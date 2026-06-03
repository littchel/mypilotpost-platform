/**
 * myPilotPost — Content Vault
 * Single source of truth for all content.
 * All editors (Create Post, Article, AI Studio) write here.
 * Approval, Scheduling, Delivery consume content_id from here.
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";
import { normalizeForSQLite, hasConflict } from "../schedule/schedule.js";
import { completeReferral } from "../promotions/promotions.js";
import { insertExperienceNotification } from "../notifications/utils.js";
import { sendEmail } from "../email/send-email.js";

const LOCKED_STATUSES = new Set(['scheduled', 'queued', 'publishing', 'published']);

/* ============================================================
   HELPERS
   ============================================================ */

function safe(v, fallback = '[]') {
  if (!v) return fallback;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

async function fetchVaultItem(db, id, brand_id) {
  return db.prepare(
    `SELECT * FROM content_vault WHERE id = ? AND brand_id = ?`
  ).bind(id, brand_id).first();
}

/* ============================================================
   GET /api/customer/vault
   List all content — unified across all types and statuses.
   ============================================================ */
export async function listVault(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const url    = new URL(request.url);
  const status = url.searchParams.get("status");   // filter by lifecycle_status
  const type   = url.searchParams.get("type");     // social | blog | campaign
  const limit  = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  const db = getDB(env);

  let q = `SELECT * FROM content_vault WHERE brand_id = ?`;
  const params = [brand_id];

  if (type) { q += ` AND content_type = ?`; params.push(type); }

  if (status === "scheduled") {
    q += ` AND lifecycle_status IN ('scheduled','queued','publishing')`;
  } else if (status === "pending") {
    q += ` AND lifecycle_status IN ('approval_requested','ready')`;
  } else if (status) {
    q += ` AND lifecycle_status = ?`;
    params.push(status);
  }

  q += ` ORDER BY updated_at DESC LIMIT ?`;
  params.push(limit);

  const { results } = await db.prepare(q).bind(...params).all();
  return json({ success: true, data: results || [] });
}

/* ============================================================
   POST /api/customer/vault
   Create or update a content item. Single write path.
   ============================================================ */
export async function saveToVault(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const {
    content_id,
    content_type = "social",
    title,
    body: bodyText = "",
    hook,
    cta,
    hashtags,
    platforms,
    platform_variants,
    media_ids,
    lifecycle_status = "draft",
    scheduled_at,
    campaign_id,
    metadata,
    source = "editor",
  } = body;

  if (!bodyText && !title) {
    return error("Content body or title required", "BAD_REQUEST", null, 400);
  }

  const id = (content_id && isValidUUID(content_id)) ? content_id : crypto.randomUUID();
  const db = getDB(env);

  // Lock check — prevent editing scheduled/published content
  const existing = await fetchVaultItem(db, id, brand_id);
  if (existing && LOCKED_STATUSES.has(existing.lifecycle_status)) {
    return error(
      `Content is ${existing.lifecycle_status} and cannot be edited. Duplicate it instead.`,
      "CONTENT_LOCKED", null, 409
    );
  }

  const derivedTitle = title || (bodyText.slice(0, 60) + (bodyText.length > 60 ? "…" : ""));
  const version      = existing ? (existing.version || 1) + 1 : 1;

  if (existing) {
    await db.prepare(`
      UPDATE content_vault SET
        title             = ?,
        body              = ?,
        hook              = ?,
        cta               = ?,
        hashtags          = ?,
        platforms         = ?,
        platform_variants = ?,
        media_ids         = ?,
        lifecycle_status  = ?,
        scheduled_at      = ?,
        campaign_id       = ?,
        metadata          = ?,
        version           = ?,
        updated_at        = CURRENT_TIMESTAMP
      WHERE id = ? AND brand_id = ?
    `).bind(
      derivedTitle, bodyText, hook || null, cta || null,
      safe(hashtags), safe(platforms), safe(platform_variants, '{}'),
      safe(media_ids), lifecycle_status,
      scheduled_at || null, campaign_id || null,
      safe(metadata, '{}'), version,
      id, brand_id
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO content_vault
        (id, brand_id, user_id, content_type, title, body, hook, cta,
         hashtags, platforms, platform_variants, media_ids,
         lifecycle_status, scheduled_at, campaign_id, metadata, version, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, brand_id, user_id || null, content_type,
      derivedTitle, bodyText, hook || null, cta || null,
      safe(hashtags), safe(platforms), safe(platform_variants, '{}'),
      safe(media_ids), lifecycle_status,
      scheduled_at || null, campaign_id || null,
      safe(metadata, '{}'), 1, source
    ).run();
  }

  // Mirror write to social_assets for delivery engine backward compat
  if (content_type === 'social') {
    const platformsArr = Array.isArray(platforms) ? platforms : JSON.parse(safe(platforms));
    try {
      if (existing) {
        await db.prepare(`
          UPDATE social_assets
          SET title = ?, text = ?, lifecycle_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND brand_id = ?
        `).bind(derivedTitle, bodyText, lifecycle_status, lifecycle_status, id, brand_id).run();
      } else {
        const ctxId = crypto.randomUUID();
        await db.batch([
          db.prepare(`INSERT OR IGNORE INTO content_context (id, brand_id, user_id, locale) VALUES (?, ?, ?, 'en')`)
            .bind(ctxId, brand_id, user_id || ''),
          db.prepare(`
            INSERT OR IGNORE INTO social_assets (id, brand_id, user_id, context_id, title, text, campaign_id, lifecycle_status, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id, brand_id, user_id || '', ctxId, derivedTitle, bodyText, campaign_id || null, lifecycle_status, lifecycle_status),
        ]);
      }
      // Sync social_variants
      await db.prepare(`DELETE FROM social_variants WHERE social_asset_id = ?`).bind(id).run();
      const variantBatch = [{ platform: 'base', caption: bodyText }, ...platformsArr.map(p => ({ platform: p, caption: (platform_variants?.[p] || bodyText) }))];
      await db.batch(variantBatch.map(v =>
        db.prepare(`INSERT INTO social_variants (id, social_asset_id, platform, caption, status) VALUES (?, ?, ?, ?, 'draft')`)
          .bind(crypto.randomUUID(), id, v.platform, v.caption)
      ));
    } catch { /* mirror writes must not block vault write */ }
  }

  // Mirror write to blog_posts for delivery engine backward compat
  if (content_type === 'blog') {
    try {
      if (existing) {
        await db.prepare(`
          UPDATE blog_posts
          SET title = ?, body = ?, lifecycle_status = ?, status = ?, campaign_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND brand_id = ?
        `).bind(derivedTitle, bodyText, lifecycle_status, lifecycle_status, campaign_id || null, id, brand_id).run();
      } else {
        const ctxId = crypto.randomUUID();
        await db.batch([
          db.prepare(`INSERT OR IGNORE INTO content_context (id, brand_id, user_id, locale) VALUES (?, ?, ?, 'en')`)
            .bind(ctxId, brand_id, user_id || ''),
          db.prepare(`
            INSERT OR IGNORE INTO blog_posts
              (id, brand_id, user_id, context_id, title, body, campaign_id, lifecycle_status, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id, brand_id, user_id || '', ctxId, derivedTitle, bodyText, campaign_id || null, lifecycle_status, lifecycle_status),
        ]);
      }
    } catch { /* mirror writes must not block vault write */ }
  }

  return json({ success: true, content_id: id, version, lifecycle_status });
}

/* ============================================================
   GET /api/customer/vault/:id
   ============================================================ */
export async function getVaultItem(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").pop();

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  // Attach delivery jobs for status context
  const { results: jobs } = await db.prepare(
    `SELECT platform, status, scheduled_at, external_post_id FROM delivery_jobs WHERE content_id = ? AND brand_id = ? ORDER BY scheduled_at ASC`
  ).bind(id, brand_id).all();

  // Attach approval request if any
  const approval = await db.prepare(
    `SELECT * FROM approval_requests WHERE content_id = ? AND brand_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(id, brand_id).first();

  return json({ success: true, data: { ...item, delivery_jobs: jobs || [], approval: approval || null } });
}

/* ============================================================
   DELETE /api/customer/vault/:id
   ============================================================ */
export async function deleteVaultItem(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").pop();

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);
  if (LOCKED_STATUSES.has(item.lifecycle_status)) {
    return error("Cannot delete scheduled or published content", "CONTENT_LOCKED", null, 409);
  }

  await db.batch([
    db.prepare(`DELETE FROM content_vault WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM social_assets WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`DELETE FROM social_variants WHERE social_asset_id = ?`).bind(id),
    db.prepare(`DELETE FROM content_media_links WHERE content_id = ? AND brand_id = ?`).bind(id, brand_id),
  ]);

  return json({ success: true });
}

/* ============================================================
   POST /api/customer/vault/:id/approval
   Unified approval action: submit | approve | reject
   ============================================================ */
export async function vaultApproval(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const {
    action, notes, reviewer_type = "client", reviewer_email, channel = "dashboard",
    reviewer_name, reviewer_phone, delivery_channels, expiry,
  } = body;

  if (!["submit", "approve", "reject", "request_changes"].includes(action)) {
    return error("action must be: submit | approve | reject | request_changes", "BAD_REQUEST", null, 400);
  }

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  if (action === "submit") {
    if (item.lifecycle_status === 'approval_requested') {
      return error("Already submitted for approval", "CONFLICT", null, 409);
    }

    const approvalId = crypto.randomUUID();
    let share_url = null;

    // Always generate a share link for approval
    const token    = crypto.randomUUID().replace(/-/g, '');
    const shareId  = crypto.randomUUID();
    const expires  = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const msgUint8 = new TextEncoder().encode(token);
    const hashBuf  = await crypto.subtle.digest("SHA-256", msgUint8);
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    await db.prepare(
      `INSERT INTO content_shares (id, brand_id, content_id, share_type, access_token_hash, expires_at) VALUES (?, ?, ?, 'client_review', ?, ?)`
    ).bind(shareId, brand_id, id, tokenHash, expires).run();

    share_url = `https://app.mypilotpost.com/approve/${token}`;

    const nowStr = new Date().toISOString();

    // Calculate expiry datetime
    let expires_at = null;
    const expiryDays = { "24h": 1, "72h": 3, "7d": 7 }[expiry];
    if (expiryDays) expires_at = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const deliveryChannelsStr = JSON.stringify(
      Array.isArray(delivery_channels) && delivery_channels.length ? delivery_channels : ["email"]
    );

    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'approval_requested', share_for_approval = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'pending_approval', status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`INSERT INTO approval_requests (id, brand_id, content_id, content_type, requested_by, reviewer_type, review_notes, reviewer_email, channel, reviewer_name, reviewer_phone, delivery_channels, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(approvalId, brand_id, id, item.content_type, user_id, reviewer_type, notes || null, reviewer_email || null, channel, reviewer_name || null, reviewer_phone || null, deliveryChannelsStr, expires_at),
    ]);

    // Send approval email when reviewer_email provided
    if (reviewer_email && share_url) {
      const brand  = await db.prepare(`SELECT name FROM brands WHERE id = ? LIMIT 1`).bind(brand_id).first();
      const preview = (item.body || item.title || '').slice(0, 200);
      const emailHtml = buildApprovalEmail({
        brandName: brand?.name || 'myPilotPost',
        title:     item.title || 'Content for Review',
        preview,
        shareUrl:  share_url,
        notes
      });
      try {
        await sendEmail({ to: reviewer_email, subject: `You have content to review — ${brand?.name || 'myPilotPost'}`, html: emailHtml, env });
        await db.prepare(`UPDATE approval_requests SET email_sent_at = ? WHERE id = ?`).bind(nowStr, approvalId).run();
      } catch (emailErr) {
        console.error('[APPROVAL EMAIL]', emailErr.message);
      }
    }

    await insertExperienceNotification(db, brand_id, "approval", "Approval Requested", "Content sent for review.");
    return json({ success: true, status: "approval_requested", share_url });
  }

  if (action === "approve") {
    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'approved', status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE approval_requests SET approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE content_id = ? AND brand_id = ? AND approved_at IS NULL`).bind(user_id, id, brand_id),
    ]);
    return json({ success: true, status: "approved" });
  }

  if (action === "reject") {
    // Reject → archive so it disappears from both draft and approval views
    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'archived', status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE approval_requests SET rejected_by = ?, rejection_reason = ? WHERE content_id = ? AND brand_id = ? AND approved_at IS NULL`).bind(user_id, notes || null, id, brand_id),
    ]);
    return json({ success: true, status: "archived" });
  }

  if (action === "request_changes") {
    // Request changes → back to draft so creator can edit and resubmit
    await db.batch([
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'draft', status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE approval_requests SET rejection_reason = ? WHERE content_id = ? AND brand_id = ? AND approved_at IS NULL`).bind(notes || null, id, brand_id),
    ]);
    return json({ success: true, status: "draft" });
  }
}

/* ============================================================
   GET /api/customer/vault/approvals
   Content items currently in approval workflow, joined with
   their latest approval_request record.
   ============================================================ */
export async function getApprovalItems(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const db = getDB(env);

  const rows = await db.prepare(`
    SELECT
      cv.id, cv.title, cv.body, cv.content_type, cv.platforms,
      cv.lifecycle_status, cv.share_for_approval,
      cv.created_at AS content_created_at,
      cv.updated_at, cv.created_by, cv.updated_by,
      cv.campaign_objective, cv.objective,
      ar.id           AS ar_id,
      ar.requested_by, ar.reviewer_type,
      ar.review_notes, ar.reviewer_email,
      ar.reviewer_name, ar.reviewer_phone,
      ar.channel, ar.delivery_channels,
      ar.created_at   AS submitted_at,
      ar.expires_at,
      ar.approved_at, ar.approved_by,
      ar.rejected_by, ar.rejection_reason,
      ar.email_sent_at
    FROM content_vault cv
    LEFT JOIN approval_requests ar ON ar.id = (
      SELECT id FROM approval_requests
      WHERE content_id = cv.id
      ORDER BY created_at DESC LIMIT 1
    )
    WHERE cv.brand_id = ?
      AND cv.share_for_approval = 1
      AND cv.lifecycle_status IN ('approval_requested', 'changes_requested', 'approved')
    ORDER BY cv.updated_at DESC
    LIMIT 100
  `).bind(brand_id).all();

  const data = (rows.results || []).map(row => ({
    id: row.id,
    title: row.title,
    body: row.body,
    content_type: row.content_type,
    platforms: row.platforms,
    lifecycle_status: row.lifecycle_status,
    share_for_approval: row.share_for_approval,
    content_created_at: row.content_created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
    campaign_objective: row.campaign_objective,
    objective: row.objective,
    _approval: {
      id: row.ar_id,
      requested_by: row.requested_by,
      reviewer_type: row.reviewer_type,
      review_notes: row.review_notes,
      reviewer_email: row.reviewer_email,
      reviewer_name: row.reviewer_name,
      reviewer_phone: row.reviewer_phone,
      channel: row.channel,
      delivery_channels: row.delivery_channels,
      submitted_at: row.submitted_at,
      expires_at: row.expires_at,
      approved_at: row.approved_at,
      approved_by: row.approved_by,
      rejected_by: row.rejected_by,
      rejection_reason: row.rejection_reason,
      email_sent_at: row.email_sent_at,
    },
  }));

  return json({ success: true, data });
}

/* ============================================================
   POST /api/customer/vault/:id/schedule
   Single scheduling entry point for all content types.
   ============================================================ */
export async function vaultSchedule(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const { platforms = [], scheduled_at } = body;

  if (!scheduled_at) return error("scheduled_at is required", "BAD_REQUEST", null, 400);
  if (!isValidISO8601(scheduled_at)) return error("Invalid date format", "BAD_REQUEST", null, 400);
  if (new Date(scheduled_at) <= new Date()) return error("Cannot schedule in the past", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  const schedulablePlatforms = platforms.length
    ? platforms
    : JSON.parse(item.platforms || '[]');

  if (!schedulablePlatforms.length) return error("No platforms specified", "BAD_REQUEST", null, 400);

  const normalized = normalizeForSQLite(scheduled_at);
  const batch = [];

  for (const platform of schedulablePlatforms) {
    const conflict = await hasConflict(db, brand_id, platform, scheduled_at);
    if (conflict) continue;

    batch.push(db.prepare(`
      INSERT INTO delivery_jobs (id, brand_id, content_type, content_id, platform, scheduled_at, status, campaign_id)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).bind(crypto.randomUUID(), brand_id, item.content_type, id, platform, normalized, item.campaign_id || null));
  }

  if (!batch.length) return error("All platform slots are conflicted", "CONFLICT", null, 409);

  batch.push(
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'scheduled', scheduled_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`)
      .bind(normalized, id, brand_id),
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'scheduled', status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`)
      .bind(id, brand_id),
  );

  await db.batch(batch);
  await completeReferral(db, user_id, env).catch(() => {});
  await insertExperienceNotification(db, brand_id, "schedule", "Content Scheduled", `Publishing to ${schedulablePlatforms.join(", ")} at ${scheduled_at.slice(0, 16)}.`);

  return json({ success: true, jobs_created: batch.length - 2, scheduled_at });
}

/* ============================================================
   POST /api/customer/vault/:id/cancel
   Cancel a scheduled post — deletes delivery_jobs, reverts to draft.
   ============================================================ */
export async function vaultCancel(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  const db   = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);
  if (!['scheduled', 'queued'].includes(item.lifecycle_status)) {
    return error("Only scheduled or queued content can be cancelled", "CONFLICT", null, 409);
  }

  await db.batch([
    db.prepare(`DELETE FROM delivery_jobs WHERE content_id = ? AND brand_id = ? AND status IN ('scheduled','pending')`).bind(id, brand_id),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'draft', scheduled_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE social_assets SET lifecycle_status = 'draft', status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
  ]);

  return json({ success: true, status: "draft" });
}

/* ============================================================
   POST /api/customer/vault/:id/publish-now
   Immediate publish — creates a delivery job scheduled NOW.
   ============================================================ */
export async function vaultPublishNow(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const { brand_id, user_id } = auth;
  const id = request.params?.id || new URL(request.url).pathname.split("/").slice(-2)[0];

  let body;
  try { body = await request.json(); }
  catch { body = {}; }

  const db  = getDB(env);
  const item = await fetchVaultItem(db, id, brand_id);
  if (!item) return error("Content not found", "NOT_FOUND", null, 404);

  const platforms = body.platforms?.length
    ? body.platforms
    : JSON.parse(item.platforms || '[]');

  if (!platforms.length) return error("No platforms specified", "BAD_REQUEST", null, 400);

  const nowUtc = normalizeForSQLite(new Date().toISOString());
  const batch  = [];
  let created  = 0;

  for (const platform of platforms) {
    const existing = await db.prepare(
      `SELECT id FROM delivery_jobs WHERE content_id = ? AND platform = ? AND status IN ('scheduled','processing')`
    ).bind(id, platform).first();
    if (existing) continue;

    batch.push(db.prepare(`
      INSERT INTO delivery_jobs (id, brand_id, content_type, content_id, platform, scheduled_at, status, campaign_id)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).bind(crypto.randomUUID(), brand_id, item.content_type, id, platform, nowUtc, item.campaign_id || null));
    created++;
  }

  if (batch.length) {
    batch.push(
      db.prepare(`UPDATE content_vault SET lifecycle_status = 'queued', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
      db.prepare(`UPDATE social_assets SET lifecycle_status = 'queued', status = 'queued', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    );
    await db.batch(batch);
    await completeReferral(db, user_id, env).catch(() => {});
  }

  return json({ success: true, jobs_created: created });
}

/* ============================================================
   EMAIL TEMPLATE — approval request
   ============================================================ */
function buildApprovalEmail({ brandName, title, preview, shareUrl, notes }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#2563eb;padding:28px 32px;">
      <div style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Content Review</div>
      <div style="font-size:22px;font-weight:800;color:#fff;">${brandName}</div>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 6px;font-size:14px;color:#64748b;">You've been asked to review:</p>
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">${title}</h2>
      ${preview ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:14px;color:#374151;line-height:1.6;">${preview.replace(/\n/g,'<br>')}${preview.length >= 200 ? '…' : ''}</div>` : ''}
      ${notes ? `<div style="background:#fffbeb;border:1px solid #fef08a;border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#92400e;"><strong>Note:</strong> ${notes}</div>` : ''}
      <div style="display:flex;gap:12px;margin-bottom:28px;">
        <a href="${shareUrl}?decision=approved" style="flex:1;display:block;text-align:center;background:#059669;color:#fff;padding:14px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">✓ Approve</a>
        <a href="${shareUrl}?decision=rejected" style="flex:1;display:block;text-align:center;background:#f8fafc;color:#64748b;padding:14px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;border:1px solid #e2e8f0;">✗ Reject</a>
      </div>
      <a href="${shareUrl}" style="display:block;text-align:center;color:#2563eb;font-size:13px;font-weight:600;text-decoration:none;">View full content →</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center;">
      Sent via myPilotPost · <a href="https://app.mypilotpost.com" style="color:#94a3b8;">Open Dashboard</a>
    </div>
  </div>
</body>
</html>`;
}
