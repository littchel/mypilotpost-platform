# ENGINE 20 — Billing, Plans & Monetization Engine Audit

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated certification audit)  
**Mode:** READ ONLY — no fixes, no migrations, no certification  
**Status:** CONDITIONAL — 2 critical defects, 3 high defects  
**Score:** 5.5 / 10

---

## Executive Summary

The billing stack is built on a single payment provider (Yoco / Svix), a three-tier plan model (Starter/Growth/Pro), and a dual-table enforcement architecture (`users` + `usage_tracking`). The Yoco webhook is production-quality: constant-time signature verification, replay protection, and idempotency via `UNIQUE(provider, provider_event_id)`.

However, **two critical defects make the revenue system unsafe for production billing:**

1. **Any authenticated user can self-upgrade to any paid plan without making a payment.** `POST /api/customer/billing/upgrade` validates only that the plan exists — no payment token, no Yoco confirmation, no admin gate. This is the highest-severity defect in the platform.

2. **Referral trial extensions are silently ignored.** `getCurrentPlan` reads from `users JOIN plans` but `trial_extended_until` lives only on `subscriptions`. Every referral reward of +7 days is written to a column that is never read by the entitlement engine.

Three additional high-severity findings: `POST /api/customer/schedule` bypasses the monthly post quota; `social_accounts_used` is never reset on period rollover and only increments via the onboarding path (not OAuth); and refund events do not trigger subscription downgrade.

---

## 1. Billing Architecture Map

### Runtime Path (Yoco Payment → Entitlement)

```
1. PLAN SELECTION
   GET /api/v1/pricing (public)
   └─ pricing.js::getPublicPricing
       ├─ SELECT * FROM plans WHERE is_active = 1
       └─ JOIN regional_plans WHERE region = cf.country   [geo.js::getRegion]

2. CHECKOUT (GAP — see Defect 1)
   Frontend expected to initiate Yoco hosted checkout with metadata.brand_id + metadata.plan_id
   No server-side checkout initiation endpoint exists in the codebase.

3. PAYMENT PROVIDER (Yoco / Svix spec)
   POST /api/webhooks/yoco  [yoco-webhook.js — NO auth middleware]
   ├─ Read raw body (before any await)
   ├─ Verify Svix headers: webhook-id, webhook-timestamp, webhook-signature
   ├─ Replay protection: |now - timestamp| < 180s
   ├─ HMAC-SHA256 signature verify (constant-time via crypto.subtle.verify)
   ├─ Parse event after verification
   ├─ Guard: data.metadata.brand_id required
   └─ Map event type:
       payment.succeeded  → paymentStatus='succeeded', billingEventType='payment_received'
       payment.failed     → paymentStatus='failed',    billingEventType='payment_failed'
       refund.succeeded   → paymentStatus='refunded',  billingEventType=null  ← NO STATE CHANGE

4. IDEMPOTENCY
   INSERT INTO payments (UNIQUE provider + provider_event_id)
   UNIQUE violation → isNewPayment=false → skip state machine

5. SUBSCRIPTION PERSISTENCE  [subscription-engine.js::applyBillingEvent]
   payment_received (first):
     INSERT INTO subscriptions (customer_id=brand_id, status='active', plan_id, user_id, period)
     UPDATE users SET plan_id, subscription_status='active', current_period_start, current_period_end
     snapshotMRR(env, brandId, amount)
   payment_received (renewal):
     UPDATE subscriptions SET status='active', plan_id, period
     UPDATE users SET plan_id, subscription_status='active', period
     snapshotMRR(env, brandId, amount)
   payment_failed:
     UPDATE subscriptions SET status='past_due'
     UPDATE users SET subscription_status='past_due'
     detectChurnSignals(env, brandId, 'payment_failure')

6. ENTITLEMENT CALCULATION  [billing.js::getCurrentPlan]
   SELECT u.subscription_status, u.trial_ends_at, u.plan_id, p.*
   FROM users u JOIN plans p ON u.plan_id = p.id
   WHERE u.id = ?
   Priority:
   1. Active paid subscription (status='active' AND plan_id != 'starter')
   2. Trial extension (row.trial_extended_until > now)  ← SILENTLY BROKEN (Defect 2)
   3. Standard trial (status='trial' AND trial_ends_at > now)
   4. Trial expired fallback → starter plan + status='trial_expired'

7. QUOTA ENFORCEMENT  [enforcement.js::checkAndIncrement]
   SELECT FROM users LEFT JOIN plans LEFT JOIN usage_tracking WHERE users.id = ?
   Self-healing: creates usage_tracking row if missing
   Self-healing: initializes current_period_end if null
   Auto-resets: if now > current_period_end → resetUsagePeriod() → recurse
   Blocks: status IN ('expired','cancelled','past_due')
   Increments atomically: UPDATE usage_tracking SET posts_used = posts_used + 1

8. FEATURE GATING  [billing.js::checkFeatureAccess]
   SELECT plan → JSON.parse(features_json) → includes(feature)?
   Features: social, content, seo, campaigns, analytics, intelligence, reports, white_label, api_access

9. UPGRADE / DOWNGRADE
   Webhook path: applyBillingEvent → writes both subscriptions + users (correct)
   Self-service path: POST /api/customer/billing/upgrade → WRITES PLAN WITHOUT PAYMENT (Defect 1)
   Admin path: PUT /api/v1/admin/pricing/:id (plan template edit, not per-user assignment)

10. RENEWAL
    Handled by Yoco recurring — fires payment.succeeded → applyBillingEvent → renews period
    30-day rolling window (addOneMonth) — not calendar-month aligned

11. CANCELLATION
    No explicit cancellation endpoint. No cancel → grace period → downgrade flow.
    User retains access until period_end naturally expires (no active enforcement).

12. GRACE PERIOD
    No grace period logic in any file. Past-due immediately blocks.

13. INVOICE
    No invoice table. No invoice generation. payments table is the only record.
    Billing history: GET /api/customer/billing/history → raw payments records.

14. USAGE REPORTING
    GET /api/customer/billing/usage → reads usage_tracking + plans limits
    GET /api/customer/ai/usage → reads ai_usage_quota (separate daily counter, observation only)
```

---

## 2. Payment Providers

### Yoco (LIVE — sole provider)

| Property | Status |
|----------|--------|
| Endpoint | `POST /api/webhooks/yoco` — registered, no auth middleware |
| Signature | HMAC-SHA256 via `crypto.subtle.verify` (constant-time) — CORRECT |
| Replay protection | ±3min timestamp window — CORRECT |
| Idempotency | `UNIQUE(provider, provider_event_id)` on `payments` table — CORRECT |
| Table writes | `payments`, `billing_events`, `subscriptions`, `users`, `mrr_snapshots`, `churn_signals` |
| Webhook secret | `env.YOCO_WEBHOOK_SECRET` must be `whsec_`-prefixed — validated at startup |
| `processed_webhooks` table | Defined in migration 051 but NEVER queried in yoco-webhook.js — redundant/dead |
| Retry handling | Always returns `200 OK` — Yoco will not retry. Idempotency handles duplicate delivery. |
| Failure recovery | `billingEventType && isNewPayment` guard ensures state machine only runs on new payments |
| Refund behavior | `refund.succeeded` → writes `payments.status='refunded'` but `billingEventType=null` — **subscription NOT downgraded** |

### Stripe, Paddle, PayPal, Manual, Enterprise, Invoice, Trial, Coupon

| Provider | Status |
|----------|--------|
| Stripe | **NOT IMPLEMENTED** — no Stripe SDK, no Stripe routes, no Stripe tables |
| Paddle | **NOT IMPLEMENTED** |
| PayPal | **NOT IMPLEMENTED** |
| Manual billing | Admin can edit plan templates; no admin tool to assign a specific plan to a user |
| Invoice billing | No invoice table, no invoice generation — payments table only |
| Enterprise flow | No enterprise-specific flow; `agency` plan exists but no special enterprise handling |
| Trial activation | Auto-seeded at registration by migration 063/068 (`trial_ends_at = now + 14 days`) |
| Coupon / promotion | Referral trial extension only (see Defect 2 — broken). No discount codes. |
| Checkout initiation | No server-side checkout initiation. Frontend calls Yoco directly; webhook confirms. |

---

## 3. Billing Tables

### Canonical Live Tables

| Table | Purpose | Writers | Readers | Notes |
|-------|---------|---------|---------|-------|
| `plans` | Plan templates (limits, features, pricing) | admin pricing API, migrations | `billing.js`, `enforcement.js`, `pricing.js` | Authoritative — canonical source of limits and features |
| `users` | Subscription state per user (`plan_id`, `subscription_status`, `trial_ends_at`, `current_period_start`, `current_period_end`) | `subscription-engine.js`, `enforcement.js`, `billing.js`, `auth` | `enforcement.js`, `billing.js`, all JWT-issued auth | Dual-writer risk — both subscription-engine and server.js inline code write here |
| `subscriptions` | Brand-level subscription record (maps customer_id/brand_id → plan, period, status) | `subscription-engine.js`, `billing.js::updateSubscription`, `promotions.js` (trial_extended_until only) | `billing.js::updateSubscription` (plan change audit) | PK is `customer_id` (brand_id); `user_id` column added in migration 092 |
| `usage_tracking` | Per-user monthly quota counters (posts, AI, accounts) | `enforcement.js::checkAndIncrement`, `enforcement.js::resetUsagePeriod` | `enforcement.js::checkAndIncrement`, `server.js::billing/usage` | `social_accounts_used` never reset on period rollover |
| `usage_snapshots` | Per-user brand/seat counts for `enforceLimits` | `billing.js::recalculateUsage` | `billing.js::enforceLimits` | Only tracks brand count + active user count — not content quotas |
| `payments` | Immutable provider payment facts | `yoco-webhook.js` | `server.js::billing/history` | `UNIQUE(provider, provider_event_id)` for idempotency |
| `billing_events` | Meaningful lifecycle events (payment_received, payment_failed) | `yoco-webhook.js` | Admin portal only (no active enforcement reader) |
| `mrr_snapshots` | Monthly revenue snapshots per brand | `revenue-engine.js::snapshotMRR` | `billing.js::mrrHistory` (admin) | `INSERT OR REPLACE` on `(snapshot_month, brand_id)` — updates existing month's MRR |
| `churn_signals` | Risk signals (payment_failure, unresolved) | `revenue-engine.js::detectChurnSignals` | Admin portal only |
| `subscription_events` | Upgrade/downgrade audit trail | `billing.js::updateSubscription` | Not read in any active path — audit only |
| `regional_plans` | Localized pricing overlays | Admin pricing API, migrations | `pricing.js::getPublicPricing` | Overrides `plans` for public pricing display only — enforcement always uses `plans` |
| `ai_usage_quota` | Daily per-user+brand AI generation count | `ai_client.js::trackedRunLLM` | `ai_client.js::getAIUsage` (display only) | **Observation-only — no enforcement reads this table** |

### Legacy / Dead Tables

| Table | Status |
|-------|--------|
| `processed_webhooks` | Defined in migration 051 but **never queried** in production code. `yoco-webhook.js` uses `payments` UNIQUE constraint for idempotency instead. Dead. |
| `customer_plans` | Written by `assignLifetime` (billing-admin.js) but **never read** by `getCurrentPlan`. The lifetime plan assignment route is also not wired in server.js. Entirely dead. |
| `usage_metrics` | Referenced by `lib/usage.js::enforceUsage` (dead code). `constants/plans.js` also referenced but does not exist. Neither table nor constant file exists. |
| `customers` | Dropped by migration 051. Replaced by `users` + `subscriptions`. |

---

## 4. Plan + Entitlement Engine

### Plan Limits (Canonical Values from Migration 126 + 068)

| Plan | Price | Social Accounts | Posts/Month | AI Generations | Brand Limit | Features |
|------|-------|----------------|-------------|----------------|-------------|---------|
| starter | R0/mo | 3 | 30 | 10 | 1 | social, content, seo |
| growth | R499/mo | 10 | 100 | 50 | 5 | +campaigns, analytics, intelligence, reports |
| pro | R999/mo | 25 | 500 | 200 | 25 | +white_label, api_access |
| agency | R199/mo (from 018) | — | — | — | — | same as pro (migration 126) |

**Plan schema has two price columns:** `price_cents` (canonical storage) and `price_monthly` (API compat layer). Both populated identically in 068. `billingOverview` uses `COALESCE(price_cents, price_monthly * 100)` — correct.

### Upgrade/Downgrade Behavior

- **Paid webhook path (correct):** Yoco `payment_received` → `applyBillingEvent` writes both `subscriptions` and `users` in the same transaction
- **Self-service upgrade path (broken):** `POST /api/customer/billing/upgrade` writes plan directly without payment verification — **see Defect 1**
- **Admin path:** No per-user plan assignment route. Admin can only edit plan *templates*.
- **`updateSubscription` in billing.js:** Used only from `billing.js::updateSubscription`, which updates both tables correctly — but this function is not called from any active endpoint

### Feature Gating

- Single authority: `plans.features_json` (JSON array of feature strings)
- Gate function: `checkFeatureAccess(request, env, auth, feature)` → `getCurrentPlan` → `JSON.parse(features_json).includes(feature)`
- Call sites: `campaigns.js` (8 functions), `analytics.js` (3 functions), `seo.js` (2 functions), `intelligence.js`, `settings.js` (white_label)
- **No feature gate on blog generation, content creation, or any non-campaign content operations**

### Trial Flow

- New users seeded at registration with `trial_ends_at = now + 14 days` (enforcement) via migrations 063/068
- `checkAndIncrement` auto-expires on first quota action after trial_ends_at
- **Trial extension (referral) is silently broken** — see Defect 2

---

## 5. Usage + Quota

### Quota Coverage Map

| Resource | Increment | Enforcement | Reset | Gap |
|----------|-----------|-------------|-------|-----|
| AI generations | `checkAndIncrement(db, userId, 'ai')` — called in: `social_generate.js`, `blog_generate.js`, `grammar.js`, `hashtags.js`, `studio.js` (5 functions), `intelligence/handlers.js` | `enforcement.js` — checks `ai_generations_limit` | Monthly on period rollover | AI generation via `intelligence/brand_intelligence_engine.js` writes directly via `trackedRunLLM` — increments `ai_usage_quota` (observation only), NOT `usage_tracking`. DailyIntelligence bypasses monthly AI quota. |
| Posts scheduled | `checkAndIncrement(db, userId, 'posts')` — called ONLY in `scheduling.js::scheduleContent` | `enforcement.js` — checks `posts_per_month_limit` | Monthly on period rollover | **`createSchedule` (POST /api/customer/schedule) has zero quota calls — bypasses posts limit entirely** |
| Social accounts | `checkAndIncrement(db, userId, 'accounts')` — called ONLY in `onboarding/platforms.js::connectPlatform` | `enforcement.js` — checks `social_accounts_limit` | **NEVER RESET** on period rollover | OAuth connections via `/api/customer/oauth/:platform/start` and the full connection flow do NOT call checkAndIncrement — only onboarding path enforces this |
| Brand count | `billing.js::enforceLimits(db, userId, 'brand')` — called in `brands.js::createBrand` | `usage_snapshots.brands_count >= plan.brand_limit` | Recalculated on brand events | `usage_snapshots` must be refreshed by `recalculateUsage` — not auto-triggered |
| Team seats | `billing.js::enforceLimits(db, userId, 'user')` — called in team invite flow | `usage_snapshots.active_users_count >= plan.user_limit` | Recalculated on team events | Same recalculation dependency as brand count |
| Media / Storage | **Not enforced** — no quota on media uploads or storage | None | None | No media quota exists |
| Analytics | **Not enforced** — feature-gated only (has 'reports' or 'seo' feature access) | Feature gate only | N/A | |
| Intelligence runs | `checkAndIncrement(db, userId, 'ai')` only in `handlers.js::runIntelligenceOnDemand` | Monthly AI quota | Monthly | Daily cron intelligence (`runDailyIntelligence`) does NOT call checkAndIncrement — admin-triggered on behalf of brands |
| Automation / Delivery | **Not enforced** — no quota on delivery jobs or scheduled posts (separate from content scheduling) | None | None | |

### Quota Reset Logic

`resetUsagePeriod` resets:
- `posts_used = 0` ✓
- `ai_generations_used = 0` ✓
- `social_accounts_used` — **NOT RESET** (intentional for persistent connections, but inconsistent with quota model)

Period rolling: 30-day rolling from last period end (not calendar-month). Triggers on first `checkAndIncrement` call after `current_period_end`.

### Duplicate Quota Systems

| System | Table | Enforces? | Reads? |
|--------|-------|-----------|--------|
| `enforcement.js::checkAndIncrement` | `usage_tracking` | YES — blocks at limit | YES — reads before increment |
| `lib/usage.js::enforceUsage` | `usage_metrics` (nonexistent) | DEAD — never called | DEAD |
| `ai_client.js::trackedRunLLM` | `ai_usage_quota` | NO — observation only | Display only (`getAIUsage`) |

---

## 6. Webhooks

| Property | Status |
|----------|--------|
| Provider | Yoco via Svix spec |
| Endpoint | `POST /api/webhooks/yoco` — in the public block, before requireAuth |
| Signature algorithm | HMAC-SHA256, constant-time via `crypto.subtle.verify` |
| Replay protection | ±180 second timestamp window |
| Duplicate protection | `payments` table `UNIQUE(provider, provider_event_id)` — CORRECT. `processed_webhooks` table defined but never used. |
| Response | Always `200 OK` — prevents Yoco retry storms |
| Event ordering | No event ordering guarantee — Yoco may deliver out of order. `applyBillingEvent` handles payment_received idempotently via INSERT and COALESCE. |
| Dead letter | None — failures are logged via `console.error` but no dead letter queue |
| Supported events | `payment.succeeded`, `payment.failed`, `refund.succeeded` |
| Unhandled events | All others silently return `200 OK` |
| Missing: cancellation | No `subscription.cancelled` or similar event handler |
| Missing: refund → downgrade | `refund.succeeded` records payment but does NOT trigger subscription state change |

---

## 7. Billing Safety

| Check | Status |
|-------|--------|
| Brand isolation — billing history | PARTIAL — `billing/history` joins `payments` via `brand_users` — returns payments for ALL brands the user is a MEMBER of, not just brands they OWN. Team members can see agency payment history they shouldn't. |
| Brand isolation — usage quota | SAFE — `usage_tracking` is per `user_id`; enforcement reads `users.id` |
| Brand isolation — plan | SAFE — `users.plan_id` / `subscription_status` is per user |
| Customer ownership — payments table | SAFE — `payments.brand_id` is set from webhook `metadata.brand_id` |
| Invoice access control | N/A — no invoice system |
| Subscription race conditions | LOW RISK — Yoco delivers webhooks serially per subscription. D1 `UPDATE WHERE customer_id` is atomic per-row. |
| Double charge prevention | SAFE — `UNIQUE(provider, provider_event_id)` prevents duplicate webhook processing |
| Upgrade rollback | NOT IMPLEMENTED — no rollback path for failed upgrades |
| Self-upgrade without payment | **CRITICAL — any authenticated user can call `POST /api/customer/billing/upgrade` and get a paid plan for free** (Defect 1) |
| Trial extension bypass | NOT APPLICABLE — trial_extended_until is never read (Defect 2) |
| Refund safety | UNSAFE — refund does not downgrade subscription (Defect 4) |

---

## 8. Performance

| Issue | Location | Severity |
|-------|----------|----------|
| `checkAndIncrement` requires 1 query (user+plan+usage JOIN) per quota-gated action | `enforcement.js` | LOW — single 3-table JOIN, indexed on `users.id`. Acceptable. |
| `getCurrentPlan` requires 1 query per billing action | `billing.js` | LOW — users+plans JOIN, indexed. Called on every billing endpoint. |
| `billingOverview` computes live MRR via full `users JOIN plans WHERE active` | `billing.js::billingOverview` | LOW — admin-only. Acceptable. |
| No index on `users(subscription_status)` | migrations | MEDIUM — `enforcement.js::resetUsagePeriod` and billing overview both filter by status. As user count grows, billing overview scans all users. |
| `getPromotionStatus` in `promotions.js` executes 6 separate queries | `promotions.js::getPromotionStatus` | MEDIUM — 6 queries per call (referral code + 5 count queries). N+1 pattern. |
| `billingOverview` and `mrrHistory` compute MRR differently | `billing.js` | LOW — different computation methods (live from plans vs historical snapshots). May report inconsistent MRR figures to admin. |
| `ai_usage_quota` index on `(user_id, date)` | migration 099 | GOOD — correctly indexed for daily quota reads |

---

## 9. Dead Code

| Dead Code | Location | Why Dead |
|-----------|----------|---------- |
| `lib/usage.js::enforceUsage` | `src/lib/usage.js` | Never imported anywhere. Reads from `usage_metrics` table (nonexistent) and `constants/plans.js` (file does not exist). Complete dead code. |
| `constants/plans.js` | `src/constants/plans.js` | Does not exist — only `content-status.js` is in constants/. Referenced only by the dead `usage.js`. |
| `processed_webhooks` table | migration 051 | Defined, never queried. Yoco webhook uses `payments` UNIQUE constraint for idempotency instead. |
| `customer_plans` table + `assignLifetime` | `billing-admin.js` + migration 018 | `assignLifetime` writes to `customer_plans` but: (1) no route is registered for it in server.js, (2) `getCurrentPlan` never reads `customer_plans`. Lifetime plans cannot be assigned or honored. |
| `billing.js::updateSubscription` | `core/billing/billing.js` | Correctly updates both tables with subscription_events audit trail — but is only called by itself. No active endpoint calls it. |
| `billing.js::recalculateUsage` | `core/billing/billing.js` | Defined but not called from any active event trigger. Usage snapshots may be stale. |

---

## 10. Defect Register

### DEFECT 1 — CRITICAL: `POST /api/customer/billing/upgrade` activates any plan without payment

**File:** `packages/api/src/server.js:1411–1428`

**Root Cause:**

```js
if (method === "POST" && path === "/api/customer/billing/upgrade") {
  const { plan_id } = await request.json();
  const validPlan = await db.prepare("SELECT id, name FROM plans WHERE id = ? AND is_active = 1")
    .bind(plan_id).first();
  if (!validPlan) return json({ error: "Invalid plan" }, 400, ...);
  // IMMEDIATELY WRITES ACTIVE SUBSCRIPTION — NO PAYMENT CHECK
  await db.batch([
    db.prepare("UPDATE users SET plan_id = ?, subscription_status = 'active', ...").bind(plan_id, ...),
    db.prepare("UPDATE subscriptions SET plan_id = ?, status = 'active', ...").bind(plan_id, ...),
  ]);
  return json({ success: true, plan: updatedPlan });
}
```

This endpoint is inside the `/api/customer` block — protected by `requireAuth`. Any authenticated user (even a free trial user) can POST `{ "plan_id": "pro" }` and receive a fully active Pro subscription immediately, for free.

**Impact:**
- Revenue bypass — users can access Pro/Agency features permanently without payment
- No audit trail specific to this path (no subscription_events entry)
- Does not call `snapshotMRR` — MRR figures will be inaccurate

**Why this exists:** This was likely intended as the endpoint the frontend calls *after* Yoco completes payment, with the assumption the webhook would have already activated the subscription. But the endpoint sets `status='active'` regardless of whether a Yoco payment webhook was received.

---

### DEFECT 2 — CRITICAL: Referral trial extension is silently broken

**Files:** `core/promotions/promotions.js:169`, `core/billing/billing.js:9–16`

**Root Cause:**

`grantReferralReward` writes to `subscriptions.trial_extended_until`:
```js
UPDATE subscriptions SET
  trial_extended_until = datetime(MAX(COALESCE(trial_extended_until, ...)), '+7 days')
  WHERE user_id = ?
```

`getCurrentPlan` reads from `users JOIN plans` — neither table has `trial_extended_until`:
```js
SELECT u.subscription_status as status, u.trial_ends_at, u.plan_id, p.*
FROM users u JOIN plans p ON u.plan_id = p.id
WHERE u.id = ?
```

`billing.js:30` checks `if (row.trial_extended_until && ...)` — `row` is from `users JOIN plans`, so `trial_extended_until` is always `undefined`. The condition is permanently false.

**Migration evidence:** `trial_extended_until` was added ONLY to `subscriptions` (migration 052). No `ALTER TABLE users ADD COLUMN trial_extended_until` exists anywhere.

**Impact:**
- Every referral reward written to `subscriptions.trial_extended_until` is silently ignored
- Users who refer friends and earn +7 days never actually get the extension
- The referral engine works (risk scoring, reward records, promotion_rewards table) but the benefit is never applied

---

### DEFECT 3 — HIGH: `POST /api/customer/schedule` bypasses monthly posts quota

**Files:** `core/schedule/schedule.js` (no quota), `core/content/scheduling.js` (has quota)

**Root Cause:**

Two scheduling paths exist:

| Route | Handler | Quota Check |
|-------|---------|-------------|
| `POST /api/customer/content/schedule` | `scheduleContent` | `checkAndIncrement(db, auth.user_id, 'posts')` — enforced |
| `POST /api/customer/schedule` | `createSchedule` | **NONE** — no quota call anywhere in the file |

`createSchedule` was added as the newer calendar UI scheduling path. It inserts directly into `delivery_jobs` without calling `checkAndIncrement`. Any user can schedule unlimited posts via this endpoint, regardless of `posts_per_month_limit`.

**Impact:** Posts quota is completely bypassed for the primary calendar scheduling flow.

---

### DEFECT 4 — HIGH: Refund does not downgrade subscription

**File:** `core/billing/yoco-webhook.js:126–131`

**Root Cause:**
```js
} else if (eventType === "refund.succeeded") {
  paymentStatus = "refunded";
  billingEventType = null;   // ← no subscription state change triggered
}
```

`billingEventType = null` means `if (billingEventType && isNewPayment)` is false — `applyBillingEvent` is never called. The payment record is written with `status='refunded'` but the user's subscription remains `status='active'` indefinitely.

**Impact:** Users who receive a refund retain full paid access. No automatic downgrade, no past_due, no notification.

---

### DEFECT 5 — HIGH: `social_accounts_used` only increments on onboarding connect, not full OAuth flow

**Files:** `core/onboarding/platforms.js:113`, `core/oauth/` (no quota calls)

**Root Cause:**
```js
// onboarding/platforms.js (onboarding connect only):
await checkAndIncrement(db, auth.user_id, "accounts");

// Full OAuth flow (core/oauth/providers/, integrations/):
// No checkAndIncrement call
```

Users who connect social platforms via the full OAuth flow (`/api/customer/oauth/:platform/start`) never increment `social_accounts_used`. The social accounts quota only applies during the onboarding wizard's connect step.

Additionally, `resetUsagePeriod` does not reset `social_accounts_used`, meaning the counter accumulates indefinitely even for users who only go through onboarding.

**Impact:** `social_accounts_limit` is effectively unenforced for the primary connection path.

---

### DEFECT 6 — MEDIUM: `customer_plans` lifetime plan assignment — route not wired, never read

**Files:** `api/admin/billing-admin.js`, migrations 018

**Root Cause:**
- `assignLifetime` writes to `customer_plans` with `is_lifetime = 1`
- No route in `server.js` maps to `assignLifetime`
- `getCurrentPlan` queries `users JOIN plans` — never reads `customer_plans`
- Migration 018 defines `customer_plans` with `plan_id = 'lifetime'` — no 'lifetime' plan seeded in `plans` table

**Impact:** Admin lifetime plan assignment feature is entirely non-functional (cannot be triggered, would not be honored even if triggered).

---

### DEFECT 7 — MEDIUM: Billing history leaks payment data across brand membership

**File:** `packages/api/src/server.js:1430–1441`

**Root Cause:**
```sql
SELECT p.provider, p.amount, p.currency, p.status, p.occurred_at
FROM payments p
JOIN brands b ON b.id = p.brand_id
JOIN brand_users bu ON bu.brand_id = b.id
WHERE bu.user_id = ?
```

This returns payments for all brands the user is a **member** of (`brand_users`), not just brands they own. A team member invited to a brand can see the payment history for that brand's subscription, including amounts and provider.

**Impact:** Payment information leakage to non-owner team members.

---

## 11. Risk Register

| Risk | Severity | Likelihood | Notes |
|------|----------|-----------|-------|
| Self-upgrade without payment (D1) | CRITICAL | Certain | Any authenticated user can get Pro free |
| Trial extension never honored (D2) | CRITICAL | Certain | Referral engine broken — no user gets their earned extension |
| Posts quota bypass via /api/customer/schedule (D3) | HIGH | Certain | Calendar scheduling bypasses monthly limit |
| Refund no downgrade (D4) | HIGH | Certain | Refunded users retain paid access indefinitely |
| Social accounts quota unenforced (D5) | HIGH | Certain | OAuth connect path has no quota check |
| Lifetime plan un-grantable (D6) | MEDIUM | Certain | Admin tool is a no-op |
| Payment history leaks to team members (D7) | MEDIUM | Certain | Non-owners see payment amounts |
| No subscription cancellation flow | MEDIUM | Certain | No cancel endpoint, no period-end enforcement |
| No grace period logic | LOW | Certain | Past-due blocks immediately — no grace window |
| No invoice system | LOW | Certain | No PDF invoices, no invoice table |
| No Stripe/Paddle/PayPal | LOW | Certain | Single payment provider; Yoco-only |
| `ai_usage_quota` observation-only | LOW | Certain | Separate daily counter not enforced |
| MRR discrepancy (live vs snapshot) | LOW | Certain | billingOverview and mrrHistory compute MRR differently |
| Double MRR on monthly billing | LOW | Possible | `mrr_snapshots` uses `INSERT OR REPLACE` — if Yoco sends multiple events in same month, only latest is kept |

---

## 12. Audit Scores by Domain

| Domain | Score | Notes |
|--------|-------|-------|
| 1. Billing Architecture | 6/10 | Webhook path is correct; self-service upgrade path is broken |
| 2. Payment Provider | 8/10 | Yoco webhook is production quality; refund handling is missing |
| 3. Billing Tables | 6/10 | Core tables correct; 4 dead tables; dual-writer schema risk on subscriptions |
| 4. Plan + Entitlement | 5/10 | Feature gating correct; trial extension broken; free upgrade path exists |
| 5. Usage + Quota | 4/10 | AI quota wired; posts quota bypassed via second path; accounts unenforced |
| 6. Webhooks | 7/10 | Signature, replay, idempotency correct; no refund→downgrade; no cancel event |
| 7. Billing Safety | 4/10 | Free upgrade is critical; payment history leaks to members |
| 8. Performance | 7/10 | Core queries indexed; no obvious unbounded queries; N+1 in getPromotionStatus |
| 9. Dead Code | 5/10 | 4 dead tables, 1 dead enforcement system, 2 dead functions |
| 10. Live Test Readiness | 5/10 | See section 13 |

**Overall: 5.5 / 10 — CONDITIONAL (2 critical defects block production billing)**

---

## 13. Live Test Readiness

### Safe to Test Live

| Feature | Test approach |
|---------|---------------|
| Yoco webhook signature verification | Send a signed test payload with `payment.succeeded` |
| Plan display (GET /api/v1/pricing) | Public endpoint, safe to call |
| Billing plan read (GET /api/customer/billing/plan) | Read-only, safe |
| Billing usage read (GET /api/customer/billing/usage) | Read-only, safe |
| Feature gating (campaigns, seo, analytics) | Test with Starter plan; verify 403 on gated features |
| AI quota enforcement | Generate > limit; verify 403 |
| Brand creation limit | Create brands to limit; verify 403 |

### Must Remain Sandbox Only / Requires Fix Before Live

| Feature | Risk |
|---------|------|
| `POST /api/customer/billing/upgrade` | **CRITICAL** — free plan upgrade. Must add payment verification or remove endpoint before production. |
| Yoco recurring payment webhooks | Test only with Yoco test mode keys |
| Referral trial extensions | Broken — granting rewards will have no user-visible effect |
| Refund → downgrade flow | Refund currently grants free unlimited access |
| Social accounts quota (`/api/customer/schedule`) | Posts quota bypassed — test data will exceed plan limits silently |

---

## 14. Verdict

**CONDITIONAL**

The Yoco webhook pipeline is production-ready. Plan definition, feature gating, and AI quota enforcement work correctly for the paths that call them. The tables are well-structured.

However, two defects are unacceptable for a live revenue system:

1. Any authenticated user can self-assign any paid plan for free via `POST /api/customer/billing/upgrade`. This must be fixed before any real users are billed.

2. Referral trial extensions are permanently silently broken — no user who earns a referral reward ever receives it, because the extension is written to `subscriptions.trial_extended_until` but read from `users.trial_extended_until` (which does not exist).

Three additional high-severity gaps: posts quota bypassed by the calendar scheduling path, social accounts quota bypassed by the OAuth connect path, and refunds that do not trigger subscription downgrade.

**Lock criteria:**
- ✗ Paid plan requires payment
- ✗ Trial extensions are honored
- ✓ Quota enforcement fires for AI generations
- ✗ Posts quota applies to all scheduling paths
- ✓ Payment idempotency prevents double-billing
- ✓ Webhook signature is verified
