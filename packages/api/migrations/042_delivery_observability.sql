-- Migration: 042_delivery_observability.sql
-- Description: Adds delivery_attempts tracking and last_error logging for resilience pass.

-- 1. Add delivery_attempts to delivery_jobs (Defaulting to 0 for atomic counter)
ALTER TABLE delivery_jobs ADD COLUMN delivery_attempts INTEGER DEFAULT 0;

-- 2. Add last_error to delivery_jobs (For activity feed normalization)
ALTER TABLE delivery_jobs ADD COLUMN last_error TEXT;

-- 3. Add external_error_message to delivery_jobs (Optional storage for raw platform errors)
ALTER TABLE delivery_jobs ADD COLUMN external_error_message TEXT;

-- 4. Re-Initialize indices for attempt-aware lookups
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_brand_attempts ON delivery_jobs (brand_id, delivery_attempts);
