-- Migration: 137_checkout_domain.sql
-- BILLING CERTIFICATION — Checkout Session Domain
--
-- Adds:
--   checkouts — canonical checkout session record
--
-- Lifecycle (immutable events, status advances forward only):
--   created → pending → paid
--                     → failed
--               → cancelled
--               → expired
--
-- provider_session_id: Yoco payment token / session ID
-- canonical_price:     plan price_cents at time of checkout (snapshot)
-- localized_price:     regional price in target currency (equals canonical for ZAR)
-- fx_rate:             conversion multiplier (1.0 for ZAR→ZAR)
-- provider_metadata:   raw JSON from Yoco checkout creation response

CREATE TABLE IF NOT EXISTS checkouts (
  id                 TEXT PRIMARY KEY,
  brand_id           TEXT NOT NULL,
  user_id            TEXT NOT NULL,
  plan_id            TEXT NOT NULL REFERENCES plans(id),
  billing_interval   TEXT NOT NULL DEFAULT 'monthly',   -- 'monthly' | 'yearly'
  provider           TEXT NOT NULL DEFAULT 'yoco',
  provider_session_id TEXT,
  provider_metadata  TEXT,                               -- JSON
  currency           TEXT NOT NULL DEFAULT 'ZAR',
  canonical_price    INTEGER NOT NULL,                   -- plan cents at checkout time
  localized_price    INTEGER NOT NULL,                   -- regional cents (equals canonical for ZAR)
  fx_rate            REAL NOT NULL DEFAULT 1.0,
  country            TEXT,
  status             TEXT NOT NULL DEFAULT 'created',    -- created|pending|paid|failed|cancelled|expired
  redirect_url       TEXT,                               -- success redirect target
  cancel_url         TEXT,                               -- cancel redirect target
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at         TEXT NOT NULL,                      -- checkout window (e.g. 30 min from created_at)
  completed_at       TEXT                                -- set when status = paid | failed | cancelled
);

CREATE INDEX IF NOT EXISTS idx_checkouts_brand   ON checkouts(brand_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_user    ON checkouts(user_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_status  ON checkouts(status);
CREATE INDEX IF NOT EXISTS idx_checkouts_session
  ON checkouts(provider_session_id)
  WHERE provider_session_id IS NOT NULL;

-- Link payments back to the checkout that originated them (nullable — legacy payments have no checkout)
ALTER TABLE payments ADD COLUMN checkout_id TEXT REFERENCES checkouts(id);
CREATE INDEX IF NOT EXISTS idx_payments_checkout ON payments(checkout_id) WHERE checkout_id IS NOT NULL;
