# V1 Backend Reconciliation Plan (Status: STABILIZED)

## Completed Milestones

### 1. Schema Repair & Compatibility
- **Migration 026**: Fixed `customers` FK mismatches by adding unique `brand_id`.
- **Migration 027**: Created `content_drafts` to unify content state.
- **Migration 028**: Created `content_media_links` and implemented locking in `social.js` and `blog.js`.
- **Migration 030**: Added `metadata` and `published_at` to `schedules`.
- **Migration 031**: Added `timezone` to `brands`.

### 2. Content Engine Stabilization
- **Social**: Resolved `contextId` errors, corrected status transitions to `ready`, and verified draft-to-schedule flow.
- **Blog**: Verified manual media linking and scheduling flow.

### 3. Scheduling Engine (Canon 5)
- **Authoritative Table**: `schedules` identified and reconciled.
- **Rules Verified**:
  - 15-minute conflict blocking (per brand/platform).
  - UTC normalization for SQLite compatibility.
  - Safe updates and cancellations.
  - Media locking on successful schedule.

## Future Alignments (Post-V1)
- Rename `schedules` to `delivery_jobs`.
- Drop legacy `content_delivery_jobs` table.
- Canonicalize all FKs to point to `brands(id)` instead of `customers(brand_id)`.
