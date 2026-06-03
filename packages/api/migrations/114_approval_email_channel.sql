-- 114: Approval email channel fields
ALTER TABLE approval_requests ADD COLUMN reviewer_email TEXT;
ALTER TABLE approval_requests ADD COLUMN channel TEXT DEFAULT 'dashboard';
ALTER TABLE approval_requests ADD COLUMN email_sent_at TEXT;
