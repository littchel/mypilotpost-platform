-- packages/api/migrations/054_brand_audit_support.sql

-- Track if the user has seen their inaugural AI Brand Audit
ALTER TABLE brands ADD COLUMN audit_seen INTEGER DEFAULT 0;

-- Track the timestamp of the last generated audit to support refresh logic
ALTER TABLE brands ADD COLUMN audit_last_run_at TEXT;

-- Index for performance checks
CREATE INDEX IF NOT EXISTS idx_brands_audit_seen ON brands(id, audit_seen);
