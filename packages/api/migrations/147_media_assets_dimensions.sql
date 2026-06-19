-- Migration: 147_media_assets_dimensions.sql
-- Description: Add width, height, and duration_seconds columns to media_assets

ALTER TABLE media_assets ADD COLUMN width INTEGER;
ALTER TABLE media_assets ADD COLUMN height INTEGER;
ALTER TABLE media_assets ADD COLUMN duration_seconds INTEGER;
