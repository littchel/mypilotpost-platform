import { getDB } from "../../../lib/db.js";
import { SocialReportSchema } from "./schema.js";

export async function buildSocialReport(env, brandId, period) {
  const db = getDB(env);

  const report = structuredClone(SocialReportSchema);

  report.report.period = period;

  /* ===============================
     DASHBOARD METRICS (LOCKED)
  ============================== */
  const dashboard = await db.prepare(
    `
    SELECT
      platform,
      COUNT(*) AS posts
    FROM delivery_jobs
    WHERE brand_id = ?
    GROUP BY platform
    `
  ).bind(brandId).all();

  report.dashboard.metrics = dashboard.results.map(row => ({
    label: `${row.platform} Posts`,
    value: row.posts
  }));

  /* ===============================
     PLATFORM BREAKDOWN
  ============================== */
  report.platforms = dashboard.results.map(row => ({
    name: row.platform,
    metrics: [
      { label: "Posts", value: row.posts }
    ],
    insight: "" // agency editable
  }));

  return report;
}
