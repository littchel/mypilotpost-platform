-- 082_brand_dna_foundation.sql: Strategic Grounding Layer
-- Supports Brand DNA Profiles, Audience, Voice, Content Pillars, Visual Identity, and Business Objectives

-- 1. Brand DNA Profile (Core Identity)
CREATE TABLE IF NOT EXISTS brand_dna_profiles (
  brand_id TEXT PRIMARY KEY,
  mission TEXT,
  vision TEXT,
  positioning TEXT,
  value_proposition TEXT,
  industry TEXT,
  brand_personality TEXT, -- JSON array of traits
  differentiators TEXT, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 2. Brand DNA Audience (ICP)
CREATE TABLE IF NOT EXISTS brand_dna_audience (
  brand_id TEXT PRIMARY KEY,
  icp_name TEXT,
  demographics TEXT, -- JSON object
  psychographics TEXT, -- JSON object
  pain_points TEXT, -- JSON array
  desires TEXT, -- JSON array
  objections TEXT, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 3. Brand DNA Voice & Tone
CREATE TABLE IF NOT EXISTS brand_dna_voice (
  brand_id TEXT PRIMARY KEY,
  voice_traits TEXT, -- JSON array
  forbidden_language TEXT, -- JSON array
  cta_style TEXT,
  messaging_style TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 4. Brand DNA Content Pillars
CREATE TABLE IF NOT EXISTS brand_dna_content_pillars (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  preferred_formats TEXT, -- JSON array
  posting_goals TEXT,
  authority_goals TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 5. Brand DNA Visual Identity
CREATE TABLE IF NOT EXISTS brand_dna_visual_identity (
  brand_id TEXT PRIMARY KEY,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  typography_main TEXT,
  typography_heading TEXT,
  visual_direction TEXT,
  imagery_style TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 6. Brand DNA Objectives
CREATE TABLE IF NOT EXISTS brand_dna_objectives (
  brand_id TEXT PRIMARY KEY,
  awareness_goal TEXT,
  leads_goal TEXT,
  conversions_goal TEXT,
  retention_goal TEXT,
  seo_goal TEXT,
  authority_goal TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 7. Brand DNA Competitors
CREATE TABLE IF NOT EXISTS brand_dna_competitors (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL,
  website_url TEXT,
  strengths TEXT, -- JSON array
  weaknesses TEXT, -- JSON array
  strategy_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 8. Indices
CREATE INDEX IF NOT EXISTS idx_dna_pillars_brand ON brand_dna_content_pillars(brand_id);
CREATE INDEX IF NOT EXISTS idx_dna_competitors_brand ON brand_dna_competitors(brand_id);
