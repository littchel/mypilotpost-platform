# New Domain Schema Proposal — Agency Model Extension

This document proposes the modular, additive database schemas for the myPilotPost Agency Model Extension. All tables strictly follow the `brand_id` scoping rule and preserve the Canon 2 identity model.

## 1. Content Approval Workflow (Phase 1.1)

### Table: content_approvals
**Purpose:** Tracks the approval lifecycle for a specific content item (social or blog).

**Core Columns:**
- `id` (TEXT PRIMARY KEY)
- `brand_id` (TEXT NOT NULL) — Foreign key to `brands.id`
- `content_type` (TEXT NOT NULL) — `'social'` or `'blog'`
- `content_id` (TEXT NOT NULL) — polymorphic application-level reference to `social_assets.id` or `blog_posts.id`
- `status` (TEXT NOT NULL) — `'pending'`, `'approved'`, `'rejected'`, `'requested_changes'`
- `requested_by` (TEXT NOT NULL) — `users.id` of the agency operator
- `resolved_by` (TEXT) — `users.id` of the approver if on-platform
- `metadata` (TEXT) — JSON for comments, rejection reasons, version markers, or context
- `requested_at` (TEXT)
- `resolved_at` (TEXT)
- `created_at` (TEXT)
- `updated_at` (TEXT)

**Relationship to `brand_id`:**
Strictly scoped to the brand owning the content.

**Rule:**
`content_type` + `content_id` is a polymorphic reference and must be validated in application code. The referenced content item must belong to the same `brand_id`.

**V1 Non-Regression:**
Must not prevent content from being scheduled or published if approval is bypassed. Approval remains additive until the enforcement phase is explicitly enabled.

### Table: approval_share_links
**Purpose:** Tokenized external review links for client approval without platform login.

**Core Columns:**
- `id` (TEXT PRIMARY KEY)
- `token` (TEXT UNIQUE NOT NULL) — secure random token
- `approval_id` (TEXT NOT NULL) — references `content_approvals.id`
- `brand_id` (TEXT NOT NULL) — references `brands.id`
- `recipient_email` (TEXT)
- `status` (TEXT NOT NULL) — `'active'`, `'used'`, `'expired'`, `'revoked'`
- `access_count` (INTEGER DEFAULT 0)
- `last_accessed_at` (TEXT)
- `expires_at` (TEXT)
- `created_at` (TEXT)

**Relationship to `brand_id`:**
Scoped to the active workspace.

**Rule:**
These are review artifacts only. They grant access to one approval flow / content review surface, not the platform.

---

## 2. Agency Reporting (Phase 1.1)

### Table: agency_reports
**Purpose:** Stores metadata and configuration for agency/client performance reports.

**Core Columns:**
- `id` (TEXT PRIMARY KEY)
- `brand_id` (TEXT NOT NULL) — references `brands.id`
- `title` (TEXT NOT NULL)
- `report_type` (TEXT NOT NULL) — `'performance'`, `'content_calendar'`, `'growth'`
- `date_from` (TEXT)
- `date_to` (TEXT)
- `status` (TEXT NOT NULL) — `'draft'`, `'final'`, `'archived'`
- `config` (TEXT) — JSON for metric selection, platform filters, etc.
- `created_at` (TEXT)
- `updated_at` (TEXT)

**Relationship to `brand_id`:**
Each report is owned by a single brand workspace.

**V1 Non-Regression:**
Reporting must remain read-only with respect to operational content and scheduling state. Reporting must not modify `social_assets`, `blog_posts`, `schedules`, or future `delivery_jobs`.

---

## 3. Localization & Market Context (Phase 1.2)

### Table: brand_localization_profiles
**Purpose:** Per-brand regional, cultural, and language settings for future content intelligence and localization.

**Core Columns:**
- `brand_id` (TEXT PRIMARY KEY) — one record per brand
- `country_code` (TEXT) — ISO 3166-1 alpha-2
- `language_code` (TEXT) — ISO 639-1
- `market_segment` (TEXT)
- `competitor_keywords` (TEXT) — JSON array
- `created_at` (TEXT)
- `updated_at` (TEXT)

**Relationship to `brand_id`:**
Extension of brand operating context without polluting identity tables.

**V1 Non-Regression:**
If missing, the platform must fall back safely to generic/default context and current scheduling/content behavior must remain unaffected.

---

## 4. Growth Engine Foundations (Phase 1.2)

### Table: growth_invites
**Purpose:** Tracks agency-to-client or collaborator invites while preserving the canonical membership model.

**Core Columns:**
- `id` (TEXT PRIMARY KEY)
- `inviter_user_id` (TEXT NOT NULL) — references `users.id`
- `brand_id` (TEXT) — nullable if invite is platform-level, populated if workspace-specific
- `email` (TEXT NOT NULL)
- `role` (TEXT NOT NULL) — must map to an allowed `brand_users.role`
- `status` (TEXT NOT NULL) — `'pending'`, `'accepted'`, `'expired'`, `'revoked'`
- `token` (TEXT UNIQUE NOT NULL)
- `expires_at` (TEXT)
- `created_at` (TEXT)
- `updated_at` (TEXT)

**Relationship to `brand_id`:**
May relate to a specific workspace or remain platform-level until acceptance flow resolves the target.

**V1 Non-Regression:**
Invite acceptance must never bypass normal membership creation. Acceptance must create or trigger a standard `brand_users` membership record.

---

## Compatibility Summary

| Domain | Phase | Brand Scoped? | Core Identity Impact |
|---|---|---:|---|
| Approval | 1.1 | Yes | None (modular) |
| Reporting | 1.1 | Yes | None (modular) |
| Localization | 1.2 | Yes | None (modular) |
| Growth | 1.2 | Linked | Populates `brand_users` on acceptance |

---

## Indexing Requirements

Recommended indexes:
- `content_approvals(brand_id, status, created_at)`
- `approval_share_links(token)`
- `approval_share_links(brand_id, status)`
- `agency_reports(brand_id, date_from, date_to)`
- `growth_invites(email, status)`
- `growth_invites(brand_id, status)`

---

## Security Requirements

- All normal internal brand-owned endpoints must use `requireAuth`.
- All authenticated endpoints must verify that JWT `brand_id` matches the target record `brand_id`.
- External approval-link endpoints must use secure token validation, not normal platform auth.
- Approval-link endpoints must never grant platform access or create session-level identity.
