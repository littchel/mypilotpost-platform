import { json } from "../../lib/json.js";

/**
 * POST /api/content/blog/:id/media
 * Attach media to a blog post
 */
export async function attachMediaToBlog(request, env, blogPostId) {
  try {
    const { media_asset_id } = await request.json();

    if (!media_asset_id) {
      return json({ error: "media_asset_id is required" }, 400);
    }

    /* Ensure blog post exists */
    const blog = await env.ADMIN_DB.prepare(`
      SELECT id, brand_id
      FROM blog_posts
      WHERE id = ?
    `)
      .bind(blogPostId)
      .first();

    if (!blog) {
      return json({ error: "Blog post not found" }, 404);
    }

    /* Ensure media exists */
    const media = await env.ADMIN_DB.prepare(`
      SELECT id
      FROM media_assets
      WHERE id = ?
    `)
      .bind(media_asset_id)
      .first();

    if (!media) {
      return json({ error: "Media asset not found" }, 404);
    }

    /* Attach media (idempotent) */
    await env.ADMIN_DB.prepare(`
      INSERT OR IGNORE INTO blog_media_links (
        blog_post_id,
        media_asset_id
      ) VALUES (?, ?)
    `)
      .bind(blogPostId, media_asset_id)
      .run();

    /* Emit mission */
    await env.ADMIN_DB.prepare(`
      INSERT INTO missions (
        id,
        brand_id,
        type,
        entity_type,
        entity_id
      ) VALUES (?, ?, 'media_attached', 'blog_post', ?)
    `)
      .bind(
        crypto.randomUUID(),
        blog.brand_id,
        blogPostId
      )
      .run();

    return json({ attached: true }, 201);
  } catch (err) {
    return json(
      {
        error: "Blog media attachment failed",
        detail: String(err?.message || err),
      },
      500
    );
  }
}

/**
 * GET /api/content/blog/:id/media
 * List media attached to a blog post
 */
export async function listBlogMedia(request, env, blogPostId) {
  /* Ensure blog post exists */
  const blog = await env.ADMIN_DB.prepare(`
    SELECT id
    FROM blog_posts
    WHERE id = ?
  `)
    .bind(blogPostId)
    .first();

  if (!blog) {
    return json({ error: "Blog post not found" }, 404);
  }

  const { results } = await env.ADMIN_DB.prepare(`
    SELECT
      m.id,
      m.provider,
      m.preview_url,
      m.type,
      m.aspect_ratio
    FROM blog_media_links bml
    JOIN media_assets m
      ON m.id = bml.media_asset_id
    WHERE bml.blog_post_id = ?
  `)
    .bind(blogPostId)
    .all();

  return json({ media: results });
}
