# OAuth & Permissions

**Route:** `/oauth-permissions`

**Thuthu (Pty) Ltd t/a myPilotPost** · Registration Number: 2025/102758/07  
23 Fielding Crescent, Mondeor Green, Johannesburg, Gauteng, 2091, South Africa

---

myPilotPost connects to social media and productivity platforms on your behalf using OAuth 2.0 — an industry-standard authorisation protocol that allows you to grant specific, revocable permissions to a third-party application without sharing your account password.

This page is relevant to users of myPilotPost and to the platform review processes of Meta, Google, LinkedIn, TikTok, Canva, and other connected services.

> We request only the permissions necessary to deliver the specific features you use. We never request permissions beyond what is required for stated functionality.

---

## How OAuth Works

When you connect a platform to myPilotPost:

1. You click **Connect** within the myPilotPost Integration Hub
2. You are redirected to that platform's official authentication and authorisation screen — hosted by that platform, not by us
3. You review the permissions being requested and choose to approve or deny
4. If approved, the platform issues an access token to myPilotPost — your password is never transmitted to us at any point
5. We store this token encrypted, scoped to your brand and connected account within our Cloudflare infrastructure
6. You can revoke access at any time — either from within myPilotPost or directly from the connected platform's settings

---

## Permissions We Request — By Platform

### Meta (Instagram / Facebook Pages)

| OAuth Permission | Why We Request It |
|---|---|
| `instagram_content_publish` | To publish scheduled posts to your connected Instagram Business or Creator account |
| `pages_manage_posts` | To publish scheduled posts to your connected Facebook Page |
| `instagram_basic` | To verify the connected account identity and retrieve basic profile data for display purposes |
| `pages_read_engagement` | To retrieve post engagement metrics (likes, comments, shares, reach) for your Mission Analytics dashboard |
| `pages_show_list` | To display your available Facebook Pages during the account connection flow |

We do not request `instagram_manage_messages`, `pages_messaging`, or any permission relating to inbox or DM access.

### Google (Analytics / Search Console / Google My Business)

| OAuth Permission / Scope | Why We Request It |
|---|---|
| `https://www.googleapis.com/auth/analytics.readonly` | To read your Google Analytics 4 property data for the Mission Analytics dashboard |
| `https://www.googleapis.com/auth/webmasters.readonly` | To read Search Console data for the SEO Command Center |
| `https://www.googleapis.com/auth/business.manage` (read-only operations) | To retrieve your Google My Business profile and location data |

We request read-only scopes wherever the platform makes them available.

### LinkedIn

| OAuth Permission | Why We Request It |
|---|---|
| `w_member_social` | To publish scheduled posts to your LinkedIn personal profile or Company Page |
| `r_basicprofile` | To verify the connected account identity |
| `r_organization_social` | To retrieve engagement data for your LinkedIn Company Page analytics |

### Canva

| OAuth Permission | Why We Request It |
|---|---|
| `design:content:read` | To access designs you create and save to your Canva account for use within myPilotPost |
| `design:content:write` | To open the Canva editor embedded within myPilotPost for content creation |
| `asset:read` | To retrieve Canva assets attached to your content items |

### Google Drive / Dropbox

| Permission | Why We Request It |
|---|---|
| Read-only file access (scoped) | To import media assets you select into your myPilotPost Content Hangar |

We request read-only access to files you explicitly select. We do not request access to your full Drive or Dropbox contents.

---

## What We Do NOT Do With OAuth Access

> These restrictions are enforced by the permission scopes we request. We do not request permissions that would enable these actions, and we do not perform them.

- We never read or access direct messages, private inboxes, or private conversations on any connected platform
- We never publish content without explicit user scheduling and confirmation via the myPilotPost Launch Pad — no AI-initiated or background publishing occurs
- We never follow, unfollow, like, comment on, or interact with third-party accounts or content on your behalf
- We never sell, share, licence, or otherwise expose your OAuth tokens or connected account data to any third party, except Cloudflare as our infrastructure provider
- We never use the OAuth access of one connected platform to access data from another
- We never retain OAuth tokens after a connected account is disconnected — tokens are deleted immediately upon disconnection
- We do not use OAuth access to scrape, harvest, or store data from connected platforms beyond what is necessary for the features described in this document

---

## How Tokens Are Stored

- OAuth access tokens are encrypted before storage using Cloudflare's infrastructure encryption layer
- Tokens are scoped per brand and per connected account — cross-brand access is architecturally prevented
- Access tokens are never logged in plaintext in application logs or error reports
- Token refresh (where supported by the connected platform) is handled server-side and transparently — you do not need to reconnect unless the platform revokes the token
- On account deletion, all stored tokens are deleted within 30 days

---

## Revoking Access

### From myPilotPost

1. Navigate to **Control Tower → Integration Hub**
2. Locate the connected account you wish to disconnect
3. Select **Disconnect** — the access token is deleted from our system immediately

### From the Connected Platform Directly

Revoking from the platform directly will invalidate the token in our system on the next API call. We recommend also disconnecting from within myPilotPost to ensure our stored token record is removed.

- **Instagram / Facebook:** facebook.com → Settings → Security → Apps and Websites → Remove myPilotPost
- **Google:** myaccount.google.com → Security → Third-party apps with account access → Remove myPilotPost
- **LinkedIn:** linkedin.com → Settings & Privacy → Data Privacy → Permitted Services → Remove myPilotPost
- **Canva:** canva.com → Account Settings → Connected Apps → Disconnect myPilotPost
- **Dropbox:** dropbox.com → Account → Security → Apps → Revoke myPilotPost

---

## Platform Review Reference

This page is maintained to support the app review processes of connected platforms. If you are a platform reviewer, the following confirms our data use:

- myPilotPost is a social media management and content scheduling tool for brands and agencies, operated by Thuthu (Pty) Ltd (Registration No. 2025/102758/07), South Africa
- All permission requests are directly tied to product features described on this page and in our [Privacy Policy](/privacy-policy)
- Data obtained via OAuth is used only for the stated purposes — scheduling, publishing, and analytics retrieval
- We do not transfer, sell, or use OAuth data for advertising, data brokering, or any purpose unrelated to platform functionality
- Users can revoke all permissions at any time through both our platform and the connected platform's native settings
- We comply with Meta's Platform Terms, Google's API Services User Data Policy, LinkedIn's API Terms of Use, and Canva's API Terms

*Platform review enquiries: legal@mypilotpost.com*
