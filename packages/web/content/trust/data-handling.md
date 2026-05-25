# Data Handling

**Route:** `/data-handling`

This page explains what data myPilotPost collects, how it is used, what it is never used for, and how it is protected. We are committed to data minimization — we collect only what is necessary to deliver the platform.

---

## What Data We Collect

### Account Data

- Name and email address (for registration and communication)
- Authentication identifiers (from OAuth providers where applicable)
- Password hash (if using email/password authentication — never stored in plaintext)
- Account creation timestamp and last login

### Brand & Workspace Data

- Brand name, description, and voice configuration
- Platform targeting preferences and strategic goals
- Brand memory events — patterns and preferences you have configured
- Team member associations (which users can access which brands)

### Content Data

- Social media posts and drafts — text, media references, scheduling details
- Blog post drafts and published records
- Campaign configurations and mission briefs
- Content generation history (prompts and outputs) — used to improve AI assistance within your brand only

### Scheduling & Delivery Data

- Scheduled post records — platform, time, status
- Delivery results — success, failure, retry records
- Delivery job logs — used for reliability monitoring and error resolution

### Analytics Data

- Engagement metrics pulled from connected platform APIs (likes, shares, reach, etc.)
- Delivery success and failure events
- Content performance comparisons (within your brand only)

### OAuth & Integration Metadata

- Connected account identifiers (not passwords — we never receive social media passwords)
- OAuth tokens — encrypted, scoped per connected account, stored securely
- Integration status and health indicators
- Permission scopes granted at connection time

### Technical & Operational Data

- API request logs — used for debugging, rate limiting, and security monitoring
- Error logs — used for reliability and incident response
- Session tokens — JWT-based, validated server-side

---

## What We Do NOT Collect

> Data minimization is a core principle. We do not collect data we do not need.

- Social media account passwords — we connect via OAuth; your passwords are never transmitted to us
- Private messages or DMs from connected social platforms
- Browsing activity outside of myPilotPost
- Device fingerprints or persistent tracking identifiers
- Third-party advertising profiles
- Data from platforms you have not explicitly connected
- Content from other users or brands

---

## How Data Is Used

| Purpose | Data Used |
|---|---|
| Scheduling & delivery | Scheduled post records, connected account tokens, delivery logs |
| Analytics & reporting | Engagement metrics, delivery events, content performance data |
| AI content assistance | Brand voice config, mission brief, content history (your brand only) |
| Account management | Account data, brand associations, session tokens |
| Customer support | Account data, error logs, delivery records (on request) |
| Security & monitoring | API logs, auth events, rate-limit state |
| Billing | Subscription tier, usage data (no payment card data stored by us) |

---

## Data Retention

- Active account data is retained while your account is active
- Delivery logs are retained for 90 days by default
- Analytics events are retained for the duration of your subscription
- Upon account deletion, personal data is removed within 30 days
- Anonymized, aggregated analytics may be retained for platform improvement

---

## Your Data Rights

You have the right to:

- **Access** — request a copy of your data
- **Rectification** — correct inaccurate data
- **Deletion** — request deletion of your account and associated data
- **Portability** — export your content, analytics, and brand configuration
- **Restriction** — limit processing of your data in specific circumstances
- **Objection** — object to processing based on legitimate interests

To submit a data request: **privacy@mypilotpost.com**

We respond to all data requests within 30 days.
