-- Migration to extend brand_dna_visual_identity table with design visuals fields
ALTER TABLE brand_dna_visual_identity ADD COLUMN primary_color_hex VARCHAR(7) DEFAULT '#1A73E8';
ALTER TABLE brand_dna_visual_identity ADD COLUMN secondary_color_hex VARCHAR(7) DEFAULT '#34A853';
ALTER TABLE brand_dna_visual_identity ADD COLUMN font_pairing_headline VARCHAR(100) DEFAULT 'Inter';
ALTER TABLE brand_dna_visual_identity ADD COLUMN font_pairing_body VARCHAR(100) DEFAULT 'Inter';
ALTER TABLE brand_dna_visual_identity ADD COLUMN logo_asset_url TEXT NULL;
ALTER TABLE brand_dna_visual_identity ADD COLUMN visual_style VARCHAR(20) DEFAULT 'minimal';
ALTER TABLE brand_dna_visual_identity ADD COLUMN watermark_position VARCHAR(20) DEFAULT 'bottom_right';
ALTER TABLE brand_dna_visual_identity ADD COLUMN background_preference VARCHAR(20) DEFAULT 'light';
