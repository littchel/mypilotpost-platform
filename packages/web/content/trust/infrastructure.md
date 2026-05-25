# Infrastructure & Reliability

**Route:** `/infrastructure`

myPilotPost is built on Cloudflare's global edge network — one of the most distributed and resilient infrastructure platforms available. Our architecture is designed for deterministic delivery, not best-effort scheduling.

> Our architecture is one of our strongest assets. Deterministic scheduling, fail-safe delivery, and edge-distributed compute are not aspirational goals — they are how the platform works today.

---

## Infrastructure Overview

| Layer | Technology & Characteristics |
|---|---|
| API / Compute | Cloudflare Workers — serverless, globally distributed, no cold-start delays |
| Frontend Delivery | Cloudflare Pages — statically served from the edge, globally cached |
| Primary Database | Cloudflare D1 — SQLite-based relational database, brand-scoped queries |
| Configuration & Locks | Cloudflare KV — distributed key-value store for flags, locks, rate limits |
| Media Storage | Cloudflare R2 — S3-compatible object storage, no egress fees, brand-scoped |
| DNS & Routing | Cloudflare DNS with DDoS protection and automatic failover |
| TLS / HTTPS | Enforced globally at the edge — no unencrypted traffic permitted |

---

## Scheduling Architecture

### Deterministic Scheduling

The myPilotPost scheduling engine is production-locked and designed for deterministic delivery:

- All scheduled times are stored and processed in UTC — timezone conversion is handled at the UI layer
- Conflict detection enforces a 15-minute protection window between posts on the same platform
- Scheduled posts follow an immutable publish lifecycle — once scheduled, they cannot be silently altered
- Cancellations are explicit and logged — they do not silently remove records

### Publish Lifecycle

| State | Meaning |
|---|---|
| `scheduled` | Post is queued for delivery at the configured UTC time |
| `published` | Post was successfully delivered to the target platform |
| `cancelled` | Post was explicitly cancelled by the user — a permanent, logged state |
| `failed` | Delivery was attempted but unsuccessful — visible in delivery logs |

There is no silent failure mode. Every delivery attempt produces a visible outcome.

---

## Reliability Principles

### Fail-Safe Design

- Failed deliveries are logged, visible to the user, and surfaced in the admin control plane
- Retry logic is applied to transient failures — with exponential backoff, not infinite loops
- Scheduling conflicts are detected before acceptance — not discovered at delivery time
- API errors return structured, human-readable responses — no silent 200-OK failures
- KV locks prevent duplicate delivery attempts on the same scheduled post

### Observability

- Delivery success and failure rates are tracked per brand in real time
- The admin control plane shows live system health across all customers
- Error rates, delivery delays, and scheduler health are monitored continuously
- Incidents are acknowledged and communicated via [status.mypilotpost.com](https://status.mypilotpost.com)

---

## Uptime Philosophy

Because myPilotPost runs on Cloudflare Workers, our compute layer inherits Cloudflare's global availability SLA. There are no single-region failure modes in our architecture.

- Worker functions are stateless and execute at the edge closest to the request origin
- D1 replication ensures database availability across regional failures
- R2 media storage is globally distributed with built-in redundancy
- Frontend delivery via Cloudflare Pages has no single point of failure

> We do not promise 100% uptime — no honest platform does. We promise that when something goes wrong, it is visible, logged, and communicated promptly.

### Uptime Targets

| Component | Target |
|---|---|
| API layer | 99.9% monthly |
| Scheduling engine | 99.95% |
| Frontend delivery | 99.99% |

---

## Maintenance & Updates

- Cloudflare Workers deployments are zero-downtime by design
- Database schema changes are applied via migration — not in-place modifications
- Maintenance windows are announced via [status.mypilotpost.com](https://status.mypilotpost.com) when required
- Production changes follow environment separation — staging before production

---

*Current system status: [status.mypilotpost.com](https://status.mypilotpost.com)*
