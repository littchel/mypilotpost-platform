-- Migration 139: Refund domain
-- Adds refund_requests table and provider_payment_id to payments for Yoco refund lookup.

ALTER TABLE payments ADD COLUMN provider_payment_id TEXT;

CREATE TABLE IF NOT EXISTS refund_requests (
  id                  TEXT PRIMARY KEY,
  payment_id          TEXT NOT NULL REFERENCES payments(id),
  brand_id            TEXT NOT NULL REFERENCES brands(id),
  requested_by        TEXT NOT NULL,
  reason              TEXT NOT NULL,
  policy_version      TEXT NOT NULL DEFAULT '2026-v1',
  eligible            INTEGER NOT NULL DEFAULT 0,
  refund_percent      INTEGER NOT NULL DEFAULT 0,
  refund_amount       INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'requested',
  statutory_override  INTEGER NOT NULL DEFAULT 0,
  statutory_reason    TEXT,
  provider_refund_id  TEXT,
  rejection_reason    TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_brand   ON refund_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment ON refund_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status  ON refund_requests(status);
