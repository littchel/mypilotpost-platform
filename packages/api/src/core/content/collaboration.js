import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { isValidUUID } from "../../lib/validation.js";

/**
 * Add Comment for Agency-Grade Workflow
 */
export async function addComment(request, env, auth) {
  if (!auth?.id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const url = new URL(request.url);
  const contentId = url.searchParams.get("id");
  if (!contentId) return error("Content ID is required", 400);

  const body = await request.json();
  const { message, parent_id, type = 'internal' } = body;
  
  if (!message) return error("Message is required", 400);

  const db = getDB(env);
  const commentId = crypto.randomUUID();

  // Verify access (content belongs to brand)
  const draft = await db.prepare(`
    SELECT content_type FROM content_drafts WHERE content_id = ? AND brand_id = ?
  `).bind(contentId, auth.brand_id).first();

  if (!draft) return error("Content not found or access denied", 404);

  await db.prepare(`
    INSERT INTO content_comments (id, content_id, parent_id, user_id, message, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(commentId, contentId, parent_id || null, auth.id, message, type).run();

  return json({ success: true, id: commentId });
}

/**
 * List Comments (Threaded)
 */
export async function listComments(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const url = new URL(request.url);
  const contentId = url.searchParams.get("id");
  if (!contentId) return error("Content ID is required", 400);

  const db = getDB(env);

  // Verify access
  const draft = await db.prepare(`
    SELECT content_type FROM content_drafts WHERE content_id = ? AND brand_id = ?
  `).bind(contentId, auth.brand_id).first();

  if (!draft) return error("Content not found or access denied", 404);

  const { results } = await db.prepare(`
    SELECT c.*, u.full_name as author_name
    FROM content_comments c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.content_id = ?
    ORDER BY c.created_at ASC
  `).bind(contentId).all();

  return json({ data: results || [] });
}

/**
 * Update Content Status (Approval Workflow)
 * Supports: draft, approval (in_review), approved, scheduled, published
 */
export async function updateContentStatus(request, env, auth, idFromPath = null) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const url = new URL(request.url);
  const contentId = idFromPath || url.searchParams.get("id");
  if (!contentId) return error("Content ID is required", 400);

  const body = await request.json();
  const { status, comment, action } = body;

  let targetStatus = status;
  // Map internal actions to canonical statuses
  if (action === 'reject' || action === 'request_changes' || status === 'rejected') {
    targetStatus = 'draft';
  } else if (status === 'in_review') {
    targetStatus = 'approval';
  }

  const validStatuses = ['draft', 'approval', 'approved', 'scheduled', 'published', 'failed', 'partial_failure'];
  if (!validStatuses.includes(targetStatus)) {
    return error(`Invalid status: ${targetStatus}`, 400);
  }

  const db = getDB(env);

  // 1. Verify access and get current status
  const current = await db.prepare(`
    SELECT content_type, state FROM content_drafts WHERE content_id = ? AND brand_id = ?
  `).bind(contentId, auth.brand_id).first();

  if (!current) return error("Content not found or access denied", 404);

  // 2. Strict Status Flow Enforcement
  // (draft -> approval -> approved -> scheduled -> published)
  const allowedTransitions = {
    'draft': ['approval', 'failed'],
    'approval': ['approved', 'draft', 'failed'],
    'approved': ['scheduled', 'published', 'draft', 'failed'],
    'scheduled': ['published', 'failed', 'partial_failure', 'draft'],
    'published': [], 
    'failed': ['approval', 'draft'],
    'partial_failure': ['approval', 'draft']
  };

  if (targetStatus !== current.state && !allowedTransitions[current.state]?.includes(targetStatus)) {
    // Exception: Allow force-revert to draft from ANY state (hard reset)
    if (targetStatus !== 'draft') {
       return error(`Invalid transition from ${current.state} to ${targetStatus}`, 400);
    }
  }

  // 3. Role Enforcement (Only owner/admin can approve)
  if (targetStatus === 'approved') {
    const brandUser = await db.prepare(`
      SELECT role FROM brand_users WHERE user_id = ? AND brand_id = ?
    `).bind(auth.id, auth.brand_id).first();

    const brand = await db.prepare(`
      SELECT owner_user_id FROM brands WHERE id = ?
    `).bind(auth.brand_id).first();

    const isOwner = brand?.owner_user_id === auth.id;
    const isAdmin = brandUser?.role === 'admin' || brandUser?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return error("Only Brand Owners or Admins can approve content", 403);
    }
  }

  // Logic: if status is 'approved', track who did it
  const approvedBy = targetStatus === 'approved' ? auth.id : null;

  // Update tables
  await db.batch([
    // Update central registry
    db.prepare(`
      UPDATE content_drafts SET state = ?, updated_at = CURRENT_TIMESTAMP
      WHERE content_id = ? AND brand_id = ?
    `).bind(targetStatus, contentId, auth.brand_id),

    // Update specific table based on type
    current.content_type === 'social' 
      ? db.prepare(`
          UPDATE social_assets 
          SET status = ?, 
              approved_by = COALESCE(?, approved_by),
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND brand_id = ?
        `).bind(targetStatus, approvedBy, contentId, auth.brand_id)
      : db.prepare(`
          UPDATE blog_posts 
          SET status = ?, 
              approved_by = COALESCE(?, approved_by),
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND brand_id = ?
        `).bind(targetStatus, approvedBy, contentId, auth.brand_id)
  ]);

  // If a comment was provided (e.g. Request Changes), save it
  if (comment || action === 'reject' || action === 'request_changes' || status === 'rejected') {
    const commentId = crypto.randomUUID();
    const finalMessage = comment || (action === 'reject' || status === 'rejected' ? "Content rejected." : "Changes requested.");
    await db.prepare(`
      INSERT INTO content_comments (id, content_id, user_id, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(commentId, contentId, auth.id, finalMessage, 'internal').run();
  }

  return json({ success: true, status: targetStatus, approved_by: approvedBy });
}
