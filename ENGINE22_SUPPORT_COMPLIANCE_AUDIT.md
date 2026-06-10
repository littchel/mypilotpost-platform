# ENGINE 22 — Support, Trust & Compliance Engine Audit

**Mode:** READ ONLY — No fixes, no migrations, no refactor  
**Date:** 2026-06-10  
**Scope:** Operational trust layer: support / trust / compliance / privacy / deletion / status / auditability  
**Verdict:** NOT CERTIFIED — Score: 2/10

---

## Phase 1 — Runtime Map

### Files in scope

| File | Role | Status |
|------|------|--------|
| `api/customer/compliance.js` | AUTHORITATIVE — deletion, export, consent | Active, wired |
| `core/compliance/compliance.js` | OLD — immediate deletion (phase 1 legacy) | Active, wired, broken |
| `routes/support.js` | Hono-based live chat (SSE + Durable Object) | Active, wired, broken |
| `core/support/requests.js` | Async support ticket creation | Active, wired |
| `core/trust/verification.js` | OTP / email verification | Active |
| `core/lifecycle/engine.js` | Unsubscribe, email click tracking | Active, vulnerabilities |
| `core/realtime/ChatRoom.js` | Cloudflare Durable Object (SSE) | Active |
| `api/customer/certification.js` | Platform delivery certification matrix | Active, correct |

### Tables in scope

| Table | Migration | Notes |
|-------|-----------|-------|
| `deletion_requests` | 103_compliance_phase13.sql | columns: `requested_at`, `scheduled_for`, `status`, `cancelled_at`, `completed_at` |
| `export_requests` | 103_compliance_phase13.sql | columns: `requested_at`, `status`, `format` |
| `consent_records` | 103_compliance_phase13.sql | latest row per user is authoritative |
| `compliance_audit_log` | 103_compliance_phase13.sql | append-only |
| `support_requests` | 119_support_requests.sql | async request tickets |
| `support_threads` | 022_notifications_and_chat.sql | chat threads |
| `support_messages` | 022_notifications_and_chat.sql | chat messages |
| `support_tickets` | **MISSING — no migration** | used by routes/support.js |

### Cron wiring (server.js:2262)

| Schedule | Work done |
|----------|-----------|
| `* * * * *` | delivery + email worker |
| `0 3 * * *` | lifecycle emails, intelligence, memory aggregation, analytics backfill |
| `0 */4 * * *` | OAuth token refresh |
| — | **`processPendingDeletions` imported (line 298) but never called** |

---

## Phase 2 — Support Engine

### `core/support/requests.js`

- `createSupportRequest`: persists to `support_requests`, notifies `env.SUPPORT_EMAIL || 'support@mypilotpost.com'`, creates in-app notification. Correct.
- `listSupportRequests`: user-scoped, `LIMIT 20`. Correct.
- `adminListSupport`: `LIMIT 50`, filtered by status. Correct.
- `adminUpdateSupport`: validates status, logs via `logAdminAction`. Correct.

### `routes/support.js` — Hono router, live chat

- `/api/v1/support/authorize` — creates a `support_tickets` row. **Table does not exist (no migration). Runtime crash on every call.**
- `/api/v1/support/stream` — validates ticket, marks used, connects to Durable Object SSE. Same crash path.
- `/api/v1/support/message` — persists to `support_messages`, broadcasts via Durable Object. Functional if stream init is bypassed.
- `/api/v1/support/history/:other_id` — reads `support_messages` LIMIT 50 between two user IDs. No admin-to-admin scope restriction — any admin can pull messages for any user pair.
- `/api/v1/support/conversations` — `requirePermission("support:read")` ✓, but **query has no LIMIT** — unbounded scan.
- `/api/v1/support/unread-count` — functional.
- `/api/v1/support/test-broadcast` — still wired in production, returns stub response. Dead endpoint exposure.

---

## Phase 3 — Compliance Engine

### `api/customer/compliance.js` — AUTHORITATIVE

**Deletion flow:**

```
POST /api/customer/account/delete-request   → handleDeleteRequest   — 7-day grace window
DELETE /api/customer/account/delete-request → handleDeleteCancel    — cancels pending request
GET /api/customer/account/delete-status     → handleDeleteStatus    — status check
[CRON]                                      → processPendingDeletions — NEVER CALLED
```

**Critical defect: `processPendingDeletions` never fires.**  
Imported at server.js:298. The `scheduled()` handler (lines 2262–2360) calls delivery, email worker, lifecycle, memory aggregation, analytics backfill, and OAuth refresh — but never `processPendingDeletions`. All deletion requests accumulate as `pending` indefinitely.

**Critical defect: `CONCAT()` crashes SQLite on execution.**  
`performAccountDeletion` (compliance.js:375):
```sql
email = CONCAT('deleted-', id, '@deleted.mypilotpost.com')
```
SQLite/D1 does not support `CONCAT()`. The correct form is `'deleted-' || id || '@deleted.mypilotpost.com'`. If the cron were fixed to call this function, every deletion would crash at this line and leave the user stuck in `status='processing'`.

**Data export — phantom tables:**  
`handleDataExport` (compliance.js:151–161) queries:
- `scheduled_posts` — **no migration creates this table** (codebase uses `delivery_jobs`/`content_vault`)
- `oauth_connections` — **no migration creates this table** (codebase uses `social_connections`/`connected_accounts`)

Both queries are wrapped in `.catch(() => ({ results: [] }))` internally, but are NOT wrapped — they will silently return empty arrays on table-not-found errors. Posts and integration data are missing from every GDPR export with no error raised and no flag in the response.

**`handleExportHistory`:** queries `requested_at`, `status`, `format` — all exist in migration 103. Correct.  
**`handleDeleteStatus`:** queries `requested_at`, `scheduled_for` — both exist in migration 103. Correct.  
**`handleConsentUpdate` / `handleConsentGet`:** correct.

### `core/compliance/compliance.js` — OLD / PARALLEL

Still wired at server.js:2117:
```
DELETE /api/customer/compliance/delete-account → handleDataDeletionRequest
```

Two defects:
1. Uses `auth.userId` (line 15) — `undefined` on every call. The correct field is `auth.user_id`. The deletion always operates on `undefined` userId, touching no rows.
2. Immediate hard-delete with no grace window, no audit log entry, no deletion email.

This route is a dead endpoint that silently does nothing. It remains wired alongside the authoritative route, creating two deletion entrypoints and audit confusion.

---

## Phase 4 — Trust Layer

### `core/trust/verification.js` — OTP

- SHA-256 hashed 6-digit OTP. ✓
- 15-minute TTL. ✓
- 5-attempt lockout. ✓
- Rate-limited to 3 sends/hour. ✓
- `sendOTP`, `verifyOTP`, `getVerificationStatus`, `queueOTPEmail` — all correct.

No defects found in the trust/verification layer.

---

## Phase 5 — Consent & Communication

### `core/lifecycle/engine.js` — unsubscribe / email tracking

**`handleUnsubscribe`:**
- Token read from query param → `email_unsubscribes` table lookup. ✓
- On invalid/expired token: returns HTTP 200 with body `"Already unsubscribed or link expired"`. **Silent 200 makes token enumeration indistinguishable from a valid unsubscribe.** Should return 404 on invalid tokens.

**`handleCategoryUnsubscribe`:**
- Accepts any arbitrary string as `category`. No validation against a known set (`marketing`, `system`, `notifications`, etc.).
- Any garbage value is inserted into `email_unsubscribes` and must be matched exactly at send time.

**`getUnsubscribeStatus`:**
```js
return json({ subscribed: !row, token: row?.token || null, ... });
```
**Leaks raw unsubscribe token in API response.** The token is a single-use secret that gates the user's unsubscribe page. Exposing it allows any API consumer (JS analytics, browser DevTools, logs) to silently trigger category unsubscribes for other users.

**`trackEmailClick`:**
```js
const target = dest ? decodeURIComponent(dest) : "https://app.mypilotpost.com";
return Response.redirect(target, 302);
```
**Open redirect.** No URL validation on `dest`. Attacker can craft an email link to `https://app.mypilotpost.com/api/track/click?id=X&url=https%3A%2F%2Fevil.com` and redirect users to any external domain. Also accepts `javascript:` URIs in older browsers.

---

## Phase 6 — Security Checklist

| Check | Result |
|-------|--------|
| Deletion requires auth | ✓ (new path) — ✗ (old path, auth.userId undefined) |
| Deletion has grace period | ✓ (new) — ✗ (old, immediate) |
| Deletion cron executes | **✗ NEVER CALLED** |
| Deletion SQL compiles | **✗ CONCAT() unsupported** |
| Data export covers correct tables | **✗ scheduled_posts + oauth_connections don't exist** |
| Export rate-limited | ✓ 5/day |
| Unsubscribe token secret | **✗ leaked in getUnsubscribeStatus response** |
| Email redirect validated | **✗ open redirect** |
| Live chat auth | ✓ (JWT required) |
| Live chat bootstrap table exists | **✗ support_tickets missing** |
| Admin audit log | ✓ compliance_audit_log, logAdminAction |
| Admin IP exposure | ✗ raw IP in audit log response (medium) |
| Consent records complete | ✓ |
| OTP security | ✓ |

---

## Phase 7 — Performance

- `adminComplianceAuditLog`: accepts up to `LIMIT 500` with no OFFSET pagination parameter — full 500-row scans on every admin call.
- `adminListDeletions` / `adminListExports`: LIMIT 100/100 but no OFFSET. Cannot page through history.
- `/api/v1/support/conversations`: **no LIMIT** on query. Unbounded row scan on admin call.
- `handleDataExport`: collects up to 500 posts + all integrations in a single synchronous Worker execution. On high-volume brands this risks Cloudflare Worker CPU limits (50ms CPU / 30s wall time). No streaming, no background job.

---

## Phase 8 — Dead Code

| Item | Status |
|------|--------|
| `core/compliance/compliance.js` | Active, broken, should be removed |
| `/api/v1/support/test-broadcast` | Still wired, stub only |
| `DELETE /api/customer/compliance/delete-account` | Dead (auth.userId undefined), should be removed |

---

## Defect Register

### CRITICAL

| ID | File | Defect |
|----|------|--------|
| C1 | `server.js:2262` | `processPendingDeletions` imported (line 298) but never called in any cron block — all deletion requests remain `pending` forever, no user data is ever deleted |
| C2 | `api/customer/compliance.js:375` | `CONCAT(...)` in `performAccountDeletion` SQL — SQLite/D1 has no `CONCAT()` function — crashes every deletion execution, leaves user in `status='processing'` permanently |
| C3 | `routes/support.js:30,47,57` | `support_tickets` table is queried (INSERT + SELECT + UPDATE) but no migration creates it — every live chat initiation crashes at runtime |

### HIGH

| ID | File | Defect |
|----|------|--------|
| H1 | `core/lifecycle/engine.js:250` | Open redirect — `trackEmailClick` does `Response.redirect(decodeURIComponent(dest), 302)` with no URL validation — any destination URL accepted, phishing-ready |
| H2 | `core/compliance/compliance.js:15` | Old deletion route uses `auth.userId` (undefined) — deletes nothing, silently returns success; route remains wired at `DELETE /api/customer/compliance/delete-account` alongside authoritative new path |
| H3 | `api/customer/compliance.js:151-161` | `handleDataExport` queries `scheduled_posts` and `oauth_connections` — neither table exists; GDPR exports silently return empty posts + integrations with no error or warning |
| H4 | `core/lifecycle/engine.js` | `getUnsubscribeStatus` leaks raw unsubscribe token in response body (`token: row?.token || null`) — token is a security credential, must not be re-served via API |
| H5 | `core/lifecycle/engine.js` | `handleCategoryUnsubscribe` accepts arbitrary strings as category — no validation; garbage values inserted into `email_unsubscribes` |

### MEDIUM

| ID | File | Defect |
|----|------|--------|
| M1 | `routes/support.js` | `/api/v1/support/history/:other_id` reads messages between any two user IDs with no scope restriction — admin can probe any user pair's chat history |
| M2 | `routes/support.js` | `/api/v1/support/conversations` has no LIMIT — unbounded row scan |
| M3 | `api/customer/compliance.js:293` | `adminComplianceAuditLog` exposes `cal.*` including raw `ip_address` — no masking |
| M4 | `api/customer/compliance.js:271,304` | `adminListDeletions` and `adminListExports` have no OFFSET pagination — cannot retrieve records beyond LIMIT 100 |

### LOW

| ID | File | Defect |
|----|------|--------|
| L1 | `routes/support.js` | `/api/v1/support/test-broadcast` still wired in production |
| L2 | `core/lifecycle/engine.js` | `handleUnsubscribe` returns 200 on invalid/expired token — makes enumeration indistinguishable from success |
| L3 | `server.js:2117` | Old deletion route (`DELETE /api/customer/compliance/delete-account`) remains wired as a dead endpoint alongside authoritative new route |

---

## Files Affected

- `packages/api/src/server.js` — C1 (cron never calls processPendingDeletions), H2 wiring (L3)
- `packages/api/src/api/customer/compliance.js` — C2 (CONCAT), H3 (phantom tables), M3, M4
- `packages/api/src/core/compliance/compliance.js` — H2 (auth.userId, dead route)
- `packages/api/src/routes/support.js` — C3 (missing table), M1, M2, L1
- `packages/api/src/core/lifecycle/engine.js` — H1 (open redirect), H4 (token leak), H5 (category validation), L2

## Tables Affected

- `deletion_requests` — records pile up, never processed (C1 + C2)
- `support_tickets` — table missing, crashes on use (C3)
- `scheduled_posts` — phantom table in data export (H3)
- `oauth_connections` — phantom table in data export (H3)
- `email_unsubscribes` — token leaked via API (H4), garbage categories inserted (H5)

---

## Score

| Category | Weight | Score |
|----------|--------|-------|
| Critical defects (3) | -3.0 each | 1.0 |
| High defects (5) | -0.5 each | -1.5 (floor: 0) |
| Functional correctness | baseline 10 | 10 → 1.0 after deductions |
| Trust layer (OTP, consent) | partial credit | +1.0 |

**Final score: 2/10**

---

## Verdict: NOT CERTIFIED

**Primary failure reasons:**

1. **Deletion system is inert.** Three independent defects conspire to ensure no user data is ever deleted: the cron is unwired (C1), the SQL would crash on execution (C2), and a parallel dead route silently accepts requests with no effect (H2). The platform is non-compliant with GDPR Article 17 (right to erasure).

2. **Live support chat is broken.** The `support_tickets` table referenced by the Hono router has never been created. Every attempt to initiate a live chat session crashes at the database layer (C3).

3. **GDPR data exports are silently incomplete.** Posts and OAuth integration data are missing from every export because the queries target tables that do not exist (H3). Users cannot exercise their right to data portability accurately.

4. **Open redirect in production email links.** All tracked email click URLs pass through an unvalidated redirect, making every outgoing email a potential phishing vector (H1).

**What is working:**
- OTP verification (trust layer) — correct
- Consent records (collection + retrieval) — correct
- Async support request creation (`core/support/requests.js`) — correct
- Platform certification matrix (`api/customer/certification.js`) — correct
- Admin audit log writes — correct
- 7-day deletion grace window request/cancel flow — correct (front half only; back half never executes)
