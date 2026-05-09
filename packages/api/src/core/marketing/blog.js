import { json, error } from "../../lib/json.js";
import { hasPermission } from "../../auth/permissions.js";

/* ================= ADMIN (AUTH REQUIRED) ================= */

export async function createMarketingPost(request, env, auth) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  try {
    const body = await request.json();

    const {
      slug,
      title,
      excerpt,
      content_html,
      featured_image,
      category,
      status = "draft",
      published_at = null,
      author = "myPilotPost Team"
    } = body;

    if (!slug || !title || !content_html) {
      return json({ error: "Missing required fields" }, 400);
    }

    const id = crypto.randomUUID();

    await env.mypilotpost.prepare(`
      INSERT INTO marketing_blog_posts (
        id,
        slug,
        title,
        excerpt,
        content_html,
        featured_image,
        category,
        status,
        published_at,
        author,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      slug,
      title,
      excerpt,
      content_html,
      featured_image,
      category,
      status,
      published_at,
      author
    ).run();

    return json({ success: true, id });

  } catch (err) {
    return json({ error: "Marketing blog creation failed", detail: String(err) }, 500);
  }
}

export async function listMarketingPosts(request, env, auth) {
  if (!hasPermission(auth.role, "blog:read")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const { results } = await env.mypilotpost.prepare(`
    SELECT *
    FROM marketing_blog_posts
    ORDER BY created_at DESC
  `).all();

  return json(results || []);
}

export async function updateMarketingPost(request, env, auth, id) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const body = await request.json();

  await env.mypilotpost.prepare(`
    UPDATE marketing_blog_posts
    SET
      slug = ?,
      title = ?,
      excerpt = ?,
      content_html = ?,
      featured_image = ?,
      category = ?,
      status = ?,
      published_at = ?,
      author = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.slug,
    body.title,
    body.excerpt,
    body.content_html,
    body.featured_image,
    body.category,
    body.status,
    body.published_at,
    body.author || "myPilotPost Team",
    id
  ).run();

  return json({ success: true });
}

export async function deleteMarketingPost(request, env, auth, id) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  await env.mypilotpost.prepare(`
    DELETE FROM marketing_blog_posts
    WHERE id = ?
  `).bind(id).run();

  return json({ success: true });
}

/* ================= PUBLIC (NO AUTH) ================= */

export async function publicListMarketingPosts(request, env) {
  const { results } = await env.mypilotpost.prepare(`
    SELECT id, slug, title, excerpt, featured_image, author, published_at
    FROM marketing_blog_posts
    WHERE status = 'published'
    ORDER BY published_at DESC
  `).all();

  return json({ posts: results || [] });
}

export async function publicGetMarketingPost(request, env, slug) {
  const post = await env.mypilotpost.prepare(`
    SELECT *
    FROM marketing_blog_posts
    WHERE slug = ? AND status = 'published'
    LIMIT 1
  `).bind(slug).first();

  if (!post) {
    return json({ error: "Not found" }, 404);
  }

  return json({ post });
}
