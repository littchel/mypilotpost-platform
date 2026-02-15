-- 003_seo_center.sql
-- myPilotPost — Milestone 2: SEO Center (Native Intelligence)
-- STATUS: CANON-LOCKED

-- =====================================================
-- 1. Brand Knowledge Graph
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_brand_knowledge (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  brand_name TEXT NOT NULL,
  brand_variations TEXT,          -- JSON array
  industry TEXT,

  offerings TEXT,                 -- JSON array
  target_audiences TEXT,          -- JSON array
  target_locations TEXT,          -- JSON array

  language_signals TEXT,          -- JSON (tone, intent)
  notes TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- =====================================================
-- 2. SEO Keywords
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_keywords (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  keyword TEXT NOT NULL,
  intent TEXT,                    -- informational / commercial / local
  priority INTEGER DEFAULT 0,

  created_at TEXT NOT NULL
);

-- =====================================================
-- 3. Keyword → Blog Mapping
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_keyword_targets (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  keyword_id TEXT NOT NULL,
  blog_post_id TEXT NOT NULL,

  created_at TEXT NOT NULL
);

-- =====================================================
-- 4. Rank History (Location-Aware, Append-Only)
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_rank_history (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  keyword_id TEXT NOT NULL,
  blog_post_id TEXT,

  location TEXT NOT NULL,
  rank INTEGER,                   -- NULL = not ranking
  url TEXT,

  checked_at TEXT NOT NULL
);

-- =====================================================
-- 5. SEO Audits (Snapshot-Based)
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_audits (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  blog_post_id TEXT NOT NULL,
  audit_type TEXT NOT NULL,        -- on-page / structure / content

  created_at TEXT NOT NULL
);

-- =====================================================
-- 6. SEO Audit Issues (Explainable)
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_audit_issues (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,

  issue_code TEXT NOT NULL,
  severity TEXT NOT NULL,          -- low / medium / high
  description TEXT NOT NULL,
  recommendation TEXT,

  created_at TEXT NOT NULL
);

-- =====================================================
-- 7. Local SEO Signals
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_local_signals (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  location TEXT NOT NULL,
  keyword_id TEXT,

  signal_type TEXT NOT NULL,       -- coverage_gap / weak_presence
  notes TEXT,

  created_at TEXT NOT NULL
);

-- =====================================================
-- 8. E-commerce SEO Signals
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_ecommerce_signals (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,

  external_ref TEXT,               -- product/category external ID
  signal_type TEXT NOT NULL,       -- thin_content / duplicate
  notes TEXT,

  created_at TEXT NOT NULL
);
