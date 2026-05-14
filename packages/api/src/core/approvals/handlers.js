/**
 * myPilotPost — Content Approval System
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

/**
 * POST /api/customer/approvals
 * Submit content for approval
 */
export async function submitForApproval(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { content_id, content_type = 'social', reviewer_type = 'client', notes } = body;

  if (!content_id) return error("Content ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  // 1. Create Approval Request
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO approval_requests (id, brand_id, content_id, content_type, requested_by, reviewer_type, review_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, brand_id, content_id, content_type, user_id, reviewer_type, notes).run();

  // 2. Update Content Status (Audit Trail)
  // Assuming 'content' table exists or update appropriate table
  // await db.prepare(`UPDATE content SET status = 'pending' WHERE id = ?`).bind(content_id).run();

  // 3. Create Share Link if reviewer_type is client
  let share_url = null;
  if (reviewer_type === 'client') {
    const token = crypto.randomUUID().replace(/-/g, '');
    const shareId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days

    // Hash token for storage
    const tokenHash = await hashToken(token);

    await db.prepare(`
      INSERT INTO content_shares (id, brand_id, content_id, share_type, access_token_hash, expires_at)
      VALUES (?, ?, ?, 'client_review', ?, ?)
    `).bind(shareId, brand_id, content_id, tokenHash, expiresAt).run();

    share_url = `https://app.mypilotpost.com/approve/${token}`;
  }

  // 4. Emit Event
  await emitEvent(env, 'content_submitted', {
    brand_id,
    user_id,
    content_id,
    metadata: { reviewer_type, share_url }
  });

  return json({ success: true, approval_id: id, share_url });
}

/**
 * GET /api/customer/approvals
 */
export async function getApprovalRequests(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT ar.*, (u.first_name || ' ' || u.last_name) as requester_name
    FROM approval_requests ar
    JOIN users u ON u.id = ar.requested_by
    WHERE ar.brand_id = ?
    ORDER BY ar.created_at DESC
  `).bind(brand_id).all();

  return json({ data: results });
}

async function hashToken(token) {
  const msgUint8 = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
