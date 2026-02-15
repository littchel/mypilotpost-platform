-- =========================================
-- Milestone 3: Campaign Engine (Growth Logic)
-- Migration: 004_campaigns.sql
-- Status: FINAL / LOCKED
-- Database: Cloudflare D1 (SQLite)
-- =========================================


-- ======================================================
-- 1. Campaigns
-- Core growth container. Mandatory for all content.
-- ======================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL,
  -- planned | active | paused | completed

  start_date TEXT,
  end_date TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand
  ON campaigns (brand_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON campaigns (status);


-- ======================================================
-- 2. Campaign Objectives
-- Explicit declared intent (no inference).
-- ======================================================
CREATE TABLE IF NOT EXISTS campaign_objectives (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,

  objective_type TEXT NOT NULL,
  -- sales | leads | traffic | engagement

  target_value REAL,
  unit TEXT,
  -- revenue | conversions | clicks | impressions

  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_objectives_campaign
  ON campaign_objectives (campaign_id);


-- ======================================================
-- 3. Campaign ↔ Content Links
-- Observational mapping only.
-- Content is owned by Content Engine.
-- ======================================================
CREATE TABLE IF NOT EXISTS campaign_content_links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,

  content_type TEXT NOT NULL,
  -- blog | social

  content_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign
  ON campaign_content_links (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_content_content
  ON campaign_content_links (content_id);


-- ======================================================
-- 4. Campaign Spend Observations
-- Observational spend only (non-operational).
-- ======================================================
CREATE TABLE IF NOT EXISTS campaign_spend_observations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,

  channel TEXT NOT NULL,
  -- google_ads | meta_ads | influencer | other

  amount REAL NOT NULL,
  currency TEXT NOT NULL,

  observed_at TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaign_spend_campaign
  ON campaign_spend_observations (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_spend_time
  ON campaign_spend_observations (observed_at);


-- ======================================================
-- 5. Campaign Outcomes
-- Measured results only. Append-only.
-- ======================================================
CREATE TABLE IF NOT EXISTS campaign_outcomes (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,

  metric TEXT NOT NULL,
  -- revenue | conversions | clicks | impressions

  value REAL NOT NULL,

  source TEXT NOT NULL,
  -- analytics | manual | platform

  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_outcomes_campaign
  ON campaign_outcomes (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_outcomes_metric
  ON campaign_outcomes (metric);

CREATE INDEX IF NOT EXISTS idx_campaign_outcomes_time
  ON campaign_outcomes (observed_at);


-- ======================================================
-- 6. Campaign Incentives
-- Declarative, observational only.
-- No enforcement, no redemption logic.
-- ======================================================
CREATE TABLE IF NOT EXISTS campaign_incentives (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,

  incentive_type TEXT NOT NULL,
  -- discount | free_trial | bonus | bundle | other

  label TEXT NOT NULL,
  -- e.g. "10% Off", "Free Shipping"

  value REAL,
  unit TEXT,
  -- percent | amount | days | items | null

  conditions TEXT,
  -- Plain-text rules, human readable

  starts_at TEXT,
  ends_at TEXT,

  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_incentives_campaign
  ON campaign_incentives (campaign_id);


-- =========================================
-- END OF MIGRATION
-- =========================================
