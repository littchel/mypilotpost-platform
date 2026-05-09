-- 052_promotions_engine.sql
-- Viral Growth Loop & Referral Engine

-- 1. REFERRAL CODES
-- Unique per user, human-friendly (e.g., MP-LITTCHEL-8X2K)
CREATE TABLE IF NOT EXISTS referral_codes (
    user_id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. REFERRALS (THE LOG)
-- Status machine: pending -> completed -> rewarded
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_user_id TEXT NOT NULL,
    referred_user_id TEXT NOT NULL UNIQUE, -- One user can only be referred once
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, rewarded
    risk_level TEXT NOT NULL DEFAULT 'low', -- low, medium, high
    risk_score INTEGER DEFAULT 0,
    metadata_json TEXT, -- Capture IP, User-Agent, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    rewarded_at DATETIME,
    FOREIGN KEY (referrer_user_id) REFERENCES users(id),
    FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

-- 3. PROMOTION REWARDS
-- Audit log of granted benefits
CREATE TABLE IF NOT EXISTS promotion_rewards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    referral_id TEXT UNIQUE, -- Ensures one reward per referral (idempotency)
    type TEXT NOT NULL, -- trial_extension, feature_unlock
    value INTEGER NOT NULL, -- days or credits
    source TEXT NOT NULL, -- referral, campaign, manual
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (referral_id) REFERENCES referrals(id)
);

-- 4. SUBSCRIPTION EXTENSIONS
-- Adding fields to track non-standard time
ALTER TABLE subscriptions ADD COLUMN trial_extended_until DATETIME;
ALTER TABLE subscriptions ADD COLUMN referral_credits INTEGER DEFAULT 0;

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_promotion_rewards_user ON promotion_rewards(user_id);
