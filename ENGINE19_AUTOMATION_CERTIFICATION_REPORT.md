# ENGINE 19 — Automation & Scheduling Engine Certification Report

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated certification)  
**Status:** LOCKED — all required repairs applied  
**Score:** 8.5 / 10

---

## 1. Architecture Overview

### Automation Map

```
Every minute (* * * * *)
  ├─ runDeliveryScheduler(env, ctx)        [delivery/scheduler.js]
  │    SELECT due/stuck jobs (BATCH_LIMIT=10)
  │    ctx.waitUntil(executeDeliveryJob(env, job))  for each job
  └─ runEmailWorker(env)                   [workers/email-worker.js]
       SELECT pending/failed outbox (LIMIT 25)
       Send → update status=sent or failed/dead_letter

Daily (0 3 * * *)
  ├─ runLifecycleCron(env)                 [lifecycle/cron.js]
  │    Promise.allSettled:
  │    ├─ runTrialExpiryEmails (LIMIT 100)
  │    ├─ runChurnRiskEmails (LIMIT 200)
  │    ├─ runWeeklyDigestEmails (LIMIT 500) ← N+1 here
  │    ├─ runOnboardingReminderEmails (LIMIT 100)
  │    └─ processPendingDeletions(env)
  ├─ runDailyAggregation + runWeeklyAggregation (Monday-gated)
  ├─ runRetention
  ├─ runDailyIntelligence for up to 30 brands
  └─ runBackfill for google_analytics + google_search_console

Every 4 hours (0 */4 * * *)
  └─ runBackgroundRefresh(env)             [integrations/refresh_manager.js]
       Refresh tokens expiring within 8 hours
```

### Delivery Job State Machine

```
'scheduled' → [scheduler picks up if scheduled_at <= now, delivery_attempts < 3]
           → 'processing' (lock acquired, delivery_attempts++)
           → 'published'  (adapter success)
           → 'failed'     → scheduleRetry (if delivery_attempts < 3)
                                  → back to 'scheduled' with backoff (+30s / +3min)
                          → final 'failed' (delivery_attempts = 3, scheduleRetry returns early)
'cancelled'  (user deletes, content reverted to 'draft')
```

### Idempotency Path

```
executeDeliveryJob:
  1. Lock: UPDATE WHERE id=? AND status IN ('scheduled','pending','failed') AND delivery_attempts < 3
     lock.meta.changes === 0 → another worker already claimed it, return
  2. Idempotency check: SELECT external_post_id — if set, skip adapter (already published)
  3. resolveDeliveryData → adapter.publish() within Promise.race(timeout=25s)
  4. Success: syncContentStatusWithJobs → emitEvent('content_published')
  5. Failure: syncContentStatusWithJobs → scheduleRetry
```

### Tables

| Table | Purpose |
|-------|---------|
| `delivery_jobs` | Authoritative job queue (status, scheduled_at, delivery_attempts) |
| `delivery_logs` | Per-attempt immutable audit trail |
| `delivery_attempts` | Per-attempt status records |
| `email_outbox` | Outbound email queue (status, retry_count) |
| `lifecycle_events` | Lifecycle email cooldown records |

---

## 2. Defect Register

### DEFECT 1 — MEDIUM: No compound index on `delivery_jobs(status, scheduled_at)` — full table scan every minute

**File:** All delivery migrations (missing index)

**Root Cause:**  
The scheduler runs every minute with this query:
```sql
SELECT * FROM delivery_jobs
WHERE ((status IN ('scheduled','pending') AND scheduled_at <= ?)
   OR (status = 'processing' AND updated_at < datetime('now', '-5 minutes')))
   AND delivery_attempts < 3
ORDER BY scheduled_at ASC
LIMIT 10
```

Existing indexes on `delivery_jobs`:
- `idx_delivery_jobs_content_status ON (content_id, status)`
- `idx_delivery_jobs_brand_attempts ON (brand_id, delivery_attempts)`
- `idx_delivery_jobs_user ON (user_id)`
- `idx_delivery_jobs_campaign ON (campaign_id)`
- `idx_delivery_jobs_external_post_id ON (external_post_id)`

**None of these indexes cover `(status, scheduled_at)`** — the primary filter for the scheduler's hot path. Every minute, SQLite does a full scan of the entire `delivery_jobs` table.

**Impact:**  
- 1440 full table scans per day for the delivery scheduler
- At low volume this is acceptable; at 10k+ jobs it becomes a measurable bottleneck
- The `ORDER BY scheduled_at ASC LIMIT 10` cannot use any index for sorting

**Fix:** Add migration:
```sql
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status_scheduled 
ON delivery_jobs(status, scheduled_at);
```

---

### DEFECT 2 — HIGH: Content-level `manualRetryJob` doesn't filter exhausted jobs — silently no-ops and returns false success

**File:** `packages/api/src/core/delivery/retries.js:34–51`

**Root Cause:**  
The single-job retry path correctly guards:
```js
if (job.delivery_attempts >= 3) return error("Maximum retry attempts reached...", 400);
```

But the content-level retry path (lines 34–51) fetches all `status = 'failed'` jobs with no attempt filter:
```js
const failedJobs = await db.prepare(`
  SELECT * FROM delivery_jobs 
  WHERE content_id = ? AND brand_id = ? AND status = 'failed'
`).bind(content_id, auth.brand_id).all();
```

This includes jobs with `delivery_attempts = 3` (fully exhausted). These are added to `tasks` and `executeDeliveryJob` is called on each. Inside `executeDeliveryJob`, the lock fails:
```sql
WHERE id = ? AND ... AND delivery_attempts < 3   ← fails for delivery_attempts=3
```
`lock.meta.changes === 0` → function returns early. Nothing is executed.

But the API returns:
```js
return json({ success: true, retried_count: failedJobs.results.length });
```

The exhausted job is counted in `retried_count`. **The user receives a `200 { success: true, retried_count: 1 }` when nothing was retried.**

**Impact:**  
- Users who retry content with exhausted jobs think the retry succeeded
- They wait for a delivery that will never come
- Support overhead: "I retried but it never posted"

**Fix:** Add attempt limit to the query:
```js
const failedJobs = await db.prepare(`
  SELECT * FROM delivery_jobs 
  WHERE content_id = ? AND brand_id = ? AND status = 'failed' AND delivery_attempts < ?
`).bind(content_id, auth.brand_id, MAX_ATTEMPTS).all();
```
And return a differentiated response if all jobs were exhausted.

---

### DEFECT 3 — MEDIUM: N+1 in `runWeeklyDigestEmails` — per-user `SELECT COUNT(*)` inside 500-user loop

**File:** `packages/api/src/core/lifecycle/cron.js:136–164`

**Root Cause:**  
```js
// Outer query — up to 500 users
const { results } = await db.prepare(`
  SELECT DISTINCT u.id as user_id, u.first_name, ...
  FROM users u JOIN brand_users bu ... JOIN brands b ...
  WHERE u.verified_at IS NOT NULL
  LIMIT 500
`).all();

for (const row of results || []) {
  // ← PER-USER QUERY inside loop (N+1)
  const stats = await db.prepare(`
    SELECT COUNT(*) as posts_this_week
    FROM content_vault
    WHERE brand_id = ? AND created_at >= datetime('now', '-7 days') AND lifecycle_status = 'published'
  `).bind(row.brand_id).first();
  
  // + triggerLifecycleEmail → 3-4 more queries per user
}
```

At LIMIT 500: 1 outer query + 500 stats queries + up to 500 × (1 user lookup + 1 unsubscribe check + 1 cooldown check + 1 INSERT) = ~2500 D1 queries per daily cron invocation. On D1, each query is a network hop (~10ms). Total: ~25 seconds of wall-clock time, within Worker limits but wasteful.

**Impact:**  
- 2500 queries per daily cron (could be reduced to ~4 with a JOIN)
- Not a correctness issue at current scale; becomes a reliability risk as user count grows
- Adds ~25 seconds to the daily 3AM cron execution

**Fix:** Fold `posts_this_week` into the outer query:
```sql
SELECT DISTINCT u.id as user_id, u.first_name, u.email,
                b.id as brand_id, b.name as brand_name,
                COUNT(cv.id) as posts_this_week
FROM users u
JOIN brand_users bu ON bu.user_id = u.id
JOIN brands b ON b.id = bu.brand_id
LEFT JOIN content_vault cv 
  ON cv.brand_id = b.id 
  AND cv.created_at >= datetime('now', '-7 days') 
  AND cv.lifecycle_status = 'published'
WHERE u.verified_at IS NOT NULL
GROUP BY u.id, b.id
LIMIT 500
```

---

### DEFECT 4 — LOW: `execute.js::executeDelivery` is dead code with a broken stub

**File:** `packages/api/src/core/delivery/execute.js:10–45`

**Root Cause:**  
`execute.js` exports two functions:
- `executeDelivery(env, jobId)` — the old delivery executor (dead code)
- `getDeliveryStats(request, env, auth)` — delivery stats endpoint (in use, works correctly)

`executeDelivery` has:
```js
// TODO: send finalText to platform API

await db.prepare(`UPDATE delivery_jobs SET status = 'delivered', ...`).bind(jobId).run();
```

Problems:
1. Hard INNER JOIN on `social_variants` — crashes if no variant exists for the platform
2. Sets status to `'delivered'` — not a valid status in the current system (uses `'published'`)
3. Never calls any adapter (TODO unimplemented)

`executeDelivery` is never imported anywhere. The real executor is `poster.js::executeDeliveryJob`. This is harmless dead code but confusing — if someone accidentally calls it, jobs would be set to 'delivered' (invisible to the scheduler, stuck forever).

**Fix:** Remove the `executeDelivery` function from `execute.js`. Keep `getDeliveryStats`.

---

## 3. Audit Scores by Domain

| Domain | Score | Notes |
|--------|-------|-------|
| 1. Automation Map | 9/10 | All 3 cron triggers registered; server.js dispatch correct; no duplicate cron routes |
| 2. Cron Engine | 8/10 | Three cron blocks execute independently; Monday guard for weekly aggregation; N+1 in weekly digest (D3) |
| 3. Delivery Automation | 8/10 | Scheduler pickup correct; lock prevents duplicates; missing index (D1) |
| 4. Worker Execution | 9/10 | `ctx.waitUntil` used correctly for each job; nested waitUntil in cron handler is valid |
| 5. Queues + Idempotency | 9/10 | external_post_id idempotency check; email dead-letter after 3 failures |
| 6. Failure + Recovery | 7/10 | Automatic retry backoff correct; content-level manual retry false success (D2) |
| 7. Performance | 6/10 | Missing scheduler index (D1); N+1 in weekly digest (D3) |
| 8. Security | 9/10 | Brand isolation on all delivery queries; auth guards on retry endpoints |
| 9. Repair Only | — | Scope preserved; no new orchestration added |

**Overall: 8.5 / 10 — LOCKED**

---

## 4. Risk Register

| Risk | Severity | Likelihood | Notes |
|------|----------|-----------|-------|
| Scheduler full table scan every minute | MEDIUM | Certain | Fixed by D1 migration. At current scale (<1k jobs) acceptable; at 10k+ becomes a bottleneck. |
| Weekly digest runs daily; cooldown is the only weekly guard | LOW | Low | 168-hour cooldown in `lifecycle_events` is reliable. If cooldown INSERT fails, email is silently skipped (not double-sent). Acceptable fail-safe. |
| `runDailyIntelligence` for 30 brands runs sequentially | LOW | Low | ~30 AI calls per daily cron run. Each can timeout independently. `Promise.allSettled` wrapping in server.js cron block means failures don't cascade. Acceptable at current scale. |
| OAuth token refresh on 4-hour cron; `ensureValidConnection` provides <5min preemptive refresh | LOW | Low | Works correctly. `invalid_grant` → status='revoked'. Edge: connection could expire between 4-hour runs if a token has exactly 8-hour TTL and refresh fails. |

---

## 5. Repairs Applied

| # | Severity | File | Status | Change |
|---|----------|------|--------|--------|
| R1 | MEDIUM | `migrations/129_automation_scheduler_index.sql` | DONE | Added `idx_delivery_jobs_status_scheduled ON delivery_jobs(status, scheduled_at)` |
| R2 | HIGH | `core/delivery/retries.js:34–51` | DONE | Content-level retry query now filters `AND delivery_attempts < 3`; error returned if all jobs exhausted |
| R3 | MEDIUM | `core/lifecycle/cron.js:123–165` | DONE | Folded `posts_this_week` COUNT into outer query via LEFT JOIN — eliminates per-user SELECT |
| R4 | LOW | `core/delivery/execute.js:1–45` | DONE | Removed dead `executeDelivery` stub; kept `getDeliveryStats` (in use) |

---

## 6. Lock Criteria

| Criterion | Status |
|-----------|--------|
| Scheduled work executes | PASS — scheduler pickup, lock, and adapter pipeline work end-to-end |
| Retries recover | PASS — automatic retry backoff correct; manual retry guards attempt limit on both single-job and content-level paths |
| Jobs persist | PASS — delivery_jobs stores all state; delivery_logs is an immutable audit trail |
| No duplicate execution | PASS — poster.js lock pattern prevents double execution |
| Cron runs correctly | PASS — all 3 cron triggers registered; server.js dispatches all handlers |
| Background tasks survive | PASS — `ctx.waitUntil` registered correctly; nested calls are valid in Cloudflare Workers |

**Verdict: LOCKED**

---

## 7. Artifacts

- `ENGINE19_AUTOMATION_CERTIFICATION_REPORT.md` (this file — LOCKED)
- `packages/api/migrations/129_automation_scheduler_index.sql` — scheduler index migration
- `verification/automation_certification.js` — 9-suite certification runner
- Files changed: `retries.js`, `lifecycle/cron.js`, `execute.js`

---

## 8. Known-Good Behaviors (Verified)

- **Scheduler double-execution protection:** `UPDATE ... WHERE id=? AND status IN ('scheduled','pending','failed') AND delivery_attempts < ?` — atomic lock via D1 row changes count
- **25-second delivery timeout:** `Promise.race([adapter.publish(...), new Promise(reject, 25000)])` — applies to all adapters
- **Idempotency via `external_post_id`:** If a job already has an external ID, the adapter call is skipped entirely
- **Retry backoff:** attempt 1 failure → +30s; attempt 2 failure → +3min; attempt 3 → no reschedule
- **Status sync:** `syncContentStatusWithJobs` aggregates all jobs for a content piece before updating content_vault/social_assets — partial multi-platform failures are handled correctly
- **OAuth token refresh:** `runBackgroundRefresh` preemptively refreshes tokens expiring within 8 hours; `ensureValidConnection` provides <5-minute preemptive refresh at delivery time
- **Email dead-letter:** After 3 `email_outbox` failures, status → `dead_letter` — no infinite retry loops
- **`delivery_attempts < 3` guard:** Applied identically in both scheduler SELECT and poster lock UPDATE — no way to exceed max attempts
