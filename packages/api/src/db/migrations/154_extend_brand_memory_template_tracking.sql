-- Migration to extend brand_memory with template performance and preferences
ALTER TABLE brand_memory ADD COLUMN preferred_template_id VARCHAR(100);
ALTER TABLE brand_memory ADD COLUMN template_performance TEXT; -- TEXT stores JSON representation in SQLite
