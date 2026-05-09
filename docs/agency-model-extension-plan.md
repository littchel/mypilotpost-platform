# myPilotPost — Agency Model Extension Plan

This document outlines the expansion of myPilotPost to support agency-managed brand workflows while preserving the locked Canon 2 Identity Model.

## 1. Agency Architecture

### Principle

An agency is an operating model of a platform customer/account, not a replacement for the core identity architecture.

Agency capability allows one platform account to manage multiple client brands while preserving strict workspace isolation.

### Identity Mapping

- **User**: an authenticated human operator (for example, an agency employee or owner)
- **Brand**: an isolated technical workspace representing a managed client brand
- **Brand Membership**: access is granted only through the authoritative `brand_users` table
- **Isolation**: every brand remains strictly isolated at the data layer through `brand_id` scoping in all core customer-facing tables and APIs

### Workflow

1. Agency user logs in
2. System resolves all accessible brands from `brand_users`
3. User selects a brand to operate within
4. JWT is issued or scoped to one active `brand_id`
5. All customer-facing operations (content, media, scheduling, analytics) run under that single active brand scope

### Core Identity Rule

Agency support does not change the Canon 2 identity model.

- Access is never granted by `customers`
- Access is never granted by `brands.user_id`
- Access is never granted by billing or subscription records
- Access is only granted by `brand_users`

If a user belongs to multiple brands, the platform may allow brand switching, but all operational API activity must execute against one active `brand_id` at a time.

Multi-brand membership discovery may happen before JWT issuance, but all authenticated operational API requests must run against a single active brand_id in the JWT.

## 2. New Backend Domains

The following domains may be implemented as modular, additive systems after V1 backend completion.

### Content Approval Workflow (Phase 1.1)

Purpose:
Enable agency-client review and approval of content before publishing.

Capabilities:
- approval request lifecycle
- approve / reject / comment actions
- approval history
- external approval share links for client review without requiring full platform login

Important rule:
External approval links are tokenized review artifacts only. They do not grant normal platform access and do not replace `brand_users`.

### Agency Reporting (Phase 1.1)

Purpose:
Support agency-facing and client-facing performance reporting across managed brands.

Capabilities:
- report records
- date-range reporting
- content delivery summaries
- export metadata for PDF / JSON / future dashboard views

### Localization & Market Context (Phase 1.2)

Purpose:
Support per-brand regional, cultural, and language context for content and future intelligence systems.

Capabilities:
- country / region / language targeting
- market context records
- trend snapshot storage
- foundation for future multi-market content intelligence

### Growth Engine (Phase 1.2)

Purpose:
Support growth loops for agencies and managed client ecosystems.

Capabilities:
- invites
- referral links
- reward events
- program metadata

## 3. Compatibility & Non-Regression

### Rules

- No recursive brand-in-brand hierarchy
- Keep the flat `brand_users` model
- Preserve Canon 2 identity boundaries
- Do not move access logic into `customers`
- Do not move access logic into `brands` directly
- Keep `brand_id` as the canonical scope key for new customer-facing backend flows
- Preserve existing Admin APIs for billing, customer metrics, and operational visibility

### Non-Regression Requirement

Agency model expansion must extend the current V1 backend safely.

It must not break:
- authentication
- brand scoping
- content lifecycle
- scheduling behavior
- media locking
- admin compatibility
