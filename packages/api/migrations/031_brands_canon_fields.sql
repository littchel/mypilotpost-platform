-- packages/api/migrations/031_brands_canon_fields.sql

-- Add missing timezone column to brands to align with Canon 2
ALTER TABLE brands ADD COLUMN timezone TEXT DEFAULT 'UTC';
