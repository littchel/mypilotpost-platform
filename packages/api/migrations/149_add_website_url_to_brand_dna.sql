-- 149_add_website_url_to_brand_dna.sql: Add website_url column to Brand DNA profiles
ALTER TABLE brand_dna_profiles ADD COLUMN website_url TEXT;
