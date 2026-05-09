-- packages/api/scripts/seed.sql

-- 1. Insert Test User (password: password123)
INSERT INTO users (id, email, password_hash, verified_at, created_at)
VALUES (
  'test-user-uuid', 
  'test@mypilotpost.com', 
  '9123e4932c7f396bc59a5a1dfa6c611b:84f276c1d25afda4fc7d5d95988422fa337893b91b0e333a5b5d2e87381c2cdf', 
  datetime('now'), 
  datetime('now')
);

-- 2. Insert Test Brand
INSERT INTO brands (id, name, industry, created_at)
VALUES (
  'test-brand-uuid', 
  'Test Aviation', 
  'Aviation', 
  datetime('now')
);

-- 3. Link User to Brand
INSERT INTO brand_users (id, brand_id, user_id, role, created_at)
VALUES (
  'test-link-uuid', 
  'test-brand-uuid', 
  'test-user-uuid', 
  'owner', 
  datetime('now')
);
