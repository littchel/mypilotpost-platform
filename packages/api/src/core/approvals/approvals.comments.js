/**
 * myPilotPost — Approval Comments Controller
 * Phase 2
 * Supports internal + public (token) comments
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/* ======================================================
   GET COMMENTS (INTERNAL)
   GET /api/customer/approvals/:approval_id/comments
====================================================== */
export async function getApprovalComments(_request, env, auth, approvalId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(
    `
    SELECT
      id,
      author_type,
      author_name,
      comment,
      created_at
    FROM approval_comments
    WHERE approval_id = ?
    ORDER BY created_at ASC
    `
  )
  .bind(approvalId)
  .all();

  return json({
    approval_id: approvalId,
    comments: results || []
  });
}

/* ======================================================
   ADD COMMENT (INTERNAL)
   POST /api/customer/approvals/:approval_id/comments
====================================================== */
export async function addApprovalComment(request, env, auth, approvalId) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const body = await request.json();
  const { comment } = body || {};

  if (!comment) return error("Comment is required", 400);

  const db = getDB(env);

  await db.prepare(
    `
    INSERT INTO approval_comments (
      id,
      approval_id,
      author_type,
      author_name,
      comment,
      created_at
    )
    VALUES (?, ?, 'internal', ?, ?, CURRENT_TIMESTAMP)
    `
  )
  .bind(
    crypto.randomUUID(),
    approvalId,
    auth.user_id || "Internal User",
    comment
  )
  .run();

  await logCommentEvent(db, auth.brand_id, "internal_comment", {
    approval_id: approvalId
  });

  return json({ success: true });
}

/* ======================================================
   GET COMMENTS (PUBLIC)
   GET /public/approval/:token/comments
====================================================== */
export async function getApprovalCommentsByToken(_request, env, token) {
  const db = getDB(env);

  const approval = await db.prepare(
    `
    SELECT id
    FROM content_approvals
    WHERE approval_token = ?
      AND token_expires_at > CURRENT_TIMESTAMP
    `
  )
  .bind(token)
  .first();

  if (!approval) return error("Invalid or expired approval link", 404);

  const { results } = await db.prepare(
    `
    SELECT
      id,
      author_type,
      author_name,
      comment,
      created_at
    FROM approval_comments
    WHERE approval_id = ?
    ORDER BY created_at ASC
    `
  )
  .bind(approval.id)
  .all();

  return json({
    approval_id: approval.id,
    comments: results || []
  });
}

/* ======================================================
   ADD COMMENT (PUBLIC)
   POST /public/approval/:token/comments
====================================================== */
export async function addApprovalCommentByToken(request, env, token) {
  const body = await request.json();
  const { comment, author_name = "Client" } = body || {};

  if (!comment) return error("Comment is required", 400);

  const db = getDB(env);

  const approval = await db.prepare(
    `
    SELECT id, brand_id
    FROM content_approvals
    WHERE approval_token = ?
      AND token_expires_at > CURRENT_TIMESTAMP
    `
  )
  .bind(token)
  .first();

  if (!approval) return error("Invalid or expired approval link", 404);

  await db.prepare(
    `
    INSERT INTO approval_comments (
      id,
      approval_id,
      author_type,
      author_name,
      comment,
      created_at
    )
    VALUES (?, ?, 'client', ?, ?, CURRENT_TIMESTAMP)
    `
  )
  .bind(
    crypto.randomUUID(),
    approval.id,
    author_name,
    comment
  )
  .run();

  await logCommentEvent(db, approval.brand_id, "client_comment", {
    approval_id: approval.id
  });

  return json({ success: true });
}

/* ======================================================
   EVENT LOGGING
====================================================== */
async function logCommentEvent(db, brandId, type, metadata) {
  await db.prepare(
    `
    INSERT INTO events (
      id,
      brand_id,
      event_type,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
  )
  .bind(
    crypto.randomUUID(),
    brandId,
    type,
    JSON.stringify(metadata)
  )
  .run();
}
