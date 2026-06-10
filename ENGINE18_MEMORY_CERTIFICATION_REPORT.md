# ENGINE 18 — Memory & Learning Engine Certification Report

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated certification)  
**Status:** CONDITIONAL — repairs required before lock  
**Score:** 6.0 / 10

---

## 1. Architecture Overview

### Memory Pipeline

```
Platform Action (publish, approve, share, invite)
  ↓
emitEvent(env, eventType, payload)           [lib/bus.js]
  ↓
handleMemoryEvent({ env, eventType, payload }) [memory/collector.js]
  ↓  maps busEvent → { tool, event, metadata }
emit(env, { tool, event, brandId, metadata }) [events/emit.js]
  ↓  writes to memory_events table
  ↓  fire-and-forget
consume(env, event)                           [events/consume.js]
  ├─ updateFeatures(env, event)               [memory/features.js]  → memory_features
  └─ updateMemory(env, event)                 [memory/engine.js]    → brand_memory
  
Daily CRON (0 3 * * *)
  ├─ runDailyAggregation(env)                 [memory/aggregator.js] → memory_snapshots (daily)
  └─ runRetention(env)                        [memory/retention.js]  → deletes old rows
```

### Tables

| Table | Purpose | Retention |
|-------|---------|-----------|
| `memory_events` | Raw event stream (brand_id, tool, event, metadata) | 18 months |
| `memory_features` | Aggregated counters per (brand, feature, window) | 24 months |
| `brand_memory` | Key-value intelligence store (namespace:key → JSON value) | Indefinite |
| `memory_snapshots` | Daily/weekly brand snapshots | 36 months |
| `brand_memory_events` | Legacy append-only factual events (migration 007) | Not managed |
| `brand_patterns` | Legacy derived patterns (migration 007) | Not managed |
| `brand_preferences` | Legacy declared/inferred preferences (migration 007) | Not managed |
| `brand_performance_summary` | Legacy derived read model (migration 007) | Not managed |

### Memory Retrieval Consumers

| Consumer | What it reads | Path |
|----------|---------------|------|
| `intelligence_context_builder.js` | `brand_memory` (6 keys: preferred_platform, top_content_type, etc.) | Used in daily intelligence run |
| `getMemory` (customer API) | `brand_memory` by namespace | `GET /api/customer/memory` |
| `getFeatures` (customer API) | `memory_features` by window | `GET /api/customer/features` |
| `getSnapshot` (customer API) | `memory_snapshots` | `GET /api/customer/memory/snapshot` |
| `getEvents` (customer API) | `memory_events` | `GET /api/customer/memory/events` |
| Admin endpoints | `memory_events`, `memory_features`, `brand_memory` | `GET /api/v1/admin/memory/*` |

---

## 2. Defect Register

### DEFECT 1 — HIGH: `poster.js` uses `meta` instead of `metadata` — platform/content_type learning permanently disabled

**File:** `packages/api/src/core/delivery/poster.js:205`

**Root Cause:**  
`executeDeliveryJob` emits:
```js
await emitEvent(globalThis.__ENV__, 'content_published', {
  brand_id: job.brand_id,
  user_id:  job.user_id,
  content_id: job.content_id,
  meta: { platform: job.platform }   // ← WRONG FIELD NAME
});
```

`bus.js` destructures the payload as:
```js
const { brand_id, user_id, content_id, metadata = {} } = payload;
```
The field `meta` is not destructured — `metadata` defaults to `{}`. The platform is silently dropped.

`collector.js` for `content_published`:
```js
extract: p => ({ metadata: { platform: p.metadata?.platform, ... } })
```
`p.metadata.platform` is `undefined`.

`engine.js` MEMORY_RULES for `content_published`:
```js
if (metadata?.platform) {          // always false — platform is undefined
  await incrementPlatformCount(...) // never called
}
if (metadata?.content_type) {      // always false
  await incrementContentTypeCount(...) // never called
}
```

**Impact:**  
- `preferred_platform` is **never derived** from publish activity
- `platform_count_*` keys are never written to `brand_memory`
- `top_content_type` is never derived
- `intelligence_context_builder.js` reads `preferred_platform` for AI context — always blank
- The most important learning signal (what platform the brand publishes on) is permanently dead

**Fix:** Change `meta:` to `metadata:` in `poster.js:209`.

---

### DEFECT 2 — HIGH: `runWeeklyAggregation` never called — weekly snapshots never created

**File:** `packages/api/src/core/memory/aggregator.js` / `src/server.js`

**Root Cause:**  
`aggregator.js` exports both `runDailyAggregation` and `runWeeklyAggregation`. The daily CRON block in `server.js` imports and calls `runDailyAggregation` but never imports or calls `runWeeklyAggregation`.

```js
// server.js:2319 — only daily called
const { runDailyAggregation } = await import("./core/memory/aggregator.js");
await runDailyAggregation(env);
// runWeeklyAggregation ← NEVER CALLED
```

**Impact:**  
- `memory_snapshots` with `period = 'weekly'` are never created
- `getSnapshot(period='weekly')` always returns null → `{ data: null, message: 'No snapshot available yet' }`
- Intelligence can't use weekly trend patterns

**Fix:** Add `runWeeklyAggregation` call in the daily cron block (once per week check via day-of-week guard, or add a separate `0 3 * * 1` weekly cron).

---

### DEFECT 3 — MEDIUM: Memory tables not purged on account deletion — compliance risk

**File:** `packages/api/src/core/compliance/compliance.js`

**Root Cause:**  
`handleDataDeletionRequest` deletes: `social_connections`, `content_drafts`, `brand_users`, user record.

Does NOT delete:
- `memory_events` (brand_id + user_id — contains behavioral data)
- `memory_features` (brand_id — contains aggregated usage counts)
- `brand_memory` (brand_id — contains learned intelligence)
- `memory_snapshots` (brand_id — contains full behavioral snapshots)
- `brand_memory_events` (brand_id — legacy append-only events)

**Impact:** After account deletion, user's behavioral data persists indefinitely in all memory tables. This creates GDPR / privacy compliance risk.

**Fix:** Add memory table deletion to the compliance batch, scoped by `user_id` for event tables and (if the brand has no other members) by `brand_id` for aggregated tables.

---

### DEFECT 4 — MEDIUM: 6 collector mappings listen to events that are never emitted — dead code

**File:** `packages/api/src/core/memory/collector.js`

**Dead mappings:**

| Bus eventType | Status | Impact |
|---------------|--------|--------|
| `content_saved` | Never emitted | No content_saved memory events |
| `post_scheduled` | Never emitted | `schedule_usage` feature never updated via this path |
| `content_rejected` | Never emitted | Rejection signal absent |
| `report_exported` | Never emitted | `report_engagement = 'high'` never derived |
| `first_post_generated` | Only from frontend `trackOnboardingEvent` via `POST /api/customer/growth/action` — not via `emitEvent` | Onboarding completion signal may not fire |
| `first_post_scheduled` | Same — frontend only | Schedule completion signal unreliable |

**Note:** `schedule_created` IS handled by `emit.js` EVENTS enum and the memory engine has a rule for it. But `emitEvent('schedule_created')` is never called — only `emitEvent` from poster.js for `content_published`.

**Impact:** Memory coverage is much narrower than intended. Learning primarily occurs from: approvals, team invites, and report shares. Content publishing learning only partially works (event is captured, but platform/type metadata is lost — see Defect 1).

**Fix:** Remove or document dead mappings. Add `emitEvent('schedule_created', ...)` from `createSchedule` handler (server.js:1462). This is the only one likely to be high-value.

---

### DEFECT 5 — LOW: `incrementPlatformCount` in engine.js is non-atomic (read-then-write)

**File:** `packages/api/src/core/memory/engine.js`

**Root Cause:**  
```js
const row = await db.prepare(`SELECT value FROM brand_memory ...`).first();
const count = (parseFloat(row?.value || '0') || 0) + 1;  // read
await upsertMemory(..., count, ...);                        // write
```
This is a read-modify-write pattern. If two `content_published` events fire concurrently (two platforms publishing simultaneously), both would read the same count (e.g., 5), both would write 6, losing one increment.

**Impact:** Low in practice (Cloudflare Workers are single-threaded per isolate). However, correctness risk exists under high concurrency or batch delivery jobs.

By contrast, `features.js` `upsertFeature` correctly uses an atomic SQL increment:
```sql
value = json(CAST(CAST(json_extract(value, '$') AS REAL) + ? AS TEXT))
```

**Fix:** Convert `incrementPlatformCount` and `incrementContentTypeCount` to use atomic SQL increment in `upsertMemory`, consistent with `features.js`.

---

## 3. Audit Scores by Domain

| Domain | Score | Notes |
|--------|-------|-------|
| 1. Memory Map | 7/10 | Pipeline wired, cron fires, but weekly aggregation dead |
| 2. Memory Table Canon | 7/10 | 4 live tables + 4 legacy tables that are written but never read |
| 3. Memory Ingestion | 4/10 | Critical: content_published metadata lost (meta vs metadata), 6 dead bus mappings |
| 4. Memory Retrieval | 8/10 | All 4 customer endpoints wired; intelligence_context_builder reads memory |
| 5. Learning Loop | 4/10 | Loop technically closed but core signal (platform preference) always null |
| 6. Personalization | 7/10 | Brand isolation correct; brand_memory is brand-scoped throughout |
| 7. Snapshots + Decay | 6/10 | Daily snapshots work; weekly never fires; retention runs but windows misleading |
| 8. Performance | 8/10 | Indexes present; queries bounded by brand_id; all_time window can grow |
| 9. Security | 6/10 | Memory not purged on deletion (compliance gap); isolation otherwise correct |
| 10. Repair Only | — | Scope preserved |

**Overall: 6.0 / 10 — CONDITIONAL**

---

## 4. Risk Register

| Risk | Severity | Likelihood | Notes |
|------|----------|-----------|-------|
| Feature windows (7d/30d/90d) accumulate forever without decay | MEDIUM | Certain | Values equal all_time after first event. Not a runtime error but misleading to consumers. Out of fix scope (would require decay cron). Documented here as known limitation. |
| `brand_memory_events` / `brand_patterns` / `brand_preferences` written by legacy paths but never read by active engines | LOW | Certain | Dead tables from migration 007. No retention policy. Low risk but silent data accumulation. |
| `globalThis.__ENV__` in poster.js — fragile Worker pattern | LOW | Low | Works because env is set at top of `executeDeliveryJob`. Not a memory-specific risk. |

---

## 5. Repairs Required

| # | Severity | File | Action |
|---|----------|------|--------|
| R1 | HIGH | `core/delivery/poster.js:209` | Change `meta:` to `metadata:` in `content_published` emitEvent call |
| R2 | HIGH | `server.js:2316–2327` | Add `runWeeklyAggregation` call in daily cron with day-of-week guard (Mondays) |
| R3 | MEDIUM | `core/compliance/compliance.js` | Add memory table deletion to compliance batch |
| R4 | MEDIUM | `core/memory/collector.js` | Remove 6 dead bus mappings; wire `schedule_created` via emitEvent in schedule handler |
| R5 | LOW | `core/memory/engine.js` | Convert `incrementPlatformCount` and `incrementContentTypeCount` to atomic SQL |

---

## 6. Lock Criteria

| Criterion | Current | After Repairs |
|-----------|---------|---------------|
| Memory persists after events | PASS (for 4 event types) | PASS (expanded) |
| Learning occurs (preferred_platform derived) | FAIL — always null | PASS |
| Recommendations adapt (intelligence reads memory) | PARTIAL — reads memory but platform always null | PASS |
| Brand isolation holds | PASS | PASS |
| Memory retrieval works | PASS | PASS |
| No unbounded growth | PASS (retention runs) | PASS |

**Verdict: CONDITIONAL — engine unlocks after R1–R3 are applied. R4–R5 are improvements.**

---

## 7. Artifacts

- `ENGINE18_MEMORY_CERTIFICATION_REPORT.md` (this file)
- `verification/memory_certification.js` (to be created post-repair)
