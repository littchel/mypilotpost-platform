-- 121: Add missing columns needed by vault approval workflow
-- approval_requests audit columns already present from 088/115 — content_vault only

ALTER TABLE content_vault ADD COLUMN share_for_approval INTEGER NOT NULL DEFAULT 0;
