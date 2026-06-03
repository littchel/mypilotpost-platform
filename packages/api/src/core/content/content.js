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
    FROM content_vault
    WHERE id = ?
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

  await db.prepare(`
    UPDATE content_vault SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?
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
      cv.id,
      cv.content_type,
      cv.updated_at,
      cv.title,
      cv.lifecycle_status AS status
    FROM content_vault cv
    WHERE cv.brand_id = ?
    ORDER BY cv.updated_at DESC
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
    SELECT id, content_type, updated_at, title
    FROM content_vault
    WHERE brand_id = ? AND lifecycle_status = 'draft'
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
