# Status Page

**Route:** `status.mypilotpost.com`

**Thuthu (Pty) Ltd t/a myPilotPost** · Registration Number: 2025/102758/07  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa

---

The myPilotPost status page provides real-time visibility into platform availability, active incidents, and scheduled maintenance. Operational transparency is a core commitment of Thuthu (Pty) Ltd.

Under our Terms and Conditions, we make reasonable efforts to notify users of significant service changes or interruptions. The status page is the primary channel for that communication.

> You should never have to guess whether myPilotPost is working. If something is wrong, it will be visible here before you contact support.

---

## Service Components

| Component | What It Tracks |
|---|---|
| API — Core | Cloudflare Workers API availability and response latency |
| Scheduling Engine | Post scheduling acceptance and delivery queue health |
| Delivery System | Active publishing jobs and delivery success rates to connected platforms |
| OAuth Connections | Connected account token validation health per platform |
| Analytics Pipeline | Analytics event collection and processing from connected platforms |
| Admin Control Plane | Admin API availability and observability system health |
| Media Storage (R2) | Asset upload and retrieval availability via Cloudflare R2 |
| Database (D1) | Read/write availability for Cloudflare D1 structured data |
| YOCO Payment Processing | Payment gateway availability (as reported by YOCO) |

---

## Status Definitions

| Status | Meaning |
|---|---|
| **Operational ✓** | The service is functioning normally with no known issues |
| **Degraded Performance** | The service is available but operating slower than normal or with limited functionality |
| **Partial Outage** | Some users, regions, or functions are experiencing issues |
| **Major Outage** | The service is unavailable or severely impacted for all users |
| **Under Maintenance** | Planned maintenance is in progress — communicated in advance where possible |

---

## Incident Communication

When an incident occurs, Thuthu (Pty) Ltd will:

- Post an incident notice on the status page within **15 minutes** of detection or verified report
- Provide status updates at least every **30 minutes** during active incidents
- Publish a post-incident summary within **72 hours** for any major outage
- Notify affected users by email for incidents lasting more than **30 continuous minutes**

Incident records are retained on the status page for a rolling 90-day history.

---

## Uptime Targets

These targets reflect our engineering commitments. They are not guaranteed service level agreements unless explicitly documented in a separate enterprise contract with Thuthu (Pty) Ltd.

| Component | Monthly Uptime Target |
|---|---|
| API layer | 99.9% |
| Scheduling engine | 99.95% |
| Frontend delivery (Cloudflare Pages) | 99.99% |

Historical uptime performance is published monthly on the status page. Because our infrastructure runs on Cloudflare's global network, our compute and delivery layers inherit the resilience of Cloudflare's distributed architecture.

---

## Planned Maintenance

- Planned maintenance windows will be announced on the status page at least **24 hours** in advance where operationally possible
- Cloudflare Workers deployments are zero-downtime — most platform updates do not require maintenance windows
- Database migrations that require a maintenance window will be scheduled outside peak usage hours and communicated in advance
- Emergency maintenance required to protect platform security or data integrity may be performed without advance notice; we will communicate the reason as soon as possible

---

## Subscribing to Status Updates

- **Email notifications:** Subscribe at [status.mypilotpost.com](https://status.mypilotpost.com) to receive incident and maintenance alerts
- **RSS feed:** Available at the status page for programmatic or aggregated monitoring

Subscribers receive notifications at incident creation, each major status update, and incident resolution.

---

## Reporting an Issue

If you experience a problem not reflected on the status page:

- **Email:** support@mypilotpost.com — include "Status Report" in the subject line
- **In-app:** Use the support option in Control Tower

We investigate all user-reported issues promptly, regardless of whether an incident is already open. If the issue is confirmed as a platform-wide problem, we will open an incident on the status page.

Under POPIA's security safeguard obligations, we are required to take reasonable steps to identify and resolve security incidents. Users who believe they have identified a security vulnerability should contact security@mypilotpost.com directly.
