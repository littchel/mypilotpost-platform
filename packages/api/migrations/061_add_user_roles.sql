-- =========================================
-- Migration: 061_add_user_roles.sql
-- Description: Add role-based access control to users
-- =========================================

-- 1. Add role column to users
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Note: In a production environment, we would also run a script to 
-- upgrade specific accounts to 'admin' role.
