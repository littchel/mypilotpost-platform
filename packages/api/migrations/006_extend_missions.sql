-- =========================================================
-- Extend missions table for content engine
-- =========================================================

PRAGMA foreign_keys = OFF;

ALTER TABLE missions ADD COLUMN customer_id TEXT;
ALTER TABLE missions ADD COLUMN entity_type TEXT;
ALTER TABLE missions ADD COLUMN entity_id TEXT;

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_missions_customer
  ON missions (customer_id);

CREATE INDEX IF NOT EXISTS idx_missions_entity
  ON missions (entity_type, entity_id);
