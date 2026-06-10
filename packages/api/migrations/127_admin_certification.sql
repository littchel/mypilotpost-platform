-- Migration: 127_admin_certification.sql
-- Admin, Governance & Platform Operations Certification — ENGINE 15
--
-- CODE FIXES (in this release, not SQL):
--
--   server.js /api/internal/* (3 routes) — replaced requireAdmin with requireAdminAuth.
--     requireAdmin (middleware.js) accepts customer JWTs whose brand_users.role is 'admin',
--     allowing any brand admin customer to call platform-wide ops (delivery run, intelligence
--     run, performance ingest). requireAdminAuth requires is_admin:true in the JWT payload,
--     which is only set by the dedicated adminLogin flow.
--
--   api/admin/users.js toggleAdminUserStatus — added auth parameter + logAdminAction call.
--     Previously: auth result was discarded at the route level, and the handler had no audit
--     logging. User activate/deactivate is a privileged action that must be in the audit trail.
--
--   api/admin/users.js forceVerifyUser — added auth parameter + logAdminAction call.
--     Same problem: no audit trail for admin-forced email verification.
--
--   core/support/requests.js adminUpdateSupport — added auth parameter + logAdminAction call
--     + status field validation (VALID_SUPPORT_STATUSES whitelist).
--     Previously: auth was discarded, any string could be written to support_requests.status,
--     and no admin was identifiable as having made the update.
--
--   server.js admin stub endpoints (5 routes) — added requireAdminAuth() before each return.
--     /api/v1/admin/memory, /seo/overview, /automation/rules, /ml/health, /experiments
--     were returning 200 with empty bodies to unauthenticated requests.
--
--   server.js /api/v1/admin/pricing/:id PUT — added logAdminAction("update_plan") after the
--     handler returns. Plan limit/price modifications are now traceable to the acting admin.
--
-- SQL FIXES:
--
--   1. Add ip_address and user_agent columns to admin_audit_logs if not already present
--      (migration 097 added these via ALTER TABLE; use IF NOT EXISTS pattern to be safe).
--
--   2. Index admin_audit_logs by admin_id and action for fast incident queries.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure admin_audit_logs has the full schema (defensive — 097 may not have run)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            TEXT PRIMARY KEY,
  admin_id      TEXT NOT NULL,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  metadata_json TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Performance indices for audit log queries
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id  ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action     ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target     ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);
