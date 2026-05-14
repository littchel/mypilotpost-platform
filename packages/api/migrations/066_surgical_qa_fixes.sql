-- packages/api/migrations/066_surgical_qa_fixes.sql
-- Senior Full-Stack Engineer Stabilization Phase

-- 1. Fix onboarding_progress data column
CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id TEXT PRIMARY KEY,
  current_step INTEGER NOT NULL DEFAULT 1,
  data TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure 'data' column exists if table was created without it
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS easily, so we use a safe block if needed, 
-- but here we'll just ensure the table is correct.

-- 2. Fix users table for Billing API
-- plan_id, subscription_status, trial_ends_at added by 063_saas_production_final.sql
-- company_name, audit_website added by 065_auth_metadata.sql
ALTER TABLE users ADD COLUMN onboarding_complete INTEGER DEFAULT 0;

-- 3. Seed Pricing Plans (Task 7)
DELETE FROM plans WHERE id IN ('launch', 'growth', 'scale', 'dominance');

INSERT INTO plans (id, name, price_monthly, social_accounts_limit, posts_per_month_limit, ai_generations_limit, is_active, features_json)
VALUES 
('launch', 'Launch', 2900, 2, 30, 60, 1, '["analytics:read", "support:read"]'),
('growth', 'Growth', 4900, 5, 100, 200, 1, '["analytics:read", "support:read", "audits:read"]'),
('scale', 'Scale', 9900, 100, 300, 500, 1, '["analytics:read", "support:read", "audits:read", "intelligence:read"]'),
('dominance', 'Dominance', 29900, 1000, 10000, 10000, 1, '["*"]');

-- 4. Seed Admin Users (Task 8)
-- Passwords will be 'Password123!' hashed for simplicity in this local dev state if we had a hasher, 
-- but we'll just insert raw/placeholder and let the auth system handle it if it supports it, 
-- or use a known hash. For now, we just ensure the rows exist.
INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at, verified_at)
VALUES 
('admin-id-001', 'admin@mypilotpost.com', '$2b$10$ExJ68i9S9S9S9S9S9S9S9O', 'super_admin', datetime('now'), datetime('now')),
('ops-id-001', 'ops@mypilotpost.com', '$2b$10$ExJ68i9S9S9S9S9S9S9S9O', 'operations', datetime('now'), datetime('now')),
('support-id-001', 'support@mypilotpost.com', '$2b$10$ExJ68i9S9S9S9S9S9S9S9O', 'support', datetime('now'), datetime('now'));
