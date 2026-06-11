-- Migration: 138_checkout_billing_region.sql
-- BILLING CERTIFICATION — Brand Billing Region
--
-- Adds billing_country + billing_currency to brands so that price resolution
-- uses the brand's registered billing location rather than request.cf.country.
--
-- billing_country: ISO 3166-1 alpha-2 code stored at checkout or settings time
-- billing_currency: resolved currency for that country (e.g. ZAR for ZA)
--
-- These fields are optional — if null, checkout falls back to request.cf.country,
-- then maps through getRegion() to find a regional_plans row.
-- The resolved values are snapshotted on each checkout row (checkouts.country).

PRAGMA foreign_keys = OFF;

ALTER TABLE brands ADD COLUMN billing_country  TEXT;
ALTER TABLE brands ADD COLUMN billing_currency TEXT;

PRAGMA foreign_keys = ON;
