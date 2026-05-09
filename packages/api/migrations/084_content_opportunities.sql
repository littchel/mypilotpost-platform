-- 084_content_opportunities.sql
-- Content Opportunities Engine — Intelligence-Led Strategic Content System

CREATE TABLE IF NOT EXISTS content_opportunities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,        -- authority_building | engagement_recovery | seo_opportunity | ...
  title TEXT NOT NULL,
  description TEXT,
  strategic_goal TEXT,                   -- awareness | leads | conversions | retention | authority | seo
  target_platform TEXT,                  -- linkedin | instagram | tiktok | x | youtube | blog | all
  content_format TEXT,                   -- short_video | carousel | article | thread | story | reel
  funnel_stage TEXT,                     -- awareness | consideration | decision | retention
  rationale TEXT NOT NULL,               -- WHY this was generated
  source_signal TEXT,                    -- audit | dna | seo | competitor | analytics | growth
  linked_metric TEXT,                    -- Which metric triggered this
  expected_impact TEXT,                  -- Business impact description
  impact_score INTEGER DEFAULT 0,        -- 0-100
  urgency_score INTEGER DEFAULT 0,       -- 0-100
  confidence_score INTEGER DEFAULT 0,    -- 0-100
  opportunity_value INTEGER DEFAULT 0,   -- Combined weighted score
  confidence_level TEXT DEFAULT 'estimated', -- measured | inferred | estimated | benchmarked | user_supplied
  urgency TEXT DEFAULT 'LOW',            -- CRITICAL | HIGH | MEDIUM | LOW
  priority INTEGER DEFAULT 3,            -- 1=highest, 5=lowest
  recommendation_data TEXT,             -- JSON: full structured recommendation
  generated_from TEXT,                   -- 'audit' | 'weekly_run' | 'realtime' | 'manual'
  status TEXT DEFAULT 'pending',         -- pending | accepted | dismissed | completed | expired
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  accepted_at TEXT,
  created_draft_id TEXT,                 -- FK to content_drafts if draft created
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_strategic_plans (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  week_start TEXT NOT NULL,              -- ISO date: Monday of the week
  week_focus TEXT NOT NULL,              -- The strategic theme for the week
  recommended_platforms TEXT,            -- JSON array
  recommended_cadence INTEGER,           -- posts per week
  content_balance TEXT,                  -- JSON: {educational:40, promotional:20, engagement:40}
  authority_opportunities TEXT,          -- JSON array of opportunity IDs
  seo_opportunities TEXT,               -- JSON array of opportunity IDs
  conversion_opportunities TEXT,         -- JSON array of opportunity IDs
  plan_data TEXT,                        -- Full JSON plan
  status TEXT DEFAULT 'active',
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS opportunity_performance (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  content_id TEXT,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  impact_achieved TEXT,                  -- 'exceeded' | 'met' | 'partial' | 'missed'
  measured_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (opportunity_id) REFERENCES content_opportunities(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_opp_brand ON content_opportunities(brand_id);
CREATE INDEX IF NOT EXISTS idx_opp_status ON content_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opp_urgency ON content_opportunities(urgency);
CREATE INDEX IF NOT EXISTS idx_opp_type ON content_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_weekly_brand ON weekly_strategic_plans(brand_id);
CREATE INDEX IF NOT EXISTS idx_weekly_start ON weekly_strategic_plans(week_start);
