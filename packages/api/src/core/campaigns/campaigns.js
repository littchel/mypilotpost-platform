/**
 * Campaign Engine
 * Milestone: 3 — Campaign Engine (Growth Logic)
 * Status: FINAL / LOCKED
 */

import { db } from "../../lib/db.js";
import { json } from "../../lib/json.js";
import { nowISO } from "../../lib/dates.js";
import { writeBrandMemoryEvent } from "../brands/memory-writer.js";

/* ======================================================
   CAMPAIGNS
====================================================== */

/**
 * Create a new campaign
 */
export async function createCampaign(env, payload) {
  const {
    id,
    brand_id,
    name,
    description = null,
    status = "planned",
    start_date = null,
    end_date = null
  } = payload;

  const created_at = nowISO();

  await db(env)
    .prepare(
      `
      INSERT INTO campaigns (
        id,
        brand_id,
        name,
        description,
        status,
        start_date,
        end_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      brand_id,
      name,
      description,
      status,
      start_date,
      end_date,
      created_at
    )
    .run();

  return json({
    id,
    brand_id,
    name,
    status,
    created_at
  });
}

/**
 * Update campaign metadata (safe fields only)
 */
export async function updateCampaign(env, campaignId, updates = {}) {
  const allowedFields = [
    "name",
    "description",
    "status",
    "start_date",
    "end_date"
  ];

  const fields = [];
  const values = [];

  const existing = await db(env)
    .prepare(`SELECT * FROM campaigns WHERE id = ?`)
    .bind(campaignId)
    .first();

  if (!existing) {
    return json({ updated: false });
  }

  for (const key of allowedFields) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return json({ updated: false });
  }

  fields.push("updated_at = ?");
  values.push(nowISO());
  values.push(campaignId);

  await db(env)
    .prepare(
      `
      UPDATE campaigns
      SET ${fields.join(", ")}
      WHERE id = ?
      `
    )
    .bind(...values)
    .run();

  /* Brand Memory — terminal campaign completion */
  const terminalStatuses = new Set(["completed", "ended", "archived"]);
  const becameTerminal =
    updates.status &&
    updates.status !== existing.status &&
    terminalStatuses.has(updates.status);

  if (becameTerminal) {
    const contentCount = await db(env)
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM campaign_content_links
        WHERE campaign_id = ?
        `
      )
      .bind(campaignId)
      .first();

    await writeBrandMemoryEvent(db(env), {
      brandId: existing.brand_id,
      eventType: "campaign_completed",
      sourceEngine: "campaign",
      entityType: "campaign",
      entityId: campaignId,
      snapshot: {
        content_count: contentCount?.count || 0
      }
    });
  }

  return json({ updated: true });
}

/**
 * Fetch a single campaign
 */
export async function getCampaign(env, campaignId) {
  const campaign = await db(env)
    .prepare(`SELECT * FROM campaigns WHERE id = ?`)
    .bind(campaignId)
    .first();

  return json(campaign);
}

/**
 * List campaigns for a brand (canonical internal function)
 */
export async function listCampaignsByBrand(env, brandId) {
  const res = await db(env)
    .prepare(
      `
      SELECT *
      FROM campaigns
      WHERE brand_id = ?
      ORDER BY created_at DESC
      `
    )
    .bind(brandId)
    .all();

  return res.results || [];
}

/**
 * List campaigns — ROUTER EXPORT
 * (Thin wrapper for canonical function)
 */
export async function listCampaigns(env, auth) {
  return json(
    await listCampaignsByBrand(env, auth.brand_id)
  );
}

/* ======================================================
   CAMPAIGN OBJECTIVES
====================================================== */

export async function addCampaignObjective(env, payload) {
  const {
    id,
    campaign_id,
    objective_type,
    target_value = null,
    unit = null
  } = payload;

  await db(env)
    .prepare(
      `
      INSERT INTO campaign_objectives (
        id,
        campaign_id,
        objective_type,
        target_value,
        unit,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      campaign_id,
      objective_type,
      target_value,
      unit,
      nowISO()
    )
    .run();

  return json({ id, campaign_id, objective_type });
}

export async function listCampaignObjectives(env, campaignId) {
  const res = await db(env)
    .prepare(
      `
      SELECT *
      FROM campaign_objectives
      WHERE campaign_id = ?
      `
    )
    .bind(campaignId)
    .all();

  return json(res.results || []);
}

/* ======================================================
   CAMPAIGN INCENTIVES (DECLARATIVE ONLY)
====================================================== */

export async function addCampaignIncentive(env, payload) {
  const {
    id,
    campaign_id,
    incentive_type,
    label,
    value = null,
    unit = null,
    conditions = null,
    starts_at = null,
    ends_at = null
  } = payload;

  await db(env)
    .prepare(
      `
      INSERT INTO campaign_incentives (
        id,
        campaign_id,
        incentive_type,
        label,
        value,
        unit,
        conditions,
        starts_at,
        ends_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      campaign_id,
      incentive_type,
      label,
      value,
      unit,
      conditions,
      starts_at,
      ends_at,
      nowISO()
    )
    .run();

  return json({ id, campaign_id, incentive_type });
}

export async function listCampaignIncentives(env, campaignId) {
  const res = await db(env)
    .prepare(
      `
      SELECT *
      FROM campaign_incentives
      WHERE campaign_id = ?
      `
    )
    .bind(campaignId)
    .all();

  return json(res.results || []);
}

/* ======================================================
   CAMPAIGN ↔ CONTENT LINKS
====================================================== */

/**
 * Canonical internal function
 */
export async function linkContentToCampaign(env, payload) {
  const {
    id,
    campaign_id,
    content_type,
    content_id
  } = payload;

  await db(env)
    .prepare(
      `
      INSERT INTO campaign_content_links (
        id,
        campaign_id,
        content_type,
        content_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      campaign_id,
      content_type,
      content_id,
      nowISO()
    )
    .run();

  return { id, campaign_id, content_id };
}

/**
 * Attach campaign content — ROUTER EXPORT
 * (Thin wrapper for canonical function)
 */
export async function attachCampaignContent(request, env) {
  const payload = await request.json();
  const result = await linkContentToCampaign(env, payload);
  return json(result);
}

export async function listCampaignContent(env, campaignId) {
  const res = await db(env)
    .prepare(
      `
      SELECT *
      FROM campaign_content_links
      WHERE campaign_id = ?
      ORDER BY created_at ASC
      `
    )
    .bind(campaignId)
    .all();

  return json(res.results || []);
}
