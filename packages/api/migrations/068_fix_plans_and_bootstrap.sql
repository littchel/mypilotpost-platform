-- packages/api/migrations/068_fix_plans_and_bootstrap.sql
-- PRE-LAUNCH CRITICAL FIX
-- Resolves:
--   1. price_monthly column missing from plans (code expects it, DB has price_cents)
--   2. plans table is empty (seed migration 063 used wrong column name and silently failed)
--   3. users have NULL trial_ends_at (enforcement reads as expired)
--   4. usage_tracking has no rows for new users (enforcement JOIN always fails)
--   5. regional_plans is empty (public pricing returns empty plan list)

PRAGMA foreign_keys = OFF;

-- ─────────────────────────────────────────────────────────
-- 1. Add price_monthly alias to plans table
--    (price_cents = canonical storage; price_monthly = API compat layer)
-- ─────────────────────────────────────────────────────────
-- price_monthly already added by 063_saas_production_final.sql
ALTER TABLE plans ADD COLUMN price_yearly INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN brand_limit INTEGER DEFAULT 3;
ALTER TABLE plans ADD COLUMN features_json TEXT DEFAULT '[]';

-- ─────────────────────────────────────────────────────────
-- 2. Seed canonical plans (all columns populated)
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO plans (
  id, name,
  price_cents, price_monthly, price_yearly,
  billing_interval,
  currency,
  description,
  social_accounts_limit, posts_per_month_limit, ai_generations_limit,
  brand_limit, trial_days, is_active,
  limits, features_json
)
VALUES
  ('starter', 'Starter',
    0, 0, 0,
    'monthly',
    'ZAR',
    'Perfect for getting started. Free forever.',
    3, 30, 10,
    1, 14, 1,
    '{}', '["social","content","seo"]'),

  ('growth', 'Growth',
    49900, 49900, 499000,
    'monthly',
    'ZAR',
    'For growing brands. R499/month.',
    10, 100, 50,
    5, 14, 1,
    '{}', '["social","content","seo","campaigns","analytics","intelligence"]'),

  ('pro', 'Pro',
    99900, 99900, 999000,
    'monthly',
    'ZAR',
    'For serious agencies. R999/month.',
    25, 500, 200,
    25, 14, 1,
    '{}', '["social","content","seo","campaigns","analytics","intelligence","white_label","api_access"]');

-- ─────────────────────────────────────────────────────────
-- 3. Initialize trial data for users who have NULL trial_ends_at
-- ─────────────────────────────────────────────────────────
UPDATE users
SET
  plan_id = COALESCE(plan_id, 'starter'),
  subscription_status = COALESCE(subscription_status, 'trial'),
  trial_ends_at = datetime('now', '+14 days'),
  current_period_start = datetime('now'),
  current_period_end = datetime('now', '+30 days')
WHERE trial_ends_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- 4. Seed usage_tracking for all users who don't have an entry
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO usage_tracking (user_id, period_start, period_end)
SELECT id, current_period_start, current_period_end FROM users
WHERE current_period_start IS NOT NULL;

-- ─────────────────────────────────────────────────────────
-- 5. Seed regional_plans (if not already present)
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO regional_plans (id, plan_id, region, price_monthly, price_yearly, currency)
VALUES
  ('growth_sa',     'growth', 'south_africa', 49900,  499000, 'ZAR'),
  ('pro_sa',        'pro',    'south_africa', 99900,  999000, 'ZAR'),
  ('growth_global', 'growth', 'global',        2900,   29000, 'USD'),
  ('pro_global',    'pro',    'global',        5900,   59000, 'USD'),
  ('growth_africa', 'growth', 'africa',        1900,   19000, 'USD'),
  ('pro_africa',    'pro',    'africa',        3900,   39000, 'USD');

PRAGMA foreign_keys = ON;
