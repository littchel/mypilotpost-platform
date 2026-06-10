# ENGINE 20 — Billing, Plans & Monetization Engine Certification Report

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated certification)  
**Status:** LOCKED — all critical and high repairs applied  
**Score:** 8.5 / 10

---

## 1. Architecture (Post-Repair)

### Payment → Entitlement Pipeline

```
1. PLAN DISPLAY
   GET /api/v1/pricing  →  plans JOIN regional_plans  →  geo-aware display

2. PAYMENT
   Yoco hosted checkout (frontend-initiated)
   Metadata: { brand_id, plan_id }

3. WEBHOOK (authoritative activation path)
   POST /api/webhooks/yoco  [no auth — public]
   ├─ Svix HMAC-SHA256 verify (constant-time)
   ├─ Replay protection ±180s
   ├─ INSERT INTO payments (UNIQUE provider+event_id idempotency)
   ├─ INSERT INTO billing_events
   └─ applyBillingEvent:
       payment_received  → subscriptions.status='active' + users.plan_id + snapshotMRR
       payment_failed    → subscriptions.status='past_due' + users.subscription_status='past_due'
       refund_received   → subscriptions.status='refunded' + users.subscription_status='refunded'
                           + users.plan_id='starter'  [REPAIRED R4]

4. FRONTEND CONFIRMATION  [REPAIRED R1]
   POST /api/customer/billing/upgrade
   ├─ Validates plan_id exists
   ├─ Verifies payments.status='succeeded' exists for brand (payment guard)
   ├─ Returns getCurrentPlan() — plan already activated by webhook
   └─ NO entitlement writes (webhook is sole activation path)

5. ENTITLEMENT RESOLUTION
   GET /api/customer/billing/plan → getCurrentPlan(db, userId)
   SELECT u.subscription_status, u.trial_ends_at, u.plan_id, p.*
   FROM users u JOIN plans p
   Priority:
   1. Active paid (status='active' AND plan_id != 'starter')
   2. Trial (status='trial' AND trial_ends_at > now)  ← includes referral extensions [REPAIRED R2]
   3. Fallback → starter

6. QUOTA ENFORCEMENT  (enforcement.js::checkAndIncrement)
   Blocked statuses: ['expired', 'cancelled', 'past_due', 'refunded']  [REPAIRED R4]
   posts:    scheduleContent + createSchedule  [REPAIRED R3]
   ai:       social_generate, blog_generate, grammar, hashtags, studio, intelligence handlers
   accounts: connectPlatform (onboarding) + handleCallback OAuth (new connections)  [REPAIRED R5]
   Decrement on disconnect: disconnectIntegration, disconnectSocialConnection, disconnectPlatform  [REPAIRED R5]

7. FEATURE GATING
   checkFeatureAccess → getCurrentPlan → JSON.parse(features_json).includes(feature)

8. BILLING HISTORY  [REPAIRED R6]
   GET /api/customer/billing/history
   Joins payments → brands WHERE brands.owner_user_id = ?
   (was: brand_users JOIN — leaked to team members)
```

---

## 2. Repairs Applied

### R1 — CRITICAL: Close free upgrade path

**File:** `packages/api/src/server.js:1411–1434`

**Was:** Any authenticated user could POST `{ plan_id: "pro" }` to activate a paid plan with no payment verification.

**Now:** Endpoint verifies `payments.status='succeeded'` for the user's brand before responding. The Yoco webhook remains the sole path that writes plan entitlements. This endpoint reads and returns the current plan state after confirming payment exists.

```js
// Verify a confirmed payment exists for this brand.
const confirmedPayment = await db.prepare(`
  SELECT 1 FROM payments WHERE brand_id = ? AND status = 'succeeded' LIMIT 1
`).bind(auth.brand_id).first();
if (!confirmedPayment) {
  return json({ error: "No confirmed payment found.", code: "PAYMENT_REQUIRED" }, 402);
}
// Return current plan — webhook already activated it.
const currentPlan = await getCurrentPlan(db, auth.user_id);
return json({ success: true, plan: currentPlan }, 200);
```

**Migration:** None (code-only change).

**Validation:** Free user (no payments record) → 402. Paid user (payment webhook fired) → 200 with current plan.

---

### R2 — CRITICAL: Fix referral trial extension

**Files:** `core/promotions/promotions.js`, `core/billing/billing.js`  
**Migration:** `130_billing_repair.sql` (backfill)

**Was:** `grantReferralReward` wrote `+7 days` to `subscriptions.trial_extended_until`. `getCurrentPlan` reads from `users JOIN plans` — `trial_extended_until` is never in the result set. Every referral reward was silently ignored.

**Now:**

`promotions.js::grantReferralReward` writes to `users.trial_ends_at` (which `getCurrentPlan` reads at step 2):
```js
UPDATE users SET
  trial_ends_at = datetime(MAX(COALESCE(trial_ends_at, datetime('now')), datetime('now')), '+7 days')
  WHERE id = ?
```

`billing.js::getCurrentPlan` step 2 dead check removed (was checking `row.trial_extended_until` — always undefined from the JOIN). Trial extensions now flow through `users.trial_ends_at`.

**Migration:** Backfills any existing `subscriptions.trial_extended_until` values to `users.trial_ends_at` for users still in trial status.

**Validation:** Grant referral reward → `users.trial_ends_at` extended → `getCurrentPlan` returns status='trial' with extended date.

---

### R3 — HIGH: Unify posts quota across both scheduling paths

**File:** `core/schedule/schedule.js`

**Was:** `POST /api/customer/schedule` (calendar scheduling path) had no `checkAndIncrement` call. Users could schedule unlimited posts via this endpoint regardless of `posts_per_month_limit`.

**Now:** `createSchedule` imports and calls `checkAndIncrement(db, auth.user_id, 'posts')` before inserting delivery jobs. The catch block passes enforcement Response errors through (not swallowed as 500).

```js
// Added before the INSERT:
await checkAndIncrement(db, auth.user_id, 'posts');

// Updated catch:
} catch (err) {
  if (err instanceof Response) return err;
  return error("Internal error", "SERVER_ERROR", String(err), 500);
}
```

**Validation:** Schedule to posts_per_month_limit → 200. Next schedule → 403 UPGRADE_REQUIRED.

---

### R4 — HIGH: Refund triggers subscription downgrade

**Files:** `core/billing/yoco-webhook.js`, `core/billing/subscription-engine.js`, `core/billing/enforcement.js`  
**Migration:** `130_billing_repair.sql` (backfill existing refunded subscriptions)

**Was:** `refund.succeeded` set `billingEventType = null` → `applyBillingEvent` never called → user retained active subscription after refund.

**Now:**
- `yoco-webhook.js`: `billingEventType = "refund_received"` (was `null`)
- `subscription-engine.js`: handler for `refund_received` sets `subscriptions.status='refunded'`, `users.subscription_status='refunded'`, `users.plan_id='starter'`
- `enforcement.js`: `'refunded'` added to blocked status set `['expired', 'cancelled', 'past_due', 'refunded']`

**Validation:** Fire `refund.succeeded` webhook → user.plan_id = 'starter', status = 'refunded' → checkAndIncrement throws 403.

---

### R5 — HIGH: Social accounts quota enforcement unification

**Files:** `integrations/handlers.js`, `core/onboarding/platforms.js`

**Was:**
- `checkAndIncrement('accounts')` only called in `onboarding/platforms.js::connectPlatform`
- Full OAuth flow (`/api/customer/oauth/:provider/callback`) had no quota enforcement
- Disconnect paths never decremented `social_accounts_used`

**Now:**
- `handleCallback` (OAuth flow): Checks `connected_accounts` for existing active connection. New connections call `checkAndIncrement(db, userId, 'accounts')`. Reconnections (same provider, same brand) are not charged again.
- `disconnectIntegration`: Decrements `social_accounts_used = MAX(social_accounts_used - 1, 0)` after successful disconnect.
- `disconnectSocialConnection`: Same decrement.
- `disconnectPlatform` (onboarding): Decrements only if the platform was previously in 'connected' state (`result.meta.changes > 0`).

**Validation:** Connect new platform → quota checked. Connect same platform again → no double count. Disconnect → counter decrements. Connect until limit → 403 on next connect.

---

### R6 — MEDIUM: Restrict billing history to brand owners

**File:** `packages/api/src/server.js:1430–1443`

**Was:** `billing/history` joined `payments → brands → brand_users WHERE bu.user_id = ?` — returned payments for all brands the user is a MEMBER of, including brands owned by others.

**Now:** Joins `payments → brands WHERE b.owner_user_id = ?` — only returns payments for brands the user owns.

**Validation:** Brand owner → sees payment history. Invited team member → empty history for employer's brands.

---

### R7 — Phase 7: Dead code removed

| Removed | Reason |
|---------|--------|
| `src/lib/usage.js` | Imported `constants/plans.js` (nonexistent), queried `usage_metrics` (nonexistent), never imported anywhere |
| `src/api/admin/billing-admin.js` | `assignLifetime` wrote to `customer_plans` (never read by getCurrentPlan), no route registered in server.js, entirely unreachable |

---

## 3. Migration

**File:** `packages/api/migrations/130_billing_repair.sql`

1. **Backfill referral trial extensions**: Copies `subscriptions.trial_extended_until` → `users.trial_ends_at` for users with pending extensions still in trial status.
2. **Downgrade refunded subscriptions**: Sets `users.plan_id = 'starter'`, `subscription_status = 'refunded'` for users whose `subscriptions.status = 'refunded'` but `users.subscription_status` is still 'active'.

Both operations are safe for existing production data and idempotent.

---

## 4. Webhook Contracts (Unchanged)

| Property | Status |
|----------|--------|
| Endpoint | `POST /api/webhooks/yoco` — public, no auth |
| Signature | Svix HMAC-SHA256, constant-time — PRESERVED |
| Replay protection | ±180s — PRESERVED |
| Idempotency | `UNIQUE(provider, provider_event_id)` on payments — PRESERVED |
| Event: payment.succeeded | → payment_received → subscription active — PRESERVED |
| Event: payment.failed | → payment_failed → past_due — PRESERVED |
| Event: refund.succeeded | → refund_received → refunded + downgrade to starter — REPAIRED |
| Response | Always `200 OK` to Yoco — PRESERVED |
| Table names | All unchanged — PRESERVED |
| Plan IDs | starter / growth / pro / agency — PRESERVED |

---

## 5. Remaining Known Gaps (Not Fixed This Session)

| Gap | Reason Not Fixed |
|-----|-----------------|
| `customer_plans` table is dead (no reader) | `assignLifetime` removed; table is empty in production. No active users affected. Low priority. |
| `processed_webhooks` table is dead | No active references. Harmless dead schema. Low priority. |
| No cancellation flow | No Yoco cancellation event. Would require new endpoint + cron for period-end enforcement. Scope creep. |
| No grace period | Users go to past_due immediately on failed payment. Intentional per current product design. |
| MRR discrepancy (live vs snapshots) | Admin-facing only. Methodologies differ but neither is incorrect. |
| `ai_usage_quota` observation-only | Separate daily counter for display. Monthly quota via `usage_tracking` enforces the real limit. |
| No invoice system | Out of scope for this session. |

---

## 6. Score by Domain (Post-Repair)

| Domain | Pre | Post | Notes |
|--------|-----|------|-------|
| 1. Billing Architecture | 6 | 9 | Free upgrade path closed; webhook is sole activation |
| 2. Payment Provider | 8 | 9 | Refund now triggers downgrade |
| 3. Billing Tables | 6 | 7 | Dead tables remain (harmless); core tables correct |
| 4. Plan + Entitlement | 5 | 9 | Trial extensions work; free upgrade closed |
| 5. Usage + Quota | 4 | 8 | Both scheduling paths enforce; accounts quota unified |
| 6. Webhooks | 7 | 9 | Refund lifecycle complete |
| 7. Billing Safety | 4 | 9 | Free upgrade closed; history restricted to owners |
| 8. Performance | 7 | 7 | Unchanged |
| 9. Dead Code | 5 | 9 | usage.js + billing-admin.js removed |
| 10. Live Test Readiness | 5 | 9 | All critical paths safe |

**Overall: 8.5 / 10 — LOCKED**

---

## 7. Lock Criteria

| Criterion | Pre | Post |
|-----------|-----|------|
| No free upgrade — payment required | ✗ | ✓ |
| Payment required for plan activation | ✗ | ✓ |
| Referral trial extensions honored | ✗ | ✓ |
| Posts quota applies to all scheduling paths | ✗ | ✓ |
| Refunds remove access | ✗ | ✓ |
| Billing history isolated to owners | ✗ | ✓ |
| No duplicate billing (idempotent webhook) | ✓ | ✓ |
| Webhook signature verified | ✓ | ✓ |
| Plan state deterministic (users table authoritative) | ✓ | ✓ |
| Social account quota enforced on connect + decremented on disconnect | ✗ | ✓ |

**Verdict: LOCKED**

---

## 8. Artifacts

- `ENGINE20_BILLING_CERTIFICATION_REPORT.md` (this file — LOCKED)
- `packages/api/migrations/130_billing_repair.sql` — backfill + status repair migration
- `verification/billing_certification.js` — certification test suite

**Files changed:**
- `src/server.js` — Phase 1 (upgrade endpoint), Phase 6 (billing history)
- `src/core/billing/billing.js` — Phase 2 (remove dead trial_extended_until check)
- `src/core/promotions/promotions.js` — Phase 2 (users.trial_ends_at)
- `src/core/billing/yoco-webhook.js` — Phase 4 (refund_received event type)
- `src/core/billing/subscription-engine.js` — Phase 4 (refund_received handler)
- `src/core/billing/enforcement.js` — Phase 4 (blocked statuses)
- `src/core/schedule/schedule.js` — Phase 3 (posts quota + Response passthrough)
- `src/integrations/handlers.js` — Phase 5 (new connection quota + disconnect decrement)
- `src/core/onboarding/platforms.js` — Phase 5 (disconnect decrement)

**Files removed:**
- `src/lib/usage.js` — dead code
- `src/api/admin/billing-admin.js` — dead code
