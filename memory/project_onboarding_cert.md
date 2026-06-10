---
name: project-onboarding-cert
description: "ENGINE 17 Onboarding & Activation Certification — 6 defects repaired, LOCKED 2026-06-10"
metadata:
  type: project
---

ENGINE 17 — Onboarding & Activation Engine: LOCKED 2026-06-10. 6 defects repaired.

**Why:** The onboarding flow had a schema conflict that made step progress never persist, a wrong-schema progress tracker, 5 dead imports, a silent schedule skip, and a wrong-query readiness check.

**Defects repaired:**

1. **CRITICAL — `onboarding_progress` missing `data` column** (`migrations/128_onboarding_data_column.sql`): Migrations 035 and 066 used `CREATE TABLE IF NOT EXISTS` to add a `data TEXT` column — no-op since table existed from migration 012. Every `updateOnboardingStep()` call failed with SQL column error → 500 → progress never saved → resume always reset to step 1. Fixed: `ALTER TABLE onboarding_progress ADD COLUMN data TEXT`.

2. **HIGH — `markOnboardingStep` used wrong schema** (`core/onboarding/progress.js`): Queried `brand_id` PK + boolean step columns that don't exist in actual table (`user_id` PK). Removed entirely. Callers in `ingest.js` also cleaned up.

3. **HIGH — 5 handlers imported but not wired** (`server.js`): `connectPlatform`, `disconnectPlatform`, `getReadiness` now wired. `ingestWebsite`, `ingestSocial` remain imported but unwired (future activation path).

4. **HIGH — `ScheduleStep` contentId always undefined** (`onboarding/steps/ScheduleStep.jsx`): Social generation API returns no `content_id`. Schedule call always silently skipped. Fixed: save generated content as an approved social asset first via `POST /api/customer/content/social`, then schedule the returned `content_id` via `POST /api/customer/schedule`.

5. **MEDIUM — `readiness.js` queried wrong columns** (`core/onboarding/readiness.js`): `brand_id`, `step`, `industry`, `website`, `platforms_connected` — none exist. Rewritten to use `user_id` PK, `completed_at`, and a separate `brand_platforms` count query.

6. **LOW — `connectPlatform` UPDATE silently no-ops** (`core/onboarding/platforms.js`): UPDATE matched 0 rows if platform row absent. Fixed to INSERT OR REPLACE (UPSERT) pattern.

**Architecture invariants:**
- `onboarding_progress` PK is `user_id` (not `brand_id`). Schema: `user_id, current_step, data TEXT, completed_at, updated_at`.
- Social generation (`/api/customer/ai/generate/social`) does NOT return a `content_id`. Save via `POST /api/customer/content/social` first.
- `scheduleContent` (from `content/scheduling.js`) requires `lifecycle_status = 'approved'` in content_vault. `createSchedule` (from `schedule/schedule.js`) does not — use the latter for onboarding.

**Artifacts:**
- `ENGINE17_ONBOARDING_CERTIFICATION_REPORT.md`
- `verification/onboarding_certification.js`
- `migrations/128_onboarding_data_column.sql`

Related: [[project-experience-cert]] [[project-growth-engine-cert]] [[project-onboarding-refactor]]
