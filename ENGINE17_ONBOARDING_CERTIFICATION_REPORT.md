# ENGINE 17 — Onboarding & Activation Engine Certification Report

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated certification)  
**Status:** CONDITIONAL — repairs required before lock  
**Score:** 5.5 / 10

---

## 1. Architecture Overview

### Activation Funnel (7 steps)

```
Register → CreateBrand → Platforms → AuditOrSkip → Generate → Schedule → Complete
                ↓                                       ↓
          brand created,                       generatedContent in
          JWT updated                          step data (memory only)
```

### Key Files

| Layer | File | Role |
|-------|------|------|
| Backend | `core/onboarding/onboarding_v2.js` | Step read/write, complete |
| Backend | `core/onboarding/progress.js` | `markOnboardingStep` (legacy, wrong schema) |
| Backend | `core/onboarding/readiness.js` | Brand readiness query (unwired) |
| Backend | `core/onboarding/ingest.js` | Website/social ingest (unwired) |
| Backend | `core/onboarding/platforms.js` | Platform list/save/connect |
| Backend | `auth/customer.js` | Register (no brand) / Login (brand_id from brand_users) |
| Backend | `core/brands/brands.js` | createBrand, switchBrand |
| Frontend | `contexts/OnboardingContext.jsx` | Step state, updateStep, completeOnboarding |
| Frontend | `components/onboarding/steps/*.jsx` | UI per step |
| DB | migration 012 | `onboarding_progress (user_id PK, current_step, completed_at, updated_at)` |
| DB | migration 035 | `CREATE TABLE IF NOT EXISTS onboarding_progress` with `data TEXT` — **NO-OP** |

### Route Inventory (server.js)

| Method | Path | Handler | Status |
|--------|------|---------|--------|
| GET | `/api/customer/onboarding` | `getOnboarding` | WIRED |
| POST | `/api/customer/onboarding/step` | `updateOnboardingStep` | WIRED (broken) |
| POST | `/api/customer/onboarding/market` | `updateMarketContext` | WIRED |
| POST | `/api/customer/onboarding/complete` | `completeOnboarding` | WIRED |
| GET | `/api/customer/onboarding/platforms` | `listPlatforms` | WIRED |
| POST | `/api/customer/onboarding/platforms` | `savePlatforms` | WIRED |
| — | — | `connectPlatform` | IMPORTED, NOT WIRED |
| — | — | `disconnectPlatform` | IMPORTED, NOT WIRED |
| — | — | `getReadiness` | IMPORTED, NOT WIRED |
| — | — | `ingestWebsite` | IMPORTED, NOT WIRED |
| — | — | `ingestSocial` | IMPORTED, NOT WIRED |

---

## 2. Defect Register

### DEFECT 1 — CRITICAL: `onboarding_progress` missing `data` column — step progress never persisted

**File:** `packages/api/migrations/` (schema gap)  
**Affects:** `core/onboarding/onboarding_v2.js` → `updateOnboardingStep`

**Root Cause:**  
Migration 012 creates `onboarding_progress` with schema:
```sql
CREATE TABLE onboarding_progress (
  user_id TEXT PRIMARY KEY,
  current_step INTEGER DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT
);
-- NO `data` column
```

Migration 035 attempts to add the `data` column via:
```sql
CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id TEXT PRIMARY KEY,
  current_step INTEGER,
  data TEXT,        -- ← intended addition
  ...
);
```

`CREATE TABLE IF NOT EXISTS` is a **no-op** when the table already exists in SQLite/D1. The `data` column is **never created**.

Migration 066 repeats the same pattern — also a no-op.

**Impact:**  
Every call to `updateOnboardingStep()` executes:
```sql
INSERT INTO onboarding_progress (user_id, current_step, data, updated_at)
ON CONFLICT (user_id) DO UPDATE SET current_step = ?, data = ?, updated_at = ?
```
This fails with `SQLite error: table onboarding_progress has no column named data` → 500.

The frontend catches the error silently and still advances `step` in local state. On page refresh or any interruption, `getOnboarding()` returns `current_step = 0` (never saved) — user always restarts at step 1.

**Fix:** Add migration `ALTER TABLE onboarding_progress ADD COLUMN data TEXT;`

---

### DEFECT 2 — HIGH: `markOnboardingStep` uses wrong schema — all calls fail

**File:** `packages/api/src/core/onboarding/progress.js`

**Root Cause:**  
`markOnboardingStep(env, brandId, step)` uses a v1 schema that does not match the actual table:
```js
await db.prepare(`
  INSERT INTO onboarding_progress (brand_id, ${step})
  VALUES (?, 1)
  ON CONFLICT (brand_id) DO UPDATE SET ${step} = 1
`).bind(brandId).run();
```
- Column `brand_id` does not exist (actual PK is `user_id`)  
- Step boolean columns (`brand_identity`, `business_type`, etc.) do not exist

All callers (`ingest.js` → `markOnboardingStep`) fail with column errors.

**Impact:** Silent failure in ingest flows, no step recorded, no meaningful error surfaced.

**Fix:** Remove `markOnboardingStep` entirely (only called by unwired ingest handlers). Ingest handlers should be wired with `updateOnboardingStep` or remain unwired.

---

### DEFECT 3 — HIGH: 5 handlers imported but not wired — all produce 404

**File:** `packages/api/src/server.js`

**Handlers:** `connectPlatform`, `disconnectPlatform`, `getReadiness`, `ingestWebsite`, `ingestSocial`

All five are imported at the top of server.js but have no corresponding route registration block. Any client call to these endpoints returns 404.

**Impact:**  
- Platform connection cannot be completed via API (`connectPlatform`)  
- Platform disconnection is inaccessible  
- Readiness check never runs  
- Website/social ingest pipelines are unreachable  

**Fix:** Wire the three operationally critical routes: `connectPlatform` (POST), `disconnectPlatform` (DELETE or POST), `getReadiness` (GET). Remove or retain `ingestWebsite`/`ingestSocial` based on whether they're needed at activation time.

---

### DEFECT 4 — HIGH: `ScheduleStep` `contentId` always undefined — first schedule never fires

**File:** `packages/dashboard/src/components/onboarding/steps/ScheduleStep.jsx`

**Root Cause:**  
`ScheduleStep` attempts to retrieve the generated post's ID:
```js
const contentId = data.generatedContent?.content_id;
if (contentId) {
  await apiRequest("/api/customer/schedule", { ... });
}
```

Two cascading failures:
1. The AI social generation endpoint (`POST /api/customer/ai/generate/social`) returns:
   ```json
   { "posts": [...], "brand_name": "..." }
   ```
   There is **no `content_id`** in the response. Drafts are not saved during generation.
2. Even if `generatedContent` held a `content_id`, Defect 1 means `updateOnboardingStep` always 500s — so `data.generatedContent` is never written to the backend and is lost on refresh.

**Impact:** The schedule block always silently skips. `trackOnboardingEvent("first_post_scheduled")` never fires. The "first schedule" AHA moment does not complete.

**Fix:** The `ScheduleStep` must save the generated content as a draft first (via `POST /api/customer/content` or pass content directly to the schedule endpoint), then use the returned `content_id` to schedule. Until Defect 1 is resolved, in-memory `data.generatedContent` can bridge this within the same session.

---

### DEFECT 5 — MEDIUM: `readiness.js` queries non-existent columns — endpoint broken

**File:** `packages/api/src/core/onboarding/readiness.js`

**Root Cause:**  
`getReadiness()` queries:
```sql
SELECT completed, step, industry, website, platforms_connected
FROM onboarding_progress WHERE brand_id = ?
```
- `brand_id` column does not exist (PK is `user_id`)
- `completed`, `step`, `industry`, `website`, `platforms_connected` columns do not exist
- No route is wired to this handler anyway (Defect 3)

**Impact:** If wired, would always 500. Low urgency since unwired, but must be corrected before routing.

**Fix:** Rewrite query against actual table schema or remove file. The actual readiness check should query `onboarding_progress.completed_at IS NOT NULL` with `user_id = ?`.

---

### DEFECT 6 — LOW: `connectPlatform` UPDATE silently no-ops if row absent

**File:** `packages/api/src/core/onboarding/platforms.js`

**Root Cause:**  
```js
await db.prepare(`
  UPDATE brand_platforms SET status = 'connected', ... WHERE brand_id = ? AND platform = ?
`).bind(...).run();
```
If `savePlatforms` was never called first (row doesn't exist), the UPDATE matches 0 rows — no error, no row created. Platform appears connected in-memory but is not recorded.

**Impact:** Low — `savePlatforms` is called earlier in the onboarding flow. Only affects out-of-order API calls or retry scenarios.

**Fix:** Convert to INSERT OR REPLACE / UPSERT pattern.

---

## 3. Audit Scores by Domain

| Domain | Score | Notes |
|--------|-------|-------|
| 1. Activation Map | 6/10 | Brand create → complete works; ingest, readiness dead |
| 2. Onboarding Engine | 2/10 | `updateOnboardingStep` always 500 — core broken |
| 3. Brand Activation | 8/10 | Brand create + JWT update works correctly |
| 4. Connection Activation | 5/10 | `savePlatforms` wired; `connectPlatform` unwired |
| 5. First Value | 4/10 | Generation works; schedule silently skips every time |
| 6. Experience Handoff | 7/10 | `completeOnboarding` wired; `completed_at` set; dashboard unlocks |
| 7. Tracking | 5/10 | `trackOnboardingEvent` fires in frontend; backend growth actions partial |
| 8. Performance | 7/10 | No N+1 issues in critical paths |
| 9. Security | 8/10 | `requireAuth` on all routes; brand isolation via JWT |
| 10. Repair Only | — | Mode preserved |

**Overall: 5.5 / 10 — CONDITIONAL**

---

## 4. Repairs Required

| # | Severity | File | Action |
|---|----------|------|--------|
| R1 | CRITICAL | `migrations/128_onboarding_data_column.sql` | `ALTER TABLE onboarding_progress ADD COLUMN data TEXT` |
| R2 | HIGH | `core/onboarding/progress.js` | Remove `markOnboardingStep` (wrong schema, dead callers) |
| R3 | HIGH | `server.js` | Wire `connectPlatform`, `disconnectPlatform`, `getReadiness` routes |
| R4 | HIGH | `onboarding/steps/ScheduleStep.jsx` | Save draft first, use returned `content_id` for schedule call |
| R5 | MEDIUM | `core/onboarding/readiness.js` | Rewrite query with `user_id` PK and real column names |
| R6 | LOW | `core/onboarding/platforms.js` | `connectPlatform` → UPSERT instead of UPDATE |

---

## 5. Lock Criteria

| Criterion | Current | After Repairs |
|-----------|---------|---------------|
| User reaches first value (generated + scheduled post) | FAIL — schedule silently skipped | PASS |
| Resume works after refresh | FAIL — step always resets to 1 | PASS |
| Dashboard unlocks after complete | PASS | PASS |
| Platform connect succeeds | PARTIAL — savePlatforms wired, connectPlatform 404 | PASS |
| No dead onboarding states | FAIL — 5 unwired handlers, wrong-schema progress | PASS |

**Verdict: CONDITIONAL — engine unlocks after R1–R4 are applied.**

---

## 6. Artifacts

- `ENGINE17_ONBOARDING_CERTIFICATION_REPORT.md` (this file)
- `verification/onboarding_certification.js` (to be created post-repair)
- Migration: `packages/api/migrations/128_onboarding_data_column.sql`
