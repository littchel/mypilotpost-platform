-- 140_commercial_catalog_reset.sql
-- COMMERCIAL CATALOG — CANONICAL RESET (LOCK)
-- Repairs corrupted plans table to 4 canonical plans (all USD).
-- Keeps existing subscriptions. Maps pro→dominance via plan_aliases.
-- Archives strays (pro, launch, scale). Does NOT touch payments/invoices/refunds.

-- 1. Alias table for legacy plan-id resolution
CREATE TABLE IF NOT EXISTS plan_aliases (
  old_plan_id TEXT PRIMARY KEY,
  new_plan_id TEXT NOT NULL,
  migrated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO plan_aliases (old_plan_id, new_plan_id, migrated_at)
VALUES ('pro', 'dominance', datetime('now'));

-- 2. Canonical Starter — $29/mo, $290/yr, 1 user
UPDATE plans SET name='Starter', currency='USD', price_monthly=29, price_yearly=290,
  price_cents=2900, user_limit=1, status='active', is_active=1, visible=1, sort_order=1,
  updated_at=datetime('now') WHERE id='starter';

-- 3. Canonical Growth — $79/mo, $790/yr, 5 users
UPDATE plans SET name='Growth', currency='USD', price_monthly=79, price_yearly=790,
  price_cents=7900, user_limit=5, status='active', is_active=1, visible=1, sort_order=2,
  updated_at=datetime('now') WHERE id='growth';

-- 4. Canonical Agency — $149/mo, $1490/yr, 15 users
UPDATE plans SET name='Agency', currency='USD', price_monthly=149, price_yearly=1490,
  price_cents=14900, user_limit=15, status='active', is_active=1, visible=1, sort_order=3,
  updated_at=datetime('now') WHERE id='agency';

-- 5. Canonical Dominance — repurpose existing 'dominance' row (fixes id/name), $249/mo, $2490/yr, 50 users
UPDATE plans SET name='Dominance', currency='USD', price_monthly=249, price_yearly=2490,
  price_cents=24900, user_limit=50, status='active', is_active=1, visible=1, sort_order=4,
  updated_at=datetime('now') WHERE id='dominance';

-- 6. Copy pro's entitlements → dominance so migrated subscribers keep feature access
INSERT OR IGNORE INTO plan_entitlements (plan_id, feature_key, enabled, limit_value, limit_type)
  SELECT 'dominance', feature_key, enabled, limit_value, limit_type
  FROM plan_entitlements WHERE plan_id='pro';

-- 7. Migrate live subscribers pro → dominance (KEEP subscription, only repoint plan)
UPDATE users SET plan_id='dominance' WHERE plan_id='pro';

-- 8. Repoint regional pricing rows pro → dominance (catalog integrity; prices unchanged)
UPDATE regional_plans SET plan_id='dominance' WHERE plan_id='pro';

-- 9. Archive strays — pro (old Dominance), launch, scale
UPDATE plans SET status='archived', is_active=0, visible=0, updated_at=datetime('now')
  WHERE id IN ('pro','launch','scale');
