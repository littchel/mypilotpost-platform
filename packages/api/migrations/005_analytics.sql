-- ============================================================
-- 005_analytics.sql
-- Distribution & Analytics Engine (FINAL, CANON-SAFE)
-- D1 / SQLite compatible
-- ============================================================

-- ------------------------------------------------------------
-- 1. content_delivery_jobs
-- Represents the intent to publish content
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_delivery_jobs (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    platform TEXT NOT NULL,

    scheduled_at TEXT NOT NULL, -- UTC ISO8601
    state TEXT NOT NULL CHECK (
        state IN ('pending', 'scheduled', 'delivering', 'delivered', 'failed')
    ),

    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_state
ON content_delivery_jobs (state);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_scheduled_at
ON content_delivery_jobs (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_campaign
ON content_delivery_jobs (campaign_id);


-- ------------------------------------------------------------
-- 2. content_delivery_attempts
-- Represents each delivery attempt (retry-safe, append-only)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_delivery_attempts (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,

    attempt_number INTEGER NOT NULL,
    started_at TEXT NOT NULL, -- UTC ISO8601
    ended_at TEXT,

    success INTEGER NOT NULL CHECK (success IN (0, 1)),
    error_code TEXT,
    error_message TEXT,

    FOREIGN KEY (job_id) REFERENCES content_delivery_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_job
ON content_delivery_attempts (job_id);


-- ------------------------------------------------------------
-- 3. content_delivery_failures
-- Terminal failures only (one per job max by convention)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_delivery_failures (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    platform TEXT NOT NULL,

    failure_type TEXT NOT NULL,
    failure_reason TEXT NOT NULL,
    failed_at TEXT NOT NULL, -- UTC ISO8601

    FOREIGN KEY (job_id) REFERENCES content_delivery_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_failures_job
ON content_delivery_failures (job_id);


-- ------------------------------------------------------------
-- 4. content_engagement_metrics
-- Raw, platform-reported engagement metrics (observational)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_engagement_metrics (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    platform TEXT NOT NULL,

    metric_type TEXT NOT NULL CHECK (
        metric_type IN (
            'impression',
            'click',
            'like',
            'comment',
            'share',
            'save'
        )
    ),

    value INTEGER NOT NULL,
    reported_at TEXT NOT NULL -- UTC ISO8601
);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_content
ON content_engagement_metrics (content_id);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_platform
ON content_engagement_metrics (platform);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_type
ON content_engagement_metrics (metric_type);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_reported_at
ON content_engagement_metrics (reported_at);


-- ------------------------------------------------------------
-- 5. Canon Notes (NON-EXECUTABLE)
-- ------------------------------------------------------------
-- Distribution writes to campaign_outcomes (defined earlier)
-- Distribution never reads ROI, objectives, or spend
-- No triggers, no cascading deletes, no mutation logic
-- Failures are terminal, visible, and auditable
-- Silence is a bug
