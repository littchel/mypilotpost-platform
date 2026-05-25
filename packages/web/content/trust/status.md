# Status Page

**Route:** `status.mypilotpost.com`

The myPilotPost status page provides real-time visibility into platform availability, incidents, and scheduled maintenance. Transparency about uptime is a core part of our operational trust commitment.

> A dedicated status page means you never have to wonder if something is wrong — you can check for yourself.

---

## Service Components

| Component | What It Tracks |
|---|---|
| API — Core | Cloudflare Workers API availability and latency |
| Scheduling Engine | Post scheduling acceptance and queue health |
| Delivery System | Active publishing jobs and delivery success rates |
| OAuth Connections | Connected account token validation health |
| Analytics Pipeline | Analytics event collection and processing |
| Admin Control Plane | Admin API availability and observability health |
| Media Storage (R2) | Asset upload and retrieval availability |
| Database (D1) | Read/write availability for structured data |

---

## Status Definitions

| Status | Meaning |
|---|---|
| **Operational ✓** | Service is functioning normally with no known issues |
| **Degraded Performance** | Service is available but slower or partially limited |
| **Partial Outage** | Some users or regions are experiencing issues |
| **Major Outage** | Service is unavailable or severely impacted for all users |
| **Maintenance** | Planned maintenance window — communicated in advance |

---

## Incident Communication

When an incident occurs:

- We post an incident notice within **15 minutes** of detection or report
- Updates are posted at least every **30 minutes** during active incidents
- A post-incident summary is published within **72 hours** for major outages
- Affected customers are notified by email for incidents lasting more than 30 minutes

---

## Uptime Targets

| Component | Monthly Uptime Target |
|---|---|
| API layer | 99.9% |
| Scheduling engine | 99.95% |
| Frontend delivery | 99.99% |

Historical uptime data is published monthly on the status page.

---

## Subscribing to Updates

Stay informed without having to check manually:

- **Email notifications** — subscribe at [status.mypilotpost.com](https://status.mypilotpost.com)
- **RSS feed** — for programmatic or aggregated monitoring

Subscribers are notified at incident creation, major updates, and resolution.

---

## Reporting an Issue

If you experience a problem not reflected on the status page:

- **Email:** support@mypilotpost.com
- **Subject line:** Include "Status Report" and a brief description

We investigate all reports promptly, regardless of whether an incident is already open.
