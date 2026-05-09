-- packages/api/migrations/065_auth_metadata.sql
-- Add user metadata for registration and audit flow

ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN company_name TEXT;
ALTER TABLE users ADD COLUMN audit_website TEXT;
