-- 100_signup_source.sql: Track signup source and extend audit with intake form fields
ALTER TABLE users ADD COLUMN signup_source TEXT DEFAULT 'direct';
ALTER TABLE brand_audit_results_v2 ADD COLUMN industry TEXT;
ALTER TABLE brand_audit_results_v2 ADD COLUMN goals_json TEXT;
ALTER TABLE brand_audit_results_v2 ADD COLUMN platforms_json TEXT;
