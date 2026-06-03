// packages/api/src/core/content/public_approval.js
// Phase 6: Public-facing approval endpoints (no auth required)
// Route: GET/POST /api/public/approval/:content_id

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

/**
 * GET /api/public/approval/:content_id
 * Returns content, brand, and public comments for the approval page.
 */
export async function getPublicContent(request, env, contentId) {
  if (!contentId) return error("Content ID required", 400);

  const db = getDB(env);

  // Fetch the content from vault (source of truth)
  const draft = await db.prepare(`
    SELECT id AS content_id, content_type, brand_id, title, lifecycle_status AS status
    FROM content_vault
    WHERE id = ?
    LIMIT 1
  `).bind(contentId).first();

  if (!draft) return error("Content not found", 404);

  // Only allow public access for content in approval flow
  if (!['approval_requested', 'approved', 'rejected'].includes(draft.status)) {
    return error("This content is not available for public review", 403);
  }

  // Fetch brand info
  const brand = await db.prepare(`
    SELECT id, name, logo_url, industry
    FROM brands WHERE id = ? LIMIT 1
  `).bind(draft.brand_id).first();

  // Fetch content body by type
  let contentBody = null;
  if (draft.content_type === 'social') {
    const variant = await db.prepare(`
      SELECT caption as content, platform FROM social_variants
      WHERE social_asset_id = ? AND platform = 'base' LIMIT 1
    `).bind(contentId).first();
    contentBody = variant;
  }

  // Fetch external comments only
  const { results: comments } = await db.prepare(`
    SELECT id, message, type, created_at, user_id FROM content_comments
    WHERE content_id = ? AND type = 'external'
    ORDER BY created_at ASC
  `).bind(contentId).all();

  return json({
    content: {
      ...contentBody,
      title: draft.title,
      status: draft.status,
      type: draft.content_type
    },
    brand,
    comments: comments || []
  });
}

/**
 * POST /api/public/approval/:content_id
 * External stakeholder approves or rejects content.
 */
export async function submitPublicDecision(request, env, contentId) {
  if (!contentId) return error("Content ID required", 400);

  const body = await request.json();
  const { status, comment } = body;

  if (!['approved', 'rejected'].includes(status)) {
    return error("Invalid decision. Must be 'approved' or 'rejected'", 400);
  }

  const db = getDB(env);

  // Verify content exists and is in approval state (vault is source of truth)
  const draft = await db.prepare(`
    SELECT id AS content_id, content_type, brand_id, lifecycle_status AS status
    FROM content_vault
    WHERE id = ? LIMIT 1
  `).bind(contentId).first();

  if (!draft) return error("Content not found", 404);
  if (draft.status !== 'approval_requested') return error("Content is no longer pending approval", 409);

  // Map decision to vault lifecycle status
  const newStatus = status === 'approved' ? 'approved' : 'draft';

  // Update vault (source of truth) + mirror tables
  const updates = [
    db.prepare(`
      UPDATE content_vault SET lifecycle_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatus, contentId),
  ];
  if (draft.content_type === 'social') {
    updates.push(db.prepare(`
      UPDATE social_assets SET lifecycle_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatus, newStatus, contentId));
  } else if (draft.content_type === 'blog') {
    updates.push(db.prepare(`
      UPDATE blog_posts SET lifecycle_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatus, newStatus, contentId));
  }
  await db.batch(updates);

  // Store the comment (marked as 'external')
  if (comment) {
    const commentId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO content_comments (id, content_id, user_id, message, type)
      VALUES (?, ?, 'external_client', ?, 'external')
    `).bind(commentId, contentId, comment).run();
  }

  // Growth Engine Integration
  if (newStatus === 'approved') {
    await emitEvent(env, 'content_approved', {
      brand_id: draft.brand_id,
      user_id: draft.user_id || 'system', // Ideally we'd know who requested approval
      content_id: contentId,
      meta: { source: 'public_link' }
    });
  }

  return json({ success: true, status: newStatus });
}

/**
 * POST /api/public/approval/:content_id/comment
 * External comment without a decision.
 */
export async function addPublicComment(request, env, contentId) {
  if (!contentId) return error("Content ID required", 400);

  const body = await request.json();
  const { message } = body;
  if (!message) return error("Message is required", 400);

  const db = getDB(env);
  const commentId = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO content_comments (id, content_id, user_id, message, type)
    VALUES (?, ?, 'external_client', ?, 'external')
  `).bind(commentId, contentId, message).run();

  return json({ success: true, id: commentId });
}
