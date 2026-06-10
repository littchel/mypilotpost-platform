-- Migration: 126_billing_certification.sql
-- Billing Engine Certification — ENGINE 14
--
-- CODE FIXES (in this release, not SQL):
--
--   billing.js checkFeatureAccess     — removed `&& plan.id === 'starter'` AND condition.
--                                       Old logic only blocked Starter users; Growth/Pro users
--                                       could access any feature not in their features_json by
--                                       bypassing the gate entirely. Now features_json is the
--                                       sole authority for all plans.
--
--   billing.js updateSubscription     — now updates BOTH subscriptions AND users tables.
--                                       Previously only updated subscriptions, leaving users.plan_id
--                                       stale. enforcement.js and getCurrentPlan() read from users,
--                                       so plan changes were invisible to enforcement.
--
--   subscription-engine.js            — payment_failed now also sets users.subscription_status =
--                                       'past_due'. Previously only updated subscriptions table;
--                                       enforcement reads from users, so payment failures granted
--                                       continued full access.
--
--   enforcement.js                    — added 'past_due' to blocked status set. Before this fix,
--                                       ['expired','cancelled'] were blocked but 'past_due' was not,
--                                       so payment-failed customers retained full quota access.
--
--   scheduling.js scheduleContent     — now calls checkAndIncrement(db, userId, 'posts') before
--                                       creating delivery jobs. The posts_per_month_limit quota was
--                                       fully defined in enforcement.js but was never called anywhere
--                                       in the content pipeline — every user could schedule unlimited
--                                       posts regardless of plan.
--
-- SQL FIXES:
--
--   1. Fix features_json for all plans using authoritative array format.
--      Migration 068 used INSERT OR IGNORE, so plans seeded earlier (via 051) kept NULL or
--      object-format features_json. These UPDATEs ensure all installations have correct values.
--
--   2. Add 'reports' to Growth and Pro features_json.
--      analytics.js gates report generation behind checkFeatureAccess(_, _, _, 'reports').
--      'reports' was missing from Growth/Pro features_json, so after fixing the AND logic bug,
--      legitimate Growth/Pro users would have been blocked from report export. This adds it.
--
--   3. Fix agency plan features_json from object format to array format.
--      Migration 051 seeded agency with '{"campaigns":true,...}' (object). billing.js does
--      allowedFeatures.includes(feature) which fails on objects — would throw TypeError at runtime.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Canonicalize features_json for all plans
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE plans
SET features_json = '["social","content","seo"]'
WHERE id = 'starter';

UPDATE plans
SET features_json = '["social","content","seo","campaigns","analytics","intelligence","reports"]'
WHERE id = 'growth';

UPDATE plans
SET features_json = '["social","content","seo","campaigns","analytics","intelligence","white_label","api_access","reports"]'
WHERE id = 'pro';

UPDATE plans
SET features_json = '["social","content","seo","campaigns","analytics","intelligence","white_label","api_access","reports"]'
WHERE id = 'agency';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill users.subscription_status for brands whose subscriptions.status
--    is 'past_due' but users.subscription_status is still 'active'.
--    Prevents payment-failed customers from retaining access after this migration.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE users
SET subscription_status = 'past_due'
WHERE subscription_status = 'active'
  AND id IN (
    SELECT s.user_id
    FROM subscriptions s
    WHERE s.status = 'past_due'
      AND s.user_id IS NOT NULL
  );
