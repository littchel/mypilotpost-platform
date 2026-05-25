# Security

**Route:** `/security`

myPilotPost is built on Cloudflare's global edge infrastructure with layered security controls designed for professional brand and agency workflows. This page explains how your data is protected, how brand isolation is enforced, and how we operate our systems securely.

> Security is not an afterthought at myPilotPost — it is embedded in the architecture. Brand isolation, JWT validation, and encrypted transport are first-class requirements, not optional layers.

---

## Infrastructure Security

### Where the Platform Runs

myPilotPost runs entirely on Cloudflare's global network:

| Component | Technology & Role |
|---|---|
| API Layer | Cloudflare Workers — serverless edge compute, globally distributed |
| Frontend | Cloudflare Pages — statically delivered, globally cached |
| Database | Cloudflare D1 (SQLite) — structured, brand-scoped relational data |
| Key-Value Store | Cloudflare KV — flags, locks, rate-limit state, configuration |
| Object Storage | Cloudflare R2 — media assets, securely stored, brand-scoped |
| Transport | HTTPS enforced on all routes — no unencrypted connections permitted |

This architecture means there are no self-managed servers to patch, no exposed database ports, and no infrastructure requiring manual intervention to stay secure.

### Brand-Scoped Isolation

Every piece of data in myPilotPost — content, analytics, connected accounts, media assets, scheduling records — is isolated per brand. This is enforced at the API layer, not just the UI.

- Each API request is validated against a JWT that encodes the brand identity
- No query can return data across brand boundaries
- Admin systems are entirely separated from customer workflows
- One user managing multiple brands cannot accidentally cross-access brand data

> **Brand isolation is a first-class architectural rule, not a permission setting. It cannot be misconfigured out of existence.**

---

## Authentication & Access Controls

### How Authentication Works

myPilotPost uses an OAuth-first authentication architecture:

- Users authenticate via OAuth providers (Google, etc.) or email/password
- Sessions are represented as JWTs — JSON Web Tokens — signed and validated server-side
- JWTs encode the user identity and brand scope
- No session data is stored in the browser beyond the JWT itself
- Token expiry and refresh are handled server-side
- Logout invalidates the session at the server; the JWT cannot be reused

### Admin System Separation

The myPilotPost admin control plane is strictly isolated from all customer-facing systems:

- Admin APIs require a separate secret header (X-Admin-Secret) not present in any customer session
- Admin routes are not accessible via customer JWTs under any condition
- Admin systems can observe customer state; they cannot silently alter it
- All admin actions produce audit-visible records

---

## Data Protection

### Encryption

- All data in transit is encrypted via HTTPS/TLS — enforced at the Cloudflare edge
- Data at rest in D1 and R2 is encrypted by Cloudflare's storage layer
- No plaintext storage of credentials, tokens, or sensitive account data
- OAuth tokens from connected social platforms are stored encrypted, scoped per connected account

### What We Never Store

- Social media account passwords
- Payment card details (handled by payment processor)
- Unrelated browsing data or third-party tracking identifiers
- Content or messages from connected platform inboxes

---

## Operational Security

### Least Privilege Principle

All internal systems operate on least privilege:

- Workers only access the KV namespaces and D1 databases they are explicitly bound to
- No wildcard access grants exist in any binding configuration
- Production and development environments are strictly separated
- Secrets and API keys are never exposed in client-side code or logs

### Monitoring & Incident Response

- Delivery jobs, scheduling operations, and auth events are logged
- Failed delivery attempts are tracked, surfaced in admin, and never silently dropped
- Rate limiting is applied at the API layer to prevent abuse
- The admin control plane provides real-time visibility into system health
- Security incidents are acknowledged within 48 hours of responsible disclosure

---

## Future Security Commitments

The following security enhancements are on our roadmap:

- **Role-Based Access Control (RBAC)** — team-level permission management within brands
- **Multi-Factor Authentication (MFA)** — required option for all accounts
- **Penetration testing** — scheduled third-party security assessment
- **Vulnerability management program** — structured disclosure and remediation process
- **SOC 2 readiness assessment** — planned for enterprise tier

---

*Questions? Contact security@mypilotpost.com*
