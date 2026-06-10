-- Migration: 135_commercial_system.sql
-- ADMIN V2 — COMMERCIAL CONTROL SYSTEM
--
-- Adds:
--   1. plan_features  — immutable-key feature catalog (admin-editable display names)
--   2. plan_entitlements — per-plan feature toggles + limits (replaces features_json blob)
--   3. plan_versions    — snapshot every plan edit for rollback
--   4. Plans: new columns slug, status, visible, sort_order, badge
--
-- Existing plans columns (already present, not modified):
--   id, name, description, price_monthly, price_yearly, price_cents,
--   currency, brand_limit, user_limit, features_json,
--   social_accounts_limit, posts_per_month_limit, ai_generations_limit,
--   trial_days, is_active, updated_at, billing_interval, limits
--
-- Backward-compat: features_json and enforcement columns are kept intact.
-- requireEntitlement() reads plan_entitlements first, falls back to features_json.

PRAGMA foreign_keys = OFF;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NEW COLUMNS ON plans
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE plans ADD COLUMN slug       TEXT;
ALTER TABLE plans ADD COLUMN status     TEXT NOT NULL DEFAULT 'active';
ALTER TABLE plans ADD COLUMN visible    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plans ADD COLUMN sort_order INTEGER;
ALTER TABLE plans ADD COLUMN badge      TEXT;
ALTER TABLE plans ADD COLUMN user_limit INTEGER DEFAULT 5;

-- Backfill slug = id for existing plans
UPDATE plans SET slug = id WHERE slug IS NULL;

-- Set canonical sort order
UPDATE plans SET sort_order = 1 WHERE id = 'starter';
UPDATE plans SET sort_order = 2 WHERE id = 'growth';
UPDATE plans SET sort_order = 3 WHERE id = 'pro';
UPDATE plans SET sort_order = 4 WHERE id = 'agency';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FEATURE CATALOG
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_features (
  key         TEXT PRIMARY KEY,  -- immutable identifier used in code
  name        TEXT NOT NULL,     -- admin-editable display name
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'core',
  visible     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO plan_features (key, name, description, category) VALUES
  ('social_posts',   'Social Posts',          'Schedule and publish to social platforms',         'publishing'),
  ('ai_content',     'AI Content Generation', 'Generate post copy and images with AI',             'ai'),
  ('brands',         'Brands',                'Number of brands managed per account',              'core'),
  ('users',          'Team Members',          'Number of team seat licenses',                      'core'),
  ('campaigns',      'Campaigns',             'Multi-channel marketing campaign management',       'marketing'),
  ('approvals',      'Content Approvals',     'Internal approval queue for content',               'workflow'),
  ('analytics',      'Analytics & Reports',   'Performance analytics dashboards and exports',      'analytics'),
  ('seo',            'SEO Tools',             'SEO keyword tracking and optimisation',             'analytics'),
  ('intelligence',   'Brand Intelligence',    'AI-powered brand insights and recommendations',     'ai'),
  ('white_label',    'White Label',           'Remove myPilotPost branding, custom domain',        'advanced'),
  ('api_access',     'API Access',            'Programmatic REST API access',                      'advanced'),
  ('storage',        'Media Storage',         'Cloud media library storage (GB)',                  'storage'),
  ('workspaces',     'Workspaces',            'Multiple isolated workspaces per account',          'advanced');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PLAN ENTITLEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_entitlements (
  plan_id     TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  limit_value INTEGER,       -- NULL = unlimited
  limit_type  TEXT NOT NULL DEFAULT 'boolean',
  PRIMARY KEY (plan_id, feature_key),
  FOREIGN KEY (plan_id)     REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_key) REFERENCES plan_features(key)
);

-- ── STARTER ──────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO plan_entitlements VALUES
  ('starter', 'social_posts',  1,  30,   'monthly'),
  ('starter', 'ai_content',    1,  100,  'monthly'),
  ('starter', 'brands',        1,  1,    'count'),
  ('starter', 'users',         1,  1,    'count'),
  ('starter', 'campaigns',     0,  NULL, 'boolean'),
  ('starter', 'approvals',     0,  NULL, 'boolean'),
  ('starter', 'analytics',     0,  NULL, 'boolean'),
  ('starter', 'seo',           1,  NULL, 'boolean'),
  ('starter', 'intelligence',  0,  NULL, 'boolean'),
  ('starter', 'white_label',   0,  NULL, 'boolean'),
  ('starter', 'api_access',    0,  NULL, 'boolean'),
  ('starter', 'storage',       1,  1,    'storage'),
  ('starter', 'workspaces',    0,  NULL, 'boolean');

-- ── GROWTH ────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO plan_entitlements VALUES
  ('growth', 'social_posts',  1,  200,  'monthly'),
  ('growth', 'ai_content',    1,  500,  'monthly'),
  ('growth', 'brands',        1,  3,    'count'),
  ('growth', 'users',         1,  5,    'count'),
  ('growth', 'campaigns',     1,  NULL, 'boolean'),
  ('growth', 'approvals',     1,  NULL, 'boolean'),
  ('growth', 'analytics',     1,  NULL, 'boolean'),
  ('growth', 'seo',           1,  NULL, 'boolean'),
  ('growth', 'intelligence',  1,  NULL, 'boolean'),
  ('growth', 'white_label',   0,  NULL, 'boolean'),
  ('growth', 'api_access',    0,  NULL, 'boolean'),
  ('growth', 'storage',       1,  10,   'storage'),
  ('growth', 'workspaces',    0,  NULL, 'boolean');

-- ── PRO ───────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO plan_entitlements VALUES
  ('pro', 'social_posts',  1,  NULL, 'monthly'),
  ('pro', 'ai_content',    1,  NULL, 'monthly'),
  ('pro', 'brands',        1,  10,   'count'),
  ('pro', 'users',         1,  20,   'count'),
  ('pro', 'campaigns',     1,  NULL, 'boolean'),
  ('pro', 'approvals',     1,  NULL, 'boolean'),
  ('pro', 'analytics',     1,  NULL, 'boolean'),
  ('pro', 'seo',           1,  NULL, 'boolean'),
  ('pro', 'intelligence',  1,  NULL, 'boolean'),
  ('pro', 'white_label',   1,  NULL, 'boolean'),
  ('pro', 'api_access',    1,  NULL, 'boolean'),
  ('pro', 'storage',       1,  50,   'storage'),
  ('pro', 'workspaces',    1,  NULL, 'boolean');

-- ── AGENCY ────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO plan_entitlements VALUES
  ('agency', 'social_posts',  1,  NULL, 'monthly'),
  ('agency', 'ai_content',    1,  NULL, 'monthly'),
  ('agency', 'brands',        1,  NULL, 'count'),
  ('agency', 'users',         1,  NULL, 'count'),
  ('agency', 'campaigns',     1,  NULL, 'boolean'),
  ('agency', 'approvals',     1,  NULL, 'boolean'),
  ('agency', 'analytics',     1,  NULL, 'boolean'),
  ('agency', 'seo',           1,  NULL, 'boolean'),
  ('agency', 'intelligence',  1,  NULL, 'boolean'),
  ('agency', 'white_label',   1,  NULL, 'boolean'),
  ('agency', 'api_access',    1,  NULL, 'boolean'),
  ('agency', 'storage',       1,  NULL, 'storage'),
  ('agency', 'workspaces',    1,  NULL, 'boolean');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PLAN VERSIONS (snapshot every admin edit)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_versions (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  plan_id      TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,  -- full plans row + entitlements array at time of change
  changed_by   TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

PRAGMA foreign_keys = ON;
