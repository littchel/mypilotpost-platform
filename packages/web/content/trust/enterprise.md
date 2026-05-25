# Enterprise Trust

**Route:** `/enterprise` *(or use as internal style guide)*

myPilotPost is built for teams that care about clarity, consistency, and operational control. This page documents the platform's enterprise-grade architecture, the language that accurately reflects it, and what enterprise prospects should expect during evaluation.

> myPilotPost is not a toy, a template factory, or a black-box AI product. It is a control-plane-driven SaaS platform designed to evolve safely as data, usage, and trust grow.

---

## Enterprise Architecture Summary

| Capability | Detail |
|---|---|
| Brand isolation | Every brand is a fully isolated workspace — data never crosses brand boundaries |
| Admin separation | Admin systems cannot alter customer state silently — observe only |
| Audit logging | All delivery and administrative events are logged and traceable |
| Encryption | In transit (HTTPS/TLS) and at rest (Cloudflare storage layer) |
| GDPR & POPIA compliance | Documented posture — see [Compliance](/compliance) |
| OAuth minimization | We request only the permissions required for features you use |
| Revocable integrations | Users can disconnect any platform at any time — tokens deleted immediately |
| Explainable AI | Every AI output includes its rationale — no black-box recommendations |
| Status transparency | Real-time availability at [status.mypilotpost.com](https://status.mypilotpost.com) |
| Fail-safe delivery | Failed deliveries surface to users — they are never silently dropped |

---

## Approved Trust Language

The following phrases reflect real platform behaviour and should be used consistently across the website, sales materials, and product copy.

| Phrase | Where & Why to Use It |
|---|---|
| Brand-scoped isolation | Security, data handling — reflects the architectural reality |
| Deterministic scheduling | Infrastructure, security — your posts publish exactly as configured |
| Explainable intelligence | AI principles, homepage — AI shows its reasoning, always |
| Operational transparency | Trust Center hub — admin observes; it never silently acts |
| Fail-safe delivery architecture | Infrastructure, security — errors surface; they never disappear |
| Human-reviewed workflows | AI principles, homepage — no autonomous publishing |
| Role-separated systems | Security, enterprise pages — admin and customer systems are isolated |
| Advisory AI systems | AI principles, homepage — ML recommends; it never decides |
| Consent-first analytics | Compliance, homepage — GA4 is not activated before consent |
| Control-plane-driven SaaS | Enterprise positioning — governance and observability are first-class |

---

## Language to Avoid

| Avoid | Use Instead |
|---|---|
| AI-powered automation | AI-assisted workflows |
| Automated publishing | Scheduled publishing with user approval |
| Predictive analytics (at v1) | Descriptive analytics and insights |
| AI-driven decisions | AI-assisted recommendations |
| Smart automation | Explainable, advisory intelligence |

---

## Enterprise Evaluation Checklist

For enterprise prospects, confirm the following is visible during evaluation:

- [ ] Brand isolation model — each brand is a fully isolated workspace
- [ ] Admin separation — admin systems cannot alter customer state silently
- [ ] Audit logging — all delivery and administrative events are logged
- [ ] Encryption in transit and at rest — enforced at infrastructure level
- [ ] GDPR and POPIA compliance posture — documented in [/compliance](/compliance)
- [ ] OAuth permission minimization — we request only what we use
- [ ] Revocable integrations — users can disconnect any platform at any time
- [ ] No black-box AI — every AI output includes its rationale
- [ ] Status transparency — real-time availability at [status.mypilotpost.com](https://status.mypilotpost.com)
- [ ] Data request process — documented in [/compliance](/compliance)

---

## Future Enterprise Capabilities (Roadmap)

- **Role-Based Access Control (RBAC)** — team-level permissions within brands
- **Multi-Factor Authentication (MFA)** — enforced option for all accounts
- **SSO / SAML** — enterprise identity provider integration
- **Penetration testing** — third-party security assessment
- **SOC 2 Type II** — planned for enterprise tier
- **Custom data retention policies** — configurable per brand
- **Dedicated SLA agreements** — for enterprise contracts

---

*Enterprise enquiries: trust@mypilotpost.com*
