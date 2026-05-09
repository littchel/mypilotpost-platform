-- Migration: 043_system_intelligence.sql
-- Description: Adds delivery analytics and platform health monitoring tables.

-- 1. Delivery Analytics (Tracks normalized error counts)
CREATE TABLE IF NOT EXISTS delivery_analytics (
    brand_id TEXT,
    platform TEXT,
    error_type TEXT,
    count INTEGER DEFAULT 0,
    last_occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (brand_id, platform, error_type)
);

-- 2. Platform Health Monitoring
CREATE TABLE IF NOT EXISTS platform_health (
    platform TEXT PRIMARY KEY,
    status TEXT DEFAULT 'healthy', -- 'healthy' or 'degraded'
    failure_count INTEGER DEFAULT 0,
    last_failure_at DATETIME,
    last_success_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Initialize health status for core platforms
INSERT OR IGNORE INTO platform_health (platform, status) VALUES ('instagram', 'healthy');
INSERT OR IGNORE INTO platform_health (platform, status) VALUES ('facebook', 'healthy');
INSERT OR IGNORE INTO platform_health (platform, status) VALUES ('linkedin', 'healthy');
INSERT OR IGNORE INTO platform_health (platform, status) VALUES ('tiktok', 'healthy');

-- 4. Index for fast analytical lookups
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_brand ON delivery_analytics (brand_id);
CREATE INDEX IF NOT EXISTS idx_platform_health_status ON platform_health (status);
