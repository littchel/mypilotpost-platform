/**
 * myPilotPost — Public Client Approval Controller
 * Phase 2
 * Token-based, no authentication required
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/* ======================================================
   FETCH APPROVAL BY TOKEN (CLIENT VIEW)
   GET /public/approval/:token
====================================================== */
export async function getApprovalByToken(_request, env, token) {
  const db = getDB(env);

  const approval = await db.prepare(
    `
    SELECT
      ca.id,
      ca.content_id,
      ca.content_type,
      ca.brand_id,
      ca.status,
      ca.submitted_at,
      b.name AS brand_name
    FROM content_approvals ca
    JOIN brands b ON b.id = ca.brand_id
    WHERE ca.approval_token = ?
      AND ca.token_expires_at > CURRENT_TIMESTAMP
    `
  )
  .bind(token)
  .first();

  if (!approval) {
    return error("Approval link is invalid or expired", 404);
  }

  const content = await loadContent(db, approval.content_type, approval.content_id);

  return json({
    approval_id: approval.id,
    status: approval.status,
    submitted_at: approval.submitted_at,
    brand: {
      id: approval.brand_id,
      name: approval.brand_name
    },
    content
  });
}

/* ======================================================
   CLIENT APPROVE
   POST /public/approval/:token/approve
====================================================== */
export async function approveByToken(_request, env, token) {
  return updateByToken(env, token, "approved");
}

/* ======================================================
   CLIENT REJECT
   POST /public/approval/:token/reject
====================================================== */
export async function rejectByToken(_request, env, token) {
  return updateByToken(env, token, "rejected");
}

/* ======================================================
   CLIENT REQUEST CHANGES
   POST /public/approval/:token/request-changes
====================================================== */
export async function requestChangesByToken(request, env, token) {
  const body = await request.json();
  const { comment } = body || {};

  return updateByToken(env, token, "changes_requested", comment);
}

/* ======================================================
   INTERNAL HELPERS
====================================================== */

async function updateByToken(env, token, status, comment = null) {
  const db = getDB(env);

  const approval = await db.prepare(
    `
    SELECT id, brand_id
    FROM content_approvals
    WHERE approval_token = ?
      AND token_expires_at > CURRENT_TIMESTAMP
      AND status = 'pending'
    `
  )
  .bind(token)
  .first();

  if (!approval) {
    return error("Approval already processed or expired", 409);
  }

  await db.prepare(
    `
    UPDATE content_approvals
    SET
      status = ?,
      approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `
  )
  .bind(status, approval.id)
  .run();

  await logPublicEvent(db, approval.brand_id, status, {
    approval_id: approval.id,
    comment
  });

  return json({
    success: true,
    status
  });
}

/* ======================================================
   LOAD CONTENT FOR PREVIEW
====================================================== */

async function loadContent(db, type, contentId) {
  if (type === "social") {
    const asset = await db.prepare(
      `
      SELECT
        id,
        title
      FROM social_assets
      WHERE id = ?
      `
    )
    .bind(contentId)
    .first();

    const variants = await db.prepare(
      `
      SELECT platform, body
      FROM social_variants
      WHERE social_id = ?
      `
    )
    .bind(contentId)
    .all();

    return {
      type: "social",
      title: asset?.title,
      variants: variants.results || []
    };
  }

  if (type === "blog") {
    const post = await db.prepare(
      `
      SELECT
        id,
        title,
        body
      FROM blog_posts
      WHERE id = ?
      `
    )
    .bind(contentId)
    .first();

    return {
      type: "blog",
      title: post?.title,
      body: post?.body
    };
  }

  return null;
}

/* ======================================================
   EVENT LOGGING (PUBLIC)
====================================================== */

async function logPublicEvent(db, brandId, action, metadata) {
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
    `approval_${action}_public`,
    JSON.stringify(metadata)
  )
  .run();
}
