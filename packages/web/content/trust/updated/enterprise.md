# Enterprise Trust

**Route:** `/enterprise`

**Thuthu (Pty) Ltd t/a myPilotPost** · Registration Number: 2025/102758/07  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa  
Information Officer: Littchel Nhlalo Mathuthu · legal@mypilotpost.com

---

myPilotPost is a social media content intelligence and execution platform designed for brands and agencies that require operational clarity, data governance, and reliable delivery. This page documents the platform's enterprise-grade architecture, the contractual and compliance commitments available to enterprise customers, and how to engage Thuthu (Pty) Ltd for enterprise arrangements.

> myPilotPost is not a black-box AI product. It is a control-plane-driven SaaS platform built for teams that require visibility, consistency, and accountability at every stage of the content workflow.

---

## Enterprise Architecture Summary

| Capability | Implementation |
|---|---|
| **Brand-scoped isolation** | Every brand workspace is fully isolated at the API and database layer — no cross-brand data access is architecturally possible |
| **Admin system separation** | The admin control plane is accessible only via a separate authentication mechanism; it cannot be reached via customer JWTs under any condition |
| **Audit-visible operations** | All delivery events, scheduling operations, and admin actions produce logged records |
| **Encryption in transit** | HTTPS/TLS enforced at the Cloudflare edge on all routes — no unencrypted traffic reaches our application layer |
| **Encryption at rest** | Data in Cloudflare D1 and R2 is encrypted by Cloudflare's storage layer |
| **POPIA compliance** | Full compliance with all eight POPIA lawful processing conditions — documented in [Compliance](/compliance) |
| **GDPR compliance** | Full compliance for EU residents including SCCs for cross-border transfers — documented in [GDPR Compliance](/gdpr-compliance) |
| **OAuth permission minimisation** | We request only the OAuth scopes required for features in active use — documented per platform in [OAuth & Permissions](/oauth-permissions) |
| **Revocable integrations** | Users and admins can disconnect any connected platform at any time — tokens are deleted immediately |
| **No black-box AI** | Every AI-generated recommendation includes an explanation of its basis — no opaque or autonomous outputs |
| **Human-reviewed publishing** | No content is published to any connected platform without explicit user scheduling and confirmation |
| **Fail-safe delivery** | Failed deliveries surface immediately to users and the admin control plane — silent failures are not architecturally possible |
| **Status transparency** | Real-time availability at [status.mypilotpost.com](https://status.mypilotpost.com) with 90-day incident history |
| **Data Processing Agreement** | A GDPR- and POPIA-compliant DPA is available upon request — contact legal@mypilotpost.com |

---

## Enterprise-Specific Commitments

### Data Processing Agreement (DPA)

Thuthu (Pty) Ltd offers a Data Processing Agreement for enterprise customers requiring contractual data protection commitments beyond our standard Privacy Policy. The DPA addresses:

- Roles and responsibilities (Data Controller / Data Processor)
- Sub-processor disclosure and management
- Data subject rights facilitation
- Security measures and breach notification obligations
- International data transfer safeguards (SCCs)
- Audit rights

**To request a DPA:** Email legal@mypilotpost.com — we will provide an executed copy within 10 business days.

### Custom Data Retention

Enterprise customers requiring data retention terms that differ from our standard schedules (as documented in [Data Handling](/data-handling)) may request custom retention policies. Please contact legal@mypilotpost.com to discuss your requirements.

### Service Level Agreements

Our standard uptime targets are documented on the [Infrastructure](/infrastructure) and [Status](/status) pages. Customers requiring contractual SLA commitments with defined remedies should contact trust@mypilotpost.com to discuss enterprise contract terms.

---

## Approved Trust Language

The following phrases accurately reflect the myPilotPost platform architecture and should be used in enterprise sales, marketing, and product materials:

| Phrase | Basis |
|---|---|
| **Brand-scoped isolation** | Enforced at the API and database layer — not a UI-only permission setting |
| **Deterministic scheduling** | Scheduling engine is production-locked; posts publish exactly as configured |
| **Explainable intelligence** | Every AI recommendation surfaces its rationale; no black-box outputs |
| **Operational transparency** | Admin systems observe; they cannot silently alter customer state |
| **Fail-safe delivery architecture** | Every delivery attempt produces a visible, logged outcome |
| **Human-reviewed workflows** | No content reaches a connected platform without explicit user confirmation |
| **Role-separated systems** | Admin and customer systems use separate authentication mechanisms |
| **Advisory AI systems** | ML outputs are recommendations; they do not trigger automated actions |
| **Consent-first analytics** | Google Analytics 4 is not initialised before explicit user consent |
| **Control-plane-driven SaaS** | Governance, observability, and scheduling are first-class architectural features |

### Language to Avoid

| Do Not Use | Use Instead |
|---|---|
| AI-powered automation | AI-assisted workflows |
| Automated publishing | Scheduled publishing with user approval |
| Predictive analytics (at v1) | Descriptive analytics and insights |
| AI-driven decisions | AI-assisted recommendations |
| Smart automation | Explainable, advisory intelligence |

---

## Enterprise Evaluation Checklist

For enterprise procurement teams conducting due diligence:

- [ ] **Legal entity verified** — Thuthu (Pty) Ltd, Registration No. 2025/102758/07, South Africa
- [ ] **Brand isolation confirmed** — API and database-layer enforcement, documented in [Security](/security)
- [ ] **Admin separation confirmed** — separate authentication mechanism, no silent customer data alteration
- [ ] **Encryption confirmed** — in transit (TLS) and at rest (Cloudflare storage layer)
- [ ] **POPIA compliance documented** — eight conditions addressed in [Compliance](/compliance)
- [ ] **GDPR compliance documented** — [GDPR Compliance Statement](/gdpr-compliance) and DPA available
- [ ] **OAuth scopes documented** — per-platform permission inventory in [OAuth & Permissions](/oauth-permissions)
- [ ] **AI governance documented** — [AI Principles](/ai-principles) page; no automated publishing; no black-box outputs
- [ ] **Refund policy reviewed** — [Refund Policy](/refund-policy); CPA-compliant; YOCO as payment processor
- [ ] **Status page confirmed** — [status.mypilotpost.com](https://status.mypilotpost.com) with incident history
- [ ] **DPA available** — contact legal@mypilotpost.com
- [ ] **Data request process confirmed** — documented in [Compliance](/compliance); 30-day response SLA

---

## Enterprise Roadmap

The following capabilities are planned for enterprise tier and are not yet available in v1:

- **Role-Based Access Control (RBAC)** — team-level permission management within brand workspaces
- **Multi-Factor Authentication (MFA)** — enforced option for all enterprise accounts
- **Single Sign-On (SSO/SAML)** — enterprise identity provider integration
- **Custom data residency options** — where technically feasible within Cloudflare's infrastructure
- **Dedicated SLA agreements** — with defined uptime commitments and remedies
- **Third-party penetration testing** — scheduled security assessment with published report
- **SOC 2 Type II readiness** — compliance assessment for enterprise trust certification

---

## Enterprise Contact

| Purpose | Contact |
|---|---|
| Enterprise sales enquiries | trust@mypilotpost.com |
| Data Processing Agreement | legal@mypilotpost.com |
| Security & compliance questions | security@mypilotpost.com |
| Custom arrangements | legal@mypilotpost.com |

**Thuthu (Pty) Ltd t/a myPilotPost**  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa  
Registration Number: 2025/102758/07
