# Verification Log

## [2026-03-20 00:46] Baseline — System Verification Report (Local)

**Status**: Verified Baseline
**Environment**: Local (Mac)
**Worker**: Port 8788 (Test Server) / 8787 (Dev Server)

### Repo Structure
- `packages/api/src/index.js`: ✅ Found
- `packages/api/src/server.js`: ✅ Found (Updated with Admin APIs)
- `packages/api/wrangler.toml`: ✅ Found
- `packages/api/migrations`: ✅ Found (001-024 + Phase 4)
- `packages/web`: ✅ Found
- `docs`: ✅ Created

### Worker Status
- **Local (`wrangler dev`)**: ✅ Running
- **Remote**: ❌ Failing (Blocked by Cloudflare account mismatch)

### Database Tables (Actual)
- `users`, `brands` (lacks `customer_id`), `onboarding_progress`, `sessions`
- `content_versions`, `content_blog_posts` (legacy), `content_context`
- `social_assets`, `social_variants`, `blog_posts` (active)
- `media_assets` (with `customer_id`), `social_media`
- `schedules` (legacy), `delivery_attempts` (with `job_id`)
- `campaigns`, `campaign_objectives`, `campaign_outcomes`
- `content_delivery_jobs` (active), `content_delivery_attempts`
- `plans`, `customer_plans`, `usage_metrics`, `subscriptions`
- `mrr_snapshots`, `churn_signals` (with `customer_id`)
- `d1_migrations` (recorded all 24 migrations)

### Admin API Status (Local)
- `GET /api/admin/customers`: ✅ Responds (Returns 200, though table `customers` missing)
- `GET /api/admin/billing/overview`: ✅ Responds (Returns 200)
- `GET /api/admin/analytics/delivery`: ✅ Responds (Returns 200)
- `GET /api/admin/campaigns`: ✅ Responds (Returns 200)

### Known Inconsistencies
- `customers` table referenced but missing from migrations.
- `brand_users` required by canon but missing from local DB.
- `customer_id` vs `brand_id` drift.
- `blog_posts` (active) vs `content_blog_posts` (legacy).
- Remote verification blocked by account mismatch.

---
Next Step: Phase 4 Foundation Fixes.
