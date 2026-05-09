-- migration: 025_foundation_reconciliation.sql

-- 1. Create brand_users table (Identity Canon 2)
CREATE TABLE IF NOT EXISTS brand_users (
    user_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, brand_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 2. Seed brand_users from brands.owner_user_id (if any exist)
-- In real system, brands.owner_user_id was likely the owner.
INSERT INTO brand_users (user_id, brand_id, role, created_at)
SELECT owner_user_id, id, 'owner', created_at
FROM brands
WHERE owner_user_id IS NOT NULL;

-- 3. Add customer_id to brands (Admin compatibility)
ALTER TABLE brands ADD COLUMN customer_id TEXT;

-- 4. Create customers table (Admin compatibility)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free',
    mrr INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Correct usage_metrics (Admin compatibility)
ALTER TABLE usage_metrics ADD COLUMN total INTEGER NOT NULL DEFAULT 0;
