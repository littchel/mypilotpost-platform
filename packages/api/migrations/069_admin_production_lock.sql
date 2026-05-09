-- Migration: 069_admin_production_lock

-- 1. Add is_active column
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;

-- 2. Clean old admin users
DELETE FROM users WHERE email IN (
  'superadmin@mpp.local',
  'admin@test.com'
);
