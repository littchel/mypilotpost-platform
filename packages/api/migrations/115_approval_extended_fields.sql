-- 115: Approval extended fields for Share for Approval v2
ALTER TABLE approval_requests ADD COLUMN reviewer_name TEXT;
ALTER TABLE approval_requests ADD COLUMN reviewer_phone TEXT;
ALTER TABLE approval_requests ADD COLUMN delivery_channels TEXT DEFAULT '["email"]';
ALTER TABLE approval_requests ADD COLUMN expires_at TEXT;
