-- 142_social_asset_overlays.sql
-- ITEM 2 — Overlay function. Store the editable overlay state as objects (never flattened).
-- Shape: { background: {url, fit, width, height}, overlay_text: [...], overlay_image: [...] }

ALTER TABLE social_assets ADD COLUMN overlays TEXT;
