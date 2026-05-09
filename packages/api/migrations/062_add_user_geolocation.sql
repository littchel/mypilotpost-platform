-- Migration: Add Geolocation and Regional Pricing Data to Users
-- Description: Tracks user country and region for regional pricing support.

-- Add country column
ALTER TABLE users ADD COLUMN country TEXT;

-- Add region column
ALTER TABLE users ADD COLUMN region TEXT;

-- Index for region-based queries
CREATE INDEX idx_users_region ON users(region);
