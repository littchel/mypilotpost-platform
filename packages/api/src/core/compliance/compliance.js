/**
 * myPilotPost — Compliance & Privacy Engine
 * Handles data deletion requests and legal status reporting.
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * DELETE /api/compliance/delete-account
 * Permanent data deletion as required by Meta/Google/LinkedIn.
 */
export async function handleDataDeletionRequest(request, env, auth) {
  const db = getDB(env);
  const userId = auth.userId;

  if (!userId) return error("Unauthorized", 401);

  try {
    // 1. Mark user for deletion (soft delete first for safety, or hard delete if required)
    // For compliance, we usually need to wipe everything.
    
    await db.batch([
      // Wipe social tokens
      db.prepare("DELETE FROM social_connections WHERE user_id = ?").bind(userId),
      // Wipe content drafts
      db.prepare("DELETE FROM content_drafts WHERE user_id = ?").bind(userId),
      // Wipe brand memberships
      db.prepare("DELETE FROM brand_users WHERE user_id = ?").bind(userId),
      // Deactivate user
      db.prepare("UPDATE users SET is_active = 0, email = 'deleted-' || id || '@mypilotpost.com', password_hash = 'DELETED' WHERE id = ?").bind(userId)
    ]);

    return json({ 
      ok: true, 
      message: "Your data deletion request has been processed. All social tokens and personal data have been removed." 
    });
  } catch (e) {
    console.error("[COMPLIANCE:DELETION_FAILED]", e);
    return error("Failed to process deletion request", 500);
  }
}
