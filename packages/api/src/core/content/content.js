import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/* ======================================================
   UPDATE CONTENT (SOCIAL + BLOG)
   - UUID-based
   - Draft index = content_drafts (index only)
====================================================== */
export async function updateContent(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const contentId = request.url.split("/").pop();
  if (!contentId) return error("Invalid content id", 400);

  const body = await request.json();
  const db = getDB(env);

  const draft = await db.prepare(`
    SELECT content_type
    FROM content_drafts
    WHERE content_id = ?
      AND brand_id = ?
  `).bind(contentId, auth.brand_id).first();

  if (!draft) return error("Content not found", 404);

  if (draft.content_type === "social") {
    await db.prepare(`
      UPDATE social_assets
      SET
        title = COALESCE(?, title),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND brand_id = ?
    `).bind(
      body.title ?? body.text ?? null,
      contentId,
      auth.brand_id
    ).run();
  }

  if (draft.content_type === "blog") {
    await db.prepare(`
      UPDATE blog_posts
      SET
        title = COALESCE(?, title),
        body  = COALESCE(?, body),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND brand_id = ?
    `).bind(
      body.title ?? null,
      body.body ?? null,
      contentId,
      auth.brand_id
    ).run();
  }

  // Touch draft index for ordering
  await db.prepare(`
    UPDATE content_drafts
    SET updated_at = CURRENT_TIMESTAMP
    WHERE content_id = ?
      AND brand_id = ?
  `).bind(contentId, auth.brand_id).run();

  return json({ success: true });
}

/* ======================================================
   LIST CONTENT (DASHBOARD / ALL CONTENT)
====================================================== */
export async function listContent(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      cd.content_id        AS id,
      cd.content_type,
      cd.updated_at,
      CASE
        WHEN cd.content_type = 'social' THEN sa.title
        WHEN cd.content_type = 'blog'   THEN bp.title
      END AS title,
      CASE
        WHEN cd.content_type = 'social' THEN sa.status
        WHEN cd.content_type = 'blog'   THEN bp.status
      END AS status
    FROM content_drafts cd
    LEFT JOIN social_assets sa
      ON cd.content_type = 'social'
     AND sa.id = cd.content_id
    LEFT JOIN blog_posts bp
      ON cd.content_type = 'blog'
     AND bp.id = cd.content_id
    WHERE cd.brand_id = ?
    ORDER BY cd.updated_at DESC
  `).bind(auth.brand_id).all();

  return json({
    brand_id: auth.brand_id,
    content: results || []
  });
}

/* ======================================================
   LIST DRAFTS (TAB / QUICK LIST)
====================================================== */
export async function getDrafts(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      content_id AS id,
      content_type,
      updated_at
    FROM content_drafts
    WHERE brand_id = ?
    ORDER BY updated_at DESC
  `).bind(auth.brand_id).all();

  return json({
    brand_id: auth.brand_id,
    drafts: results || []
  });
}

/* ======================================================
   LIST SCHEDULED CONTENT (UNCHANGED)
====================================================== */
export async function getScheduled(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      id,
      content_id,
      platform,
      scheduled_at,
      status
    FROM delivery_jobs
    WHERE brand_id = ?
      AND status = 'scheduled'
    ORDER BY scheduled_at ASC
  `).bind(auth.brand_id).all();

  return json({ scheduled: results || [] });
}
