-- Migration: 094_email_verification_otp.sql
-- Adds OTP (6-digit code) support to the existing email_verifications table.
-- The existing `token` column (UUID link) is preserved for backward compat.
--
-- otp_hash        — SHA-256 of the 6-digit code; never stored plaintext
-- otp_expires_at  — 15-minute window; enforced at verify time
-- attempts        — max 5 per OTP before lockout; resets on new OTP send

ALTER TABLE email_verifications ADD COLUMN otp_hash       TEXT;
ALTER TABLE email_verifications ADD COLUMN otp_expires_at TEXT;
ALTER TABLE email_verifications ADD COLUMN attempts       INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ev_user_otp ON email_verifications(user_id, otp_expires_at);
