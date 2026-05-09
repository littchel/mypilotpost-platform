# Canon-to-Reality Mapping (Updated)

| Canon Component | Canonical Table | Reality Table (Local) | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Identity** | `users` | `users` | ✅ SYNCED | Auth-only. |
| **Identity** | `brands` | `brands` | ✅ RECONCILED | Added `timezone` column (Migration 031). |
| **Identity** | `brand_users` | `brand_users` | ✅ SYNCED | Membership linked. |
| **Content** | `content_drafts`| `content_drafts` | ✅ CREATED | Migration 027. |
| **Content** | `social_assets` | `social_assets` | ✅ SYNCED | Ready/Draft statuses corrected. |
| **Content** | `blog_posts` | `blog_posts` | ✅ SYNCED | Media linking verified. |
| **Media** | `media_assets` | `media_assets` | ✅ SYNCED | Standardized with `external_id`. |
| **Media** | `content_media_links` | `content_media_links`| ✅ CREATED | Migration 028. Locking verified. |
| **Scheduling** | `delivery_jobs`| `schedules` | ⚠️ MAPPED | `schedules` fulfills the role. Migration 030 added `metadata`. |
| **Scheduling** | - | `content_delivery_jobs`| 🗑️ LEGACY | Empty (count 0). Safe to remove later. |

## Reconciliation Decisions
- **Scheduling**: The table `schedules` is the authoritative runtime table. It has been reconciled to Canon 5 behavior (15-min conflicts, UTC normalization). The name `delivery_jobs` remains a future alignment target.
- **Identity**: `customers` table exists as a compatibility layer. Every brand creation now automatically seeds a `customers` record to satisfy legacy FKs.
