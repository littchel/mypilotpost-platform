-- packages/api/migrations/035_onboarding_v2.sql
-- Supports the 8-step guided activation flow

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id TEXT PRIMARY KEY,
  current_step INTEGER NOT NULL DEFAULT 1,
  data TEXT, -- JSON blob for step-specific data
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS brand_market_context (
  brand_id TEXT PRIMARY KEY,
  country TEXT DEFAULT 'ZW',
  language TEXT DEFAULT 'en',
  industry TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);
