// packages/api/src/core/content/public_approval.js
// Public-facing approval endpoints — token-gated, no authentication required.
// Route: GET/POST /api/public/approval/:token

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

// ── Token resolution ──────────────────────────────────────────────────────────

async function sha256hex(raw) {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolve a raw share token to { content_id, brand_id }.
 * Returns null on invalid / expired / revoked token.
 */
async function resolveToken(db, rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 8) return null;
  const hash = await sha256hex(rawToken);
  return db.prepare(`
    SELECT content_id, brand_id
    FROM   content_shares
    WHERE  access_token_hash = ?
      AND  expires_at        > datetime('now')
      AND  revoked           = 0
    LIMIT 1
  `).bind(hash).first();
}

// ── GET /api/public/approval/:token ──────────────────────────────────────────
export async function getPublicContent(request, env, rawToken) {
  const db = getDB(env);

  const share = await resolveToken(db, rawToken);
  if (!share) return error("Invalid, expired, or revoked approval link", 403);

  const { content_id, brand_id } = share;

  // Record last_viewed_at for analytics
  db.prepare(`
    UPDATE content_shares
    SET    view_count    = view_count + 1,
           last_viewed_at = datetime('now')
    WHERE  access_token_hash = ?
  `).bind(await sha256hex(rawToken)).run().catch(() => {});

  const draft = await db.prepare(`
    SELECT id AS content_id, content_type, brand_id, title, body,
           lifecycle_status AS status
    FROM   content_vault
    WHERE  id = ? AND brand_id = ?
    LIMIT  1
  `).bind(content_id, brand_id).first();

  if (!draft) return error("Content not found", 404);

  if (!['approval_requested', 'approved', 'changes_requested'].includes(draft.status)) {
    return error("This content is not available for review", 403);
  }

  const brand = await db.prepare(`
    SELECT id, name, logo_url, industry
    FROM   brands WHERE id = ? LIMIT 1
  `).bind(brand_id).first();

  let contentBody = { content: draft.body || "", platform: null };
  if (draft.content_type === 'social') {
    const variant = await db.prepare(`
      SELECT caption AS content, platform
      FROM   social_variants
      WHERE  social_asset_id = ? AND platform = 'base'
      LIMIT  1
    `).bind(content_id).first();
    contentBody = variant || contentBody;
  }

  const { results: comments } = await db.prepare(`
    SELECT id, message, type, created_at
    FROM   content_comments
    WHERE  content_id = ? AND type = 'external'
    ORDER  BY created_at ASC
  `).bind(content_id).all();

  return json({
    content: {
      ...contentBody,
      title:  draft.title,
      status: draft.status,
      type:   draft.content_type
    },
    brand,
    comments: comments || []
  });
}

// ── POST /api/public/approval/:token ─────────────────────────────────────────
export async function submitPublicDecision(request, env, rawToken) {
  const db = getDB(env);

  const share = await resolveToken(db, rawToken);
  if (!share) return error("Invalid, expired, or revoked approval link", 403);

  const { content_id, brand_id } = share;

  const body = await request.json();
  const { status, comment } = body;

  if (!['approved', 'rejected'].includes(status)) {
    return error("Decision must be 'approved' or 'rejected'", 400);
  }

  const draft = await db.prepare(`
    SELECT id AS content_id, content_type, user_id, lifecycle_status AS status
    FROM   content_vault
    WHERE  id = ? AND brand_id = ?
    LIMIT  1
  `).bind(content_id, brand_id).first();

  if (!draft) return error("Content not found", 404);
  if (draft.status !== 'approval_requested') {
    return error("Content is no longer pending approval", 409);
  }

  // approved → 'approved' | rejected → 'changes_requested' (recoverable)
  const newStatus = status === 'approved' ? 'approved' : 'changes_requested';

  const updates = [
    db.prepare(`
      UPDATE content_vault
      SET    lifecycle_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE  id = ? AND brand_id = ?
    `).bind(newStatus, content_id, brand_id),
  ];

  if (draft.content_type === 'social') {
    updates.push(db.prepare(`
      UPDATE social_assets
      SET    lifecycle_status = ?,
             status           = ?,
             updated_at       = CURRENT_TIMESTAMP
      WHERE  id = ? AND brand_id = ?
    `).bind(newStatus, status === 'approved' ? 'approved' : 'draft', content_id, brand_id));
  } else if (draft.content_type === 'blog') {
    updates.push(db.prepare(`
      UPDATE blog_posts
      SET    lifecycle_status = ?,
             status           = ?,
             updated_at       = CURRENT_TIMESTAMP
      WHERE  id = ? AND brand_id = ?
    `).bind(newStatus, status === 'approved' ? 'approved' : 'draft', content_id, brand_id));
  }

  if (status === 'approved') {
    updates.push(db.prepare(`
      UPDATE approval_requests
      SET    approved_at = CURRENT_TIMESTAMP
      WHERE  content_id = ? AND brand_id = ? AND approved_at IS NULL
    `).bind(content_id, brand_id));
  } else {
    updates.push(db.prepare(`
      UPDATE approval_requests
      SET    rejected_by        = COALESCE(rejected_by, 'public'),
             rejection_reason   = COALESCE(?, rejection_reason)
      WHERE  content_id = ? AND brand_id = ? AND approved_at IS NULL
    `).bind(comment || null, content_id, brand_id));
  }

  await db.batch(updates);

  if (comment) {
    await db.prepare(`
      INSERT INTO content_comments (id, content_id, user_id, message, type)
      VALUES (?, ?, 'external_client', ?, 'external')
    `).bind(crypto.randomUUID(), content_id, comment).run();
  }

  if (newStatus === 'approved') {
    await emitEvent(env, 'content_approved', {
      brand_id,
      user_id:    draft.user_id,
      content_id,
      meta: { source: 'public_link' }
    });
  }

  return json({ success: true, status: newStatus });
}

// ── POST /api/public/approval/:token/comment ─────────────────────────────────
export async function addPublicComment(request, env, rawToken) {
  const db = getDB(env);

  const share = await resolveToken(db, rawToken);
  if (!share) return error("Invalid, expired, or revoked approval link", 403);

  const { content_id } = share;
  const body = await request.json();
  const { message } = body;
  if (!message) return error("Message is required", 400);

  await db.prepare(`
    INSERT INTO content_comments (id, content_id, user_id, message, type)
    VALUES (?, ?, 'external_client', ?, 'external')
  `).bind(crypto.randomUUID(), content_id, message).run();

  return json({ success: true });
}
