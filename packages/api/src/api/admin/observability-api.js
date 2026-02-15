import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * GET /api/admin/observability/events
 */
export async function getSystemEvents(request, env) {
  const db = getDB(env);
  const url = new URL(request.url);

  const severity = url.searchParams.get("severity");

  let query = `
    SELECT *
    FROM admin_system_events
  `;

  if (severity) {
    query += ` WHERE severity = ?`;
  }

  query += ` ORDER BY created_at DESC LIMIT 100`;

  const stmt = db.prepare(query);

  const result = severity
    ? await stmt.bind(severity).all()
    : await stmt.all();

  return json({ events: result.results });
}

/**
 * GET /api/admin/analytics/platform-health
 */
export async function getPlatformHealth(env) {
  const db = getDB(env);

  const delivery = await db.prepare(`
    SELECT *
    FROM admin_delivery_metrics
    ORDER BY date DESC
    LIMIT 14
  `).all();

  const content = await db.prepare(`
    SELECT *
    FROM admin_content_metrics
    ORDER BY date DESC
    LIMIT 14
  `).all();

  return json({
    delivery: delivery.results,
    content: content.results,
  });
}
