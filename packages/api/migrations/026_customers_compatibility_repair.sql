-- packages/api/migrations/026_customers_compatibility_repair.sql

-- 1. Create a new customers table with the correct schema
CREATE TABLE customers_new (
    id TEXT PRIMARY KEY,
    brand_id TEXT UNIQUE, -- Required for FKs from content_context and media_assets
    plan TEXT NOT NULL DEFAULT 'free',
    mrr INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Migrate existing data if customers table exists
-- (We use INSERT OR IGNORE just in case, since we're also backfilling)
INSERT INTO customers_new (id, plan, mrr, created_at)
SELECT id, plan, mrr, created_at FROM customers;

-- 3. Backfill brand_id from brands table
-- We match by the nullable customer_id field in brands if available,
-- or we'll perform a fuzzy match/creation in step 4.
UPDATE customers_new
SET brand_id = (SELECT id FROM brands WHERE brands.customer_id = customers_new.id)
WHERE brand_id IS NULL;

-- 4. Ensure all existing brands have a corresponding customer record (Admin/Billing compatibility)
INSERT INTO customers_new (id, brand_id, plan, mrr)
SELECT 
    hex(randomblob(16)), 
    id, 
    'free', 
    0
FROM brands 
WHERE id NOT IN (SELECT brand_id FROM customers_new WHERE brand_id IS NOT NULL);

-- 5. Drop old table and rename new one
DROP TABLE customers;
ALTER TABLE customers_new RENAME TO customers;

-- 6. Back-sync brands.customer_id for admin joins to keep the 1:1 relationship consistent
UPDATE brands
SET customer_id = (SELECT id FROM customers WHERE customers.brand_id = brands.id)
WHERE customer_id IS NULL;
