-- Migration: 101_admin_promotions.sql
-- Admin-controlled promo codes, holiday specials, and discount campaigns.

CREATE TABLE IF NOT EXISTS promotions (
  id           TEXT PRIMARY KEY,
  code         TEXT UNIQUE NOT NULL,           -- e.g. LAUNCH50, HOLIDAY2025
  name         TEXT,                           -- display name
  description  TEXT,
  discount_type TEXT NOT NULL,                 -- percent | fixed | trial_days
  discount_value REAL NOT NULL,                -- e.g. 50 (for 50% or R50 or 14 days)
  applies_to   TEXT DEFAULT 'all',             -- all | plan:growth | plan:agency
  max_uses     INTEGER,                        -- NULL = unlimited
  uses_count   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  is_public    INTEGER NOT NULL DEFAULT 0,     -- show on pricing page
  badge        TEXT,                           -- e.g. "Holiday Special"
  expires_at   TEXT,
  created_by   TEXT,                           -- admin user_id
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_promotions_code     ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active   ON promotions(is_active, expires_at);

-- Track which users have redeemed which promo
CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id           TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(promotion_id, user_id)
);
