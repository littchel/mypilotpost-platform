import { json, error } from "../../lib/json.js";
import { hasPermission } from "../../auth/permissions.js";
import { logAdminAction } from "../../lib/admin_logger.js";

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
      content,
      featured_image,
      cover_image,
      category,
      status = "draft",
      published_at = null,
      author = "myPilotPost Team"
    } = body;

    const finalContent = content_html || content || "";
    const finalFeaturedImage = featured_image || cover_image || null;

    if (!slug || !title || !finalContent) {
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
      finalContent,
      finalFeaturedImage,
      category,
      status,
      published_at,
      author
    ).run();

    logAdminAction(env, auth, 'create_blog_post', 'marketing_blog', id, { slug, title, status }).catch(() => {});
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

  const posts = (results || []).map(post => ({
    ...post,
    content: post.content_html,
    cover_image: post.featured_image
  }));

  return json(posts);
}

export async function updateMarketingPost(request, env, auth, id) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const body = await request.json();
  const content = body.content_html !== undefined ? body.content_html : (body.content !== undefined ? body.content : "");
  const coverImage = body.featured_image !== undefined ? body.featured_image : (body.cover_image !== undefined ? body.cover_image : null);

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
    content,
    coverImage,
    body.category,
    body.status,
    body.published_at,
    body.author || "myPilotPost Team",
    id
  ).run();

  logAdminAction(env, auth, 'update_blog_post', 'marketing_blog', id, { slug: body.slug, status: body.status }).catch(() => {});
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

  logAdminAction(env, auth, 'delete_blog_post', 'marketing_blog', id, {}).catch(() => {});
  return json({ success: true });
}

/* ================= PUBLIC (NO AUTH) ================= */

export async function publicListMarketingPosts(request, env) {
  const { results } = await env.mypilotpost.prepare(`
    SELECT id, slug, title, excerpt, content_html, featured_image, category, author, published_at
    FROM marketing_blog_posts
    WHERE status = 'published'
    ORDER BY published_at DESC
  `).all();

  const posts = (results || []).map(post => ({
    ...post,
    content: post.content_html,
    cover_image: post.featured_image
  }));

  return json({ posts });
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

  const decorated = {
    ...post,
    content: post.content_html,
    cover_image: post.featured_image
  };

  return json({ post: decorated });
}

export async function uploadBlogMedia(req, env, auth) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") return error("No file provided", 400);

  const assetId = crypto.randomUUID();
  const filename = file.name || `blog-${assetId}`;
  const mimeType = file.type || "application/octet-stream";
  const r2Key = `marketing-blog/${assetId}/${filename}`;

  const buffer = await file.arrayBuffer();
  await env.MEDIA_BUCKET.put(r2Key, buffer, {
    httpMetadata: { contentType: mimeType }
  });

  const publicUrl = `${env.BASE_URL || "https://api.mypilotpost.com"}/api/media/file/${encodeURIComponent(r2Key)}`;

  logAdminAction(env, auth, 'upload_blog_media', 'marketing_blog', assetId, { filename, mimeType }).catch(() => {});

  return json({ success: true, url: publicUrl, filename, mime_type: mimeType });
}
