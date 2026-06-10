# ENGINE 23 — Platform Operations & Governance Audit

**Mode:** READ ONLY — No fixes, no migrations, no refactors, no commits  
**Date:** 2026-06-10  
**Scope:** Production governance readiness at scale  
**Verdict:** NOT CERTIFIED — 4/10

---

## Executive Summary

The platform has a structurally sound operations skeleton: 40+ admin routes, RBAC separation, three cron schedules, a compliance audit log, and an admin audit log. Under load, however, the operational signals that operators would rely on to detect, diagnose, and respond to incidents are largely non-functional. Three core observability instruments — the system events table, the delivery metrics table, and the platform health registry — are never written to at runtime. The admin audit trail exists but has no query route, making it invisible to operators. No kill switches, circuit breakers, or maintenance-mode controls exist anywhere. The platform can operate today at low scale, but operators would be flying blind during an incident.

---

## Phase 1 — Operations Surface Map

### Admin route surface (all protected by `requireAdminAuth`)

| Category | Routes |
|---|---|
| Billing | overview, mrr-history |
| Users | list (paginated), detail, toggle, verify |
| Campaigns / Emails | list campaigns, campaign content, email campaigns, messages, templates |
| Pricing | GET, POST, PATCH, toggle |
| Customers | list, detail, toggle, verify |
| Support | threads, requests list, request update, message send, broadcast |
| Compliance | deletions, exports, audit-log |
| System | status, events |
| Operations | health |
| Integrations | diagnostics, backfill, backfill-status |
| Attribution | diagnostics |
| Rewards | overview |
| Certification | matrix, delivery-history, validate-media |
| Platform Test | run, connections |
| Blog | CRUD (4 routes) |
| Promotions | list, create |
| Stubs | memory, seo/overview, automation/rules, ml/health, experiments |

### Internal routes (admin JWT required)
- `POST /api/internal/performance/ingest`
- `POST /api/internal/intelligence/run`
- `POST /api/internal/delivery/run`

### Cron schedule
| Expression | Jobs |
|---|---|
| `* * * * *` | `runDeliveryScheduler`, `runEmailWorker` |
| `0 3 * * *` | `runLifecycleCron`, `runDailyIntelligence` (up to 30 brands), `processPendingDeletions`, memory aggregation + retention, analytics backfill (GA4, GSC) |
| `0 */4 * * *` | `runBackgroundRefresh` (OAuth token rotation) |

### Public endpoints
- `GET /api/health` — static `{status: "ok", version: "1.1.1"}` (no real check)
- `GET /api/v1/pricing` — public pricing, no auth
- `POST /api/webhooks/yoco` — Yoco payment webhook, no auth (webhook body-authenticated)

---

## Phase 2 — Admin Authority & RBAC

### Auth model

`requireAdminAuth` validates: Bearer token → verifyJWT → `is_admin: true` → role in `['super_admin','admin','ops','operations','support']`. Customer tokens (no `is_admin`) are explicitly rejected at the flag check.

### Permission model (`auth/permissions.js`)

| Role | Permissions |
|---|---|
| `super_admin` | `*` |
| `admin` | `*` (legacy alias — identical to super_admin) |
| `ops` / `operations` | users:read/write, analytics:read, billing:read, blog:write, support:read/write, pricing:read, messaging:write, operations:read |
| `support` | users:read, support:read/write, reports:read, connections:read, messaging:write |

### DEFECT (High) — Role granularity not enforced beyond pricing:write

`hasPermission` is called on exactly **2 routes** in the entire admin surface: `POST /api/v1/admin/pricing` and `PATCH /api/v1/admin/pricing/:id/toggle`. Every other route — including destructive operations (user toggle, force-verify, platform-test, broadcast, blog delete, integrations backfill) — enforces only `is_admin: true`. A `support` role user can:
- Run `POST /api/v1/admin/platform-test` (fires real posts to live social connections)
- Trigger `POST /api/v1/admin/integrations/backfill` (rewrites analytics history)
- Send `POST /api/v1/admin/support/broadcast` (messages all users)
- Read billing overview and MRR history (billing:read not checked)

The PERMISSIONS map defines what each role should be able to do, but the routes don't enforce it.

### DEFECT (Critical) — User disable does not revoke active JWTs

`toggleAdminUserStatus` sets `is_active = 0` in the `users` table. JWTs issued to that user remain cryptographically valid until their expiry (typically hours or days). The customer auth middleware (`requireAuth`) checks the JWT signature but does not re-query `is_active` from the database. A disabled account continues to make API calls until tokens expire.

---

## Phase 3 — Operations Controls

### Kill switches: none

There is no mechanism to:
- Disable a specific cron job without a deployment
- Pause delivery for a specific platform (e.g. when Instagram is down)
- Put the platform in maintenance mode
- Disable AI generation globally (e.g. when Groq is degraded)
- Pause new user registrations
- Throttle specific brands consuming excessive resources

The only lever available to operators is a full Cloudflare Worker redeployment. This means incident response requires a code change.

### Feature flags: stub

`GET /api/v1/admin/experiments` returns `{experiments: []}` hardcoded. No feature flag storage, evaluation, or toggle UI exists.

### Platform test sandbox: unsafe for support role

`POST /api/v1/admin/platform-test` decrypts live OAuth tokens and calls the real social platform adapter with the provided caption and media. It produces actual posts on actual accounts. It requires no confirmation, fires no audit log entry, and is accessible to the `support` role.

---

## Phase 4 — Incident Management

### What exists

- `admin_system_events` table: severity (`info|warning|critical`), source, message, metadata, created_at
- `GET /api/v1/admin/system/events` — queries admin_system_events ordered by created_at DESC, LIMIT 100
- `GET /api/v1/admin/system/status` — live delivery_jobs aggregate + last 20 system events
- `GET /api/v1/admin/operations/health` — live counts: ai_generations (last hour), oauth failures (last 24h from admin_system_events), delivery failures (last hour)

### DEFECT (Critical) — writeSystemEvent is never called from application code

`writeSystemEvent` is defined in `api/admin/observability.js` and exported. It is imported nowhere in `server.js` or any core module. The `admin_system_events` table is seeded by migrations but never written to at runtime.

Consequence:
- `getOperationsHealth.oauth_failures_24h` always returns 0 (queries an empty table)
- `getAdminSystemStatus.recent_events` always returns `[]`
- No OAuth failures, delivery failures, cron errors, or billing events are ever recorded
- Operators have no signal of platform degradation short of checking D1 directly

### No alerting or escalation

There is no webhook, email, or external notification when error thresholds are crossed. Cron errors are written to `console.error` only, which is visible in Cloudflare Workers logs but not surfaced to any ops dashboard or pager.

---

## Phase 5 — Auditability

### Admin audit log (`admin_audit_logs`)

Table: `id, admin_id, action, target_type, target_id, metadata_json, ip_address, user_agent, created_at`

`logAdminAction` is called from:

| Action | File |
|---|---|
| `toggle_user_status` | `api/admin/users.js` |
| `force_verify_user` | `api/admin/users.js` |
| `create_plan`, `toggle_plan`, `update_plan` | `server.js` |
| `create_promotion` | `server.js` |
| `send_message`, `broadcast_message` | `server.js` |
| `update_support_request` | `core/support/requests.js` |

### DEFECT (Critical) — admin_audit_logs has no query route

`GET /api/v1/admin/compliance/audit-log` calls `adminComplianceAuditLog` which queries `compliance_audit_log` (customer-facing actions). There is no route that queries `admin_audit_logs`. The admin actions table is write-only from an ops perspective — operators cannot retrieve or search it without direct D1 access.

### DEFECT (High) — Admin write operations not audited

The following destructive admin operations do not call `logAdminAction`:

| Operation | Route |
|---|---|
| Campaign create | `POST /api/v1/admin/campaigns` |
| Email campaign create/send | `POST /api/v1/admin/emails/campaigns` |
| Blog post create | `POST /api/v1/admin/blog` |
| Blog post update | `PATCH /api/v1/admin/blog/:id` |
| Blog post delete | `DELETE /api/v1/admin/blog/:id` |
| Analytics backfill trigger | `POST /api/v1/admin/integrations/backfill` |
| Platform sandbox test | `POST /api/v1/admin/platform-test` |
| Promotion creation | `POST /api/v1/admin/promotions` (audited ✓) |

Blog mutations and analytics backfills can have platform-wide effects and leave no audit trail.

### Compliance audit log (customer actions)

`compliance_audit_log` is separate, queryable, paginated, and IP-masked. This layer is correct. The gap is exclusively on the admin side.

---

## Phase 6 — Moderation

### Content moderation: none

There is no mechanism for:
- Users to report content or accounts
- Admins to flag or review content
- Automated detection of policy violations
- Content quarantine or takedown
- Brand suspension independent of account disable

The platform operates under an implicit trust model: all content generated and scheduled by authenticated users is assumed compliant.

### Account disable gap

`toggleAdminUserStatus` disables the account but does not:
- Cancel pending delivery jobs in the queue
- Revoke active JWTs (covered above)
- Remove platform connections that could continue publishing via cron

A disabled user's scheduled posts will continue to be delivered by the cron scheduler because delivery_jobs are processed regardless of the originating user's `is_active` state.

---

## Phase 7 — Data Operations

### Retention

| Data | Retention |
|---|---|
| `memory_events` | `runRetention` (cron) — configurable window |
| `deletion_requests` | 7-day grace, then purged by `processPendingDeletions` |
| `ai_generations` | No retention policy |
| `admin_system_events` | No retention policy |
| `admin_audit_logs` | No retention policy |
| `compliance_audit_log` | No retention policy |
| `delivery_jobs` | No retention policy |

### DEFECT (Medium) — System and audit tables grow unbounded

`admin_system_events`, `admin_audit_logs`, and `compliance_audit_log` have no TTL, archival, or deletion policy. D1 has a per-database row and storage limit. At scale, these tables will grow without bound and may need emergency truncation.

### Manual purge: none

There is no admin endpoint to purge specific user data, bulk-delete delivery history, or force-expire AI generation records. All data operations are either automated (cron) or compliance-triggered (deletion request flow).

---

## Phase 8 — Observability

### Health endpoints

| Endpoint | What it checks |
|---|---|
| `GET /api/health` | Returns static `{status: "ok", version: "1.1.1"}` — no DB ping, no dependency check |
| `GET /api/v1/admin/system/status` | Live delivery_jobs aggregate (24h window) + last 20 system events |
| `GET /api/v1/admin/operations/health` | AI generations (1h), oauth failures (24h from dead table), delivery failures (1h) |

### DEFECT (High) — admin_delivery_metrics never populated

`aggregateDeliveryMetrics` in `api/admin/delivery-metrics.js` is defined, exported, and contains correct logic (inserts daily delivery stats from delivery_jobs). It is imported nowhere and called nowhere. The `admin_delivery_metrics` table stays permanently empty. `getPlatformHealth` (observability-api.js) queries it and returns empty arrays.

### DEFECT (Medium) — platform_health never updated at runtime

`platform_health` is initialized in migration 043 with 4 platforms set to `'healthy'`. No source file in `packages/api/src/` updates this table. The `.wrangler` dev bundles contain UPDATE statements (indicating the poster once updated it) but these are compiled artifacts from a prior version of poster.js that no longer exists. Operators viewing platform health will always see the seed values.

### Logging model

All runtime logging uses `console.log` / `console.error`. Cloudflare Workers tail logs are ephemeral. There is no structured log format, no log correlation IDs, no request tracing. Debugging a production incident requires re-deploying with added logging or enabling Workers tail in real-time.

---

## Phase 9 — Performance

### Pagination coverage

| Query | Status |
|---|---|
| Admin users | ✓ Paginated (50/page, LIMIT+OFFSET) |
| Admin compliance routes | ✓ Paginated (LIMIT/OFFSET added ENGINE 22) |
| Admin support threads | LIMIT 100, no pagination |
| Admin system events | LIMIT 100, no pagination |
| Admin rewards | LIMIT 100–200 hardcoded, no pagination |
| Admin promotions | LIMIT 50, no pagination |
| Memory events (admin) | Configurable up to 500 |

### DEFECT (High) — integrations-diagnostics is O(brands × connections)

`getIntegrationsDiagnostics` loads ALL brands, then ALL social_connections, then performs per-brand lookups for last publish date and last metrics pull via sub-queries and Promise.all. With 1,000 brands and 5,000 connections, this is a sequential per-brand Promise.all expanding to hundreds of queries. No limit on brands fetched.

### DEFECT (Medium) — attribution-diagnostics has N+1 per brand

`getAttributionDiagnostics` loads all brands then `Promise.all(brands.map(async brand => ...))` fires one compound query per brand. At scale this creates a D1 request storm. No pagination or brand_id filter is accepted.

---

## Phase 10 — Dead Ops

### Dead files (never imported by server.js)

| File | Exports | Status |
|---|---|---|
| `api/admin/delivery-metrics.js` | `aggregateDeliveryMetrics` | Never imported, never called |
| `api/admin/campaigns.js` | `getCampaignROI` | Never imported; uses `{db}` named import which doesn't match `lib/db.js` exports — would throw on first call |

### Admin stub routes (return hardcoded empty responses)

| Route | Returns |
|---|---|
| `GET /api/v1/admin/memory` | `{brands: [], total: 0}` |
| `GET /api/v1/admin/seo/overview` | `{pages: [], coverage: 0}` |
| `GET /api/v1/admin/automation/rules` | `{rules: []}` |
| `GET /api/v1/admin/ml/health` | `{status: "ok", models: []}` |
| `GET /api/v1/admin/experiments` | `{experiments: []}` |

These routes are authenticated and return 200 — they silently mislead operators into thinking these systems are empty or healthy. There is no indicator that they are stubs.

### /api/v1/admin/overview aliased to billing

`GET /api/v1/admin/overview` calls `billingOverview(env)` — identical to `GET /api/v1/admin/billing/overview`. The dashboard "overview" is a billing snapshot, not an operational overview. There is no true platform-wide ops dashboard.

---

## Defect Registry

### Critical (3)

| # | Defect | Location |
|---|---|---|
| C1 | `writeSystemEvent` never called — `admin_system_events` is permanently empty; all ops health signals that depend on it return zero | `api/admin/observability.js` defined but never imported |
| C2 | `admin_audit_logs` has no query route — admin actions are written but invisible to operators without direct D1 access | No route exists |
| C3 | `toggleAdminUserStatus` does not invalidate active JWTs — disabled accounts continue making authenticated API calls | `api/admin/users.js:toggleAdminUserStatus` |

### High (5)

| # | Defect | Location |
|---|---|---|
| H1 | `aggregateDeliveryMetrics` never wired to cron — `admin_delivery_metrics` stays empty; delivery trend graphs return nothing | `api/admin/delivery-metrics.js` (dead) |
| H2 | No kill switch, maintenance mode, or per-platform pause control | Platform-wide |
| H3 | `platform_health` never updated at runtime — always shows initial seed values | `migrations/043` seeded; no live update |
| H4 | Blog, campaign, email, backfill, and platform-test admin operations not audited | Multiple routes |
| H5 | Role granularity not enforced: `hasPermission` called only for `pricing:write`; support role can run platform tests and analytics backfills | `server.js` admin block |

### Medium (4)

| # | Defect | Location |
|---|---|---|
| M1 | `admin_system_events`, `admin_audit_logs`, `compliance_audit_log` have no retention policy — grow unbounded | No cron retention |
| M2 | `integrations-diagnostics` loads all brands × connections with no limit — O(N×M) at scale | `api/admin/integrations-diagnostics.js` |
| M3 | `attribution-diagnostics` fires N+1 queries (one Promise.all per brand) with no pagination | `api/admin/attribution-diagnostics.js` |
| M4 | Disabled users' pending delivery jobs continue executing — scheduled posts fire after account disable | `core/delivery/scheduler.js` |

### Low (4)

| # | Defect | Location |
|---|---|---|
| L1 | Five admin stub routes return hardcoded empty responses with no stub indicator — misleading for operators | `server.js` stubs |
| L2 | Dead `delivery-metrics.js` and `campaigns.js` never imported; `campaigns.js` would throw on import due to wrong `{db}` import | `api/admin/` |
| L3 | `GET /api/health` performs no real check — DB unreachable returns the same `{status: "ok"}` as healthy | `server.js:713` |
| L4 | Admin support threads, system events, rewards, promotions queries have fixed hardcoded LIMITs with no pagination | Various admin routes |

---

## Score Breakdown

| Dimension | Score | Notes |
|---|---|---|
| Admin authority (auth model) | 7/10 | requireAdminAuth solid; role granularity not enforced beyond pricing |
| Operations controls | 1/10 | No kill switches, maintenance mode, or circuit breakers |
| Incident management | 2/10 | Observability framework exists but signals never fire |
| Auditability | 3/10 | Admin audit log writes but can't be read; missing entries on writes |
| Moderation | 0/10 | No moderation capability of any kind |
| Data operations | 5/10 | Retention for most tables; compliance flow correct; system tables unbounded |
| Observability | 2/10 | writeSystemEvent dead; delivery metrics dead; health endpoint is static |
| Performance | 5/10 | Users paginated; diagnostics O(N×M); many hardcoded LIMITs |
| Security (JWT revocation) | 3/10 | Disable flag not checked on token; platform-test accessible to support |
| Dead ops | 4/10 | 2 dead files, 5 stubs, overview aliased to billing |

**Final: 4/10 — NOT CERTIFIED**

---

## Repair Priorities

**Must fix before production at scale (Critical):**
1. Wire `writeSystemEvent` — call it from poster.js (delivery failures), scheduler.js (queue overflows), OAuth refresh (token failures), and billing engine (payment events)
2. Add `GET /api/v1/admin/audit-log` querying `admin_audit_logs` with filter/pagination
3. Add `is_active` check in customer auth middleware to enforce account disable immediately

**High priority (within first sprint):**
4. Wire `aggregateDeliveryMetrics` to the `0 3 * * *` cron
5. Add platform pause controls: a `platform_disabled` flag per platform that the delivery scheduler and poster respect
6. Update `platform_health` table from poster.js on success/failure
7. Add `logAdminAction` to blog CRUD, campaign create, email send, backfill, and platform-test
8. Enforce `hasPermission` on all admin write routes (user toggle, broadcast, backfill, platform-test minimum)

**Medium priority:**
9. Add retention cron for `admin_system_events` and `admin_audit_logs` (90-day window)
10. Paginate `integrations-diagnostics` (accept `brand_id` filter, LIMIT 50 per call)
11. Add delivery job cancellation on account disable
12. Remove or replace stub routes with `503 {stub: true}` responses

---

*Audit complete. No fixes applied. No migrations created. No files modified.*
