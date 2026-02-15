/**
 * myPilotPost — CUSTOMER ANALYTICS
 * AUTHORITATIVE • V1 LOCKED • AGENCY-GRADE
 *
 * Principles:
 * - CUSTOMER ONLY (brand-scoped)
 * - READ ONLY
 * - DERIVED (no analytics tables)
 * - NO PERFORMANCE FABRICATION
 * - NO BRAND INTELLIGENCE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/* ======================================================
   ANALYTICS OVERVIEW — OPERATIONAL SNAPSHOT
====================================================== */
export async function getAnalyticsOverview(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const lifecycle = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(state = 'scheduled') AS scheduled
    FROM content_drafts
    WHERE brand_id = ?
  `).bind(auth.brand_id).first();

  const delivery = await db.prepare(`
    SELECT
      SUM(status = 'completed') AS delivered,
      SUM(status = 'failed') AS failed
    FROM delivery_jobs
    WHERE brand_id = ?
  `).bind(auth.brand_id).first();

  const platforms = await db.prepare(`
    SELECT COUNT(DISTINCT platform) AS platforms_active
    FROM delivery_jobs
    WHERE brand_id = ?
  `).bind(auth.brand_id).first();

  return json({
    brand_id: auth.brand_id,
    overview: {
      content_total: lifecycle?.total ?? 0,
      scheduled: lifecycle?.scheduled ?? 0,
      delivered: delivery?.delivered ?? 0,
      failed: delivery?.failed ?? 0,
      platforms_active: platforms?.platforms_active ?? 0
    }
  });
}

/* ======================================================
   CANON 4 — CONTENT LIFECYCLE ANALYTICS
====================================================== */
export async function getContentAnalytics(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const lifecycle = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(state = 'draft') AS draft,
      SUM(state = 'ready') AS ready,
      SUM(state = 'scheduled') AS scheduled
    FROM content_drafts
    WHERE brand_id = ?
  `).bind(auth.brand_id).first();

  const { results } = await db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM delivery_jobs
    WHERE brand_id = ?
    GROUP BY status
  `).bind(auth.brand_id).all();

  const totals = {
    all: lifecycle?.total ?? 0,
    draft: lifecycle?.draft ?? 0,
    ready: lifecycle?.ready ?? 0,
    scheduled: lifecycle?.scheduled ?? 0,
    delivered: 0,
    failed: 0
  };

  for (const r of results || []) {
    if (r.status === "completed") totals.delivered = r.count;
    if (r.status === "failed") totals.failed = r.count;
  }

  return json({ brand_id: auth.brand_id, totals });
}

/* ======================================================
   PLATFORM ANALYTICS — HEALTH & ALLOCATION
====================================================== */
export async function getPlatformAnalytics(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      platform,
      SUM(status = 'completed') AS delivered,
      SUM(status = 'failed') AS failed,
      COUNT(*) AS total_jobs
    FROM delivery_jobs
    WHERE brand_id = ?
    GROUP BY platform
  `).bind(auth.brand_id).all();

  const platforms = {};
  for (const row of results || []) {
    platforms[row.platform] = {
      delivered: row.delivered ?? 0,
      failed: row.failed ?? 0,
      total_jobs: row.total_jobs ?? 0
    };
  }

  return json({ brand_id: auth.brand_id, platforms });
}

/* ======================================================
   OPERATIONAL / AGENCY HEALTH ANALYTICS
====================================================== */
export async function getOperationalAnalytics(_req, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT
      platform,
      COUNT(*) AS jobs
    FROM delivery_jobs
    WHERE brand_id = ?
    GROUP BY platform
  `).bind(auth.brand_id).all();

  const signals = [];

  for (const row of results || []) {
    if (row.jobs < 3) {
      signals.push({
        type: "platform_underutilized",
        platform: row.platform,
        message: "Low posting volume on this platform"
      });
    }
  }

  return json({
    brand_id: auth.brand_id,
    operational_signals: signals
  });
}

/* ======================================================
   CAMPAIGN ANALYTICS — SHAPE LOCK (INTENTIONAL)
====================================================== */
export async function getCampaignAnalytics(_req, _env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  return json({
    campaigns: []
  });
}
