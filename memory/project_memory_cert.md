---
name: project-memory-cert
description: "ENGINE 18 Memory & Learning Certification — 5 defects repaired, LOCKED 2026-06-10"
metadata:
  type: project
---

ENGINE 18 — Memory & Learning Engine: LOCKED 2026-06-10. 5 defects repaired.

**Why:** The memory pipeline had a payload field name mismatch that silently disabled all platform preference learning, a weekly aggregation that was never called, compliance data not purged on deletion, and dead event mappings inflating perceived coverage.

**Defects repaired:**

1. **HIGH — `poster.js` used `meta:` instead of `metadata:`** (`core/delivery/poster.js:209`): `emitEvent('content_published', { meta: { platform } })` — `bus.js` destructures `metadata = {}` so `meta` is silently dropped. `platform` was always `undefined` in the memory engine. `incrementPlatformCount` and `incrementContentTypeCount` were never called. `preferred_platform` was never derived. Intelligence context always showed no platform preference. Fixed: `meta:` → `metadata:` and added `content_type` to payload.

2. **HIGH — `runWeeklyAggregation` never called** (`server.js` cron block): Exported from `aggregator.js` but never imported or called anywhere. Weekly snapshots (`period='weekly'`) were never created. Fixed: added Monday-gated call in the `0 3 * * *` cron block.

3. **MEDIUM — Memory not purged on account deletion** (`core/compliance/compliance.js`): `handleDataDeletionRequest` omitted all four memory tables. `memory_events`, `memory_features`, `brand_memory`, `memory_snapshots`, `brand_memory_events` persisted after user deletion. Fixed: added `user_id`-scoped `memory_events` delete to the batch; added orphan-brand brand-level purge for brands that become member-less after deletion.

4. **MEDIUM — 6 dead collector bus mappings** (`core/memory/collector.js`): `content_saved`, `post_scheduled`, `content_rejected`, `report_exported`, `first_post_generated`, `first_post_scheduled` were listed in `BUS_TO_MEMORY` but no code ever called `emitEvent` with these types. Removed the dead entries. Added `audit_generated`, `schedule_created`, `report_exported`, `approval_requested` (which ARE emitted) to replace them.

5. **LOW — Non-atomic `incrementPlatformCount` / `incrementContentTypeCount`** (`core/memory/engine.js`): Used read-then-write JS pattern (read count, add 1, write). Race-prone under concurrent events. Converted to atomic SQL `INSERT ON CONFLICT DO UPDATE SET value = json(CAST(...AS REAL) + 1)` consistent with `features.js`.

**Also wired:** `emitEvent('schedule_created')` from `schedule/schedule.js` so scheduler usage is now recorded in memory.

**Architecture invariants:**
- `bus.js` destructures `{ brand_id, user_id, content_id, metadata = {} }` from payload. Always use `metadata:` field name, never `meta:`.
- Memory pipeline is fire-and-forget: `emitEvent` → `handleMemoryEvent` → `emit` → `consume` (async microtask). Never blocks requests.
- `memory_features` window labels (7d/30d/90d) are cumulative counters, not time-bounded windows. They grow monotonically without decay. This is a known limitation documented in the risk register.
- `brand_memory_events` / `brand_patterns` / `brand_preferences` / `brand_performance_summary` are legacy tables (migration 007). Written by `ai_intelligence.js` and `onboarding.js` but not read by active engines. Not managed by retention cron.

**Artifacts:**
- `ENGINE18_MEMORY_CERTIFICATION_REPORT.md`
- `verification/memory_certification.js`
- No new migration needed (all fixes are code-only)

Related: [[project-onboarding-cert]] [[project-experience-cert]] [[project-growth-engine-cert]]
