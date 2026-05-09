import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function handleAdminUsers(request, env) {
  try {
    const db = getDB(env);
    // Fetch users with their plan and basic info
    // Left join with some metric if needed, but for now we return what we can
    const { results } = await db.prepare(`
      SELECT id, email, plan_id as plan, 
             CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END as status
      FROM users
      ORDER BY created_at DESC
    `).all();

    return json({ success: true, data: results });
  } catch (err) {
    console.error("[ADMIN:USERS:FAILED]", err);
    return error("Failed to load users", "SERVER_ERROR", String(err), 500);
  }
}

export async function toggleAdminUserStatus(request, env, userId) {
  try {
    const db = getDB(env);
    
    // Toggle logic: CASE WHEN is_active = 1 THEN 0 ELSE 1 END
    const result = await db.prepare(`
      UPDATE users
      SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
      WHERE id = ?
      RETURNING *
    `).bind(userId).all();

    if (!result || result.results.length === 0) {
      return error("User not found", "NOT_FOUND", null, 404);
    }

    const updatedUser = result.results[0];

    return json({ 
      success: true, 
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        is_active: updatedUser.is_active
      }
    });
  } catch (err) {
    console.error("[ADMIN:USERS:TOGGLE_FAILED]", err);
    return error("Failed to toggle user status", "SERVER_ERROR", String(err), 500);
  }
}
