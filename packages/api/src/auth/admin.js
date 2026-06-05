/**
 * myPilotPost — Admin Authentication
 * Completely separate from customer auth.
 * Issues JWTs with is_admin:true — customer tokens are rejected by requireAdminAuth.
 */

import { json, error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { verifyJWT, issueJWT } from "./jwt.js";

const ADMIN_ROLES = ["super_admin", "admin", "ops", "operations", "support"];

/**
 * POST /api/admin/login
 */
export async function adminLogin(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return error("Invalid JSON body", "INVALID_JSON", null, 400); }

  const { email, password } = body || {};
  if (!email || !password) return error("Email and password required", "BAD_REQUEST", null, 400);

  const db = getDB(env);
  const user = await db.prepare(
    "SELECT id, email, password_hash, role, is_active FROM users WHERE LOWER(email) = ? LIMIT 1"
  ).bind(email.toLowerCase().trim()).first();

  // Constant-time: always hash to prevent timing side-channel even on miss
  const dummySalt = new Uint8Array(16);
  const dummyKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode("timing-constant"), "PBKDF2", false, ["deriveBits"]
  );
  await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: dummySalt, iterations: 100_000, hash: "SHA-256" }, dummyKey, 256
  );

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return error("Invalid credentials", "UNAUTHORIZED", null, 401);
  }
  if (!user.is_active) {
    return error("Account is disabled", "FORBIDDEN", null, 403);
  }

  const parts = (user.password_hash || "").split(":");
  if (parts.length < 2) return error("Invalid credentials", "UNAUTHORIZED", null, 401);

  const [saltHex, expectedHash] = parts;
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256
  );
  const actualHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (actualHash !== expectedHash) {
    return error("Invalid credentials", "UNAUTHORIZED", null, 401);
  }

  const token = await issueJWT(
    { user_id: user.id, email: user.email, role: user.role, is_admin: true },
    env
  );

  return json({ success: true, token, role: user.role, email: user.email });
}

/**
 * Middleware: require a valid admin JWT (is_admin: true required).
 * Customer tokens issued via /api/customer/login are rejected here.
 */
export async function requireAdminAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) throw error("Unauthorized", "UNAUTHORIZED", null, 401);

  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch {
    throw error("Invalid or expired token", "UNAUTHORIZED", null, 401);
  }

  if (!payload.is_admin) {
    throw error("Admin authentication required", "FORBIDDEN", null, 403);
  }
  if (!ADMIN_ROLES.includes(payload.role || "")) {
    throw error("Insufficient admin role", "FORBIDDEN", null, 403);
  }

  return { user_id: payload.user_id, email: payload.email, role: payload.role };
}
