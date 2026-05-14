-- packages/api/migrations/064_support_chat.sql
-- Description: Add support chat messaging system

-- 1. Support Messages Table
-- Table already created by 022_notifications_and_chat.sql with (id, thread_id, sender_type, sender_id, message, created_at).
-- Add columns required by support.js INSERT: receiver_id and is_admin_msg.
ALTER TABLE support_messages ADD COLUMN receiver_id TEXT;
ALTER TABLE support_messages ADD COLUMN is_admin_msg INTEGER DEFAULT 0;

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_sender ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_receiver ON support_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_support_thread ON support_messages(sender_id, receiver_id);

-- 3. Admin Audit Logs (Ensuring table exists and has necessary structure)
-- (Already exists in 063, but we might add extra columns if needed in future)
