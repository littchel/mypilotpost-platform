-- myPilotPost — Visual Feature Performance table for Bayesian priors
CREATE TABLE IF NOT EXISTS visual_feature_performance (
  brand_id TEXT NOT NULL,
  feature_name TEXT NOT NULL, -- e.g. 'human', 'professional', 'minimal', 'general'
  impressions INTEGER DEFAULT 1,
  clicks INTEGER DEFAULT 0,
  PRIMARY KEY (brand_id, feature_name)
);

-- Seed baseline visual categories with smoothed priors for existing brands
INSERT OR IGNORE INTO visual_feature_performance (brand_id, feature_name, impressions, clicks)
SELECT DISTINCT brand_id, 'human', 10, 2 FROM brand_dna_profiles;

INSERT OR IGNORE INTO visual_feature_performance (brand_id, feature_name, impressions, clicks)
SELECT DISTINCT brand_id, 'professional', 10, 2 FROM brand_dna_profiles;

INSERT OR IGNORE INTO visual_feature_performance (brand_id, feature_name, impressions, clicks)
SELECT DISTINCT brand_id, 'minimal', 10, 1 FROM brand_dna_profiles;

INSERT OR IGNORE INTO visual_feature_performance (brand_id, feature_name, impressions, clicks)
SELECT DISTINCT brand_id, 'general', 10, 1 FROM brand_dna_profiles;
