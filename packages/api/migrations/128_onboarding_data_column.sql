-- ENGINE 17: Add missing data column to onboarding_progress.
-- Migration 012 created the table without a data column.
-- Migrations 035 and 066 used CREATE TABLE IF NOT EXISTS (no-op since table existed).
-- This ALTER TABLE finally adds the column so updateOnboardingStep can persist step data.

ALTER TABLE onboarding_progress ADD COLUMN data TEXT;
