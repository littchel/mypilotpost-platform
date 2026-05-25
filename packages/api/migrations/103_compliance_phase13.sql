-- Migration: 103_compliance_phase13.sql
-- Compliance infrastructure: account deletion, data export, consent records, audit log

-- Account deletion requests (7-day grace window)
CREATE TABLE IF NOT EXISTS deletion_requests (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  requested_at     TEXT NOT NULL DEFAULT (datetime('now')),
  scheduled_for    TEXT NOT NULL,             -- requested_at + 7 days
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending | cancelled | processing | completed
  cancelled_at     TEXT,
  completed_at     TEXT,
  ip_address       TEXT,
  reason           TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user   ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status, scheduled_for);

-- GDPR/POPIA data export requests
CREATE TABLE IF NOT EXISTS export_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'completed',  -- completed | error
  format       TEXT NOT NULL DEFAULT 'json',
  ip_address   TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_export_requests_user ON export_requests(user_id, requested_at);

-- Consent records per user (latest row is authoritative)
CREATE TABLE IF NOT EXISTS consent_records (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  analytics_consent   INTEGER NOT NULL DEFAULT 0,  -- 1 = granted
  functional_consent  INTEGER NOT NULL DEFAULT 1,  -- always granted (necessary)
  marketing_consent   INTEGER NOT NULL DEFAULT 0,
  ip_address          TEXT,
  recorded_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id, recorded_at);

-- Compliance audit log (append-only)
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  event_type    TEXT NOT NULL,   -- deletion_requested | deletion_cancelled | deletion_completed | data_exported | consent_updated | oauth_revoked
  resource_type TEXT,
  resource_id   TEXT,
  details       TEXT,            -- JSON blob
  ip_address    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_user    ON compliance_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_type    ON compliance_audit_log(event_type, created_at);
