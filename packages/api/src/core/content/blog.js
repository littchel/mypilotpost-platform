/**
 * myPilotPost — Blog Content Core
 * AUTHORITATIVE • CANON 2 FINAL • V1 PRODUCTION LOCK
 */

import { json } from "../../lib/json.js";

/* ======================================================
   SAFE HELPERS
====================================================== */

function extractBlogId(request) {
  const pathname = new URL(request.url).pathname;
  const parts = pathname.split("/").filter(Boolean);

  const blogIndex = parts.indexOf("blog");

  // HARD GUARD — this was missing
  if (blogIndex === -1) return null;
  if (!parts[blogIndex + 1]) return null;

  return parts[blogIndex + 1];
}

/* ======================================================
   CREATE BLOG
====================================================== */

export async function createBlogPost(request, env, auth) {
  try {
    const { title = null, slug = null, body = null } = await request.json();
    
    // Debug: Check auth
    if (!auth || !auth.brand_id) {
      return json({ error: "Unauthorized: No auth or brand_id" }, 401);
    }

    const legacy = await env.mypilotpost
      .prepare(`SELECT customer_id FROM brands WHERE id = ?`)
      .bind(auth.brand_id)
      .first();

    if (!legacy?.customer_id) {
      return json({ error: "Brand not linked to customer" }, 400);
    }

    const postId = crypto.randomUUID();
    const contextId = crypto.randomUUID();

    await env.mypilotpost.batch([
      env.mypilotpost.prepare(`
        INSERT INTO content_context (id, brand_id, locale)
        VALUES (?, ?, 'en')
      `).bind(contextId, legacy.customer_id),

      // Note: Using 'draft' which is allowed by CHECK constraint
      env.mypilotpost.prepare(`
        INSERT INTO blog_posts
          (id, brand_id, context_id, title, slug, body, status)
        VALUES
          (?, ?, ?, ?, ?, ?, 'draft')
      `).bind(postId, legacy.customer_id, contextId, title, slug, body),

      env.mypilotpost.prepare(`
        INSERT INTO content_drafts
          (brand_id, content_type, content_id, state)
        VALUES
          (?, 'blog', ?, 'draft')
      `).bind(auth.brand_id, postId)
    ]);

    return json({ draft_id: postId, status: "DRAFT" }, 201);
  } catch (err) {
    console.error("createBlogPost error:", err);
    return json({ error: "Blog creation failed", detail: String(err) }, 500);
  }
}

/* ======================================================
   GET BLOG
====================================================== */

export async function getBlogPost(request, env, auth) {
  try {
    const id = extractBlogId(request);
    if (!id) return json({ error: "Invalid blog id" }, 400);

    if (!auth || !auth.brand_id) {
      return json({ error: "Unauthorized: No auth or brand_id" }, 401);
    }

    const blog = await env.mypilotpost.prepare(`
      SELECT bp.*
      FROM blog_posts bp
      JOIN content_drafts cd ON cd.content_id = bp.id
      WHERE bp.id = ?
        AND cd.brand_id = ?
        AND cd.content_type = 'blog'
    `).bind(id, auth.brand_id).first();

    if (!blog) return json({ error: "Not found" }, 404);
    return json({ content: blog });
  } catch (err) {
    console.error("getBlogPost error:", err);
    return json({ error: "Failed to get blog", detail: String(err) }, 500);
  }
}

/* ======================================================
   GET BLOG MEDIA
====================================================== */

export async function getBlogMedia(request, env, auth) {
  try {
    const id = extractBlogId(request);
    if (!id) return json({ error: "Invalid blog id" }, 400);

    if (!auth || !auth.brand_id) {
      return json({ error: "Unauthorized: No auth or brand_id" }, 401);
    }

    const media = await env.mypilotpost.prepare(`
      SELECT
        l.media_id,
        l.role,
        l.locked,
        m.provider,
        m.preview_url,
        m.type,
        m.aspect_ratio,
        m.duration
      FROM content_media_links l
      JOIN media_assets m ON m.id = l.media_id
      WHERE l.content_type = 'blog'
        AND l.content_id = ?
        AND l.brand_id = ?
      ORDER BY l.created_at ASC
    `).bind(id, auth.brand_id).all();

    return json({ items: media.results || [] });
  } catch (err) {
    console.error("getBlogMedia error:", err);
    return json({ error: "Failed to get blog media", detail: String(err) }, 500);
  }
}

/* ======================================================
   UPDATE BLOG — DRAFT ONLY
====================================================== */

export async function updateBlogPost(request, env, auth) {
  try {
    const id = extractBlogId(request);
    if (!id) return json({ error: "Invalid blog id" }, 400);

    if (!auth || !auth.brand_id) {
      return json({ error: "Unauthorized: No auth or brand_id" }, 401);
    }

    const draft = await env.mypilotpost.prepare(`
      SELECT state
      FROM content_drafts
      WHERE content_id = ?
        AND brand_id = ?
        AND content_type = 'blog'
    `).bind(id, auth.brand_id).first();

    if (!draft) {
      console.log(`No draft found for blog ${id} and brand ${auth.brand_id}`);
      return json({ error: "Not found" }, 404);
    }
    
    if (draft.state !== "draft") {
      console.log(`Blog ${id} state is ${draft.state}, expected draft`);
      return json({ error: "Content is locked" }, 409);
    }

    const { title, slug, body } = await request.json();

    // Fix: Handle undefined values by passing null instead
    const titleValue = title !== undefined ? title : null;
    const slugValue = slug !== undefined ? slug : null;
    const bodyValue = body !== undefined ? body : null;

    await env.mypilotpost.prepare(`
      UPDATE blog_posts
      SET
        title = COALESCE(?, title),
        slug  = COALESCE(?, slug),
        body  = COALESCE(?, body),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(titleValue, slugValue, bodyValue, id).run();

    return json({ updated: true });
  } catch (err) {
    console.error("updateBlogPost error:", err);
    return json({ error: "Failed to update blog", detail: String(err) }, 500);
  }
}

/* ======================================================
   MARK READY
====================================================== */

export async function markBlogReady(request, env, auth) {
  try {
    const id = extractBlogId(request);
    if (!id) return json({ error: "Invalid blog id" }, 400);

    if (!auth || !auth.brand_id) {
      return json({ error: "Unauthorized: No auth or brand_id" }, 401);
    }

    const draft = await env.mypilotpost.prepare(`
      SELECT state
      FROM content_drafts
      WHERE content_id = ?
        AND brand_id = ?
        AND content_type = 'blog'
    `).bind(id, auth.brand_id).first();

    if (!draft) {
      console.log(`markBlogReady: No draft found for ${id}`);
      return json({ error: "Only draft content can be marked ready" }, 409);
    }
    
    if (draft.state !== "draft") {
      console.log(`markBlogReady: State is ${draft.state}, expected draft`);
      return json({ error: "Only draft content can be marked ready" }, 409);
    }

    await env.mypilotpost.batch([
      env.mypilotpost.prepare(`
        UPDATE content_drafts
        SET state = 'ready', updated_at = CURRENT_TIMESTAMP
        WHERE content_id = ? AND brand_id = ? AND content_type = 'blog'
      `).bind(id, auth.brand_id),

      // FIX: Use 'structured' instead of 'ready' for blog_posts.status
      // Based on CHECK constraint: ('draft', 'structured', 'reviewed', 'published')
      env.mypilotpost.prepare(`
        UPDATE blog_posts
        SET status = 'structured', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(id)
    ]);

    return json({ status: "READY" });
  } catch (err) {
    console.error("markBlogReady error:", err);
    return json({ error: "Failed to mark blog ready", detail: String(err) }, 500);
  }
}

/* ======================================================
   SCHEDULE BLOG
====================================================== */

export async function scheduleBlogPost(request, env, auth) {
  try {
    const id = extractBlogId(request);
    if (!id) return json({ error: "Invalid blog id" }, 400);

    const { publish_at } = await request.json();
    if (!publish_at)
      return json({ error: "publish_at required" }, 400);

    if (!auth || !auth.brand_id) {
      return json({ error: "Unauthorized: No auth or brand_id" }, 401);
    }

    const draft = await env.mypilotpost.prepare(`
      SELECT state
      FROM content_drafts
      WHERE content_id = ?
        AND brand_id = ?
        AND content_type = 'blog'
    `).bind(id, auth.brand_id).first();

    if (!draft) {
      console.log(`scheduleBlogPost: No draft found for ${id}`);
      return json({ error: "Content not ready" }, 409);
    }
    
    if (draft.state !== "ready") {
      console.log(`scheduleBlogPost: State is ${draft.state}, expected ready`);
      return json({ error: "Content not ready" }, 409);
    }

    // FIX: Use correct schema - scheduled_at instead of publish_at, add platform
    await env.mypilotpost.batch([
      env.mypilotpost.prepare(`
        INSERT INTO delivery_jobs
          (brand_id, content_type, content_id, platform, scheduled_at, status)
        VALUES
          (?, 'blog', ?, 'blog', ?, 'scheduled')
      `).bind(auth.brand_id, id, publish_at),

      env.mypilotpost.prepare(`
        UPDATE content_drafts
        SET state = 'scheduled', updated_at = CURRENT_TIMESTAMP
        WHERE content_id = ? AND brand_id = ? AND content_type = 'blog'
      `).bind(id, auth.brand_id),

      // CRITICAL: Lock all media when scheduling
      env.mypilotpost.prepare(`
        UPDATE content_media_links
        SET locked = 1
        WHERE content_type = 'blog'
          AND content_id = ?
      `).bind(id),

      // Note: Using 'reviewed' instead of 'scheduled' for blog_posts.status
      // Based on CHECK constraint: ('draft', 'structured', 'reviewed', 'published')
      env.mypilotpost.prepare(`
        UPDATE blog_posts
        SET status = 'reviewed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(id)
    ]);

    return json({ status: "SCHEDULED" });
  } catch (err) {
    console.error("scheduleBlogPost error:", err);
    return json({ error: "Failed to schedule blog", detail: String(err) }, 500);
  }
}