// packages/api/src/core/content/blog.js
import { error, json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { hasConflict, normalizeForSQLite } from "../schedule/schedule.js";
import { isValidUUID, isValidISO8601 } from "../../lib/validation.js";
import { writeVersion } from "./versions.js";

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

    const { title, body: content, slug, campaign_id = null, content_id } = body;
    const postId = content_id && isValidUUID(content_id) ? content_id : crypto.randomUUID();
    const existing = await db.prepare(`
      SELECT id, context_id FROM blog_posts WHERE id = ? AND brand_id = ? AND user_id = ?
    `).bind(postId, brand_id, user_id).first();

    const contextId = existing?.context_id || crypto.randomUUID();
    const statements = [];
    if (!existing) {
      statements.push(db.prepare(`INSERT INTO content_context (id, brand_id, user_id, locale) VALUES (?, ?, ?, 'en')`).bind(contextId, brand_id, user_id));
      statements.push(db.prepare(`
        INSERT INTO blog_posts (id, brand_id, user_id, context_id, title, slug, body, campaign_id, lifecycle_status, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft')
      `).bind(postId, brand_id, user_id, contextId, title, slug, content, campaign_id));
    } else {
      statements.push(db.prepare(`
        UPDATE blog_posts
        SET title = ?, slug = COALESCE(?, slug), body = ?, campaign_id = ?, lifecycle_status = 'draft', status = 'draft', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND brand_id = ? AND user_id = ?
      `).bind(title, slug, content, campaign_id, postId, brand_id, user_id));
    }

    statements.push(db.prepare(`
      INSERT INTO content_vault
        (id, brand_id, user_id, content_type, title, body, lifecycle_status, campaign_id, version, source)
      VALUES (?, ?, ?, 'blog', ?, ?, 'draft', ?, 1, 'legacy_blog')
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        body = excluded.body,
        lifecycle_status = 'draft',
        campaign_id = excluded.campaign_id,
        version = COALESCE(content_vault.version, 1) + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE content_vault.brand_id = ?
    `).bind(postId, brand_id, user_id, title, content, campaign_id, brand_id));

    await db.batch(statements);
    const versionRow = await db.prepare(`SELECT version FROM content_vault WHERE id = ? AND brand_id = ?`).bind(postId, brand_id).first();
    await writeVersion(env, {
      contentId: postId,
      contentType: 'blog',
      version: versionRow?.version || 1,
      payload: { title, body: content, slug, campaign_id, lifecycle_status: 'draft' },
    }).catch(() => {});

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

  await db.batch([
    db.prepare(`UPDATE blog_posts SET title = COALESCE(?, title), body = COALESCE(?, body), slug = COALESCE(?, slug), campaign_id = COALESCE(?, campaign_id), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ? AND user_id = ?`)
      .bind(title ?? null, content ?? null, slug ?? null, campaign_id ?? null, id, brand_id, user_id),
    db.prepare(`UPDATE content_vault SET title = COALESCE(?, title), body = COALESCE(?, body), campaign_id = COALESCE(?, campaign_id), version = COALESCE(version, 1) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`)
      .bind(title ?? null, content ?? null, campaign_id ?? null, id, brand_id),
  ]);

  const versionRow = await db.prepare(`SELECT version FROM content_vault WHERE id = ? AND brand_id = ?`).bind(id, brand_id).first();
  await writeVersion(env, {
    contentId: id,
    contentType: 'blog',
    version: versionRow?.version || 1,
    payload: { title, body: content, slug, campaign_id, lifecycle_status: existing.lifecycle_status },
  }).catch(() => {});

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
  const { publish_at, platform = 'wordpress' } = await request.json();

  const normalized = normalizeForSQLite(publish_at);
  if (!normalized) return error("Invalid date", "INVALID_DATE", null, 400);
  if (new Date(publish_at) < new Date()) return error("Cannot schedule in the past", "BAD_REQUEST", null, 400);

  const existing = await db.prepare(`SELECT lifecycle_status FROM blog_posts WHERE id = ? AND brand_id = ?`).bind(id, brand_id).first();
  if (!existing) return error("Blog post not found", "NOT_FOUND", null, 404);

  const LOCKED = new Set(['scheduled', 'queued', 'publishing', 'published']);
  if (LOCKED.has(existing.lifecycle_status)) {
    return error("Blog post is already scheduled or published.", "CONTENT_LOCKED", null, 409);
  }

  const batch = [
    db.prepare(`UPDATE blog_posts SET lifecycle_status = 'scheduled', status = 'scheduled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(id, brand_id),
    db.prepare(`UPDATE content_vault SET lifecycle_status = 'scheduled', scheduled_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND brand_id = ?`).bind(normalized, id, brand_id),
    db.prepare(`
      INSERT INTO delivery_jobs (id, brand_id, user_id, content_type, content_id, platform, scheduled_at, status)
      VALUES (?, ?, ?, 'blog', ?, ?, ?, 'scheduled')
    `).bind(crypto.randomUUID(), brand_id, user_id, id, platform, normalized)
  ];

  await db.batch(batch);
  return json({ success: true, status: "SCHEDULED" });
}
