-- Migration: 132_support_compliance_repair.sql
-- Phase 5: Create support_tickets table (used by routes/support.js live chat bootstrap)

CREATE TABLE IF NOT EXISTS support_tickets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  other_id   TEXT NOT NULL,
  role       TEXT,
  scope      TEXT NOT NULL DEFAULT 'support_stream',
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user    ON support_tickets(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_expires ON support_tickets(expires_at, used_at);
