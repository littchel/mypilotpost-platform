/**
 * myPilotPost — AUTH MIDDLEWARE
 * AUTHORITATIVE • CANON 3 • BRAND-AWARE
 */

import { error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { verifyJWT } from "./jwt.js";
import { hasPermission } from "./permissions.js";

export async function requireAuth(request, env) {
  let token = null;
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  }

  // NOTE: Token-in-URL deliberately removed. JWTs in query strings leak into
  // Cloudflare access logs, CDN logs, and Referer headers.
  // All clients must send Authorization: Bearer <token>.

  if (!token) {
    throw error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch (err) {
    console.error("AUTH VERIFY ERROR:", err.message);
    throw error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  const user_id = payload?.user_id;
  if (!user_id) throw error("Unauthorized", "UNAUTHORIZED", null, 401);

  const db = getDB(env);
  const url = new URL(request.url);
  const is_email_exempt_route =
    url.pathname.includes("/trust/") ||
    url.pathname.includes("/verify-email") ||
    url.pathname.includes("/register") ||
    url.pathname.includes("/login") ||
    url.pathname.includes("/auth/logout") ||
    url.pathname.includes("/auth/refresh");

  if (!is_email_exempt_route) {
    const verified = await db.prepare(
      `SELECT verified_at FROM users WHERE id = ? LIMIT 1`
    ).bind(user_id).first();
    if (!verified?.verified_at) {
      throw error("Email verification required", "EMAIL_NOT_VERIFIED", null, 403);
    }
  }

  // --------------------------------------------------
  // Resolve brand (token → fallback → DB)
  // --------------------------------------------------
  let brand_id = payload.brand_id || null;
  let brand_role = null;

  // 1. Mandatory membership check
  // Even if brand_id is in the token, we MUST verify the user still belongs to it.
  if (brand_id) {
    const link = await db.prepare(`
      SELECT brand_id, role
      FROM brand_users
      WHERE user_id = ? AND brand_id = ?
      LIMIT 1
    `).bind(user_id, brand_id).first();

    if (!link) {
      // Token is stale or unauthorized for this brand
      throw error("Access to this brand is denied or revoked", "FORBIDDEN", null, 403);
    }
    brand_role = link.role;
  } else {
    // 2. Fallback to primary brand if none specified in token
    const link = await db.prepare(`
      SELECT brand_id, role
      FROM brand_users
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT 1
    `).bind(user_id).first();

    if (!link) {
      // Admin roles operate without a brand context — bypass the brand gate
      const ADMIN_ROLES = ['super_admin', 'admin', 'ops', 'operations', 'support'];
      if (ADMIN_ROLES.includes(payload.role || '')) {
        brand_id = null;
      } else {
      // 🚨 HARD BLOCK: NO BRANDS EXIST FOR THIS USER
      // We only allow this if the user is currently on an onboarding route
      const is_onboarding_route =
        url.pathname.includes("/onboarding") ||
        url.pathname.includes("/brands/create") ||
        url.pathname.includes("/profile") ||
        url.pathname.includes("/register") ||
        url.pathname.includes("/trust/") ||
        url.pathname.includes("/lifecycle/");

      if (!is_onboarding_route) {
        throw error("Dashboard access blocked: Please complete onboarding first.", "ONBOARDING_REQUIRED", null, 403);
      }
      brand_id = null;
      }
    } else {
      brand_id = link.brand_id;
      brand_role = link.role;
    }

  }

  return {
    user_id,
    brand_id,
    email: payload.email || null,
    role: brand_role || payload.role || "member"
  };
}

/**
 * PRODUCTION HARD LOCK: Require strict brand context for every request.
 */
export async function requireBrandContext(request, env) {
  const auth = await requireAuth(request, env);
  
  // 🚨 HARD BLOCK: NO BRAND_ID = NO ACCESS
  if (!auth.brand_id) {
    throw error("Brand context required for this operation.", "BRAND_CONTEXT_MISSING", null, 403);
  }
  
  return auth;
}

/**
 * Require a specific permission (RBAC)
 */
export async function requirePermission(request, env, permission) {
  const auth = await requireAuth(request, env);
  
  if (!hasPermission(auth.role, permission)) {
    throw error("Access denied: insufficient permissions", "FORBIDDEN", null, 403);
  }
  
  return auth;
}

/**
 * Require admin-level access (any administrative role)
 */
export async function requireAdmin(request, env) {
  const auth = await requireAuth(request, env);
  const adminRoles = ['super_admin', 'admin', 'ops', 'operations', 'support'];
  
  if (!adminRoles.includes(auth.role)) {
    throw error("Access denied: administrator role required", "FORBIDDEN", null, 403);
  }
  
  return auth;
}
