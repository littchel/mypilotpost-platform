/**
 * myPilotPost — Customer Auth
 * Workers-native • Canon 1 • SAFE • JWT-COMPATIBLE
 */

import { json, error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { issueJWT } from "./jwt.js";
import { getRegion } from "../lib/geo.js";
import { generateReferralCode, registerReferral } from "../core/promotions/promotions.js";
import { emitEvent } from "../lib/bus.js";
import { hydrateFromAudit } from "../core/onboarding/hydration.js";
import { isDisposableEmail } from "../core/trust/verification.js";
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
    const { email, password, referral_code, first_name, last_name, company, audit_id } = body || {};
    
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

    await db.prepare(
      `INSERT INTO users
       (id, email, password_hash, verified_at, country, region, first_name, last_name, company_name)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`
    )
    .bind(userId, email, `${bytesToHex(salt)}:${hash}`, country, region, first_name || null, last_name || null, company || null)
    .run();

    let brandId = null;
    let token = null;

    // Handle Audit Hydration & Auto-Brand Creation
    if (audit_id) {
      const audit = await db.prepare("SELECT brand_name, website_url FROM brand_audit_results_v2 WHERE id = ?").bind(audit_id).first();
      if (audit) {
        brandId = crypto.randomUUID();
        await db.batch([
          db.prepare("INSERT INTO brands (id, owner_user_id, name, created_at) VALUES (?, ?, ?, datetime('now'))").bind(brandId, userId, audit.brand_name),
          db.prepare("INSERT INTO brand_users (user_id, brand_id, role, created_at) VALUES (?, ?, 'owner', datetime('now'))").bind(userId, brandId)
        ]);

        await hydrateFromAudit(db, brandId, audit_id);
        
        // Auto-login after registration with audit
        token = await issueJWT({
          user_id: userId,
          brand_id: brandId,
          email,
          role: "user"
        }, env);
      }
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

    await db.prepare(
      `INSERT INTO email_verifications
       (id, user_id, token, expires_at)
       VALUES (?, ?, ?, datetime('now','+1 day'))`
    )
    .bind(crypto.randomUUID(), userId, newToken())
    .run();

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
        `SELECT id, password_hash, role, is_active
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

    if (resolvedBrandId) {
      const membership = await db
        .prepare(
          `SELECT 1
           FROM brand_users
           WHERE user_id = ? AND brand_id = ?`
        )
        .bind(user.id, resolvedBrandId)
        .first();

      if (!membership) {
        return error("Brand access denied", "FORBIDDEN", null, 403);
      }
    }

    // ✅ ISSUE JWT (FIXED WITH ROLE)
    const jwt = await issueJWT(
      {
        user_id: user.id,
        brand_id: resolvedBrandId,
        email,
        role: user.role || "user"
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
        `SELECT user_id
         FROM email_verifications
         WHERE token = ? AND expires_at > datetime('now')`
      )
      .bind(token)
      .first();

    if (!row) {
      return error("Invalid or expired token", "BAD_REQUEST", null, 400);
    }

    await db.prepare(
      `UPDATE users
       SET verified_at = datetime('now')
       WHERE id = ?`
    )
    .bind(row.user_id)
    .run();

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
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!user) {
      return json({ ok: true });
    }

    await db.prepare(
      `INSERT INTO password_resets
       (id, user_id, token, expires_at)
       VALUES (?, ?, ?, datetime('now','+1 hour'))`
    )
    .bind(crypto.randomUUID(), user.id, newToken())
    .run();

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

    const salt = randomBytes();
    const hash = await hashPassword(password, salt);

    await db.prepare(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?`
    )
    .bind(`${bytesToHex(salt)}:${hash}`, row.user_id)
    .run();

    return json({ ok: true });
  } catch (err) {
    console.error("[AUTH:RESET_PASSWORD:FAILED]", err);
    return error("Reset failed", "SERVER_ERROR", String(err), 500);
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
