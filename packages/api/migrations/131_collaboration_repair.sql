-- 131_collaboration_repair.sql
-- ENGINE 21 — Collaboration, Team & Approval Engine Repair
--
-- REPAIRS:
--   Phase 3: Widen team_members.role CHECK (added brand_manager, creator, approver, viewer)
--   Phase 3: Widen invites.role CHECK (added brand_manager, creator, approver, viewer)
--   Phase 6: Add revoked flag to content_shares (enables share revocation)
--   Phase 9: Index on approval_requests(brand_id, created_at) for paginated queries
--
-- NOTES:
--   SQLite does not support ALTER TABLE ... MODIFY COLUMN.
--   team_members and invites are recreated to change their CHECK constraints.
--   All data is preserved via INSERT ... SELECT.
--   Foreign keys to these tables: none (checked against all migrations).

-- ─── Phase 3: Widen team_members.role ────────────────────────────────────────

CREATE TABLE team_members_v2 (
  id         TEXT PRIMARY KEY,
  brand_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN (
               'owner', 'admin', 'brand_manager', 'creator',
               'approver', 'viewer', 'team', 'client'
             )),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  UNIQUE(brand_id, user_id)
);

INSERT INTO team_members_v2
  SELECT id, brand_id, user_id, role, created_at, updated_at
  FROM   team_members;

DROP TABLE team_members;
ALTER TABLE team_members_v2 RENAME TO team_members;

CREATE INDEX IF NOT EXISTS idx_team_members_brand ON team_members(brand_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user  ON team_members(user_id);

-- ─── Phase 3: Widen invites.role ─────────────────────────────────────────────

CREATE TABLE invites_v2 (
  id         TEXT PRIMARY KEY,
  brand_id   TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN (
               'admin', 'brand_manager', 'creator',
               'approver', 'viewer', 'team', 'client'
             )),
  token      TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (brand_id)    REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by)  REFERENCES users(id)  ON DELETE CASCADE
);

INSERT INTO invites_v2
  SELECT id, brand_id, email, role, token, status, created_by, created_at, expires_at
  FROM   invites;

DROP TABLE invites;
ALTER TABLE invites_v2 RENAME TO invites;

CREATE INDEX IF NOT EXISTS idx_invites_brand ON invites(brand_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);

-- ─── Phase 6: Add revoked flag to content_shares ─────────────────────────────

ALTER TABLE content_shares ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0;

-- ─── Phase 9: Index for paginated approval queries ───────────────────────────

CREATE INDEX IF NOT EXISTS idx_approval_requests_brand_created
  ON approval_requests(brand_id, created_at);
