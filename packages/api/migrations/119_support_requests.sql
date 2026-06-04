-- myPilotPost — Support Requests
-- Simple user-to-admin support without ticket engine.

CREATE TABLE IF NOT EXISTS support_requests (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  brand_id    TEXT,
  email       TEXT,
  name        TEXT,
  category    TEXT NOT NULL,   -- technical | billing | platform | approval | bug
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',  -- open | in_progress | resolved | closed
  admin_notes TEXT,
  resolved_at DATETIME,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_user   ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_time   ON support_requests(created_at DESC);
