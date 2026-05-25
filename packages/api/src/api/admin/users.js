import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

export async function handleAdminUsers(request, env) {
  try {
    const db = getDB(env);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        u.id, u.email, u.role, u.plan_id,
        u.subscription_status, u.is_active, u.created_at,
        p.name as plan_name,
        p.price_monthly,
        (SELECT COUNT(*) FROM brand_users bu WHERE bu.user_id = u.id) as brand_count
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.role = 'user'
    `;

    const binds = [];
    if (search) {
      query += " AND LOWER(u.email) LIKE ?";
      binds.push(`%${search.toLowerCase()}%`);
    }
    query += ` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const { results } = binds.length
      ? await db.prepare(query).bind(...binds).all()
      : await db.prepare(query).all();

    const total = await db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'user'"
    ).first();

    return json({ success: true, data: results || [], total: total?.count || 0, page, limit });
  } catch (err) {
    console.error("[ADMIN:USERS:FAILED]", err);
    return error("Failed to load users", "SERVER_ERROR", String(err), 500);
  }
}

export async function handleAdminUserDetail(request, env, userId) {
  try {
    const db = getDB(env);
    const user = await db.prepare(`
      SELECT u.id, u.email, u.role, u.plan_id, u.subscription_status, u.is_active, u.created_at,
             p.name as plan_name
      FROM users u LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.id = ?
    `).bind(userId).first();

    if (!user) return error("User not found", "NOT_FOUND", null, 404);

    const [brands, aiUsage, supportMessages] = await Promise.all([
      db.prepare("SELECT b.id, b.name, b.industry FROM brands b JOIN brand_users bu ON bu.brand_id = b.id WHERE bu.user_id = ?").bind(userId).all(),
      db.prepare("SELECT COUNT(*) as count FROM ai_generations WHERE user_id = ?").bind(userId).first().catch(() => ({ count: 0 })),
      db.prepare("SELECT COUNT(*) as count FROM support_messages WHERE sender_id = ?").bind(userId).first().catch(() => ({ count: 0 }))
    ]);

    return json({
      ...user,
      brands: brands.results || [],
      ai_generations: aiUsage?.count || 0,
      support_messages: supportMessages?.count || 0
    });
  } catch (err) {
    console.error("[ADMIN:USER_DETAIL:FAILED]", err);
    return error("Failed to load user", "SERVER_ERROR", String(err), 500);
  }
}

export async function toggleAdminUserStatus(request, env, userId) {
  try {
    const db = getDB(env);
    const result = await db.prepare(`
      UPDATE users
      SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
      WHERE id = ?
      RETURNING id, email, is_active
    `).bind(userId).all();

    if (!result?.results?.length) {
      return error("User not found", "NOT_FOUND", null, 404);
    }

    return json({ success: true, data: result.results[0] });
  } catch (err) {
    console.error("[ADMIN:USERS:TOGGLE_FAILED]", err);
    return error("Failed to toggle user status", "SERVER_ERROR", String(err), 500);
  }
}
