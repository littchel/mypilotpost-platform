-- Migration: Add Regional Pricing
-- Description: Supports regional pricing based on user location.

CREATE TABLE IF NOT EXISTS regional_plans (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    region TEXT NOT NULL, -- e.g. 'global', 'africa', 'south_africa', 'zimbabwe'
    price_monthly INTEGER NOT NULL,
    price_yearly INTEGER NOT NULL,
    currency TEXT NOT NULL, -- e.g. 'ZAR', 'USD', 'EUR'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, region)
);

-- Seed regional pricing (Example: ZA prices already in plans, but we mirror here for consistency)
INSERT OR IGNORE INTO regional_plans (id, plan_id, region, price_monthly, price_yearly, currency)
VALUES 
('growth_sa', 'growth', 'south_africa', 49900, 499000, 'ZAR'),
('pro_sa', 'pro', 'south_africa', 99900, 999000, 'ZAR'),
('growth_global', 'growth', 'global', 2900, 29000, 'USD'),
('pro_global', 'pro', 'global', 5900, 59000, 'USD'),
('growth_africa', 'growth', 'africa', 1900, 19000, 'USD'),
('pro_africa', 'pro', 'africa', 3900, 39000, 'USD');
