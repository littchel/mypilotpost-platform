// packages/api/src/core/content/drafts.js
import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * UNIFIED CONTENT LISTING (SINGLE SOURCE OF TRUTH)
 * Queries canonical tables ONLY. Enforces brand/user isolation.
 */
export async function listContent(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;

  // 1. Fetch Social Assets
  const socialPromise = db.prepare(`
    SELECT id, 'social' as type, title, text as content, lifecycle_status, updated_at 
    FROM social_assets 
    WHERE brand_id = ? AND user_id = ?
  `).bind(brand_id, user_id).all();

  // 2. Fetch Blog Posts
  const blogPromise = db.prepare(`
    SELECT id, 'blog' as type, title, body as content, lifecycle_status, updated_at 
    FROM blog_posts 
    WHERE brand_id = ? AND user_id = ?
  `).bind(brand_id, user_id).all();

  const [socials, blogs] = await Promise.all([socialPromise, blogPromise]);

  const allContent = [...(socials.results || []), ...(blogs.results || [])]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return json({
    success: true,
    brand_id,
    data: allContent
  });
}

/**
 * LIST DRAFTS (FILTERED BY TYPE)
 */
export async function listDrafts(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;
  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // social | blog

  let results;
  if (type === 'social') {
    results = await db.prepare(`
      SELECT * FROM social_assets WHERE brand_id = ? AND user_id = ? ORDER BY updated_at DESC
    `).bind(brand_id, user_id).all();
  } else {
    results = await db.prepare(`
      SELECT * FROM blog_posts WHERE brand_id = ? AND user_id = ? ORDER BY updated_at DESC
    `).bind(brand_id, user_id).all();
  }

  return json({ success: true, data: results.results || [] });
}

/**
 * GET SCHEDULED CONTENT
 * Pulls from delivery_jobs (Single Source of Truth for execution)
 */
export async function getScheduled(request, env, auth) {
  const db = getDB(env);
  const { brand_id, user_id } = auth;

  const { results } = await db.prepare(`
    SELECT dj.*, 
      CASE WHEN dj.content_type = 'social' THEN sa.title ELSE bp.title END as title,
      CASE WHEN dj.content_type = 'social' THEN sa.lifecycle_status ELSE bp.lifecycle_status END as lifecycle_status
    FROM content_delivery_jobs dj
    LEFT JOIN social_assets sa ON sa.id = dj.content_id AND dj.content_type = 'social'
    LEFT JOIN blog_posts bp ON bp.id = dj.content_id AND dj.content_type = 'blog'
    WHERE dj.brand_id = ? AND dj.user_id = ?
    ORDER BY dj.scheduled_at ASC
  `).bind(brand_id, user_id).all();

  return json({ success: true, data: results || [] });
}
