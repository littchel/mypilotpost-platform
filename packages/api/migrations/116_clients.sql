-- myPilotPost — Clients & Client Links
-- Clients are external stakeholders who receive approvals and reports.
-- Separate from team_members (internal) — clients never have app login.

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  brand_id    TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,                 -- WhatsApp-capable number e.g. +27821234567
  company     TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'active', -- active | archived
  created_by  TEXT,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_brand ON clients(brand_id);

CREATE TABLE IF NOT EXISTS client_links (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id    TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'approval', -- approval | report | invite
  entity_id   TEXT,                             -- content_id or report_id
  expires_at  DATETIME,
  accessed_at DATETIME,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_client_links_token    ON client_links(token);
CREATE INDEX IF NOT EXISTS idx_client_links_client   ON client_links(client_id);
