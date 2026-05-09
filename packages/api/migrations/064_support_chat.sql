-- packages/api/migrations/064_support_chat.sql
-- Description: Add support chat messaging system

-- 1. Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_sender ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_receiver ON support_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_support_thread ON support_messages(sender_id, receiver_id);

-- 3. Admin Audit Logs (Ensuring table exists and has necessary structure)
-- (Already exists in 063, but we might add extra columns if needed in future)
