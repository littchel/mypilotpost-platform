-- packages/api/migrations/071_saas_multi_tenant_hardening.sql
-- Enforcing strict brand-scoped architecture and global lifecycle logic.

-- 1. Ensure brand_id and user_id on core content tables
ALTER TABLE content_context ADD COLUMN user_id TEXT;
ALTER TABLE social_assets ADD COLUMN user_id TEXT;
ALTER TABLE blog_posts ADD COLUMN user_id TEXT;
ALTER TABLE media_assets ADD COLUMN user_id TEXT;
ALTER TABLE campaigns ADD COLUMN user_id TEXT;
ALTER TABLE content_delivery_jobs ADD COLUMN brand_id TEXT;
ALTER TABLE content_delivery_jobs ADD COLUMN user_id TEXT;
ALTER TABLE content_engagement_metrics ADD COLUMN brand_id TEXT;
ALTER TABLE content_engagement_metrics ADD COLUMN user_id TEXT;

-- 2. Global Lifecycle Support
-- draft, pending_approval, approved, scheduled, published, rejected
ALTER TABLE social_assets ADD COLUMN lifecycle_status TEXT DEFAULT 'draft';
ALTER TABLE blog_posts ADD COLUMN lifecycle_status TEXT DEFAULT 'draft';

-- 3. Approval Tracking Table
CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL, -- 'social' | 'blog'
    brand_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    approved_at TEXT,
    rejected_by TEXT,
    rejection_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- 4. Growth Engine Anti-Abuse Log
CREATE TABLE IF NOT EXISTS growth_activity_log (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL, -- 'publish_success', 'approval_received', 'campaign_completed'
    content_id TEXT,
    brand_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Brand Reporting Snapshots
CREATE TABLE IF NOT EXISTS brand_reports (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    report_data TEXT NOT NULL, -- JSON snapshot of published metrics
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- 6. Unified Messaging (Chat)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    type TEXT DEFAULT 'team', -- 'team' | 'assistant' | 'support'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- 7. Hardened Indexes
CREATE INDEX IF NOT EXISTS idx_social_brand_user ON social_assets(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_social_lifecycle ON social_assets(brand_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_blog_brand_user ON blog_posts(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_blog_lifecycle ON blog_posts(brand_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_campaign_brand_user ON campaigns(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_brand ON content_delivery_jobs(brand_id);
CREATE INDEX IF NOT EXISTS idx_approval_content ON approval_requests(content_id);
CREATE INDEX IF NOT EXISTS idx_growth_brand ON growth_activity_log(brand_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_brand ON messages(thread_id, brand_id);

-- 8. Data Migration (Optional/Safety)
-- Linking existing data to the user's primary brand where missing
-- This is handled by handlers at runtime for existing orphans if needed.
