-- 141_subscription_price_lock.sql
-- PART 1 — Price lock (grandfathering). Snapshot the agreed price ON the subscription.
-- Written only on purchase/upgrade/downgrade/renew; never mutated by later catalog edits.

ALTER TABLE subscriptions ADD COLUMN locked_price_cents INTEGER;
ALTER TABLE subscriptions ADD COLUMN locked_currency    TEXT;
ALTER TABLE subscriptions ADD COLUMN billing_interval   TEXT;
ALTER TABLE subscriptions ADD COLUMN effective_from     TEXT;
ALTER TABLE subscriptions ADD COLUMN grandfathered      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN checkout_id        TEXT;
ALTER TABLE subscriptions ADD COLUMN payment_id         TEXT;
