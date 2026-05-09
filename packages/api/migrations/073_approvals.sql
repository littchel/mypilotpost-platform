-- 073_approvals.sql: Content Approval Workflow
-- Tracks lifecycle from Draft -> Pending -> Approved -> Published

-- 1. Approval Requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_type TEXT NOT NULL DEFAULT 'internal' CHECK (reviewer_type IN ('internal', 'client', 'agency')),
  reviewer_id TEXT, -- User ID who performed the action
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
  -- FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE -- Adjust based on actual content table name
);

-- 2. Content Shares table (Expiring preview links)
CREATE TABLE IF NOT EXISTS content_shares (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('public_preview', 'client_review', 'whatsapp')),
  access_token_hash TEXT NOT NULL UNIQUE, -- Hashed for security
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TEXT,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_approval_content ON approval_requests(content_id);
CREATE INDEX IF NOT EXISTS idx_approval_brand ON approval_requests(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_shares_token ON content_shares(access_token_hash);
