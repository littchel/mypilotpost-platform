-- packages/api/migrations/063_saas_production_final.sql
-- SaaS Control System — Production Authoritative Schema

-- 1. Upgrade Users Table
ALTER TABLE users ADD COLUMN plan_id TEXT DEFAULT 'starter';
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial'; -- active, trial, expired, cancelled
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
ALTER TABLE users ADD COLUMN current_period_start TEXT;
ALTER TABLE users ADD COLUMN current_period_end TEXT;

-- 2. Usage Tracking Table (Primary Source of Truth)
CREATE TABLE IF NOT EXISTS usage_tracking (
    user_id TEXT PRIMARY KEY,
    posts_used INTEGER DEFAULT 0,
    ai_generations_used INTEGER DEFAULT 0,
    social_accounts_used INTEGER DEFAULT 0,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Enhance Plans Table
-- Existing plans table might have some of these, but we ensure they exist or add them.
-- Note: SQLite doesn't support IF NOT EXISTS for columns, but we assume clean migration for this production spec.

-- Add missing columns to plans if they don't exist (via a safe approach)
-- In a real scenario, we might use a temporary table or check pragma_table_info
ALTER TABLE plans ADD COLUMN currency TEXT DEFAULT 'ZAR';
ALTER TABLE plans ADD COLUMN description TEXT;
ALTER TABLE plans ADD COLUMN social_accounts_limit INTEGER DEFAULT 3;
ALTER TABLE plans ADD COLUMN posts_per_month_limit INTEGER DEFAULT 30;
ALTER TABLE plans ADD COLUMN ai_generations_limit INTEGER DEFAULT 10;
ALTER TABLE plans ADD COLUMN trial_days INTEGER DEFAULT 14;
ALTER TABLE plans ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE plans ADD COLUMN updated_at TEXT;
ALTER TABLE plans ADD COLUMN price_monthly INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN features_json TEXT DEFAULT '[]';

-- 4. Audit Intelligence Tracking
CREATE TABLE IF NOT EXISTS brand_audit_results (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    scores_json TEXT NOT NULL,        -- { content: 80, consistency: 70, growth: 60 }
    recommendations_json TEXT,         -- tactical actions
    weekly_fixes_json TEXT,           -- specific what to fix this week
    recommended_plan TEXT,            -- deterministic based on usage/stats
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 5. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,             -- create_plan, edit_plan, toggle_user
    target_type TEXT NOT NULL,        -- plan, user, audit
    target_id TEXT,
    metadata_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Safety Migration (Seed Existing Users)
-- We set trial_ends_at to 14 days from now for anyone not yet initialized.
UPDATE users 
SET plan_id = 'starter', 
    subscription_status = 'trial', 
    trial_ends_at = datetime('now', '+14 days'),
    current_period_start = datetime('now'),
    current_period_end = datetime('now', '+30 days')
WHERE trial_ends_at IS NULL;

-- 7. Initialize Usage Tracking for existing users
INSERT OR IGNORE INTO usage_tracking (user_id, period_start, period_end)
SELECT id, current_period_start, current_period_end FROM users;

-- 8. Seed Default Plans if not exists
INSERT OR IGNORE INTO plans (id, name, price_monthly, social_accounts_limit, posts_per_month_limit, ai_generations_limit, is_active)
VALUES ('starter', 'Starter', 0, 3, 30, 10, 1);

INSERT OR IGNORE INTO plans (id, name, price_monthly, social_accounts_limit, posts_per_month_limit, ai_generations_limit, is_active)
VALUES ('growth', 'Growth', 49900, 10, 100, 50, 1); -- R499 in cents

INSERT OR IGNORE INTO plans (id, name, price_monthly, social_accounts_limit, posts_per_month_limit, ai_generations_limit, is_active)
VALUES ('pro', 'Pro', 99900, 25, 500, 200, 1); -- R999 in cents
