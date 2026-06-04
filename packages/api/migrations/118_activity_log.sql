-- myPilotPost — Team Activity Log
-- Tracks all meaningful team/client/content actions with before/after state.

CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY,
  brand_id    TEXT NOT NULL,
  actor_id    TEXT,              -- user_id who performed the action (null = system)
  actor_name  TEXT,              -- denormalized for display without joins
  actor_type  TEXT DEFAULT 'user', -- user | system | client
  action      TEXT NOT NULL,     -- e.g. content.approved, member.invited, report.shared
  entity_type TEXT,              -- content | member | client | report | approval
  entity_id   TEXT,
  entity_label TEXT,             -- human-readable name of the entity
  before_state TEXT,             -- JSON snapshot before
  after_state  TEXT,             -- JSON snapshot after
  metadata    TEXT,              -- JSON extra context
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_brand  ON activity_log(brand_id);
CREATE INDEX IF NOT EXISTS idx_activity_actor  ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_time   ON activity_log(created_at DESC);
