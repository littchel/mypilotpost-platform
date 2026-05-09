-- 081_brand_audit_v2.sql: Agency-Grade Audit Engine
-- Supports Public Lead Gen + Full Strategic Reporting

-- 1. Hardened Audit Results
CREATE TABLE IF NOT EXISTS brand_audit_results_v2 (
  id TEXT PRIMARY KEY,
  brand_id TEXT, -- NULL for public audits
  lead_id TEXT,  -- For unauthenticated users
  brand_name TEXT,
  website_url TEXT,
  social_handles TEXT, -- JSON array
  overall_score INTEGER NOT NULL,
  score_breakdown_json TEXT NOT NULL, -- JSON: {consistency, quality, engagement, etc}
  strategic_actions_json TEXT NOT NULL, -- JSON array of {metric, cause, impact, recommendation}
  next_steps_json TEXT NOT NULL, -- JSON array of strings
  full_report_json TEXT, -- All 10 sections
  preview_mode INTEGER DEFAULT 1,
  locked_sections_count INTEGER DEFAULT 6,
  unlocked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Public Audit Leads (Acquisition tracking)
CREATE TABLE IF NOT EXISTS public_audit_leads (
  id TEXT PRIMARY KEY,
  email TEXT, -- Collected later in funnel
  brand_name TEXT,
  website_url TEXT,
  audit_id TEXT,
  converted_user_id TEXT, -- Linked after signup
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (audit_id) REFERENCES brand_audit_results_v2(id)
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_audit_brand ON brand_audit_results_v2(brand_id);
CREATE INDEX IF NOT EXISTS idx_audit_lead ON brand_audit_results_v2(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_public ON brand_audit_results_v2(preview_mode);
