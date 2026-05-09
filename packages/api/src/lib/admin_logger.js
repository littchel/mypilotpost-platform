// packages/api/src/lib/admin_logger.js
import { getDB } from "./db.js";

/**
 * Log an administrative action to the audit trail
 * @param {object} env - Worker environment
 * @param {object} auth - Auth payload of the admin
 * @param {string} action - Action name (e.g., 'create_plan')
 * @param {string} targetType - Type of object acted upon (e.g., 'user', 'plan')
 * @param {string} targetId - ID of the target object
 * @param {object} metadata - Extra context (optional)
 */
export async function logAdminAction(env, auth, action, targetType, targetId, metadata = {}) {
  const db = getDB(env);
  const id = crypto.randomUUID();
  const adminId = auth.user_id;
  
  try {
    await db.prepare(`
      INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id,
      adminId,
      action,
      targetType,
      targetId,
      JSON.stringify(metadata)
    ).run();
    
    console.log(`[AUDIT] Admin ${adminId} performed ${action} on ${targetType}:${targetId}`);
  } catch (err) {
    console.error("[AUDIT:FAILED]", err);
    // Fail-soft: Don't block the main action if logging fails, but log to console
  }
}
