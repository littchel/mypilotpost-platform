# OAuth & Permissions

**Route:** `/oauth-permissions`

myPilotPost connects to social media and productivity platforms on your behalf using OAuth — an industry-standard protocol that allows you to grant specific, revocable permissions without ever sharing your password.

> We request only the permissions necessary to deliver the specific features you use. We never ask for more access than we need.

---

## How OAuth Works

- You click **Connect** on a platform (e.g. Instagram, Google)
- You are redirected to that platform's official authentication screen
- You review the permissions being requested and approve or deny them
- The platform issues an access token to myPilotPost — not your password
- We store this token encrypted, scoped to your brand and connected account
- You can revoke access at any time — from myPilotPost or from the platform itself

---

## Permissions We Request — By Platform

### Meta (Instagram / Facebook)

| Permission | Why We Request It |
|---|---|
| `instagram_content_publish` | To publish scheduled posts to your Instagram account |
| `pages_manage_posts` | To publish to your connected Facebook Page |
| `instagram_basic` | To verify the connected account and retrieve basic profile data |
| `pages_read_engagement` | To retrieve engagement metrics for your analytics dashboard |
| `pages_show_list` | To display your available Pages during the connection flow |

### Google (Analytics / Search Console / My Business)

| Permission | Why We Request It |
|---|---|
| `analytics.readonly` | To read your GA4 analytics data for the Mission Analytics dashboard |
| `searchconsole.readonly` | To read Search Console data for the SEO Command Center |
| `business.manage` (read) | To retrieve your Google My Business profile data |

### LinkedIn

| Permission | Why We Request It |
|---|---|
| `w_member_social` | To publish scheduled posts to your LinkedIn profile or Page |
| `r_basicprofile` | To verify the connected account identity |
| `r_organization_social` | To retrieve engagement data for analytics |

### Canva

| Permission | Why We Request It |
|---|---|
| `design:content:read` | To access designs you create and save in Canva |
| `design:content:write` | To open the Canva editor within myPilotPost |
| `asset:read` | To retrieve Canva assets attached to your posts |

### Google Drive / Dropbox

| Permission | Why We Request It |
|---|---|
| `files.readonly` | To import media assets into your myPilotPost Content Hangar |

---

## What We Do NOT Do With OAuth Access

> These restrictions are enforced at the API permission scope level — we literally cannot do these things even if we wanted to.

- We never read or access your direct messages or private inbox
- We never post content without explicit user scheduling — no AI-initiated publishing
- We never follow, unfollow, or interact with other accounts on your behalf
- We never sell, share, or expose your OAuth tokens to third parties
- We never use access to one connected platform to access another
- We never retain OAuth tokens beyond the revocation of a connected account

---

## How Tokens Are Stored

- OAuth tokens are encrypted before storage
- Tokens are scoped per brand and per connected account — isolation is enforced
- Token storage uses Cloudflare's encrypted infrastructure
- Access tokens are never logged in plain text or included in error reports
- Token refresh (where supported by the platform) is handled server-side and transparently

---

## Revoking Access

### From myPilotPost

1. Go to **Control Tower → Integrations**
2. Select the connected account you wish to disconnect
3. Click **Disconnect** — the token is immediately deleted from our system

### From the Platform Directly

- **Instagram / Facebook:** Settings → Security → Apps and Websites → Remove myPilotPost
- **Google:** [myaccount.google.com](https://myaccount.google.com) → Security → Third-party apps with account access → Remove myPilotPost
- **LinkedIn:** Settings → Data Privacy → Permitted Services → Remove myPilotPost
- **Canva:** Account Settings → Connected Apps → Disconnect myPilotPost

Revoking from the platform directly will prevent myPilotPost from using that token. Removing from myPilotPost deletes our stored copy immediately.

---

*Questions about permissions? Contact trust@mypilotpost.com*
