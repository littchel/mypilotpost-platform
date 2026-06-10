/**
 * myPilotPost — Content Approval System
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

const APP_URL = 'https://app.mypilotpost.com';

async function sha256hex(raw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/customer/approvals
 * Submit content for approval — converges to canonical vault state.
 */
export async function submitForApproval(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { content_id, content_type: bodyType = 'social', reviewer_type = 'client', notes } = body;

  if (!content_id) return error("Content ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  // Resolve content type from vault (source of truth, not client-provided value)
  const item = await db.prepare(`
    SELECT content_type, lifecycle_status FROM content_vault WHERE id = ? AND brand_id = ?
  `).bind(content_id, brand_id).first();

  if (!item) return error("Content not found", "NOT_FOUND", null, 404);
  if (item.lifecycle_status === 'approval_requested') {
    return error("Already submitted for approval", "CONFLICT", null, 409);
  }

  const content_type = item.content_type || bodyType;

  // Generate secure share token
  const rawToken  = crypto.randomUUID().replace(/-/g, '');
  const tokenHash = await sha256hex(rawToken);
  const shareId   = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const share_url = `${APP_URL}/public/approval/${rawToken}`;

  const approvalId = crypto.randomUUID();

  // Canonical batch: mirrors vault.js state exactly
  const batch = [
    db.prepare(`
      INSERT INTO content_shares (id, brand_id, content_id, share_type, access_token_hash, expires_at)
      VALUES (?, ?, ?, 'client_review', ?, ?)
    `).bind(shareId, brand_id, content_id, tokenHash, expiresAt),

    db.prepare(`
      UPDATE content_vault
      SET    lifecycle_status = 'approval_requested', share_for_approval = 1,
             updated_at = CURRENT_TIMESTAMP
      WHERE  id = ? AND brand_id = ?
    `).bind(content_id, brand_id),

    db.prepare(`
      INSERT INTO approval_requests (id, brand_id, content_id, content_type, requested_by, reviewer_type, review_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(approvalId, brand_id, content_id, content_type, user_id, reviewer_type, notes || null),
  ];

  // Mirror social_assets if applicable
  if (content_type === 'social') {
    batch.push(db.prepare(`
      UPDATE social_assets
      SET    lifecycle_status = 'pending_approval', status = 'approval',
             updated_at = CURRENT_TIMESTAMP
      WHERE  id = ? AND brand_id = ?
    `).bind(content_id, brand_id));
  }

  await db.batch(batch);

  await emitEvent(env, 'content_submitted', {
    brand_id,
    user_id,
    content_id,
    metadata: { reviewer_type, share_url }
  });

  return json({ success: true, approval_id: approvalId, share_url });
}

/**
 * GET /api/customer/approvals
 * Paginated list of approval requests for this brand.
 */
export async function getApprovalRequests(request, env, auth) {
  const { brand_id } = auth;
  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50', 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT ar.id, ar.content_id, ar.content_type, ar.requested_by,
           ar.reviewer_type, ar.review_notes, ar.created_at,
           ar.approved_at, ar.approved_by, ar.rejected_by, ar.rejection_reason,
           (u.first_name || ' ' || u.last_name) AS requester_name
    FROM   approval_requests ar
    JOIN   users u ON u.id = ar.requested_by
    WHERE  ar.brand_id = ?
    ORDER  BY ar.created_at DESC
    LIMIT  ? OFFSET ?
  `).bind(brand_id, limit, offset).all();

  return json({ data: results || [], limit, offset });
}
