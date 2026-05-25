# Infrastructure & Reliability

**Route:** `/infrastructure`

**Thuthu (Pty) Ltd t/a myPilotPost** · Registration Number: 2025/102758/07  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa

---

myPilotPost is a social media content intelligence and execution platform built entirely on Cloudflare's global edge network. We do not operate physical servers, co-location facilities, or self-managed infrastructure. Our architecture is designed for deterministic, reliable delivery — not best-effort scheduling.

Under POPIA's security safeguard obligations (section 19), Thuthu (Pty) Ltd is required to maintain appropriate, reasonable technical measures to secure the integrity and confidentiality of personal information. The infrastructure described on this page reflects those safeguards in practice.

> Deterministic scheduling, fail-safe delivery, and edge-distributed compute are not aspirational goals — they are how the platform works today.

---

## Infrastructure Overview

| Layer | Technology & Description |
|---|---|
| API / Compute | Cloudflare Workers — serverless functions executing at Cloudflare's global edge, no cold-start delays, no single-region dependency |
| Frontend Delivery | Cloudflare Pages — static assets served from Cloudflare's global CDN, globally cached |
| Primary Database | Cloudflare D1 — SQLite-based relational database, all queries brand-scoped at the API layer |
| Configuration & Locks | Cloudflare KV — distributed key-value store for flags, scheduling locks, rate-limit state, and configuration |
| Media Storage | Cloudflare R2 — S3-compatible object storage, no egress fees, brand-scoped buckets |
| DNS & Network | Cloudflare DNS with DDoS protection, WAF, and automatic failover |
| Transport Security | HTTPS/TLS enforced globally at the Cloudflare edge — no unencrypted traffic reaches our application layer |

### Data Location

Cloudflare operates edge nodes globally. Data processed by Cloudflare Workers and stored in D1 and R2 is distributed across Cloudflare's infrastructure in accordance with Cloudflare's data localisation terms. We do not operate dedicated data centres, and we do not own or manage the underlying physical infrastructure. Cross-border data transfers to Cloudflare's infrastructure are governed by Cloudflare's Data Processing Addendum and Standard Contractual Clauses (SCCs) where applicable.

---

## Scheduling Architecture

### Deterministic Scheduling

The myPilotPost scheduling engine is production-locked. It is designed to ensure your content publishes exactly when you configure it to:

- All scheduled times are stored and processed in UTC — timezone localisation is handled at the UI layer to prevent time zone ambiguity errors
- Conflict detection enforces a 15-minute protection window between posts targeting the same platform and account, preventing accidental overlapping schedules
- Scheduled posts follow an immutable publish lifecycle — once confirmed, a scheduled post cannot be silently altered by any background process
- Cancellations are explicit user actions and are permanently logged — a cancelled post is never silently removed from records

### Publish Lifecycle States

| State | Meaning |
|---|---|
| `scheduled` | Post is confirmed and queued for delivery at the configured UTC time |
| `published` | Post was successfully delivered to the target platform via its API |
| `cancelled` | Post was explicitly cancelled by the user — a permanent, auditable record |
| `failed` | Delivery was attempted but the target platform API returned an error — visible in your delivery logs |

There is no silent failure state. Every delivery attempt produces a visible, logged outcome. Failed deliveries surface to the user and are visible in the admin control plane.

---

## Reliability Principles

### Fail-Safe Design

- Failed deliveries are immediately logged and surfaced to the user in Mission Analytics and the Launch Pad delivery history
- Retry logic is applied to transient failures with exponential backoff — we do not retry indefinitely in ways that could cause duplicate publishing
- Scheduling conflicts are detected at the point of scheduling confirmation, not at delivery time
- API errors return structured, human-readable error responses — no silent 200-OK failures that mask underlying problems
- Cloudflare KV locks prevent duplicate delivery attempts on the same scheduled post record

### Observability

- Delivery success and failure rates are tracked per brand in real time
- The admin control plane provides live system health visibility across all customer accounts
- Error rates, delivery delays, and scheduler health are monitored continuously
- Platform incidents are communicated via [status.mypilotpost.com](https://status.mypilotpost.com)

---

## Uptime

Because myPilotPost runs on Cloudflare Workers, our compute layer inherits the benefit of Cloudflare's distributed global network. There is no single-region failure mode in our architecture.

| Component | Monthly Uptime Target |
|---|---|
| API layer | 99.9% |
| Scheduling engine | 99.95% |
| Frontend delivery | 99.99% |

We do not guarantee 100% uptime. Service availability is subject to the terms stated in our Terms and Conditions. Planned maintenance and unplanned incidents are communicated transparently via the status page.

> When something goes wrong, it is visible, logged, and communicated. Silent failures are not acceptable in our architecture.

---

## Maintenance & Deployment

- Cloudflare Workers deployments are zero-downtime by design — new code versions are deployed atomically without taking the service offline
- Database schema changes are applied via structured migrations — not in-place modifications that could corrupt live data
- Planned maintenance windows are announced via [status.mypilotpost.com](https://status.mypilotpost.com) in advance where possible
- All production changes follow environment separation — staging is validated before any change reaches production

---

*System status: [status.mypilotpost.com](https://status.mypilotpost.com)*  
*Infrastructure questions: trust@mypilotpost.com*
