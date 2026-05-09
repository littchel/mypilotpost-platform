-- packages/api/migrations/058_analytical_history.sql

-- Strategic Hardening: AI Growth Strategy Report Engine
-- Stores agency-grade reports with public sharing and historical deltas
CREATE TABLE IF NOT EXISTS brand_growth_reports (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    public_id TEXT UNIQUE NOT NULL, -- UUID for external branded sharing
    is_public BOOLEAN DEFAULT FALSE,
    report_type TEXT DEFAULT 'strategy', -- strategy, campaign, monthly
    content_json TEXT NOT NULL, -- Strategic SWOT, Projections, Roadmap
    score_at_time INTEGER, -- For delta tracking
    previous_report_id TEXT, -- Link to last report for evolution analysis
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_brand ON brand_growth_reports(brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_public ON brand_growth_reports(public_id);
