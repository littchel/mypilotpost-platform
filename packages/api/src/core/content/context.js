import { json } from "../../lib/json";

/**
 * Create Content Context
 * POST /api/content/context
 */
export async function createContentContext(request, env) {
  const body = await request.json();

  const {
    brand_id,
    locale,
    tone = null,
    audience = null,
    purpose = null,
    campaign_hint = null,
  } = body;

  if (!brand_id || !locale) {
    return json(
      { error: "brand_id and locale are required" },
      400
    );
  }

  const id = crypto.randomUUID();

  await env.ADMIN_DB.prepare(`
    INSERT INTO content_context (
      id,
      brand_id,
      locale,
      tone,
      audience,
      purpose,
      campaign_hint
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    brand_id,
    locale,
    tone,
    audience,
    purpose,
    campaign_hint
  ).run();

  return json({
    id,
    brand_id,
    locale,
    tone,
    audience,
    purpose,
    campaign_hint,
  }, 201);
}

/**
 * Get Content Context
 * GET /api/content/context/:id
 */
export async function getContentContext(request, env, contextId) {
  const context = await env.ADMIN_DB.prepare(`
    SELECT
      id,
      brand_id,
      locale,
      tone,
      audience,
      purpose,
      campaign_hint,
      created_at,
      updated_at
    FROM content_context
    WHERE id = ?
  `).bind(contextId).first();

  if (!context) {
    return json({ error: "Content context not found" }, 404);
  }

  return json(context);
}
