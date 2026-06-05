-- 121: Add missing columns needed by vault approval workflow
-- Fixes 500 errors in /api/customer/vault/approvals and /api/customer/vault/:id/approval

-- content_vault: share_for_approval flag used by approval submit + approval list query
ALTER TABLE content_vault ADD COLUMN share_for_approval INTEGER NOT NULL DEFAULT 0;

-- approval_requests: columns referenced in vaultApproval INSERT that weren't in any prior migration
ALTER TABLE approval_requests ADD COLUMN content_type TEXT;
ALTER TABLE approval_requests ADD COLUMN approved_by TEXT;
ALTER TABLE approval_requests ADD COLUMN approved_at TEXT;
ALTER TABLE approval_requests ADD COLUMN rejected_by TEXT;
ALTER TABLE approval_requests ADD COLUMN rejection_reason TEXT;
