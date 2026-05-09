-- packages/api/migrations/034_fix_oauth_nullability.sql
-- Fix legacy columns still being NOT NULL

-- Copy to temp, drop, and recreate with NULLABLE columns (SQLite table rebuild)
CREATE TABLE connected_accounts_new (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  access_token TEXT, -- MADE NULLABLE
  refresh_token TEXT,
  token_expires_at TEXT,
  scopes TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  provider_type TEXT,
  provider_account_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  created_by TEXT,
  disconnected_at TEXT,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

INSERT INTO connected_accounts_new SELECT * FROM connected_accounts;
DROP TABLE connected_accounts;
ALTER TABLE connected_accounts_new RENAME TO connected_accounts;

CREATE INDEX IF NOT EXISTS idx_connected_accounts_brand ON connected_accounts(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_accounts_unique ON connected_accounts(brand_id, provider, provider_account_id);
