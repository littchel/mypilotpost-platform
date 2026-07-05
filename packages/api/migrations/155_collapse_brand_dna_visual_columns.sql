-- Migration: Collapse legacy visual columns into migration-153 columns in brand_dna_visual_identity
--
-- 1. Copy values from old columns to new columns if new columns are not set
UPDATE brand_dna_visual_identity
SET 
  primary_color_hex = COALESCE(primary_color, primary_color_hex),
  secondary_color_hex = COALESCE(secondary_color, secondary_color_hex),
  font_pairing_headline = COALESCE(typography_heading, font_pairing_headline),
  font_pairing_body = COALESCE(typography_main, font_pairing_body)
WHERE primary_color IS NOT NULL OR secondary_color IS NOT NULL OR typography_heading IS NOT NULL OR typography_main IS NOT NULL;

-- 2. Drop the redundant legacy columns
ALTER TABLE brand_dna_visual_identity DROP COLUMN primary_color;
ALTER TABLE brand_dna_visual_identity DROP COLUMN secondary_color;
ALTER TABLE brand_dna_visual_identity DROP COLUMN typography_heading;
ALTER TABLE brand_dna_visual_identity DROP COLUMN typography_main;
