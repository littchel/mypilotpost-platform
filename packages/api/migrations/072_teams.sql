-- 072_teams.sql: Team & Client Management
-- Enforce multi-tenancy and RBAC at the DB level

-- 1. Add owner tracking to brands
ALTER TABLE brands ADD COLUMN owner_id TEXT;
-- Update: Set initial owners to the creator if possible (fallback to null)
-- UPDATE brands SET owner_id = created_by WHERE owner_id IS NULL;

-- 2. Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'team', 'client')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(brand_id, user_id)
);

-- 3. Invites table
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'client')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Indexes for multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_team_members_brand ON team_members(brand_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_brand ON invites(brand_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
