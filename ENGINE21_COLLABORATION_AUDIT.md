# ENGINE 21 — Team, Collaboration & Approval Engine Audit

**Date:** 2026-06-10  
**Auditor:** Claude Sonnet 4.6 (automated audit)  
**Mode:** READ ONLY — no fixes, no migrations, no commits  
**Score:** 3.5 / 10  
**Verdict:** NOT CERTIFIED

---

## 1. Architecture Map

### 1.1 Auth & Brand Context

```
requireAuth (middleware.js)
├─ Verifies JWT
├─ Checks email verification
└─ Resolves brand via brand_users (auth-authoritative table)
   └─ Returns { user_id, brand_id, role }   ← role from brand_users

requireBrandContext  ← requireAuth + hard block on null brand_id
requirePermission   ← requireAuth + hasPermission (admin RBAC only)
requireAdmin        ← requireAuth + adminRoles check
```

**Two tables track team membership:**

| Table | Purpose | Role Values (CHECK constraint) |
|-------|---------|-------------------------------|
| `brand_users` | Auth gate — checked by middleware on every request | Any TEXT (no constraint) |
| `team_members` | Ops/display — role checks in members.js, clients.js | `owner`, `admin`, `team`, `client` ONLY |

**Two role systems in parallel:**

| Module | Roles | Used By |
|--------|-------|---------|
| `lib/rbac.js` | `owner`, `editor`, `viewer` | `requireRBAC` — never called |
| `core/team/permissions.js` | `owner`, `admin`, `brand_manager`, `creator`, `approver`, `viewer`, `team`, `client` | `members.js`, `clients.js`, `vault.js` |

---

### 1.2 Approval Systems — Three Parallel Implementations

```
SYSTEM A — approvals.controller.js  (DEAD)
  Table: content_approvals  ← TABLE DOES NOT EXIST IN ANY MIGRATION
  Token: nanoid(32) → stored in content_approvals.approval_token
  Routes: NONE registered in server.js
  Status: Entire controller unreachable. Runtime crash if wired.

SYSTEM B — approvals/handlers.js  (PARTIALLY LIVE)
  Table: approval_requests + content_shares
  Token: SHA-256(UUID) → stored in content_shares.access_token_hash
  Share URL: https://app.mypilotpost.com/approve/${token}  ← broken (no route handles /approve/:token)
  Routes: POST /api/customer/approvals, GET /api/customer/approvals  (server.js:1534-1538)
  Defects: No content_vault/social_assets status update. Share URL dead.

SYSTEM C — vault.js::vaultApproval  (AUTHORITATIVE)
  Table: approval_requests + content_shares + content_vault + social_assets
  Token: SHA-256(UUID) → stored in content_shares.access_token_hash
  Share URL: {FRONTEND_URL}/public/approval/{content_id}  ← content_id, NOT token
  Routes: POST /api/customer/vault/:id/approval  (server.js:1916)
  Status: Most complete. Role check on approve. Token generated but NEVER USED.

BONUS — social.js (LIVE, MINIMAL)
  Table: approval_requests + content_vault + social_assets
  Routes: POST /api/customer/content/social/:id/submit-approval (1995)
          POST /api/customer/content/social/:id/approve           (1996)
          POST /api/customer/content/social/:id/reject            (1997)
  Defects: No role check on approve/reject.

PUBLIC ENDPOINT — public_approval.js (LIVE, NO AUTH)
  Routes: GET  /api/public/approval/:content_id  (server.js:817)
          POST /api/public/approval/:content_id  (server.js:827)
          POST /api/public/approval/:content_id/comment (server.js:822)
  Auth: NONE — accepts content_id UUID directly. No token validation.
```

---

### 1.3 Authoritative Tables

| Table | Purpose | Created By |
|-------|---------|-----------|
| `brand_users` | Auth membership gate | migration 025 |
| `team_members` | Team ops (role matrix, display) | migration 072 |
| `invites` | Pending invitations | migration 072 |
| `approval_requests` | Approval audit trail | migration 073 + 088 + 115 |
| `content_shares` | Expiring share links (hashed token) | migration 073 |
| `content_vault` | Content lifecycle status (authoritative) | earlier migration |
| `social_assets` | Social content mirror | earlier migration |
| `clients` | External stakeholders | migration 116 |
| `client_links` | Client share links | migration 116 |
| `content_approvals` | MISSING — no migration creates this table | **DOES NOT EXIST** |
| `approval_comments` | MISSING — no migration creates this table | **DOES NOT EXIST** |

---

## 2. Defect Register

### CRITICAL

---

#### C1 — Public Approval Endpoints: Zero Authentication or Token Validation

**Files:** `core/content/public_approval.js`, `server.js:817-830`

**Description:**  
`GET /api/public/approval/:content_id`, `POST /api/public/approval/:content_id`, and `POST /api/public/approval/:content_id/comment` accept a bare `content_id` UUID with no secret token. Any person who knows or guesses a content UUID can:
- Read the full content (title, body, brand info)
- Approve or reject the content, changing `content_vault.lifecycle_status` and `social_assets.lifecycle_status` permanently
- Add public comments as 'external_client'

**Root cause:** `public_approval.js::getPublicContent` queries `content_vault WHERE id = ?` with no token check. `submitPublicDecision` requires only that `lifecycle_status = 'approval_requested'`. The `content_id` is a UUID but these are exposed in frontend URLs, notification emails, and API responses.

**Token generated but never used:** `vault.js::vaultApproval submit` generates a SHA-256 token and stores it in `content_shares.access_token_hash`. Then builds `share_url = ${FRONTEND_URL}/public/approval/${id}` — the content_id, not the token. `clients.js::sendToClient` generates `?token=${token}` as a query param, but the public approval endpoint reads only `path.split("/")[4]` and never reads `request.url` for the query parameter.

**Impact:** Any brand content in `approval_requested` state is world-readable and world-approvable by anyone with the UUID.

---

#### C2 — `handlers.js::submitForApproval` Generates Dead Share Links

**File:** `core/approvals/handlers.js:49`

**Description:**  
`POST /api/customer/approvals` generates `share_url = https://app.mypilotpost.com/approve/${token}` where `token` is the raw (pre-hash) UUID. This URL:
1. Points to frontend route `/approve/:token` — unknown if this route exists in the frontend
2. Even if the frontend route exists, the server has no `/api/.../approve/:token` endpoint — the only token-lookup endpoint would be `approvals.public.js::updateByToken`, which is NOT wired in server.js
3. The raw token is discarded after hashing; the hash is stored in `content_shares.access_token_hash`, but no server route accepts a raw token to hash and look up

Every approval share link generated via this endpoint is broken. Reviewers who receive this link get a non-functional page or a 404.

**Secondary issue:** `submitForApproval` creates an `approval_requests` row but does NOT update `content_vault.lifecycle_status` or `social_assets.lifecycle_status`. Content remains in `draft` state while an approval record says it's pending.

---

### HIGH

---

#### H1 — `team_members` CHECK Constraint Incompatible with `permissions.js` ASSIGNABLE_ROLES

**Files:** `migrations/072_teams.sql`, `core/team/permissions.js`, `core/team/members.js`

**Description:**  
`team_members.role` has a database-level CHECK constraint: `role IN ('owner', 'admin', 'team', 'client')`.  
`permissions.js::ASSIGNABLE_ROLES = ['admin', 'brand_manager', 'creator', 'approver', 'viewer']`.  
`members.js::updateMemberRole` validates against ASSIGNABLE_ROLES, then issues:
```sql
UPDATE team_members SET role = ? WHERE id = ?
UPDATE brand_users SET role = ? WHERE user_id = ? AND brand_id = ?
```
Both in a D1 batch (atomic). For roles 'brand_manager', 'creator', 'approver', 'viewer':
- Application validation passes (role is in ASSIGNABLE_ROLES)
- First statement fails with SQLite CHECK constraint error
- Batch rolls back — neither table is updated
- Handler crashes with an unhandled D1 error (no try/catch around the batch)

**Result:** `updateMemberRole` silently fails for 4 of 5 assignable roles. Only 'admin' (present in both lists) works. Same issue applies to `invites.role CHECK (role IN ('admin', 'team', 'client'))` — creating invites for 'brand_manager', 'creator', 'approver', 'viewer' roles fails at the DB level.

---

#### H2 — `social.js::approveContent` and `rejectContent`: No Role Check

**File:** `core/content/social.js:187-229`, `server.js:1996-1997`

**Description:**  
`POST /api/customer/content/social/:id/approve` and `POST /api/customer/content/social/:id/reject` require only `brand_id` membership to execute. No role check is performed. Any authenticated brand member — including a viewer — can:
- Approve content, setting `lifecycle_status = 'approved'` on `content_vault` and `social_assets`
- Reject content, setting `lifecycle_status = 'draft'` (reverting pending approval)

**Contrast:** `vault.js::vaultApproval approve` (added in migration 125) checks role against `brand_users`: only `owner`, `admin`, `approver`, `brand_manager`, `client` may approve. The social.js paths have no equivalent guard.

---

#### H3 — `content_approvals` and `approval_comments` Tables Missing from All Migrations

**Files:** `core/approvals/approvals.controller.js`, `core/approvals/approvals.public.js`, `core/approvals/approvals.comments.js`

**Description:**  
Three approval-related files query tables that do not exist in any migration:

- `content_approvals` — queried by `approvals.controller.js` (INSERT + SELECT), `approvals.public.js` (SELECT + UPDATE), `approvals.comments.js` (SELECT × 3)
- `approval_comments` — queried by `approvals.comments.js` (INSERT + SELECT × 2)

No migration creates either table. In production D1, any query against these tables returns "no such table" error.

**Compounding factor:** `approvals.controller.js` and `approvals.public.js` are also not imported in `server.js` — their routes are entirely unreachable. The missing tables are not presently causing live crashes, but the code is entirely dead and the tables are permanently absent from the schema.

**Affected functions (all dead):** `listApprovals`, `submitForApproval (controller)`, `approveContent (controller)`, `rejectContent (controller)`, `requestChanges`, `generateApprovalLink`, `loadContent`, `updateByToken`, `getApprovalCommentsByToken`, `addApprovalCommentByToken`.

---

#### H4 — Three Approval Systems Write Incompatible State

**Files:** `core/approvals/handlers.js`, `core/content/social.js`, `core/content/vault.js`

**Description:**  
Content can enter approval workflows through three different live paths, each producing different database state:

| Path | Route | `content_vault.lifecycle_status` updated? | `approval_requests` row created? |
|------|-------|------------------------------------------|----------------------------------|
| `handlers.js::submitForApproval` | `POST /api/customer/approvals` | ✗ — content stays in 'draft' | ✓ |
| `social.js::submitForApproval` | `POST /api/customer/content/social/:id/submit-approval` | ✓ — sets 'approval_requested' | ✓ |
| `vault.js::vaultApproval submit` | `POST /api/customer/vault/:id/approval` | ✓ — sets 'approval_requested' | ✓ |

The `GET /api/customer/vault/approvals` endpoint reads `content_vault WHERE share_for_approval = 1`. Only `vault.js` and `social.js` set this flag. Content submitted via `handlers.js` is permanently invisible from the approval queue UI.

**Downstream:** `vaultApproval reject` sets `lifecycle_status = 'archived'` + `social_assets.status = 'failed'`. `social.js rejectContent` sets both back to 'draft'. These are incompatible rejection semantics on the same content depending on which approve path is used.

---

### MEDIUM

---

#### M1 — `vaultApproval reject` Sets `lifecycle_status = 'archived'` — Irreversible

**File:** `core/content/vault.js:455-468`

**Description:**  
When a reviewer rejects content via `vault.js::vaultApproval`, action='reject':
```sql
UPDATE content_vault SET lifecycle_status = 'archived'
UPDATE social_assets SET lifecycle_status = 'archived', status = 'failed'
```
`lifecycle_status = 'archived'` has no recovery path. No route exists to move archived content back to draft. The content creator has no way to reclaim and revise rejected content. The `request_changes` action (which correctly sets `lifecycle_status = 'draft'`) exists as a separate action — but rejection is permanent.

**Compare:** `social.js::rejectContent` sets `lifecycle_status = 'draft'` (recoverable), `public_approval.js::submitPublicDecision` with `status='rejected'` also sets `lifecycle_status = 'draft'`. Three rejection implementations, three different final states.

---

#### M2 — Role Source Split: `callerRole` Reads `team_members`, Middleware Reads `brand_users`

**Files:** `core/team/members.js:12-15`, `core/team/clients.js:15-17`, `auth/middleware.js:65-72`

**Description:**  
`callerRole(db, brandId, userId)` in `members.js` and `memberRole(db, brandId, userId)` in `clients.js` both read role from `team_members`. The `requireAuth` middleware resolves the caller's role from `brand_users`. These are two separate tables.

Migration 125 backfills the divergence caused by the old `acceptInvite` hardcoding 'member', and `updateMemberRole` now syncs both tables atomically. But the structural risk remains: any future path that writes role to only one table will cause silent inconsistency where:
- Middleware sees old role (stale `brand_users`)
- `can()` check in members.js sees new role (fresh `team_members`)
- Or vice versa

The correct single source is `brand_users` (the auth-authoritative table). Operations should read from `brand_users` only.

---

#### M3 — Internal Approval Comments: No Brand Ownership Check on `approval_id`

**File:** `core/approvals/approvals.comments.js:14-39, 45-81`

**Description:**  
`getApprovalComments` and `addApprovalComment` query `approval_comments WHERE approval_id = ?`. They verify the caller is authenticated (`auth.brand_id` present) but do NOT verify that the `approval_id` belongs to a record owned by `auth.brand_id`. Any authenticated user who discovers or guesses an `approval_id` UUID can:
- Read all internal reviewer comments on another brand's approval
- Inject internal comments into another brand's approval thread

(These routes are currently unwired in server.js, so not a live exploit — but the code paths are ready to be registered.)

---

#### M4 — `clients.js::sendToClient` Token in URL Never Validated

**File:** `core/team/clients.js:108-157`, `server.js:817-830`

**Description:**  
`sendToClient` generates a random token, stores it in `client_links.token`, and builds:
```
share_url = ${APP_URL}/public/approval/${entity_id}?token=${token}
```
The token is appended as a query parameter, but the server-side public approval endpoints (`getPublicContent`, `submitPublicDecision`, `addPublicComment`) parse only the path parameter (content_id) and never read the query string. The token is completely ignored.

**Consequence:** The `client_links` table records expiry and access tracking, but neither is enforced. An expired or revoked client link is still functionally valid because the server doesn't check it.

---

### LOW

---

#### L1 — `getApprovalRequests` Joins on Non-Existent `first_name` / `last_name` Columns

**File:** `core/approvals/handlers.js:71`

```js
JOIN users u ON u.id = ar.requested_by
... (u.first_name || ' ' || u.last_name) as requester_name
```

The `users` table uses `full_name` (single column). `first_name` and `last_name` columns do not exist. In SQLite, referencing nonexistent columns in a `||` concatenation returns NULL for each. Result: `requester_name` is always `' '` (a single space) for every approval request.

---

#### L2 — `lib/rbac.js` Dead Module — `requireRBAC` Never Called

**File:** `src/lib/rbac.js`

`lib/rbac.js` defines a three-role RBAC matrix (owner/editor/viewer) and exports `requireRBAC`. No active route in `server.js` calls `requireRBAC`. The module exists alongside `core/team/permissions.js` (7-role matrix) but is entirely unused in production collaboration flows. Creates confusion about which RBAC system applies.

---

#### L3 — `logActivity` Silently Swallows All Errors

**File:** `core/team/activity.js` (based on import patterns)

`logActivity` is called inside catch blocks or with `.catch(() => {})` wrappers throughout the team and client modules. Any failure in activity logging is invisible — no metric, no log, no alert. Broken activity tracking produces a silent audit trail gap.

---

#### L4 — `social.js::submitForApproval` Mandatory `schedule_at` Not Applicable to All Content Types

**File:** `core/content/social.js:157-162`

```js
if (!schedule_at || !isValidISO8601(schedule_at)) {
  return error("Scheduling is mandatory for approval submission.", "BAD_REQUEST", null, 400);
}
```

Blog content submitted for approval via the same endpoint pattern (`/api/customer/content/:id/submit-approval`) would also fail if it doesn't include `schedule_at`. Approval is a content governance step that should be decoupled from scheduling.

---

## 3. Security Summary

| Vector | Status |
|--------|--------|
| Public approval: token validation | ✗ MISSING — content_id only, no secret |
| Public approval: expiry enforcement | ✗ MISSING — no expiry check on public endpoints |
| Client link: token validation | ✗ MISSING — token in URL never read by server |
| Internal approval: brand ownership on comments | ✗ MISSING (routes unwired, defect latent) |
| Approval action: role check (vault path) | ✓ Added in migration 125 |
| Approval action: role check (social path) | ✗ MISSING — any brand member can approve |
| Team invite: brand ownership | ✓ owner-only gate |
| Team member removal: access revoke | ✓ Syncs brand_users (migration 125) |
| JWT in query string | ✓ Deliberately removed (comment in middleware.js) |
| Email verification enforcement | ✓ Middleware checks verified_at |

---

## 4. Performance Notes

No critical N+1 patterns identified. Observations:

- `getApprovalItems` uses a correlated subquery `(SELECT id FROM approval_requests WHERE content_id = cv.id ORDER BY created_at DESC LIMIT 1)` — acceptable for the expected volume (<100 rows per query per brand)
- `getTeam` in `teams/handlers.js` reads from `team_members` (display) — fine, indexed on `brand_id`
- `getActivity` enforces `LIMIT 100` pagination — good
- `approvalRequests` subquery in server.js at line 1534 fetches all rows for a brand; no pagination

---

## 5. Dead Code Inventory

| File | Status | Reason |
|------|--------|--------|
| `core/approvals/approvals.controller.js` | DEAD | Not imported in server.js. Queries `content_approvals` (missing table). |
| `core/approvals/approvals.public.js` | DEAD | Not imported in server.js. Queries `content_approvals` (missing table). |
| `core/approvals/approvals.comments.js` | PARTIALLY DEAD | Public by-token functions query `content_approvals` (missing). Internal functions unwired (no routes in server.js). |
| `lib/rbac.js` | DEAD | `requireRBAC` never called in active routes. |
| `handlers.js` share URL `/approve/${token}` | DEAD PATH | No server route or registered frontend handler for this path. |

---

## 6. Affected Files

- `core/content/public_approval.js` — C1
- `core/approvals/handlers.js` — C2, L1, H4
- `core/content/social.js` — H2, L4, H4
- `core/content/vault.js` — M1, H4
- `core/content/collaboration.js` — H4 (adjacent)
- `core/approvals/approvals.controller.js` — H3 (dead)
- `core/approvals/approvals.public.js` — H3 (dead)
- `core/approvals/approvals.comments.js` — H3, M3 (partially dead)
- `core/team/members.js` — H1, M2
- `core/team/clients.js` — M2, M4
- `core/teams/handlers.js` — H1 (invites constraint)
- `lib/rbac.js` — L2 (dead)
- `auth/middleware.js` — M2 (reads brand_users, correct)
- `migrations/072_teams.sql` — H1 (CHECK constraint mismatch)

---

## 7. Authoritative Tables (Collaboration Domain)

| Table | Owner | Notes |
|-------|-------|-------|
| `brand_users` | Auth engine | Sole gate checked by middleware |
| `team_members` | Team ops | Display + role ops; synced with brand_users by migration 125 |
| `invites` | Team engine | Pending invites |
| `content_vault` | Content engine | Lifecycle status authoritative |
| `social_assets` | Social engine | Mirror of vault lifecycle_status |
| `approval_requests` | Approval engine | Audit trail for approvals |
| `content_shares` | Approval engine | Hashed tokens for share links |
| `clients` | Client engine | External stakeholders |
| `client_links` | Client engine | Token-bearing share links (token never validated) |

---

## 8. Score by Domain

| Domain | Score | Notes |
|--------|-------|-------|
| 1. Architecture | 5/10 | Three parallel approval systems, dual role tracks |
| 2. Access Control | 3/10 | Public endpoint no token (CRITICAL), approveContent no role check |
| 3. Approval Engine | 2/10 | Broken share URLs, dead tables, token generated but unused |
| 4. Team Engine | 5/10 | Member sync fixed (125), but role schema mismatch kills non-admin roles |
| 5. Collaboration UX State | 4/10 | Reject = archived (irreversible), 3 submission paths produce different state |
| 6. Security | 3/10 | Unauthenticated content access, world-approvable via content_id |
| 7. Performance | 7/10 | No critical issues |
| 8. Dead Code | 2/10 | Controller dead, public dead, comments dead, rbac.js dead |

**Overall: 3.5 / 10**

---

## 9. Defect Summary

| ID | Severity | Description |
|----|----------|-------------|
| C1 | CRITICAL | Public approval endpoints — no token, any UUID grants full access |
| C2 | CRITICAL | `handlers.js` share URL dead — `/approve/${token}` has no server handler |
| H1 | HIGH | `team_members` CHECK constraint rejects 4 of 5 ASSIGNABLE_ROLES |
| H2 | HIGH | `social.js approveContent/rejectContent` — no role check |
| H3 | HIGH | `content_approvals` + `approval_comments` missing from all migrations |
| H4 | HIGH | Three approval paths produce incompatible content lifecycle state |
| M1 | MEDIUM | `vaultApproval reject` sets archived — irreversible, no recovery path |
| M2 | MEDIUM | Role source split: callerRole reads team_members, middleware reads brand_users |
| M3 | MEDIUM | Internal comments — no brand_id check on approval_id (latent, unwired) |
| M4 | MEDIUM | Client link token in URL never validated by server |
| L1 | LOW | `getApprovalRequests` join on non-existent first_name/last_name columns |
| L2 | LOW | `lib/rbac.js` dead module — requireRBAC never called |
| L3 | LOW | `logActivity` silently swallows errors |
| L4 | LOW | submitForApproval forces `schedule_at` even for approval-only flows |

**Total: 2 Critical, 4 High, 4 Medium, 4 Low**

---

## 10. Verdict

**NOT CERTIFIED**

The collaboration and approval domain has two production-blocking security defects (C1, C2), four functional defects that corrupt or prevent approval workflows (H1-H4), and a pattern of dead code across the entire approval controller layer that indicates the domain was developed iteratively without cleaning up superseded implementations.

The most urgent repair is C1: the public approval endpoints are accessible to anyone who knows a content UUID, which is functionally equivalent to no access control on content in the approval queue.

---

*Produced by automated audit — ENGINE 21. Do not fix. Do not commit. Report only.*
