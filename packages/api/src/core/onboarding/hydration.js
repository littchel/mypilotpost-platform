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

    // 3. Create initial diagnostic insights from audit strategic actions
    const audit = await db.prepare("SELECT strategic_actions_json FROM brand_audit_results_v2 WHERE id = ?").bind(auditId).first();
    const insights = JSON.parse(audit?.strategic_actions_json || '[]');

    const urgencyToPriority = { HIGH: 'high', CRITICAL: 'critical', MEDIUM: 'medium', LOW: 'low' };

    for (const insight of insights) {
      const title = insight.metric || 'Strategic Gap';
      const message = [insight.cause, insight.recommendation].filter(Boolean).join('. Recommendation: ');
      const priority = urgencyToPriority[(insight.urgency || '').toUpperCase()] || 'medium';
      const signature = `${brandId}:strategic:${title}`;

      await db.prepare(`
        INSERT INTO brand_insights (id, brand_id, type, title, message, priority, signature)
        VALUES (?, ?, 'advisory', ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        brandId,
        title,
        message,
        priority,
        signature
      ).run();
    }
    console.log(`[AUDIT_HYDRATION] inserted ${insights.length} insights for brand=${brandId}`);

  } catch (e) {
    console.error(`[HYDRATION FAILED]`, e.message);
  }
}
