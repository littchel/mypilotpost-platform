/**
 * myPilotPost — Customer Auth
 * Workers-native • Canon 1 • SAFE • JWT-COMPATIBLE
 */

import { json, error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { issueJWT, verifyJWT } from "./jwt.js";
import { getRegion } from "../lib/geo.js";
import { generateReferralCode, registerReferral } from "../core/promotions/promotions.js";
import { emitEvent } from "../lib/bus.js";
import { isDisposableEmail, queueOTPEmail } from "../core/trust/verification.js";
import { triggerLifecycleEmail } from "../core/lifecycle/engine.js";

/* ================================
   HELPERS
 ================================ */

const encoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  return new Uint8Array(
    hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
}

function randomBytes(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

function newToken() {
  return crypto.randomUUID();
}

/* ================================
   CRYPTO (PBKDF2)
 ================================ */

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return bytesToHex(new Uint8Array(bits));
}

/* ================================
   REGISTER (PUBLIC)
 ================================ */

export async function register(request, env) {
  try {
    const db = getDB(env);
    const body = await request.json();
    const { email, password, referral_code, first_name, last_name, company, audit_id, signup_source } = body || {};
    const resolvedSource = signup_source || (audit_id ? 'brand_audit' : 'direct');
    
    if (!email || !password) {
      return error("Missing email or password", "BAD_REQUEST", null, 400);
    }

    if (isDisposableEmail(email)) {
      return error(
        "Disposable email addresses are not permitted. Please use a permanent email address.",
        "DISPOSABLE_EMAIL",
        null,
        400
      );
    }

    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (existing) {
      return error("Account already exists", "CONFLICT", null, 409);
    }

    const userId = crypto.randomUUID();
    const salt = randomBytes();
    const hash = await hashPassword(password, salt);

    // Geolocation Detection
    const country = request.cf?.country || "unknown";
    const region = getRegion(country);

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await db.prepare(
      `INSERT INTO users
       (id, email, password_hash, verified_at, country, region, first_name, last_name, company_name, signup_source,
        plan_id, subscription_status, trial_ends_at, current_period_start, current_period_end)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'starter', 'trial', ?, ?, ?)`
    )
    .bind(userId, email, `${bytesToHex(salt)}:${hash}`, country, region, first_name || null, last_name || null, company || null, resolvedSource, trialEnd, now, periodEnd)
    .run();

    let brandId = null;

    // Link audit lead record for conversion tracking only — no onboarding coupling
    if (audit_id) {
      await db.prepare("UPDATE public_audit_leads SET converted_user_id = ? WHERE audit_id = ?")
        .bind(userId, audit_id).run().catch(() => {});
    }

    // Generate own referral code
    await generateReferralCode(db, userId, email);

    // Register incoming referral if present
    if (referral_code) {
      const metadata = {
        ip: request.headers.get("CF-Connecting-IP") || "0.0.0.0",
        ua: request.headers.get("User-Agent") || "unknown"
      };
      await registerReferral(db, referral_code, userId, metadata);
    }

    const token = await issueJWT({ user_id: userId, email, role: "user" }, env);

    // Fire welcome email — awaited but non-fatal
    try {
      await triggerLifecycleEmail(env, {
        userId,
        brandId: brandId || null,
        type: "user_registered",
        payload: { first_name: first_name || null }
      });
    } catch (e) {
      console.warn("[LIFECYCLE] user_registered fire failed:", e.message);
    }

    // Auto-send verification OTP — non-fatal, queueOTPEmail swallows errors
    await queueOTPEmail(userId, env);

    return json({ ok: true, token, brand_id: brandId });
  } catch (err) {
    console.error("[AUTH:REGISTER:FAILED]", err);
    return error("Registration failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   LOGIN (PUBLIC → JWT)
 ================================ */

export async function login(request, env) {
  try {
    const db = getDB(env);
    const body = await request.json();

    const { email, password, brand_id } = body || {};
    if (!email || !password) {
      return error("Missing credentials", "BAD_REQUEST", null, 400);
    }

    const user = await db
      .prepare(
        `SELECT id, password_hash, role, is_active, first_name
         FROM users
         WHERE email = ?`
      )
      .bind(email)
      .first();

    if (!user || !user.password_hash) {
      return error("Invalid credentials", "UNAUTHORIZED", null, 401);
    }

    if (user.is_active === 0) {
      return error("account_suspended", "FORBIDDEN", "Your account has been deactivated", 403);
    }

    const [saltHex, storedHash] = user.password_hash.split(":");
    const salt = hexToBytes(saltHex);
    const computed = await hashPassword(password, salt);

    if (computed !== storedHash) {
      return error("Invalid credentials", "UNAUTHORIZED", null, 401);
    }

    let resolvedBrandId = brand_id;

    if (!resolvedBrandId) {
      const row = await db
        .prepare(
          `SELECT brand_id
           FROM brand_users
           WHERE user_id = ?
           LIMIT 1`
        )
        .bind(user.id)
        .first();

      if (row) {
        resolvedBrandId = row.brand_id;
      }
    }

    let brandRole = "member";
    if (resolvedBrandId) {
      const membership = await db
        .prepare(
          `SELECT role
           FROM brand_users
           WHERE user_id = ? AND brand_id = ?`
        )
        .bind(user.id, resolvedBrandId)
        .first();

      if (!membership) {
        return error("Brand access denied", "FORBIDDEN", null, 403);
      }
      brandRole = membership.role || "member";
    }

    const jwt = await issueJWT(
      {
        user_id: user.id,
        brand_id: resolvedBrandId,
        email,
        role: brandRole,
        first_name: user.first_name || null
      },
      env
    );

    // Growth Engine Integration: Daily Login
    if (resolvedBrandId) {
      await emitEvent(env, 'daily_login', {
        brand_id: resolvedBrandId,
        user_id: user.id
      });
    }

    return json({ token: jwt });
  } catch (err) {
    console.error("[AUTH:LOGIN:FAILED]", err);
    return error("Login failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   VERIFY EMAIL
 ================================ */

export async function verifyEmail(request, env) {
  try {
    const db = getDB(env);
    const { token } = await request.json();

    const row = await db
      .prepare(
        `SELECT user_id FROM email_verifications
         WHERE token = ? AND expires_at > datetime('now')`
      )
      .bind(token)
      .first();

    if (!row) {
      return error("Invalid or expired token", "BAD_REQUEST", null, 400);
    }

    // Check if already verified (idempotent)
    const user = await db
      .prepare("SELECT verified_at FROM users WHERE id = ?")
      .bind(row.user_id)
      .first();

    if (!user?.verified_at) {
      await db.prepare(
        `UPDATE users SET verified_at = datetime('now') WHERE id = ?`
      ).bind(row.user_id).run();

      try {
        await triggerLifecycleEmail(env, {
          userId: row.user_id,
          type: "email_verified",
          payload: {}
        });
      } catch (e) {
        console.warn("[LIFECYCLE] email_verified fire failed:", e.message);
      }
    }

    // Expire the token so it can't be reused
    await db.prepare(
      `UPDATE email_verifications SET expires_at = datetime('now') WHERE token = ?`
    ).bind(token).run();

    return json({ ok: true });
  } catch (err) {
    console.error("[AUTH:VERIFY_EMAIL:FAILED]", err);
    return error("Verification failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   FORGOT PASSWORD
 ================================ */

export async function forgotPassword(request, env) {
  try {
    const db = getDB(env);
    const { email } = await request.json();

    const user = await db
      .prepare("SELECT id, first_name FROM users WHERE email = ?")
      .bind(email)
      .first();

    // Always return ok to prevent email enumeration
    if (!user) return json({ ok: true });

    const resetToken = newToken();
    await db.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at)
       VALUES (?, ?, ?, datetime('now','+1 hour'))`
    ).bind(crypto.randomUUID(), user.id, resetToken).run();

    const FRONTEND_URL = env.FRONTEND_URL || "https://app.mypilotpost.com";
    const reset_url = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await triggerLifecycleEmail(env, {
        userId: user.id,
        type: "password_reset",
        payload: {
          first_name: user.first_name || null,
          reset_url,
        }
      });
    } catch (e) {
      console.warn("[LIFECYCLE] password_reset fire failed:", e.message);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[AUTH:FORGOT_PASSWORD:FAILED]", err);
    return error("Request failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   RESET PASSWORD
 ================================ */

export async function resetPassword(request, env) {
  try {
    const db = getDB(env);
    const { token, password } = await request.json();

    const row = await db
      .prepare(
        `SELECT user_id
         FROM password_resets
         WHERE token = ? AND expires_at > datetime('now')`
      )
      .bind(token)
      .first();

    if (!row) {
      return error("Invalid or expired token", "BAD_REQUEST", null, 400);
    }

    if (!password || password.length < 8) {
      return error("Password must be at least 8 characters", "BAD_REQUEST", null, 400);
    }

    const salt = randomBytes();
    const hash = await hashPassword(password, salt);

    await db.batch([
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
        .bind(`${bytesToHex(salt)}:${hash}`, row.user_id),
      // Expire the token so it cannot be replayed
      db.prepare(`UPDATE password_resets SET expires_at = datetime('now') WHERE token = ?`)
        .bind(token),
    ]);

    try {
      await triggerLifecycleEmail(env, {
        userId: row.user_id,
        type: "password_changed",
        payload: {}
      });
    } catch (e) {
      console.warn("[LIFECYCLE] password_changed fire failed:", e.message);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[AUTH:RESET_PASSWORD:FAILED]", err);
    return error("Reset failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   CHANGE PASSWORD (PROTECTED)
 ================================ */

export async function changePassword(request, env) {
  try {
    const db = getDB(env);
    const userId = request.user?.id;
    if (!userId) return error("Unauthorized", "UNAUTHORIZED", null, 401);

    const { current_password, new_password } = await request.json();
    if (!current_password || !new_password) {
      return error("Both current and new password are required", "BAD_REQUEST", null, 400);
    }
    if (new_password.length < 8) {
      return error("New password must be at least 8 characters", "BAD_REQUEST", null, 400);
    }

    const user = await db.prepare(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1"
    ).bind(userId).first();

    if (!user?.password_hash) return error("User not found", "NOT_FOUND", null, 404);

    const parts = user.password_hash.split(":");
    if (parts.length < 2) return error("Invalid credentials", "UNAUTHORIZED", null, 401);

    const [saltHex, expectedHash] = parts;
    const salt = hexToBytes(saltHex);
    const actualHash = await hashPassword(current_password, salt);
    if (actualHash !== expectedHash) {
      return error("Current password is incorrect", "UNAUTHORIZED", null, 401);
    }

    const newSalt = randomBytes();
    const newHash = await hashPassword(new_password, newSalt);
    await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(`${bytesToHex(newSalt)}:${newHash}`, userId)
      .run();

    try {
      await triggerLifecycleEmail(env, {
        userId,
        type: "password_changed",
        payload: {}
      });
    } catch (e) {
      console.warn("[LIFECYCLE] password_changed fire failed:", e.message);
    }

    return json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("[AUTH:CHANGE_PASSWORD:FAILED]", err);
    return error("Password change failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   LOGOUT (PROTECTED — stateless JWT)
 ================================ */

export async function logout(_request, _env, _auth) {
  return json({ ok: true });
}

/* ================================
   REFRESH JWT (PROTECTED)
 ================================ */

export async function refreshSession(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) return error("Unauthorized", "UNAUTHORIZED", null, 401);

    let payload;
    try {
      payload = await verifyJWT(token, env.JWT_SECRET);
    } catch (err) {
      if (err.message !== "Expired") {
        return error("Unauthorized", "UNAUTHORIZED", null, 401);
      }
      payload = await verifyJWT(token, env.JWT_SECRET, { ignoreExpiration: true });
    }

    const user_id = payload?.user_id;
    if (!user_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

    const db = getDB(env);

    const verified = await db.prepare(
      `SELECT verified_at FROM users WHERE id = ? LIMIT 1`
    ).bind(user_id).first();
    if (!verified?.verified_at) {
      return error("Email verification required", "EMAIL_NOT_VERIFIED", null, 403);
    }

    let brand_id = payload.brand_id || null;
    let brand_role = payload.role || "member";

    if (brand_id) {
      const link = await db.prepare(`
        SELECT brand_id, role FROM brand_users
        WHERE user_id = ? AND brand_id = ? LIMIT 1
      `).bind(user_id, brand_id).first();
      if (!link) return error("Access to this brand is denied or revoked", "FORBIDDEN", null, 403);
      brand_role = link.role;
    } else {
      const link = await db.prepare(`
        SELECT brand_id, role FROM brand_users
        WHERE user_id = ? ORDER BY created_at ASC LIMIT 1
      `).bind(user_id).first();
      if (link) {
        brand_id = link.brand_id;
        brand_role = link.role;
      }
    }

    const jwt = await issueJWT(
      {
        user_id,
        brand_id,
        email: payload.email,
        role: brand_role,
        first_name: payload.first_name || null
      },
      env
    );

    return json({ token: jwt });
  } catch (err) {
    console.error("[AUTH:REFRESH:FAILED]", err);
    return error("Refresh failed", "SERVER_ERROR", String(err), 500);
  }
}

/* ================================
   PROFILE (PROTECTED)
 ================================ */

export async function getProfile(request, env) {
  try {
    const db = getDB(env);
    const userId = request.user?.id;
    
    if (!userId) {
      return error("Unauthorized", "UNAUTHORIZED", null, 401);
    }

    const user = await db
      .prepare(
        `SELECT id, email, role, country, region, verified_at, created_at
         FROM users
         WHERE id = ?`
      )
      .bind(userId)
      .first();

    if (!user) {
      return error("User not found", "NOT_FOUND", null, 404);
    }

    return json({ 
      ok: true, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        country: user.country || 'unknown',
        region: user.region || 'global',
        is_verified: !!user.verified_at,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error("[AUTH:PROFILE:FAILED]", err);
    return error("Failed to fetch profile", "SERVER_ERROR", String(err), 500);
  }
}
