/**
 * myPilotPost — AUTH MIDDLEWARE
 * AUTHORITATIVE • CANON 3 • BRAND-AWARE
 */

import { error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { verifyJWT } from "./jwt.js";

export async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw error("Unauthorized", 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();

  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch {
    throw error("Invalid token", 401);
  }

  const user_id = payload?.user_id;
  if (!user_id) throw error("Unauthorized", 401);

  const db = getDB(env);

  // --------------------------------------------------
  // Resolve brand (token → fallback → DB)
  // --------------------------------------------------
  let brand_id = payload.brand_id || null;

  if (!brand_id) {
    const link = await db.prepare(`
      SELECT brand_id
      FROM brand_users
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT 1
    `).bind(user_id).first();

    if (link?.brand_id) {
      brand_id = link.brand_id;
    }
  }

  if (!brand_id) {
    throw error("Brand not linked to customer", 403);
  }

  return {
    user_id,
    brand_id,
    email: payload.email || null,
    role: payload.role || "customer"
  };
}
