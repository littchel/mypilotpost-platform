// packages/api/src/api/admin/governance.js
// Config → Roles (read-only, from permissions.js) + System (extended status).

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { PERMISSIONS } from "../../auth/permissions.js";
import { TEMPLATE_REGISTRY } from "../../core/email/templates/index.js";

/**
 * GET /api/v1/admin/templates
 * Platform transactional/notification templates (from TEMPLATE_REGISTRY) + legal docs.
 */
export function getAdminTemplates() {
  const CATEGORY = {
    welcome: "lifecycle", email_verified: "lifecycle", brand_created: "lifecycle",
    first_post: "lifecycle", content_published: "notification", approval: "notification",
    trial_ending: "billing", upgrade_prompt: "billing", team_invite: "team",
    churn_prevention: "lifecycle", weekly_digest: "digest",
    password_reset: "security", password_changed: "security", onboarding_reminder: "lifecycle",
    account_deletion_requested: "compliance", otp_verification: "security",
    support_reply: "support", ticket_resolved: "support",
  };
  const templates = Object.keys(TEMPLATE_REGISTRY || {}).map(key => ({
    key,
    name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    category: CATEGORY[key] || "transactional",
    type: "email",
  }));
  const legal = [
    { name: "Privacy Policy", url: "https://mypilotpost.com/privacy", type: "legal" },
    { name: "Terms of Service", url: "https://mypilotpost.com/terms", type: "legal" },
  ];
  return json({ templates, legal, source: "TEMPLATE_REGISTRY", editable: false });
}

// Map a permission prefix → the admin workspace it grants access to.
const WORKSPACE_FOR_PREFIX = {
  users: "Customers", support: "Support", billing: "Billing", pricing: "Commercial",
  blog: "Content", analytics: "Platform Ops", operations: "Platform Ops",
  audits: "Config", usage: "Config", connections: "Platform Ops", reports: "Content",
  messaging: "Support",
};

/**
 * GET /api/v1/admin/roles
 * Read-only RBAC matrix derived from permissions.js. Export allowed (client-side).
 */
export function getAdminRoles() {
  const roles = Object.entries(PERMISSIONS).map(([role, perms]) => {
    const wildcard = perms.includes("*");
    const workspaces = wildcard
      ? ["All workspaces"]
      : [...new Set(perms.map(p => WORKSPACE_FOR_PREFIX[p.split(":")[0]]).filter(Boolean))];
    return {
      role,
      wildcard,
      permissions: wildcard ? ["* (full access)"] : perms,
      permission_count: wildcard ? "all" : perms.length,
      workspace_access: workspaces,
    };
  });
  return json({ roles, source: "permissions.js", editable: false });
}

/**
 * GET /api/v1/admin/system/extended
 * Workers, domains, webhooks, provider status — operational health beyond /system/status.
 */
export async function getSystemExtended(env) {
  const db = getDB(env);

  const domains = [
    { name: "api.mypilotpost.com",   role: "API Worker",   configured: Boolean(env.BASE_URL) },
    { name: "app.mypilotpost.com",   role: "Dashboard",    configured: Boolean(env.FRONTEND_URL || env.APP_BASE_URL) },
    { name: "admin.mypilotpost.com", role: "Admin Portal", configured: true },
  ];

  const webhooks = {
    yoco: {
      secret_configured: Boolean(env.YOCO_WEBHOOK_SECRET),
      status: Boolean(env.YOCO_WEBHOOK_SECRET) ? "configured" : "not_configured",
    },
  };
  // recent webhook-driven payments as a liveness signal
  const lastPayment = await db.prepare(
    "SELECT MAX(occurred_at) AS t FROM payments WHERE provider='yoco'"
  ).first().catch(() => ({}));
  webhooks.yoco.last_event_at = lastPayment?.t || null;

  // Provider status — social connection health summary
  const { results: provRows } = await db.prepare(`
    SELECT platform,
      COUNT(*) AS total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < datetime('now','+7 day') THEN 1 ELSE 0 END) AS expiring
    FROM social_connections GROUP BY platform
  `).all().catch(() => ({ results: [] }));

  const providers = (provRows || []).map(p => ({
    platform: p.platform, total: p.total, active: p.active, expiring: p.expiring,
    status: p.active > 0 ? "operational" : "degraded",
  }));
  // Non-OAuth providers configured by key
  providers.push({ platform: "adobe_express", configured: Boolean(env.ADOBE_CLIENT_ID), status: env.ADOBE_CLIENT_ID ? "configured" : "not_configured" });
  providers.push({ platform: "pexels", configured: Boolean(env.PEXELS_API_KEY), status: env.PEXELS_API_KEY ? "configured" : "not_configured" });

  const workers = [
    { name: "API Worker", status: "operational" },
    { name: "Email worker", status: Boolean(env.RESEND_API_KEY) ? "configured" : "not_configured" },
    { name: "Delivery scheduler", status: "operational" },
  ];

  return json({ workers, domains, webhooks, providers, generated_at: new Date().toISOString() });
}
