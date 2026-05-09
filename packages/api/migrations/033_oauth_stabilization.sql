-- OAuth & Integrations Schema Reconciliation
-- Reconciles connected_accounts and oauth_states to V1 Hardened Standards

-- 1. Enhance connected_accounts
-- Note: Sqlite ALTER TABLE only supports one column at a time or simple renames.
-- We will add the new modular fields.

ALTER TABLE connected_accounts ADD COLUMN provider_type TEXT; -- media, publishing, automation
ALTER TABLE connected_accounts ADD COLUMN provider_account_name TEXT; -- Replaces display_name intent
ALTER TABLE connected_accounts ADD COLUMN access_token_encrypted TEXT;
ALTER TABLE connected_accounts ADD COLUMN refresh_token_encrypted TEXT;
ALTER TABLE connected_accounts ADD COLUMN created_by TEXT; -- user_id who linked it
ALTER TABLE connected_accounts ADD COLUMN disconnected_at TEXT; -- for soft-disconnect audit

-- 2. Enhance oauth_states
ALTER TABLE oauth_states ADD COLUMN user_id TEXT;
ALTER TABLE oauth_states ADD COLUMN state_token TEXT; -- encoded signed state
ALTER TABLE oauth_states ADD COLUMN used_at TEXT;

-- 3. Cleanup & Indices
CREATE INDEX IF NOT EXISTS idx_conn_acc_brand ON connected_accounts(brand_id);
CREATE INDEX IF NOT EXISTS idx_conn_acc_provider ON connected_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_conn_acc_status ON connected_accounts(status);
CREATE INDEX IF NOT EXISTS idx_oauth_state_token ON oauth_states(state_token);
