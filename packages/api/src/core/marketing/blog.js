import { json, error } from "../../lib/json.js";
import { hasPermission } from "../../auth/permissions.js";
import { logAdminAction } from "../../lib/admin_logger.js";

function resolveImageUrl(url, env) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const base = env.BASE_URL || "https://api.mypilotpost.com";
  const cleanUrl = url.startsWith("/") ? url : "/" + url;
  return `${base}${cleanUrl}`;
}

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
      category_id,
      category,
      status = "draft",
      published_at = null,
      author = "myPilotPost Team",
      seo_title = null,
      seo_description = null,
      tags = null
    } = body;

    const finalContent = content_html || content || "";
    const finalFeaturedImage = featured_image || cover_image || null;
    const finalCoverImage = cover_image || featured_image || null;
    const finalCategoryId = category_id || category || null;

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
        cover_image,
        category_id,
        category,
        status,
        published_at,
        author,
        seo_title,
        seo_description,
        tags,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      id,
      slug,
      title,
      excerpt,
      finalContent,
      finalFeaturedImage,
      finalCoverImage,
      finalCategoryId,
      finalCategoryId, // legacy fallback
      status,
      published_at,
      author,
      seo_title,
      seo_description,
      tags
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

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("category_id");

  let query = `
    SELECT p.*, c.category_name, c.category_slug
    FROM marketing_blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.category_id
  `;
  const binds = [];

  if (categoryId) {
    query += " WHERE p.category_id = ?";
    binds.push(categoryId);
  }

  query += " ORDER BY p.created_at DESC";

  const { results } = binds.length
    ? await env.mypilotpost.prepare(query).bind(...binds).all()
    : await env.mypilotpost.prepare(query).all();

  const posts = (results || []).map(post => {
    const img = resolveImageUrl(post.cover_image || post.featured_image || null, env);
    return {
      ...post,
      content: post.content_html,
      cover_image: img,
      featured_image: img
    };
  });

  return json(posts);
}

export async function getMarketingPost(request, env, auth, id) {
  if (!hasPermission(auth.role, "blog:read")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  const post = await env.mypilotpost.prepare(`
    SELECT p.*, c.category_name, c.category_slug
    FROM marketing_blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.category_id
    WHERE p.id = ? OR p.slug = ?
    LIMIT 1
  `).bind(id, id).first();

  if (!post) {
    return json({ error: "Post not found" }, 404);
  }

  const img = resolveImageUrl(post.cover_image || post.featured_image || null, env);
  const decorated = {
    ...post,
    content: post.content_html,
    cover_image: img,
    featured_image: img
  };

  return json(decorated);
}

export async function updateMarketingPost(request, env, auth, id) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  try {
    const body = await request.json();

    const existing = await env.mypilotpost.prepare(`
      SELECT * FROM marketing_blog_posts WHERE id = ? OR slug = ?
    `).bind(id, id).first();

    if (!existing) {
      return json({ error: "Post not found" }, 404);
    }

    const updates = [];
    const binds = [];

    // Fields mapping for scalar fields
    const fieldMapping = {
      slug: body.slug,
      title: body.title,
      excerpt: body.excerpt,
      author: body.author,
      status: body.status,
      published_at: body.published_at,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      tags: body.tags
    };

    // Handle content update (can be passed as content or content_html)
    if (body.content_html !== undefined) {
      updates.push("content_html = ?");
      binds.push(body.content_html);
    } else if (body.content !== undefined) {
      updates.push("content_html = ?");
      binds.push(body.content);
    }

    // Handle cover image & featured image updates
    if (body.cover_image !== undefined) {
      updates.push("cover_image = ?");
      binds.push(body.cover_image);
      updates.push("featured_image = ?");
      binds.push(body.cover_image);
    } else if (body.featured_image !== undefined) {
      updates.push("cover_image = ?");
      binds.push(body.featured_image);
      updates.push("featured_image = ?");
      binds.push(body.featured_image);
    }

    // Handle category_id & category updates
    if (body.category_id !== undefined) {
      updates.push("category_id = ?");
      binds.push(body.category_id);
      updates.push("category = ?");
      binds.push(body.category_id);
    } else if (body.category !== undefined) {
      updates.push("category_id = ?");
      binds.push(body.category);
      updates.push("category = ?");
      binds.push(body.category);
    }

    // Add generic updates
    for (const [colName, val] of Object.entries(fieldMapping)) {
      if (val !== undefined) {
        updates.push(`${colName} = ?`);
        binds.push(val);
      }
    }

    if (updates.length === 0) {
      return json({ success: true, message: "No fields to update" });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    binds.push(existing.id); // bind to the primary key id found

    const query = `
      UPDATE marketing_blog_posts
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    await env.mypilotpost.prepare(query).bind(...binds).run();

    logAdminAction(env, auth, 'update_blog_post', 'marketing_blog', existing.id, { slug: body.slug || existing.slug, status: body.status || existing.status }).catch(() => {});
    return json({ success: true });

  } catch (err) {
    return json({ error: "Failed to update blog post", detail: String(err) }, 500);
  }
}

export async function deleteMarketingPost(request, env, auth, id) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }

  await env.mypilotpost.prepare(`
    DELETE FROM marketing_blog_posts
    WHERE id = ? OR slug = ?
  `).bind(id, id).run();

  logAdminAction(env, auth, 'delete_blog_post', 'marketing_blog', id, {}).catch(() => {});
  return json({ success: true });
}

/* ================= CATEGORIES API ================= */

export async function listBlogCategories(request, env, auth) {
  if (!hasPermission(auth.role, "blog:read")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }
  const { results } = await env.mypilotpost.prepare(`
    SELECT category_id, category_slug, category_name, created_at
    FROM blog_categories
    ORDER BY category_name ASC
  `).all();
  return json(results || []);
}

export async function createBlogCategory(request, env, auth) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }
  try {
    const { category_slug, category_name, category_id } = await request.json();
    if (!category_slug || !category_name) {
      return json({ error: "category_slug and category_name are required" }, 400);
    }
    const finalId = category_id || `cat_${crypto.randomUUID()}`;
    await env.mypilotpost.prepare(`
      INSERT INTO blog_categories (category_id, category_slug, category_name)
      VALUES (?, ?, ?)
    `).bind(finalId, category_slug.toLowerCase().replace(/\s+/g, '-'), category_name).run();

    logAdminAction(env, auth, 'create_blog_category', 'marketing_blog', finalId, { category_slug, category_name }).catch(() => {});
    return json({ success: true, category_id: finalId });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return json({ error: "Category slug must be unique" }, 400);
    }
    return json({ error: "Failed to create category", detail: String(err) }, 500);
  }
}

export async function updateBlogCategory(request, env, auth, categoryId) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }
  try {
    const { category_slug, category_name } = await request.json();
    const updates = [];
    const binds = [];
    if (category_slug !== undefined) {
      updates.push("category_slug = ?");
      binds.push(category_slug.toLowerCase().replace(/\s+/g, '-'));
    }
    if (category_name !== undefined) {
      updates.push("category_name = ?");
      binds.push(category_name);
    }
    if (updates.length === 0) {
      return json({ success: true, message: "No fields to update" });
    }
    binds.push(categoryId);
    await env.mypilotpost.prepare(`
      UPDATE blog_categories
      SET ${updates.join(", ")}
      WHERE category_id = ?
    `).bind(...binds).run();

    logAdminAction(env, auth, 'update_blog_category', 'marketing_blog', categoryId, { category_slug, category_name }).catch(() => {});
    return json({ success: true });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return json({ error: "Category slug must be unique" }, 400);
    }
    return json({ error: "Failed to update category", detail: String(err) }, 500);
  }
}

export async function deleteBlogCategory(request, env, auth, categoryId) {
  if (!hasPermission(auth.role, "blog:write")) {
    return error("Insufficient permissions", "FORBIDDEN", null, 403);
  }
  // Check if category is assigned to any posts
  const inUse = await env.mypilotpost.prepare(`
    SELECT COUNT(*) as count FROM marketing_blog_posts WHERE category_id = ?
  `).bind(categoryId).first();
  if (inUse && inUse.count > 0) {
    return json({ error: "Cannot delete category that is assigned to posts" }, 400);
  }

  await env.mypilotpost.prepare(`
    DELETE FROM blog_categories WHERE category_id = ?
  `).bind(categoryId).run();

  logAdminAction(env, auth, 'delete_blog_category', 'marketing_blog', categoryId, {}).catch(() => {});
  return json({ success: true });
}

/* ================= PUBLIC (NO AUTH) ================= */

export async function publicListMarketingPosts(request, env) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get("category");

  let query = `
    SELECT p.id, p.slug, p.title, p.excerpt, p.content_html, p.featured_image, p.cover_image, p.category_id, p.author, p.published_at,
           c.category_name, c.category_slug
    FROM marketing_blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.category_id
    WHERE p.status = 'published'
  `;
  const binds = [];

  if (categorySlug) {
    query += " AND c.category_slug = ?";
    binds.push(categorySlug);
  }

  query += " ORDER BY p.published_at DESC";

  const { results } = binds.length
    ? await env.mypilotpost.prepare(query).bind(...binds).all()
    : await env.mypilotpost.prepare(query).all();

  const posts = (results || []).map(post => {
    const img = resolveImageUrl(post.cover_image || post.featured_image || null, env);
    return {
      ...post,
      category: post.category_name || post.category_id || null, // fallback
      content: post.content_html,
      cover_image: img,
      featured_image: img
    };
  });

  return json({ posts });
}

export async function publicGetMarketingPost(request, env, slug) {
  const post = await env.mypilotpost.prepare(`
    SELECT p.*, c.category_name, c.category_slug
    FROM marketing_blog_posts p
    LEFT JOIN blog_categories c ON p.category_id = c.category_id
    WHERE p.slug = ? AND p.status = 'published'
    LIMIT 1
  `).bind(slug).first();

  if (!post) {
    return json({ error: "Not found" }, 404);
  }

  const img = resolveImageUrl(post.cover_image || post.featured_image || null, env);
  const decorated = {
    ...post,
    category: post.category_name || post.category_id || null, // fallback
    content: post.content_html,
    cover_image: img,
    featured_image: img
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
