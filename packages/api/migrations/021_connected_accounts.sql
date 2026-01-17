-- Connected OAuth Accounts (authoritative)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',

  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TEXT,

  scopes TEXT,
  metadata TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (brand_id, provider, provider_account_id)
);

-- OAuth State (CSRF + replay protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);
