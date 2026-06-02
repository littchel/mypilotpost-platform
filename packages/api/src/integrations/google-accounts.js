/**
 * Resource Selection — post-OAuth account/property/page picker
 *
 * Platforms that require resource selection before becoming usable:
 *   google_analytics       → select GA4 property
 *   google_search_console  → select verified site
 *   google_business        → select account, then location
 *   linkedin               → select personal profile or company page
 *
 * Flow:
 *   1. OAuth callback saves token, sets status='pending' (or 'CONNECTED_NEEDS_RESOURCE')
 *   2. Frontend fetches GET /api/oauth/:platform/accounts?conn_id=...
 *   3. User picks a resource
 *   4. Frontend POSTs /api/oauth/:platform/select  {conn_id, resource_id, resource_name, resource_type}
 *   5. status → 'active', selected_resource_id/name persisted
 *
 * For Google Business a second step is needed:
 *   GET /api/oauth/google_business/locations?conn_id=...&account_id=...
 */

import { decrypt } from "../lib/crypto.js";
import { refreshSocialConnection } from "./refresh_manager.js";

/* ─────────────────────────────────────────────────────────────
   Resource listers — one per platform
───────────────────────────────────────────────────────────── */

async function listGA4Properties(accessToken) {
  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `GA4 API ${res.status}`);
  }
  const body = await res.json();

  const items = [];
  for (const acc of (body.accountSummaries || [])) {
    for (const prop of (acc.propertySummaries || [])) {
      items.push({
        id:           prop.property,        // "properties/123456"
        name:         prop.displayName,
        extra:        acc.displayName,      // parent account name
        resource_type: "property"
      });
    }
  }
  return items;
}

async function listGSCSites(accessToken) {
  const res = await fetch(
    "https://www.googleapis.com/webmasters/v3/sites",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `GSC API ${res.status}`);
  }
  const body = await res.json();
  return (body.siteEntry || []).map(s => ({
    id:           s.siteUrl,
    name:         s.siteUrl,
    extra:        s.permissionLevel,
    resource_type: "site"
  }));
}

async function listGMBAccounts(accessToken) {
  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `GMB accounts API ${res.status}`);
  }
  const body = await res.json();
  return (body.accounts || []).map(a => ({
    id:           a.name,            // "accounts/12345678"
    name:         a.accountName,
    extra:        a.type,
    resource_type: "account"
  }));
}

async function listGMBLocations(accessToken, accountId) {
  // accountId = "accounts/12345678"
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `GMB locations API ${res.status}`);
  }
  const body = await res.json();
  return (body.locations || []).map(l => ({
    id:           l.name,   // "accounts/123/locations/456"
    name:         l.title,
    extra:        l.storefrontAddress?.addressLines?.join(", ") || "",
    resource_type: "location"
  }));
}

async function listLinkedInOrgs(accessToken) {
  // Fetch org roles for the authenticated member
  const rolesRes = await fetch(
    "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202306"
      }
    }
  );
  if (!rolesRes.ok) {
    const e = await rolesRes.json().catch(() => ({}));
    throw new Error(e.message || `LinkedIn org ACLs API ${rolesRes.status}`);
  }
  const rolesData = await rolesRes.json();
  const elements  = rolesData.elements || [];

  if (elements.length === 0) {
    // Return personal profile only
    return [{
      id:            "personal",
      name:          "Personal Profile",
      extra:         "Publish as yourself",
      resource_type: "member"
    }];
  }

  // Fetch display names for each org URN in one batch
  const orgUrns = elements
    .map(e => e.organization?.["$URN"] || e.organization)
    .filter(Boolean);

  // LinkedIn REST API v2 — batch org lookup
  const encodedUrns = orgUrns.map(u => encodeURIComponent(u)).join(",");
  const orgRes = await fetch(
    `https://api.linkedin.com/v2/organizations?ids=List(${encodedUrns})&fields=id,name,localizedName,logoV2`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202306"
      }
    }
  );

  const items = [{
    id:            "personal",
    name:          "Personal Profile",
    extra:         "Publish as yourself",
    resource_type: "member"
  }];

  if (orgRes.ok) {
    const orgData = await orgRes.json();
    const orgs    = orgData.results || {};
    for (const [urn, org] of Object.entries(orgs)) {
      items.push({
        id:            urn,
        name:          org.localizedName || org.name?.localized?.en_US || "Company Page",
        extra:         `urn:li:organization:${org.id}`,
        resource_type: "organization"
      });
    }
  } else {
    // Fallback: return org URNs without display names
    for (const urn of orgUrns) {
      items.push({
        id:            urn,
        name:          urn,
        extra:         "",
        resource_type: "organization"
      });
    }
  }

  return items;
}

/* ─────────────────────────────────────────────────────────────
   Dispatcher
───────────────────────────────────────────────────────────── */

export async function listResourcesForPlatform(platform, accessToken, accountId) {
  switch (platform) {
    case "google_analytics":      return listGA4Properties(accessToken);
    case "google_search_console": return listGSCSites(accessToken);
    case "google_business":       return accountId
                                    ? listGMBLocations(accessToken, accountId)
                                    : listGMBAccounts(accessToken);
    case "linkedin_pages":        return listLinkedInOrgs(accessToken);
    default: throw new Error(`Resource listing not supported for platform: ${platform}`);
  }
}

/* ─────────────────────────────────────────────────────────────
   Endpoint handlers
───────────────────────────────────────────────────────────── */

export async function getAccountResources(request, env, auth) {
  const url      = new URL(request.url);
  const platform = url.pathname.split("/")[3]; // /api/oauth/:platform/accounts
  const connId   = url.searchParams.get("conn_id");
  const accountId = url.searchParams.get("account_id"); // for GMB locations drill-down

  if (!connId) return errorResponse("conn_id required", 400);

  const db   = env.DB || env.mypilotpost;
  let conn = await db.prepare(
    `SELECT id, platform, access_token, refresh_token, expires_at, status
     FROM social_connections
     WHERE id = ? AND brand_id = ? AND platform = ?`
  ).bind(connId, auth.brand_id, platform).first();

  if (!conn) return errorResponse("Connection not found", 404);

  const SELECTABLE = ["pending", "CONNECTED_NEEDS_RESOURCE", "active"];
  if (!SELECTABLE.includes(conn.status)) {
    return errorResponse("Connection not in a listable state", 409);
  }

  // Inline refresh: Google access tokens expire after 1 hour. If expired and a
  // refresh_token is present, rotate before calling the Google API.
  const now = Date.now();
  const expiry = conn.expires_at ? new Date(conn.expires_at).getTime() : null;
  if (expiry && expiry < now && conn.refresh_token) {
    const result = await refreshSocialConnection(db, conn, env);
    if (!result.success) {
      return errorResponse("Token expired and refresh failed — please reconnect", 401);
    }
    conn = await db.prepare(
      `SELECT id, platform, access_token, refresh_token, expires_at, status
       FROM social_connections WHERE id = ?`
    ).bind(conn.id).first();
  }

  let accessToken;
  try {
    accessToken = await decrypt(conn.access_token, env.ENCRYPTION_SECRET);
  } catch {
    return errorResponse("Failed to decrypt token", 500);
  }

  try {
    const resources = await listResourcesForPlatform(platform, accessToken, accountId || null);
    return new Response(JSON.stringify({ resources }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return errorResponse(err.message, 502);
  }
}

export async function selectResource(request, env, auth) {
  const url      = new URL(request.url);
  const platform = url.pathname.split("/")[3]; // /api/oauth/:platform/select

  let body;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const { conn_id, resource_id, resource_name, resource_type } = body || {};
  if (!conn_id || !resource_id) return errorResponse("conn_id and resource_id required", 400);

  const db = env.DB || env.mypilotpost;

  const conn = await db.prepare(
    `SELECT id, status FROM social_connections
     WHERE id = ? AND brand_id = ? AND platform = ?`
  ).bind(conn_id, auth.brand_id, platform).first();

  if (!conn) return errorResponse("Connection not found", 404);

  const SELECTABLE = ["pending", "CONNECTED_NEEDS_RESOURCE", "active"];
  if (!SELECTABLE.includes(conn.status)) {
    return errorResponse("Connection is not in a state that allows resource selection", 409);
  }

  await db.prepare(`
    UPDATE social_connections
    SET selected_resource_id   = ?,
        selected_resource_name = ?,
        resource_type          = ?,
        account_id             = CASE WHEN account_id = 'unknown' OR account_id IS NULL
                                      THEN ? ELSE account_id END,
        status                 = 'active',
        updated_at             = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    resource_id,
    resource_name || resource_id,
    resource_type || null,
    resource_id,
    conn_id
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}

/* GMB locations — separate endpoint because it's a second drill-down step */
export async function getGMBLocations(request, env, auth) {
  const url      = new URL(request.url);
  const connId   = url.searchParams.get("conn_id");
  const accountId = url.searchParams.get("account_id");

  if (!connId || !accountId) return errorResponse("conn_id and account_id required", 400);

  const db   = env.DB || env.mypilotpost;
  let conn = await db.prepare(
    `SELECT id, access_token, refresh_token, expires_at, status
     FROM social_connections
     WHERE id = ? AND brand_id = ? AND platform = 'google_business'`
  ).bind(connId, auth.brand_id).first();

  if (!conn) return errorResponse("Connection not found", 404);

  const now2 = Date.now();
  const expiry2 = conn.expires_at ? new Date(conn.expires_at).getTime() : null;
  if (expiry2 && expiry2 < now2 && conn.refresh_token) {
    const result = await refreshSocialConnection(db, conn, env);
    if (!result.success) {
      return errorResponse("Token expired and refresh failed — please reconnect", 401);
    }
    conn = await db.prepare(
      `SELECT id, access_token, refresh_token, expires_at, status
       FROM social_connections WHERE id = ?`
    ).bind(conn.id).first();
  }

  let accessToken;
  try {
    accessToken = await decrypt(conn.access_token, env.ENCRYPTION_SECRET);
  } catch {
    return errorResponse("Failed to decrypt token", 500);
  }

  try {
    const locations = await listGMBLocations(accessToken, accountId);
    return new Response(JSON.stringify({ locations }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return errorResponse(err.message, 502);
  }
}

function errorResponse(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
