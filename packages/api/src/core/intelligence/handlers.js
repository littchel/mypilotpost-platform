/**
 * myPilotPost — Intelligence API
 * AUTHORITATIVE • SYSTEM CORE
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { emitEvent } from "../../lib/bus.js";

/**
 * GET /api/customer/intelligence
 */
export async function listInsights(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT * FROM brand_insights
    WHERE brand_id = ? AND resolved = 0
    ORDER BY priority DESC, created_at DESC
    LIMIT ?
  `).bind(brand_id, parseInt(new URL(request.url).searchParams.get("limit")) || 50).all();

  return json({ data: results });
}

/**
 * POST /api/customer/intelligence/resolve
 */
export async function resolveInsight(request, env, auth) {
  const { brand_id, user_id } = auth;
  const body = await request.json();
  const { insight_id } = body;

  if (!insight_id) return error("Insight ID required", "BAD_REQUEST", null, 400);

  const db = getDB(env);

  const { success } = await db.prepare(`
    UPDATE brand_insights
    SET resolved = 1, resolved_at = datetime('now'), resolved_by = ?
    WHERE id = ? AND brand_id = ?
  `).bind(user_id, insight_id, brand_id).run();

  if (success) {
    await emitEvent(env, 'insight_resolved', {
      brand_id,
      user_id,
      metadata: { insight_id }
    });
  }

  return json({ success: !!success });
}

/**
 * GET /api/customer/intelligence/audits
 */
export async function listAudits(request, env, auth) {
  const { brand_id } = auth;
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT id, brand_name, overall_score, created_at, preview_mode 
    FROM brand_audit_results_v2
    WHERE brand_id = ?
    ORDER BY created_at DESC
  `).bind(brand_id).all();

  return json({ data: results });
}

/**
 * GET /api/customer/intelligence/audits/:id
 */
export async function getFullAudit(request, env, auth) {
  const { brand_id } = auth;
  const auditId = request.url.split('/').pop();
  const db = getDB(env);

  const audit = await db.prepare(`
    SELECT * FROM brand_audit_results_v2
    WHERE id = ? AND (brand_id = ? OR preview_mode = 1)
  `).bind(auditId, brand_id).first();

  if (!audit) return error("Audit not found", "NOT_FOUND", null, 404);

  // Return full report JSON (Frontend handles rendering)
  const report = JSON.parse(audit.full_report_json);
  
  return json({
    ...audit,
    full_report: report,
    score_breakdown: JSON.parse(audit.score_breakdown_json),
    strategic_actions: JSON.parse(audit.strategic_actions_json),
    next_steps: JSON.parse(audit.next_steps_json)
  });
}
