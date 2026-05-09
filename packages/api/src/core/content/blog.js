// packages/api/src/core/content/blog.js
import { error, json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { hasConflict, normalizeForSQLite } from "../schedule/schedule.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";

/**
 * BLOG CONTENT ENGINE — HARDENED V2.0
 */

function validateBlogContent(body) {
  if (!body.title || body.title.length < 5) throw new Error("TITLE_TOO_SHORT");
  if (!body.body || body.body.length < 50) throw new Error("CONTENT_TOO_SHORT");
}

export async function createBlogPost(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;

  try {
    const body = await request.json();
    validateBlogContent(body);

    const { title, body: content, slug, campaign_id = null } = body;
    const postId = crypto.randomUUID();
    const contextId = crypto.randomUUID();

    await db.batch([
      db.prepare(`INSERT INTO content_context (id, brand_id, user_id, locale) VALUES (?, ?, ?, 'en')`).bind(contextId, brand_id, user_id),
      db.prepare(`
        INSERT INTO blog_posts (id, brand_id, user_id, context_id, title, slug, body, campaign_id, lifecycle_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      `).bind(postId, brand_id, user_id, contextId, title, slug, content, campaign_id)
    ]);

    return json({ content_id: postId, lifecycle_status: 'draft' }, 201);
  } catch (err) {
    return error(err.message || "Blog creation failed", "SAVE_FAILED", null, 400);
  }
}

export async function updateBlogPost(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").pop();

  const existing = await db.prepare(`
    SELECT lifecycle_status FROM blog_posts WHERE id = ? AND brand_id = ? AND user_id = ?
  `).bind(id, brand_id, user_id).first();

  if (!existing) return error("Not found", "NOT_FOUND", null, 404);
  if (['pending_approval', 'approved', 'scheduled'].includes(existing.lifecycle_status)) {
    return error("Blog is locked.", "CONTENT_LOCKED", null, 409);
  }

  const { title, body: content, slug, campaign_id } = await request.json();

  await db.prepare(`
    UPDATE blog_posts 
    SET title = COALESCE(?, title), body = COALESCE(?, body), slug = COALESCE(?, slug), campaign_id = COALESCE(?, campaign_id), updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND brand_id = ? AND user_id = ?
  `).bind(title, content, slug, campaign_id, id, brand_id, user_id).run();

  return json({ success: true });
}

export async function getBlogPost(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").pop();

  const blog = await db.prepare(`
    SELECT * FROM blog_posts WHERE id = ? AND brand_id = ? AND user_id = ?
  `).bind(id, brand_id, user_id).first();

  if (!blog) return error("Not found", "NOT_FOUND", null, 404);

  return json({ success: true, data: blog });
}

export async function scheduleBlogPost(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];
  const { publish_at } = await request.json();

  const normalized = normalizeForSQLite(publish_at);
  if (!normalized) return error("Invalid date", "INVALID_DATE", null, 400);

  const batch = [
    db.prepare(`UPDATE blog_posts SET lifecycle_status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`
      INSERT INTO content_delivery_jobs (id, content_id, brand_id, user_id, platform, scheduled_at, state)
      VALUES (?, ?, ?, ?, 'blog', ?, 'scheduled')
    `).bind(crypto.randomUUID(), id, brand_id, user_id, normalized)
  ];

  await db.batch(batch);
  return json({ success: true, status: "SCHEDULED" });
}