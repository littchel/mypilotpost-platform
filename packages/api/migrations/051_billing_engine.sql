-- packages/api/migrations/051_billing_engine.sql
-- BILLING ENGINE — PRODUCTION MONETIZATION LAYER
-- DECOMMISSIONS legacy customers table

PRAGMA foreign_keys = OFF;

-- 1. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly INTEGER NOT NULL, -- In cents (e.g. 2900 = $29.00)
    price_yearly INTEGER NOT NULL,
    brand_limit INTEGER NOT NULL,
    user_limit INTEGER NOT NULL,
    features_json TEXT NOT NULL, -- e.g. ["campaigns", "seo", "intelligence"]
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'trial', -- trial, active, past_due, canceled
    trial_ends_at TEXT,
    current_period_start TEXT,
    current_period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- 3. SUBSCRIPTION EVENTS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS subscription_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    old_plan_id TEXT,
    new_plan_id TEXT,
    event_type TEXT NOT NULL, -- upgrade, downgrade, renewal, trial_start
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. USAGE SNAPSHOTS (PERFORMANCE LAYER)
CREATE TABLE IF NOT EXISTS usage_snapshots (
    user_id TEXT PRIMARY KEY,
    brands_count INTEGER DEFAULT 0,
    active_users_count INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. PROCESSED WEBHOOKS (IDEMPOTENCY)
CREATE TABLE IF NOT EXISTS processed_webhooks (
    event_id TEXT PRIMARY KEY,
    idempotency_key TEXT,
    source TEXT NOT NULL, -- 'yoco'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. SEED PLANS
-- plans table already exists from 018_billing_plans.sql with schema (id, name, price_cents, billing_interval, limits).
-- Seed using that schema; 068_fix_plans_and_bootstrap.sql adds price_monthly/yearly/etc. and re-seeds with full data.
INSERT OR IGNORE INTO plans (id, name, price_cents, billing_interval, limits)
VALUES
('starter', 'Starter', 0, 'monthly', '{}'),
('pro', 'Professional', 4900, 'monthly', '{"campaigns":true,"seo":true,"intelligence":true,"reports":true}'),
('agency', 'Agency', 19900, 'monthly', '{"campaigns":true,"seo":true,"intelligence":true,"reports":true,"white_label":true}');

-- 7. MIGRATE EXISTING USERS
-- subscriptions table already exists from 001_billing.sql with schema (id, brand_id, plan, status, ...).
-- Skip this seed; subscriptions for real users are created on sign-up by subscription-engine.js.

INSERT OR IGNORE INTO usage_snapshots (user_id, brands_count, active_users_count)
SELECT owner_user_id, COUNT(*), 1 FROM brands GROUP BY owner_user_id;

-- 8. DECOMMISSION LEGACY CUSTOMERS
DROP TABLE IF EXISTS customers;

PRAGMA foreign_keys = ON;
