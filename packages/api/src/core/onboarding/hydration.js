/**
 * myPilotPost — Onboarding Hydration Engine
 * AUDIT → DASHBOARD CONTINUITY
 */

import { hydrateAuditIntoDNA } from "../brands/brand_dna.js";

/**
 * Hydrates a new brand with data from their initial public audit
 */
export async function hydrateFromAudit(db, brandId, auditId) {
  if (!auditId) return;

  console.log(`[HYDRATION] Hydrating brand ${brandId} from audit ${auditId}`);

  try {
    // 1. Hydrate Brand DNA (Profiles, Objectives, Pillars)
    await hydrateAuditIntoDNA(db, brandId, auditId);

    // 2. Mark audit as linked
    await db.prepare(`
      UPDATE brand_audit_results_v2
      SET brand_id = ?, preview_mode = 0, unlocked_at = datetime('now')
      WHERE id = ?
    `).bind(brandId, auditId).run();

    // 3. Create initial diagnostic insights
    const audit = await db.prepare("SELECT strategic_actions_json FROM brand_audit_results_v2 WHERE id = ?").bind(auditId).first();
    const insights = JSON.parse(audit.strategic_actions_json || '[]');

    for (const insight of insights) {
      await db.prepare(`
        INSERT INTO brand_intelligence_insights (id, brand_id, type, metric, message, priority)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), 
        brandId, 
        'STRATEGIC_GAP', 
        insight.metric, 
        `${insight.cause}. Recommendation: ${insight.recommendation}`,
        insight.urgency || 'MEDIUM'
      ).run();
    }

  } catch (e) {
    console.error(`[HYDRATION FAILED]`, e.message);
  }
}
