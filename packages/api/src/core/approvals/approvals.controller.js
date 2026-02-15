/**
 * myPilotPost — Content Approval Controller
 * Internal / Authenticated (Agency & Team)
 * Phase 2 Safe
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { nanoid } from "nanoid";

/* ======================================================
   LIST APPROVALS
   GET /api/customer/approvals
====================================================== */
export async function listApprovals(_request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(
    `
    SELECT
      id,
      content_id,
      content_type,
      status,
      submitted_by,
      submitted_at,
      approved_by,
      approved_at
    FROM content_approvals
    WHERE brand_id = ?
    ORDER BY submitted_at DESC
    `
  )
  .bind(auth.brand_id)
  .all();

  return json({ approvals: results || [] });
}

/* ======================================================
   SUBMIT FOR APPROVAL
   POST /api/customer/approvals/submit
====================================================== */
export async function submitForApproval(request, env, auth) {
  if (!auth?.brand_id || !auth?.user_id) {
    return error("Unauthorized", 401);
  }

  const body = await request.json();
  const { content_id, content_type } = body || {};

  if (!content_id || !content_type) {
    return error("content_id and content_type are required", 400);
  }

  const db = getDB(env);
  const id = crypto.randomUUID();
  const token = nanoid(32);

  await db.prepare(
    `
    INSERT INTO content_approvals (
      id,
      content_id,
      content_type,
      brand_id,
      status,
      submitted_by,
      approval_token,
      token_expires_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now', '+14 days'))
    `
  )
  .bind(
    id,
    content_id,
    content_type,
    auth.brand_id,
    auth.user_id,
    token
  )
  .run();

  await logEvent(db, auth, "approval_submitted", {
    content_id,
    content_type
  });

  return json({
    approval_id: id,
    status: "pending"
  }, 201);
}

/* ======================================================
   APPROVE CONTENT
   POST /api/customer/approvals/:id/approve
====================================================== */
export async function approveContent(_request, env, auth, approvalId) {
  return updateApprovalStatus(
    env,
    auth,
    approvalId,
    "approved"
  );
}

/* ======================================================
   REJECT CONTENT
   POST /api/customer/approvals/:id/reject
====================================================== */
export async function rejectContent(_request, env, auth, approvalId) {
  return updateApprovalStatus(
    env,
    auth,
    approvalId,
    "rejected"
  );
}

/* ======================================================
   REQUEST CHANGES
   POST /api/customer/approvals/:id/request-changes
====================================================== */
export async function requestChanges(_request, env, auth, approvalId) {
  return updateApprovalStatus(
    env,
    auth,
    approvalId,
    "changes_requested"
  );
}

/* ======================================================
   GENERATE SHAREABLE LINK
   POST /api/customer/approvals/:id/share-link
====================================================== */
export async function generateApprovalLink(_request, env, auth, approvalId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);
  const token = nanoid(32);

  await db.prepare(
    `
    UPDATE content_approvals
    SET approval_token = ?,
        token_expires_at = datetime('now', '+14 days')
    WHERE id = ? AND brand_id = ?
    `
  )
  .bind(token, approvalId, auth.brand_id)
  .run();

  return json({
    approval_url: `${env.BASE_URL}/public/approval/${token}`
  });
}

/* ======================================================
   INTERNAL HELPERS
====================================================== */

async function updateApprovalStatus(env, auth, approvalId, status) {
  if (!auth?.brand_id || !auth?.user_id) {
    return error("Unauthorized", 401);
  }

  const db = getDB(env);

  const res = await db.prepare(
    `
    UPDATE content_approvals
    SET
      status = ?,
      approved_by = ?,
      approved_at = CURRENT_TIMESTAMP
    WHERE id = ? AND brand_id = ?
    `
  )
  .bind(
    status,
    auth.user_id,
    approvalId,
    auth.brand_id
  )
  .run();

  if (res.changes === 0) {
    return error("Approval not found or already processed", 404);
  }

  await logEvent(db, auth, `approval_${status}`, {
    approval_id: approvalId
  });

  return json({ success: true, status });
}

async function logEvent(db, auth, type, metadata = {}) {
  await db.prepare(
    `
    INSERT INTO events (
      id,
      brand_id,
      user_id,
      event_type,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
  )
  .bind(
    crypto.randomUUID(),
    auth.brand_id,
    auth.user_id,
    type,
    JSON.stringify(metadata)
  )
  .run();
}
