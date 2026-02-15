import { json } from "../../lib/json.js";

/**
 * POST /api/customer/content/social
 */
export async function createSocialAsset(request, env, auth) {
  try {
    const { title = null } = await request.json();
    const { brand_id: productBrandId } = auth || {};
    if (!productBrandId) return json({ error: "Unauthorized" }, 401);

    const legacy = await env.mypilotpost
      .prepare(`SELECT customer_id FROM brands WHERE id = ?`)
      .bind(productBrandId)
      .first();

    if (!legacy?.customer_id) {
      return json({ error: "Brand not linked to customer" }, 400);
    }

    const legacyBrandId = legacy.customer_id;
    const contextId = crypto.randomUUID();
    const assetId = crypto.randomUUID();

    await env.mypilotpost
      .prepare(
        `INSERT INTO content_context (id, brand_id, locale)
         VALUES (?, ?, 'en')`
      )
      .bind(contextId, legacyBrandId)
      .run();

    await env.mypilotpost
      .prepare(
        `INSERT INTO social_assets
         (id, brand_id, context_id, title, status)
         VALUES (?, ?, ?, ?, 'draft')`
      )
      .bind(assetId, legacyBrandId, contextId, title)
      .run();

    await env.mypilotpost
      .prepare(
        `INSERT INTO content_drafts (brand_id, content_type, content_id)
         VALUES (?, 'social', ?)`
      )
      .bind(productBrandId, assetId)
      .run();

    return json(
      { draft_id: assetId, context_id: contextId, status: "DRAFT" },
      201
    );
  } catch (err) {
    return json(
      { error: "Social draft creation failed", detail: String(err) },
      500
    );
  }
}

/**
 * GET /api/customer/content/social/:id
 */
export async function getSocialAsset(request, env, auth) {
  const { brand_id: productBrandId } = auth || {};
  const id = new URL(request.url).pathname.split("/").pop();

  const asset = await env.mypilotpost
    .prepare(`
      SELECT sa.*
      FROM social_assets sa
      JOIN content_drafts cd ON cd.content_id = sa.id
      WHERE sa.id = ?
        AND cd.brand_id = ?
        AND cd.content_type = 'social'
    `)
    .bind(id, productBrandId)
    .first();

  if (!asset) return json({ error: "Not found" }, 404);
  return json({ content: asset });
}

/**
 * PATCH /api/customer/content/social/:id
 */
export async function updateSocialAsset(request, env, auth) {
  const { brand_id: productBrandId } = auth || {};
  const id = new URL(request.url).pathname.split("/").pop();
  const { title = null } = await request.json();

  const asset = await env.mypilotpost
    .prepare(`
      SELECT sa.status
      FROM social_assets sa
      JOIN content_drafts cd ON cd.content_id = sa.id
      WHERE sa.id = ?
        AND cd.brand_id = ?
        AND cd.content_type = 'social'
    `)
    .bind(id, productBrandId)
    .first();

  if (!asset) return json({ error: "Not found" }, 404);
  if (asset.status !== "draft") {
    return json({ error: "Content is locked" }, 400);
  }

  await env.mypilotpost
    .prepare(
      `UPDATE social_assets
       SET title = COALESCE(?, title),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(title, id)
    .run();

  return json({ updated: true });
}

/**
 * POST /api/customer/content/social/:id/ready
 */
export async function markSocialReady(request, env, auth) {
  const { brand_id: productBrandId } = auth || {};
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];

  const row = await env.mypilotpost
    .prepare(`
      SELECT sa.id
      FROM social_assets sa
      JOIN content_drafts cd ON cd.content_id = sa.id
      WHERE sa.id = ?
        AND cd.brand_id = ?
        AND sa.status = 'draft'
    `)
    .bind(id, productBrandId)
    .first();

  if (!row) return json({ error: "Not in draft state" }, 400);

  await env.mypilotpost
    .prepare(`
      UPDATE social_assets
      SET status = 'ready',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(id)
    .run();

  return json({ status: "READY" });
}

/**
 * POST /api/customer/content/social/:id/schedule
 */
export async function scheduleSocialAsset(request, env, auth) {
  const { brand_id: productBrandId } = auth || {};
  const id = new URL(request.url).pathname.split("/").slice(-2)[0];
  const { publish_at } = await request.json();

  if (!publish_at) {
    return json({ error: "publish_at required" }, 400);
  }

  const ready = await env.mypilotpost
    .prepare(`
      SELECT sa.id
      FROM social_assets sa
      JOIN content_drafts cd ON cd.content_id = sa.id
      WHERE sa.id = ?
        AND cd.brand_id = ?
        AND sa.status = 'ready'
    `)
    .bind(id, productBrandId)
    .first();

  if (!ready) return json({ error: "Not schedulable" }, 400);

  const existing = await env.mypilotpost
    .prepare(`SELECT id FROM delivery_jobs WHERE content_id = ?`)
    .bind(id)
    .first();

  if (existing) return json({ error: "Already scheduled" }, 409);

  const jobId = crypto.randomUUID();

  await env.mypilotpost
    .prepare(`
      INSERT INTO delivery_jobs
        (id, content_type, content_id, brand_id, publish_at, status)
      VALUES
        (?, 'social', ?, ?, ?, 'pending')
    `)
    .bind(jobId, id, productBrandId, publish_at)
    .run();

  await env.mypilotpost
    .prepare(`
      UPDATE social_assets
      SET status = 'scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(id)
    .run();

  return json({ status: "SCHEDULED", job_id: jobId });
}
