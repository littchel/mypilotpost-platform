/**
 * WordPress Platform Adapter
 * Standardized Contract V1
 */

import { getDB } from "../../lib/db.js";
import { decrypt } from "../../lib/crypto.js";
import { json, error } from "../../lib/json.js";

export async function publish({ content, connection, env }) {
  const { text, title, metadata } = content;
  const { access_token, metadata: connectionMetadata } = connection;

  // 1. Resolve Blog URL
  const blogUrl = connectionMetadata?.blog_url || "https://your-wordpress-site.com";

  const authHeader = (access_token.startsWith("Basic ") || access_token.startsWith("Bearer "))
    ? access_token
    : `Bearer ${access_token}`;

  const payload = {
    title: title || "New Post from myPilotPost",
    content: text,
    status: "publish"
  };

  // Support categories mapping if configured
  const categories = metadata?.wordpress_categories;
  if (Array.isArray(categories) && categories.length > 0) {
    payload.categories = categories.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  }

  // 2. Publish via REST API
  const res = await fetch(`${blogUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`WORDPRESS_PUBLISH_FAILED: ${data.message || res.statusText}`);
  }

  return {
    success: true,
    external_id: data.id,
    url: data.link
  };
}

/* ======================================================
   HELPERS — WORDPRESS API CONNECTIONS
   ====================================================== */
export async function getCategories({ connection }) {
  const { access_token, metadata } = connection;
  const blogUrl = metadata?.blog_url || "https://your-wordpress-site.com";

  const authHeader = (access_token.startsWith("Basic ") || access_token.startsWith("Bearer "))
    ? access_token
    : `Bearer ${access_token}`;

  const res = await fetch(`${blogUrl}/wp-json/wp/v2/categories?per_page=100`, {
    method: "GET",
    headers: {
      "Authorization": authHeader,
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || res.statusText);
  }

  const data = await res.json();
  return (data || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    parent: cat.parent,
    count: cat.count
  }));
}

export async function createCategory({ connection, name }) {
  const { access_token, metadata } = connection;
  const blogUrl = metadata?.blog_url || "https://your-wordpress-site.com";

  const authHeader = (access_token.startsWith("Basic ") || access_token.startsWith("Bearer "))
    ? access_token
    : `Bearer ${access_token}`;

  const res = await fetch(`${blogUrl}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ name })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || res.statusText);
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    parent: data.parent
  };
}

/* ======================================================
   CONTROLLERS — ENDPOINT ROUTE HANDLERS
   ====================================================== */

/**
 * GET /api/customer/wordpress/categories
 */
export async function listWordPressCategories(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);
  const db = getDB(env);

  try {
    const connection = await db.prepare(`
      SELECT access_token, meta
      FROM social_connections
      WHERE brand_id = ? AND platform = 'wordpress' AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(auth.brand_id).first();

    if (!connection) {
      return json({ error: "NO_CONNECTION", message: "WordPress blog is not connected." }, 404);
    }

    const decryptedToken = await decrypt(connection.access_token, env.ENCRYPTION_SECRET);
    const metadata = connection.meta ? JSON.parse(connection.meta) : {};

    const categories = await getCategories({
      connection: {
        access_token: decryptedToken,
        metadata
      }
    });

    return json({ categories });
  } catch (err) {
    console.error("[WORDPRESS CATEGORIES FETCH FAILED]", err);
    return error(err.message || "Failed to fetch WordPress categories", 500);
  }
}

/**
 * POST /api/customer/wordpress/categories
 */
export async function createWordPressCategory(req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);
  
  const { name } = await req.json().catch(() => ({}));
  if (!name || !name.trim()) {
    return error("Category name is required", 400);
  }

  const db = getDB(env);

  try {
    const connection = await db.prepare(`
      SELECT access_token, meta
      FROM social_connections
      WHERE brand_id = ? AND platform = 'wordpress' AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(auth.brand_id).first();

    if (!connection) {
      return json({ error: "NO_CONNECTION", message: "WordPress blog is not connected." }, 404);
    }

    const decryptedToken = await decrypt(connection.access_token, env.ENCRYPTION_SECRET);
    const metadata = connection.meta ? JSON.parse(connection.meta) : {};

    const category = await createCategory({
      connection: {
        access_token: decryptedToken,
        metadata
      },
      name: name.trim()
    });

    return json({ success: true, category });
  } catch (err) {
    console.error("[WORDPRESS CATEGORY CREATE FAILED]", err);
    return error(err.message || "Failed to create WordPress category", 500);
  }
}

