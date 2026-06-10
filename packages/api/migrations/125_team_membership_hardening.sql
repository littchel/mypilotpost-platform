-- 125_team_membership_hardening.sql
-- Team & Collaboration Engine Certification — brand_users / team_members sync.
--
-- CODE FIXES (in this release, not SQL):
--   team/members.js removeMember    — now also deletes from brand_users (canonical auth table).
--                                     Previously only deleted from team_members, so removed
--                                     members still passed requireAuth middleware indefinitely.
--   team/members.js updateMemberRole — now also updates brand_users.role so the middleware
--                                     sees the new role immediately.
--   teams/handlers.js acceptInvite  — brand_users INSERT now uses invite.role (was hardcoded
--                                     'member'), and updates on conflict instead of DO NOTHING.
--                                     Also verifies the accepting user's email matches the
--                                     invite.email before granting access.
--   content/vault.js vaultApproval  — "approve" action now enforces owner/admin/approver check
--                                     (matching the identical guard in collaboration.js).
--
-- BACKFILL: Sync brand_users.role from team_members for existing members whose brand_users
-- row was created with the hardcoded 'member' default from the old acceptInvite code.
-- Only updates rows where brand_users.role = 'member' AND team_members has a more specific
-- role. Owners are excluded (their role is set correctly at brand creation time).

UPDATE brand_users
SET role = (
  SELECT tm.role
  FROM team_members tm
  WHERE tm.user_id  = brand_users.user_id
    AND tm.brand_id = brand_users.brand_id
  LIMIT 1
)
WHERE brand_users.role = 'member'
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id  = brand_users.user_id
      AND tm.brand_id = brand_users.brand_id
      AND tm.role NOT IN ('member')
  );
