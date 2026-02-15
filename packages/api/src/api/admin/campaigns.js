import { json } from "../../lib/json.js";
import { db } from "../../lib/db.js";

import {
  resolveCampaignWindow,
  calculateROI,
  calculateEfficiencyMetrics,
  explainROI
} from "../core/campaigns/roi.js";

/**
 * GET /api/admin/campaigns/:id/roi
 * Admin-only, read-only ROI computation
 */
export async function getCampaignROI(request, env, ctx) {
  try {
    const campaignId = ctx.params.id;

    // 1️⃣ Load campaign
    const campaign = await db(env)
      .prepare(`SELECT * FROM campaigns WHERE id = ?`)
      .bind(campaignId)
      .first();

    if (!campaign) {
      return json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Load campaign ↔ content links
    const contentLinks = await db(env)
      .prepare(
        `SELECT created_at FROM campaign_content_links
         WHERE campaign_id = ?`
      )
      .bind(campaignId)
      .all();

    // 3️⃣ Resolve campaign window
    const { start, end } = resolveCampaignWindow(
      campaign,
      contentLinks.re
