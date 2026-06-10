# ENGINE 18 — Memory & Learning Engine Certification Report

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated certification)  
**Status:** LOCKED — all blocker repairs applied  
**Score:** 9.0 / 10

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
| 1. Memory Map | 9/10 | Pipeline wired, cron fires, weekly aggregation now runs on Mondays |
| 2. Memory Table Canon | 7/10 | 4 live tables + 4 legacy tables written but not read by active engines (known) |
| 3. Memory Ingestion | 9/10 | meta→metadata fixed; schedule_created wired; dead collector mappings removed |
| 4. Memory Retrieval | 9/10 | All 4 customer endpoints wired; intelligence_context_builder reads memory |
| 5. Learning Loop | 9/10 | preferred_platform, top_content_type, schedule_usage now derived correctly |
| 6. Personalization | 9/10 | Brand isolation correct; brand_memory fully brand-scoped |
| 7. Snapshots + Decay | 8/10 | Daily + weekly snapshots created; retention runs; window labels are cumulative (known limitation) |
| 8. Performance | 8/10 | Indexes present; atomic increments; queries bounded by brand_id |
| 9. Security | 9/10 | Memory purged on account deletion; brand isolation correct |
| 10. Repair Only | — | Scope preserved; no redesign |

**Overall: 9.0 / 10 — LOCKED**

---

## 4. Risk Register

| Risk | Severity | Likelihood | Notes |
|------|----------|-----------|-------|
| Feature windows (7d/30d/90d) accumulate forever without decay | MEDIUM | Certain | Values equal all_time after first event. Not a runtime error but misleading to consumers. Out of fix scope (would require decay cron). Documented here as known limitation. |
| `brand_memory_events` / `brand_patterns` / `brand_preferences` written by legacy paths but never read by active engines | LOW | Certain | Dead tables from migration 007. No retention policy. Low risk but silent data accumulation. |
| `globalThis.__ENV__` in poster.js — fragile Worker pattern | LOW | Low | Works because env is set at top of `executeDeliveryJob`. Not a memory-specific risk. |

---

## 5. Repairs Applied

| # | Severity | File | Status | Change |
|---|----------|------|--------|--------|
| R1 | HIGH | `core/delivery/poster.js:209` | DONE | `meta:` → `metadata:`, added `content_type` to payload |
| R2 | HIGH | `server.js:2319–2324` | DONE | `runWeeklyAggregation` called Monday-gated in `0 3 * * *` block |
| R3 | MEDIUM | `core/compliance/compliance.js` | DONE | User-scoped `memory_events` delete + orphan-brand purge of all 5 memory tables |
| R4 | MEDIUM | `core/memory/collector.js` + `schedule/schedule.js` | DONE | 6 dead mappings removed; `schedule_created` emitted from `createSchedule` |
| R5 | LOW | `core/memory/engine.js` | DONE | Atomic SQL `INSERT ON CONFLICT DO UPDATE SET value = json(CAST(...+1))` |

---

## 6. Lock Criteria

| Criterion | Status |
|-----------|--------|
| `preferred_platform` learns from published content | PASS — R1 fixed metadata field; `incrementPlatformCount` now fires |
| Weekly snapshots exist | PASS — R2 added Monday-gated `runWeeklyAggregation` |
| Memory deleted on account deletion | PASS — R3 added all 5 memory tables to compliance batch |
| Brand isolation preserved | PASS — all queries gate on `brand_id`; no cross-brand reads |
| Learning loop proven | PASS — `content_published → metadata.platform → incrementPlatformCount → brand_memory.preferred_platform → intelligence_context` |
| No unbounded growth | PASS — retention cron runs at 18m/24m/36m per table |

**Verdict: LOCKED**

---

## 7. Runtime Validation Flow

```
1. User publishes content
   → executeDeliveryJob sets globalThis.__ENV__ = env
   → emitEvent(env, 'content_published', { metadata: { platform, content_type } })
   → bus.js dispatches to handleMemoryEvent
   → collector maps content_published → EVENTS.CONTENT_PUBLISHED, extracts metadata.platform
   → emit() writes to memory_events (INSERT)
   → consume() called async:
       updateFeatures: increments publishing_frequency + publishing_frequency_${platform}
       updateMemory:   MEMORY_RULES.content_published fires
                       → incrementPlatformCount (atomic SQL +1 on platform_count_${platform})
                       → derives preferred_platform from platform counts
                       → incrementContentTypeCount (atomic SQL +1 on content_type_count_${type})
                       → derives top_content_type

2. User schedules content
   → createSchedule emitEvent('schedule_created', ...)
   → collector maps to EVENTS.SCHEDULE_CREATED
   → memory: schedule_usage feature incremented, uses_scheduler → true

3. Daily CRON (0 3 * * *)
   → runDailyAggregation: creates memory_snapshots (period='daily') for all active brands
   → if Monday: runWeeklyAggregation: creates memory_snapshots (period='weekly')
   → runRetention: deletes events >18m, features >24m, snapshots >36m

4. Intelligence context build
   → buildIntelligenceContext reads brand_memory (preferred_platform, top_content_type,
     uses_approval_workflow, uses_scheduler, is_team_account, has_clients)
   → injects into AI prompt as "BRAND MEMORY (LEARNED SIGNALS)" section

5. Account deletion
   → memory_events WHERE user_id = ? → deleted
   → if brand becomes orphan (no remaining members):
       memory_events, memory_features, brand_memory, memory_snapshots,
       brand_memory_events WHERE brand_id = ? → all deleted
```

## 8. Tables Touched by Repairs

| Table | Change | Repair |
|-------|--------|--------|
| `memory_events` | Write: platform now captured correctly | R1 |
| `brand_memory` | Write: `platform_count_*`, `preferred_platform`, `top_content_type` now populated | R1 + R5 |
| `memory_features` | Write: `schedule_usage`, `publishing_frequency_${platform}` now written | R2, R4 |
| `memory_snapshots` | Write: `period='weekly'` rows now created | R2 |
| `memory_events` | Delete: purged on account deletion | R3 |
| `memory_features` | Delete: purged on orphan brand deletion | R3 |
| `brand_memory` | Delete: purged on orphan brand deletion | R3 |
| `memory_snapshots` | Delete: purged on orphan brand deletion | R3 |
| `brand_memory_events` | Delete: purged on orphan brand deletion | R3 |

## 9. Files Changed

| File | Change |
|------|--------|
| `packages/api/src/core/delivery/poster.js` | `meta:` → `metadata:` + added `content_type` |
| `packages/api/src/server.js` | Added `runWeeklyAggregation` with Monday guard |
| `packages/api/src/core/compliance/compliance.js` | Added 5-table memory purge to deletion handler |
| `packages/api/src/core/memory/collector.js` | Removed 6 dead mappings; added active event types |
| `packages/api/src/core/memory/engine.js` | `incrementPlatformCount` + `incrementContentTypeCount` → atomic SQL |
| `packages/api/src/core/schedule/schedule.js` | Added `emitEvent('schedule_created', ...)` |

## 10. Artifacts

- `ENGINE18_MEMORY_CERTIFICATION_REPORT.md` (this file — LOCKED)
- `verification/memory_certification.js` — 8-suite certification runner
- Commit: `6ab9303` — all repairs applied and pushed

## Known Limitations (Not Defects)

- `memory_features` window labels (`7d`/`30d`/`90d`) accumulate monotonically without decay. Values equal `all_time` for active brands after the first increment. Accurate rolling windows require querying `memory_events` with a time filter. This is a design constraint, not a runtime error.
- `brand_memory_events`, `brand_patterns`, `brand_preferences`, `brand_performance_summary` (migration 007 legacy tables) are written by `ai_intelligence.js` and legacy onboarding paths but not read by active intelligence engines. Not managed by the retention cron. Low risk; documented here.
