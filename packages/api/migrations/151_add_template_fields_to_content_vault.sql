-- Migration to add template layout and rendering fields to content_vault
ALTER TABLE content_vault ADD COLUMN template_id TEXT;
ALTER TABLE content_vault ADD COLUMN layout_manifest TEXT;
ALTER TABLE content_vault ADD COLUMN rendered_preview_url TEXT;
