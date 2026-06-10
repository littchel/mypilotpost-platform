-- Migration: 130_billing_repair.sql
-- Billing Engine Repair — ENGINE 20
--
-- CODE FIXES (in this release, not SQL):
--
--   server.js /api/customer/billing/upgrade
--     Phase 1: Endpoint no longer writes plan_id or subscription_status.
--     Was: any authenticated user could self-assign any paid plan with no payment.
--     Now: verifies a succeeded payment exists for the brand, then returns the
--          plan that was already activated by the Yoco webhook. No entitlement writes.
--
--   promotions.js grantReferralReward
--     Phase 2: Referral trial extension now writes to users.trial_ends_at.
--     Was: wrote to subscriptions.trial_extended_until — a column that
--          getCurrentPlan() never reads (reads users JOIN plans, not subscriptions).
--     Now: extends users.trial_ends_at which getCurrentPlan() reads at step 3.
--
--   billing.js getCurrentPlan
--     Phase 2: Removed dead step-2 check on row.trial_extended_until.
--     That field is never present in the users JOIN plans result set.
--     Trial extensions now come through users.trial_ends_at (see promotions fix).
--
--   schedule.js createSchedule
--     Phase 3: POST /api/customer/schedule now calls checkAndIncrement('posts')
--     before inserting delivery jobs.
--     Was: the calendar scheduling path had zero posts quota enforcement.
--     Now: both scheduling paths enforce the same posts_per_month_limit.
--
--   yoco-webhook.js + subscription-engine.js
--     Phase 4: refund.succeeded now triggers a subscription state transition.
--     Was: billingEventType=null → applyBillingEvent never called → refunded
--          customers retained full paid access indefinitely.
--     Now: refund_received → subscriptions.status='refunded' +
--          users.subscription_status='refunded' + users.plan_id='starter'.
--
--   enforcement.js
--     Phase 4: 'refunded' added to blocked subscription statuses.
--     Joins ['expired','cancelled','past_due'] to block all usage after refund.
--
--   integrations/handlers.js
--     Phase 5: handleCallback now calls checkAndIncrement('accounts') for
--     NEW provider connections (not reconnections) via the full OAuth flow.
--     disconnectIntegration and disconnectSocialConnection now decrement
--     social_accounts_used (floor at 0) when a connection is removed.
--
--   onboarding/platforms.js
--     Phase 5: disconnectPlatform now decrements social_accounts_used (floor at 0).
--
--   lib/usage.js (deleted)
--     Phase 7: Dead code. Imported constants/plans.js (missing) and queried
--     usage_metrics (nonexistent). Never imported anywhere.
--
--   api/admin/billing-admin.js (deleted)
--     Phase 7: assignLifetime wrote to customer_plans (never read by getCurrentPlan)
--     and had no registered route in server.js. Entirely unreachable.
--
-- SQL FIXES:
--
--   1. Backfill: honor any referral trial extensions that were written to
--      subscriptions.trial_extended_until before this release.
--      Copies them to users.trial_ends_at for users still in trial status.
--      Safe for paid users (plan_id != 'starter' + status='active' takes priority
--      in getCurrentPlan step 1, so extending trial_ends_at is harmless).
--
--   2. Mark any users whose subscriptions.status='refunded' (set by Yoco refunds
--      that were manually processed before this migration) as plan_id='starter'
--      and subscription_status='refunded' so enforcement blocks them correctly.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Backfill referral trial extensions into users.trial_ends_at
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE users
SET trial_ends_at = (
  SELECT trial_extended_until
  FROM subscriptions
  WHERE user_id = users.id
    AND trial_extended_until IS NOT NULL
)
WHERE id IN (
  SELECT user_id
  FROM subscriptions
  WHERE trial_extended_until IS NOT NULL
    AND user_id IS NOT NULL
)
AND (
  trial_ends_at IS NULL
  OR trial_ends_at < (
    SELECT trial_extended_until
    FROM subscriptions
    WHERE user_id = users.id
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Downgrade any refunded users to starter plan + refunded status
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE users
SET
  plan_id = 'starter',
  subscription_status = 'refunded'
WHERE subscription_status = 'active'
  AND id IN (
    SELECT s.user_id
    FROM subscriptions s
    WHERE s.status = 'refunded'
      AND s.user_id IS NOT NULL
  );
