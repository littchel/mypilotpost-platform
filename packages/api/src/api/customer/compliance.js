// packages/api/src/api/customer/compliance.js
// GDPR/POPIA compliance endpoints: account deletion, data export, consent management.

import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";
import { rateLimit } from "../../lib/rate-limit.js";
import { triggerLifecycleEmail } from "../../core/lifecycle/engine.js";
import { sendEmail } from "../../core/email/send-email.js";
import { accountDeletionRequestedEmail, accountDeletedEmail } from "../../core/email/templates/index.js";

async function logComplianceEvent(db, { userId, eventType, resourceType, resourceId, details, ipAddress }) {
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO compliance_audit_log (id, user_id, event_type, resource_type, resource_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId || null, eventType, resourceType || null, resourceId || null,
    details ? JSON.stringify(details) : null, ipAddress || null).run();
}

// POST /api/customer/account/delete-request
// Creates a deletion request with a 7-day grace window.
export async function handleDeleteRequest(request, env, auth) {
  const limited = await rateLimit(env, `del-req:${auth.user_id}`, 3, 3600);
  if (limited) return error("Rate limit exceeded", "RATE_LIMIT", null, 429);

  const db = getDB(env);

  // Check for an existing active request
  const existing = await db.prepare(`
    SELECT id FROM deletion_requests WHERE user_id = ? AND status = 'pending' LIMIT 1
  `).bind(auth.user_id).first();

  if (existing) {
    return json({ success: true, already_pending: true, message: "A deletion request is already pending." });
  }

  const ip = request.headers.get("CF-Connecting-IP") || null;
  const body = await request.json().catch(() => ({}));
  const id = crypto.randomUUID();
  const scheduledFor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare(`
    INSERT INTO deletion_requests (id, user_id, scheduled_for, status, ip_address, reason)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).bind(id, auth.user_id, scheduledFor, ip, body.reason || null).run();

  await logComplianceEvent(db, {
    userId: auth.user_id,
    eventType: "deletion_requested",
    resourceType: "user",
    resourceId: auth.user_id,
    details: { request_id: id, scheduled_for: scheduledFor },
    ipAddress: ip,
  });

  try {
    const FRONTEND_URL = env.FRONTEND_URL || "https://app.mypilotpost.com";
    await triggerLifecycleEmail(env, {
      userId: auth.user_id,
      type: "account_deletion_requested",
      payload: {
        scheduled_for: scheduledFor,
        cancel_url: `${FRONTEND_URL}?tab=settings&action=cancel-deletion`,
      }
    });
  } catch (e) {
    console.warn("[COMPLIANCE] account_deletion_requested email failed:", e.message);
  }

  return json({
    success: true,
    request_id: id,
    scheduled_for: scheduledFor,
    message: "Your account deletion has been scheduled. You can cancel within 7 days.",
  });
}

// DELETE /api/customer/account/delete-request
// Cancels a pending deletion request within the grace window.
export async function handleDeleteCancel(request, env, auth) {
  const db = getDB(env);
  const ip = request.headers.get("CF-Connecting-IP") || null;

  const existing = await db.prepare(`
    SELECT id, scheduled_for FROM deletion_requests
    WHERE user_id = ? AND status = 'pending' LIMIT 1
  `).bind(auth.user_id).first();

  if (!existing) {
    return error("No pending deletion request found", "NOT_FOUND", null, 404);
  }

  await db.prepare(`
    UPDATE deletion_requests SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?
  `).bind(existing.id).run();

  await logComplianceEvent(db, {
    userId: auth.user_id,
    eventType: "deletion_cancelled",
    resourceType: "deletion_request",
    resourceId: existing.id,
    details: { was_scheduled_for: existing.scheduled_for },
    ipAddress: ip,
  });

  return json({ success: true, message: "Account deletion request has been cancelled." });
}

// GET /api/customer/account/delete-status
export async function handleDeleteStatus(request, env, auth) {
  const db = getDB(env);

  const req = await db.prepare(`
    SELECT id, status, requested_at, scheduled_for, cancelled_at, completed_at
    FROM deletion_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1
  `).bind(auth.user_id).first();

  return json({ deletion_request: req || null });
}

// POST /api/customer/data/export
// Synchronously collects and returns all user data as JSON.
export async function handleDataExport(request, env, auth) {
  const limited = await rateLimit(env, `export:${auth.user_id}`, 5, 86400);
  if (limited) return error("Export rate limit exceeded — maximum 5 exports per day", "RATE_LIMIT", null, 429);

  const db = getDB(env);
  const ip = request.headers.get("CF-Connecting-IP") || null;
  const userId = auth.user_id;

  // Collect user account data
  const user = await db.prepare(`
    SELECT id, first_name, last_name, email, created_at, subscription_status, signup_source
    FROM users WHERE id = ?
  `).bind(userId).first();

  // Brands the user has access to
  const { results: brands } = await db.prepare(`
    SELECT b.id, b.name, b.description, b.created_at, bu.role
    FROM brands b JOIN brand_users bu ON bu.brand_id = b.id
    WHERE bu.user_id = ?
  `).bind(userId).all();

  const brandIds = (brands || []).map(b => b.id);
  let posts = [], integrations = [], billingHistory = [], supportThreads = [];

  if (brandIds.length > 0) {
    const placeholders = brandIds.map(() => "?").join(",");

    const postsResult = await db.prepare(`
      SELECT id, brand_id, content, platform, status, scheduled_time, published_at, created_at
      FROM scheduled_posts WHERE brand_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 500
    `).bind(...brandIds).all();
    posts = postsResult.results || [];

    const intResult = await db.prepare(`
      SELECT id, brand_id, provider, created_at
      FROM oauth_connections WHERE brand_id IN (${placeholders})
    `).bind(...brandIds).all();
    integrations = intResult.results || [];
  }

  // Billing history (user-scoped)
  const billingResult = await db.prepare(`
    SELECT id, plan_id, amount_rands, status, created_at FROM billing_events
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
  `).bind(userId).all().catch(() => ({ results: [] }));
  billingHistory = billingResult.results || [];

  // Support messages sent by this user
  const supportResult = await db.prepare(`
    SELECT id, message, created_at FROM support_messages
    WHERE sender_id = ? ORDER BY created_at DESC LIMIT 200
  `).bind(userId).all().catch(() => ({ results: [] }));
  supportThreads = supportResult.results || [];

  // Record the export
  const exportId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO export_requests (id, user_id, ip_address) VALUES (?, ?, ?)
  `).bind(exportId, userId, ip).run();

  await logComplianceEvent(db, {
    userId,
    eventType: "data_exported",
    resourceType: "user",
    resourceId: userId,
    details: { export_id: exportId, record_counts: { brands: brands?.length, posts: posts.length, integrations: integrations.length } },
    ipAddress: ip,
  });

  const exportData = {
    export_id: exportId,
    exported_at: new Date().toISOString(),
    account: user,
    brands: brands || [],
    posts,
    integrations,
    billing_history: billingHistory,
    support_messages: supportThreads,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mypilotpost-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

// GET /api/customer/data/export/history
export async function handleExportHistory(request, env, auth) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, requested_at, status, format FROM export_requests
    WHERE user_id = ? ORDER BY requested_at DESC LIMIT 20
  `).bind(auth.user_id).all();

  return json({ exports: results || [] });
}

// POST /api/customer/consent
export async function handleConsentUpdate(request, env, auth) {
  const db = getDB(env);
  const ip = request.headers.get("CF-Connecting-IP") || null;
  const body = await request.json().catch(() => ({}));

  const analytics = body.analytics_consent === true ? 1 : 0;
  const marketing = body.marketing_consent === true ? 1 : 0;
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO consent_records (id, user_id, analytics_consent, functional_consent, marketing_consent, ip_address)
    VALUES (?, ?, ?, 1, ?, ?)
  `).bind(id, auth.user_id, analytics, marketing, ip).run();

  await logComplianceEvent(db, {
    userId: auth.user_id,
    eventType: "consent_updated",
    resourceType: "consent_record",
    resourceId: id,
    details: { analytics, marketing },
    ipAddress: ip,
  });

  return json({ success: true, consent: { analytics_consent: !!analytics, marketing_consent: !!marketing } });
}

// GET /api/customer/consent
export async function handleConsentGet(request, env, auth) {
  const db = getDB(env);

  const record = await db.prepare(`
    SELECT analytics_consent, functional_consent, marketing_consent, recorded_at
    FROM consent_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1
  `).bind(auth.user_id).first();

  return json({
    consent: record ? {
      analytics_consent: !!record.analytics_consent,
      functional_consent: true,
      marketing_consent: !!record.marketing_consent,
      recorded_at: record.recorded_at,
    } : null,
  });
}

// ─── Admin compliance handlers ────────────────────────────────────────────────

// GET /api/v1/admin/compliance/deletions
export async function adminListDeletions(request, env) {
  const db = getDB(env);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";

  const { results } = await db.prepare(`
    SELECT dr.id, dr.user_id, dr.status, dr.requested_at, dr.scheduled_for,
           dr.cancelled_at, dr.completed_at, u.email, u.first_name, u.last_name
    FROM deletion_requests dr
    LEFT JOIN users u ON u.id = dr.user_id
    WHERE dr.status = ?
    ORDER BY dr.requested_at DESC LIMIT 100
  `).bind(status).all();

  return json({ deletions: results || [] });
}

// GET /api/v1/admin/compliance/audit-log
export async function adminComplianceAuditLog(request, env) {
  const db = getDB(env);
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

  const { results } = await db.prepare(`
    SELECT cal.*, u.email FROM compliance_audit_log cal
    LEFT JOIN users u ON u.id = cal.user_id
    ORDER BY cal.created_at DESC LIMIT ?
  `).bind(limit).all();

  return json({ events: results || [] });
}

// GET /api/v1/admin/compliance/exports
export async function adminListExports(request, env) {
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT er.id, er.user_id, er.requested_at, er.status, er.format, u.email
    FROM export_requests er
    LEFT JOIN users u ON u.id = er.user_id
    ORDER BY er.requested_at DESC LIMIT 100
  `).bind().all();

  return json({ exports: results || [] });
}

// ─── Cron: process scheduled deletions ───────────────────────────────────────

export async function processPendingDeletions(env) {
  const db = getDB(env);

  const { results: due } = await db.prepare(`
    SELECT id, user_id FROM deletion_requests
    WHERE status = 'pending' AND scheduled_for <= datetime('now')
    LIMIT 10
  `).bind().all();

  if (!due || due.length === 0) return;

  for (const req of due) {
    try {
      await performAccountDeletion(db, req.user_id, req.id, env);
    } catch (e) {
      console.error(`[DELETION-CRON] Failed for user ${req.user_id}:`, e);
    }
  }
}

async function performAccountDeletion(db, userId, requestId, env) {
  // Mark as processing
  await db.prepare(`UPDATE deletion_requests SET status = 'processing' WHERE id = ?`).bind(requestId).run();

  // Send deletion confirmation email before anonymizing the address
  try {
    const user = await db.prepare(`SELECT email, first_name FROM users WHERE id = ?`).bind(userId).first();
    if (user?.email && !user.email.includes('@deleted.')) {
      const emailContent = accountDeletedEmail({ first_name: user.first_name });
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        env,
      });
    }
  } catch (e) {
    console.warn("[DELETION-CRON] account_deleted email failed:", e.message);
  }

  // Revoke all OAuth tokens
  await db.prepare(`DELETE FROM oauth_connections WHERE brand_id IN (SELECT id FROM brands WHERE id IN (SELECT brand_id FROM brand_users WHERE user_id = ?))`).bind(userId).run().catch(() => {});
  await db.prepare(`DELETE FROM social_connections WHERE brand_id IN (SELECT brand_id FROM brand_users WHERE user_id = ?)`).bind(userId).run().catch(() => {});

  // Anonymize posts (preserve structure, remove identifying content)
  await db.prepare(`UPDATE scheduled_posts SET content = '[deleted]' WHERE brand_id IN (SELECT brand_id FROM brand_users WHERE user_id = ?)`).bind(userId).run().catch(() => {});

  // Remove brand associations
  await db.prepare(`DELETE FROM brand_users WHERE user_id = ?`).bind(userId).run().catch(() => {});

  // Anonymize user account (preserve billing records with anonymous reference)
  await db.prepare(`
    UPDATE users SET
      first_name = '[deleted]',
      last_name = '[deleted]',
      email = CONCAT('deleted-', id, '@deleted.mypilotpost.com'),
      password_hash = NULL,
      subscription_status = 'deleted'
    WHERE id = ?
  `).bind(userId).run();

  // Mark deletion as completed
  await db.prepare(`
    UPDATE deletion_requests SET status = 'completed', completed_at = datetime('now') WHERE id = ?
  `).bind(requestId).run();

  await db.prepare(`
    INSERT INTO compliance_audit_log (id, user_id, event_type, resource_type, resource_id, details)
    VALUES (?, ?, 'deletion_completed', 'user', ?, '{"automated":true}')
  `).bind(crypto.randomUUID(), userId, userId).run();

  console.log(`[DELETION-CRON] Completed deletion for user ${userId}`);
}
