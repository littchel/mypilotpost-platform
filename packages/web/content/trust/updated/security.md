# Security

**Route:** `/security`

**Thuthu (Pty) Ltd t/a myPilotPost** · Registration Number: 2025/102758/07  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa

---

myPilotPost is a social media content intelligence and execution platform built on Cloudflare's global edge infrastructure. This page explains how your data is protected, how brand isolation is enforced, and how we operate our systems securely.

Security is governed by our obligations under the Protection of Personal Information Act, No. 4 of 2013 (POPIA), the Electronic Communications and Transactions Act, No. 25 of 2002 (ECTA), and where applicable the General Data Protection Regulation (GDPR). Under POPIA, we are required to implement appropriate, reasonable technical and organisational measures to prevent loss of, damage to, or unauthorised destruction of personal information, and to prevent unlawful access to or processing of personal information.

> Security is not an afterthought at myPilotPost — it is embedded in the architecture. Brand isolation, JWT validation, and encrypted transport are first-class requirements, not optional layers.

---

## Infrastructure Security

### Where the Platform Runs

myPilotPost runs entirely on Cloudflare's global network. We do not operate self-managed servers. There are no exposed database ports and no infrastructure requiring manual patching.

| Component | Technology & Role |
|---|---|
| API Layer | Cloudflare Workers — serverless edge compute, globally distributed |
| Frontend | Cloudflare Pages — statically delivered, globally cached |
| Database | Cloudflare D1 (SQLite) — structured, brand-scoped relational data |
| Key-Value Store | Cloudflare KV — flags, locks, rate-limit state, configuration |
| Object Storage | Cloudflare R2 — media assets, securely stored, brand-scoped |
| Transport | HTTPS/TLS enforced on all routes — no unencrypted connections permitted |

Cloudflare operates data centres globally. Data residency is distributed across Cloudflare's network in accordance with their infrastructure. We do not store personal data on infrastructure we own or manage directly.

### Brand-Scoped Isolation

Every piece of data in myPilotPost — content, analytics, connected accounts, media assets, and scheduling records — is isolated per brand. This isolation is enforced at the API layer, not only at the UI.

- Each API request is validated against a JWT (JSON Web Token) that encodes the authenticated user's brand identity
- No database query can return data across brand boundaries
- Admin systems are entirely separated from customer-facing workflows
- A user managing multiple brands cannot access data across those brands without explicit authorisation

> **Brand isolation is a first-class architectural rule enforced at the API level. It cannot be misconfigured out of existence at the UI layer.**

---

## Authentication & Access Controls

### How Authentication Works

myPilotPost uses an OAuth-first authentication architecture consistent with industry standards:

- Users authenticate via OAuth providers (Google, etc.) or email/password
- Sessions are represented as JWTs — signed server-side and validated on every request
- JWTs encode the authenticated user identity and the brand scope of the session
- No session state is stored in the browser beyond the JWT itself
- Token expiry and refresh are handled server-side
- Logout invalidates the session at the server; the token cannot be reused after logout

### Admin System Separation

The myPilotPost admin control plane is strictly isolated from all customer-facing systems in compliance with the principle of least privilege under POPIA's security safeguard obligations:

- Admin APIs require a separate authentication mechanism (X-Admin-Secret header) that is never present in any customer session token
- Admin routes are inaccessible via customer JWTs under any condition
- Admin systems can observe customer state for operational and governance purposes; they cannot silently alter customer data
- All admin operations produce audit-visible records

---

## Data Protection

### Encryption

- All data in transit is encrypted via HTTPS/TLS — enforced at the Cloudflare edge before any data reaches our application layer
- Data at rest in Cloudflare D1 and R2 is encrypted by Cloudflare's storage layer
- No credentials, OAuth tokens, or sensitive account data are stored in plaintext
- OAuth tokens from connected social platforms are stored encrypted and scoped per connected account

### What We Never Store

- Social media account passwords — OAuth means we never receive them
- Payment card details — payments are processed by YOCO; we do not store card data on our systems
- Private messages or inbox content from connected social platforms
- Browsing activity outside of myPilotPost
- Biometric data or identity document data

---

## Operational Security

### Least Privilege

All internal systems operate on the principle of least privilege as required by sound security practice and POPIA's security safeguard obligations:

- Cloudflare Workers only access the KV namespaces and D1 databases explicitly bound to them
- No wildcard access grants exist in any binding configuration
- Production and development environments are strictly separated
- API keys and secrets are never exposed in client-side code or application logs

### Monitoring & Incident Response

- Delivery jobs, scheduling operations, and authentication events are logged for security and operational purposes
- Failed delivery attempts are tracked, surfaced to users, and never silently dropped
- Rate limiting is applied at the API layer to prevent abuse and denial-of-service attempts
- The admin control plane provides real-time visibility into system health
- Security vulnerabilities may be disclosed responsibly to security@mypilotpost.com — we acknowledge all reports within 48 hours

### Breach Notification

In the event of a personal information breach, Thuthu (Pty) Ltd will notify affected data subjects and the Information Regulator of South Africa as required by section 22 of POPIA, as soon as reasonably possible after discovery of the breach. Where GDPR applies, we will notify the relevant supervisory authority within 72 hours of becoming aware of the breach.

---

## Payment Security

Payments on myPilotPost are processed by **YOCO**, a South African licensed payment service provider. Thuthu (Pty) Ltd holds a signed merchant agreement with YOCO and is authorised to accept online payments. We do not store, transmit, or process payment card data on our own infrastructure. All card data is handled exclusively by YOCO within their PCI-DSS compliant environment.

---

## Future Security Commitments

The following enhancements are on our security roadmap:

- **Role-Based Access Control (RBAC)** — team-level permission management within brands
- **Multi-Factor Authentication (MFA)** — enforced option for all accounts
- **Penetration testing** — scheduled third-party security assessment
- **Vulnerability management programme** — structured disclosure and remediation process
- **SOC 2 readiness assessment** — planned for enterprise tier

---

*Security disclosures: security@mypilotpost.com*  
*Legal & compliance: legal@mypilotpost.com*
