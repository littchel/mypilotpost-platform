/**
 * myPilotPost — Customer Auth
 * Workers-native • Canon 1 • SAFE • JWT-COMPATIBLE
 */

import { json, error } from "../lib/json.js";
import { getDB } from "../lib/db.js";
import { issueJWT } from "./jwt.js";

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

    const { email, password } = body || {};
    if (!email || !password) {
      return error("Missing email or password", 400);
    }

    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (existing) {
      return error("Account already exists", 409);
    }

    const userId = crypto.randomUUID();
    const salt = randomBytes();
    const hash = await hashPassword(password, salt);

    await db.prepare(
      `INSERT INTO users
       (id, email, password_hash, email_verified_at)
       VALUES (?, ?, ?, NULL)`
    )
    .bind(userId, email, `${bytesToHex(salt)}:${hash}`)
    .run();

    await db.prepare(
      `INSERT INTO email_verifications
       (user_id, token, expires_at)
       VALUES (?, ?, datetime('now','+1 day'))`
    )
    .bind(userId, newToken())
    .run();

    // Registration does NOT auto-login (kept as-is)
    return json({ ok: true });
  } catch (err) {
    console.error("REGISTER ERROR", err);
    return error("Registration failed", 500);
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
      return error("Missing credentials", 400);
    }

    const user = await db
      .prepare(
        `SELECT id, password_hash
         FROM users
         WHERE email = ?`
      )
      .bind(email)
      .first();

    if (!user || !user.password_hash) {
      return error("Invalid credentials", 401);
    }

    const [saltHex, storedHash] = user.password_hash.split(":");
    const salt = hexToBytes(saltHex);
    const computed = await hashPassword(password, salt);

    if (computed !== storedHash) {
      return error("Invalid credentials", 401);
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

      if (!row) {
        return error("No brand access", 403);
      }

      resolvedBrandId = row.brand_id;
    }

    const membership = await db
      .prepare(
        `SELECT 1
         FROM brand_users
         WHERE user_id = ? AND brand_id = ?`
      )
      .bind(user.id, resolvedBrandId)
      .first();

    if (!membership) {
      return error("Brand access denied", 403);
    }

    // ✅ ISSUE JWT (FIX)
    const jwt = await issueJWT(
      {
        user_id: user.id,
        brand_id: resolvedBrandId,
        email,
        role: "customer"
      },
      env
    );

    return json({ token: jwt });
  } catch (err) {
    console.error("LOGIN ERROR", err);
    return error("Login failed", 500);
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
      return error("Invalid or expired token", 400);
    }

    await db.prepare(
      `UPDATE users
       SET email_verified_at = datetime('now')
       WHERE id = ?`
    )
    .bind(row.user_id)
    .run();

    return json({ ok: true });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR", err);
    return error("Verification failed", 500);
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
       (user_id, token, expires_at)
       VALUES (?, ?, datetime('now','+1 hour'))`
    )
    .bind(user.id, newToken())
    .run();

    return json({ ok: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR", err);
    return error("Request failed", 500);
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
      return error("Invalid or expired token", 400);
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
    console.error("RESET PASSWORD ERROR", err);
    return error("Reset failed", 500);
  }
}
