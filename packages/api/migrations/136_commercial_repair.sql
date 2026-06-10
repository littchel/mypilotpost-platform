-- Migration: 136_commercial_repair.sql
-- COMMERCIAL HOTFIX — idempotent repair
--
-- 1. Registers migration 135 in d1_migrations (was applied manually, never tracked)
-- 2. Recreates commercial tables IF NOT EXISTS (safe to run on any environment)
-- 3. Re-seeds feature catalog and entitlements with INSERT OR IGNORE
-- 4. Cannot ALTER billing_interval/limits defaults in SQLite — app code owns defaults

PRAGMA foreign_keys = OFF;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Mark migration 135 as applied so the tracker is consistent
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('135_commercial_system.sql');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill: slug = id for any rows that are NULL (safe if slug already set)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE plans SET slug = id WHERE slug IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Commercial tables (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_features (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'core',
  visible     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_entitlements (
  plan_id     TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  limit_value INTEGER,
  limit_type  TEXT NOT NULL DEFAULT 'boolean',
  PRIMARY KEY (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS plan_versions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  plan_id       TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  changed_by    TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Feature catalog (idempotent re-seed)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO plan_features (key, name, description, category) VALUES
  ('social_posts',   'Social Posts',          'Schedule and publish to social platforms',         'publishing'),
  ('ai_content',     'AI Content Generation', 'Generate post copy and images with AI',             'ai'),
  ('brands',         'Brands',                'Number of brands managed per account',              'core'),
  ('users',          'Team Members',          'Number of team seat licences',                      'core'),
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
-- 5. Default entitlements for existing plans (INSERT OR IGNORE = safe)
-- ─────────────────────────────────────────────────────────────────────────────

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
  ('starter', 'workspaces',    0,  NULL, 'boolean'),
  ('growth',  'social_posts',  1,  200,  'monthly'),
  ('growth',  'ai_content',    1,  500,  'monthly'),
  ('growth',  'brands',        1,  3,    'count'),
  ('growth',  'users',         1,  5,    'count'),
  ('growth',  'campaigns',     1,  NULL, 'boolean'),
  ('growth',  'approvals',     1,  NULL, 'boolean'),
  ('growth',  'analytics',     1,  NULL, 'boolean'),
  ('growth',  'seo',           1,  NULL, 'boolean'),
  ('growth',  'intelligence',  1,  NULL, 'boolean'),
  ('growth',  'white_label',   0,  NULL, 'boolean'),
  ('growth',  'api_access',    0,  NULL, 'boolean'),
  ('growth',  'storage',       1,  10,   'storage'),
  ('growth',  'workspaces',    0,  NULL, 'boolean'),
  ('pro',     'social_posts',  1,  NULL, 'monthly'),
  ('pro',     'ai_content',    1,  NULL, 'monthly'),
  ('pro',     'brands',        1,  10,   'count'),
  ('pro',     'users',         1,  20,   'count'),
  ('pro',     'campaigns',     1,  NULL, 'boolean'),
  ('pro',     'approvals',     1,  NULL, 'boolean'),
  ('pro',     'analytics',     1,  NULL, 'boolean'),
  ('pro',     'seo',           1,  NULL, 'boolean'),
  ('pro',     'intelligence',  1,  NULL, 'boolean'),
  ('pro',     'white_label',   1,  NULL, 'boolean'),
  ('pro',     'api_access',    1,  NULL, 'boolean'),
  ('pro',     'storage',       1,  50,   'storage'),
  ('pro',     'workspaces',    1,  NULL, 'boolean'),
  ('agency',  'social_posts',  1,  NULL, 'monthly'),
  ('agency',  'ai_content',    1,  NULL, 'monthly'),
  ('agency',  'brands',        1,  NULL, 'count'),
  ('agency',  'users',         1,  NULL, 'count'),
  ('agency',  'campaigns',     1,  NULL, 'boolean'),
  ('agency',  'approvals',     1,  NULL, 'boolean'),
  ('agency',  'analytics',     1,  NULL, 'boolean'),
  ('agency',  'seo',           1,  NULL, 'boolean'),
  ('agency',  'intelligence',  1,  NULL, 'boolean'),
  ('agency',  'white_label',   1,  NULL, 'boolean'),
  ('agency',  'api_access',    1,  NULL, 'boolean'),
  ('agency',  'storage',       1,  NULL, 'storage'),
  ('agency',  'workspaces',    1,  NULL, 'boolean');

PRAGMA foreign_keys = ON;
