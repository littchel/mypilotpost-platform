import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";
import { triggerLifecycleEmail } from "../lifecycle/engine.js";

const OTP_TTL_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;
const SEND_RATE_LIMIT_PER_HOUR = 3;

// Common disposable email domains — reject at registration and OTP send
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","guerrillamail.net","guerrillamail.org",
  "guerrillamail.biz","guerrillamail.de","sharklasers.com","guerrillamailblock.com",
  "grr.la","guerrillamail.info","spam4.me","trashmail.com","trashmail.me",
  "trashmail.net","trashmail.at","trashmail.io","trashmail.xyz","dispostable.com",
  "yopmail.com","yopmail.fr","cool.fr.nf","jetable.fr.nf","nospam.ze.tc",
  "nomail.xl.cx","mega.zik.dj","speed.1s.fr","courriel.fr.nf","moncourrier.fr.nf",
  "monemail.fr.nf","monmail.fr.nf","throwam.com","tempmail.com","temp-mail.org",
  "fakeinbox.com","mailnull.com","spamgourmet.com","spamgourmet.net","spamgourmet.org",
  "maildrop.cc","discard.email","spamboy.com","mailnesia.com","throwam.com",
  "getnada.com","mailnull.com","objectmail.com","ownmail.net","pepemail.com",
  "smellfear.com","snakemail.com","spamfree24.org","spammotel.com","spamthisplease.com",
  "temporaryemail.net","throwaway.email","trashdevil.com","wegwerfmail.de",
  "wegwerfmail.net","wegwerfmail.org","yuurok.com"
]);

export function isDisposableEmail(email) {
  const domain = (email || "").split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

async function hashOTP(code) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateOTP() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

/**
 * POST /api/customer/trust/otp/send
 * Generates a 6-digit OTP, stores SHA-256 hash, queues to email_outbox.
 */
export async function sendOTP(request, env, auth) {
  try {
    const db = getDB(env);

    const user = await db.prepare(
      `SELECT email, verified_at FROM users WHERE id = ?`
    ).bind(auth.user_id).first();

    if (!user) return error("User not found", "NOT_FOUND", null, 404);
    if (user.verified_at) return json({ ok: true, already_verified: true });

    if (isDisposableEmail(user.email)) {
      return error(
        "Disposable email addresses are not permitted. Use a permanent email address.",
        "DISPOSABLE_EMAIL",
        null,
        400
      );
    }

    // Rate-limit: max 3 sends per hour
    const recent = await db.prepare(
      `SELECT COUNT(*) as c FROM email_verifications
       WHERE user_id = ? AND created_at > datetime('now','-1 hour')`
    ).bind(auth.user_id).first();

    if ((recent?.c || 0) >= SEND_RATE_LIMIT_PER_HOUR) {
      return error(
        "Too many verification requests. Wait 1 hour before trying again.",
        "RATE_LIMITED",
        null,
        429
      );
    }

    const otp = generateOTP();
    const otp_hash = await hashOTP(otp);
    const expires = `datetime('now','+${OTP_TTL_MINUTES} minutes')`;
    const id = crypto.randomUUID();
    const token = crypto.randomUUID(); // backward-compat link token

    await db.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at, otp_hash, otp_expires_at, attempts)
       VALUES (?, ?, ?, datetime('now','+1 day'), ?, ${expires}, 0)`
    ).bind(id, auth.user_id, token, otp_hash).run();

    // Queue OTP email
    await db.prepare(
      `INSERT INTO email_outbox (id, customer_id, template, to_email, subject, payload, status)
       VALUES (?, ?, 'otp_verification', ?, 'Your myPilotPost verification code', ?, 'pending')`
    ).bind(
      crypto.randomUUID(),
      auth.user_id,
      user.email,
      JSON.stringify({ otp, user_id: auth.user_id, expires_minutes: OTP_TTL_MINUTES })
    ).run();

    return json({ ok: true, expires_in_minutes: OTP_TTL_MINUTES });
  } catch (err) {
    console.error("[TRUST:OTP:SEND]", err);
    return error("Failed to send OTP", "SERVER_ERROR", String(err), 500);
  }
}

/**
 * POST /api/customer/trust/otp/verify
 * Body: { code: "123456" }
 */
export async function verifyOTP(request, env, auth) {
  try {
    const db = getDB(env);
    const { code } = await request.json();

    if (!code || !/^\d{6}$/.test(String(code))) {
      return error("Invalid code format — must be 6 digits", "BAD_REQUEST", null, 400);
    }

    const row = await db.prepare(
      `SELECT id, otp_hash, otp_expires_at, attempts
       FROM email_verifications
       WHERE user_id = ?
         AND otp_hash IS NOT NULL
         AND otp_expires_at > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`
    ).bind(auth.user_id).first();

    if (!row) {
      return error("No active OTP found. Request a new code.", "OTP_EXPIRED", null, 400);
    }

    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      return error(
        "Too many failed attempts. Request a new code.",
        "OTP_LOCKED",
        null,
        429
      );
    }

    const submitted_hash = await hashOTP(code);

    if (submitted_hash !== row.otp_hash) {
      await db.prepare(
        `UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`
      ).bind(row.id).run();
      const remaining = OTP_MAX_ATTEMPTS - (row.attempts + 1);
      return error(
        `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
        "INVALID_OTP",
        null,
        400
      );
    }

    // Correct code — mark user as verified
    await db.batch([
      db.prepare(
        `UPDATE users SET verified_at = datetime('now') WHERE id = ?`
      ).bind(auth.user_id),
      db.prepare(
        `UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`
      ).bind(row.id),
    ]);

    try {
      await triggerLifecycleEmail(env, {
        userId: auth.user_id,
        type: "email_verified",
        payload: {}
      });
    } catch (e) {
      console.warn("[LIFECYCLE] email_verified fire failed:", e.message);
    }

    return json({ ok: true, verified: true });
  } catch (err) {
    console.error("[TRUST:OTP:VERIFY]", err);
    return error("Verification failed", "SERVER_ERROR", String(err), 500);
  }
}

/**
 * Internal utility — queue an OTP email for a newly registered user.
 * Called from register() without an HTTP request context.
 * Non-fatal: swallows all errors so registration never fails due to email.
 */
export async function queueOTPEmail(userId, env) {
  try {
    const db = getDB(env);
    const user = await db.prepare(
      `SELECT email, verified_at FROM users WHERE id = ?`
    ).bind(userId).first();

    if (!user || user.verified_at) return;

    const otp = generateOTP();
    const otp_hash = await hashOTP(otp);
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at, otp_hash, otp_expires_at, attempts)
       VALUES (?, ?, ?, datetime('now','+1 day'), ?, datetime('now','+${OTP_TTL_MINUTES} minutes'), 0)`
    ).bind(id, userId, token, otp_hash).run();

    await db.prepare(
      `INSERT INTO email_outbox (id, customer_id, template, to_email, subject, payload, status)
       VALUES (?, ?, 'otp_verification', ?, ?, ?, 'pending')`
    ).bind(
      crypto.randomUUID(),
      userId,
      user.email,
      `${otp} — Your myPilotPost verification code`,
      JSON.stringify({ otp, user_id: userId, expires_minutes: OTP_TTL_MINUTES })
    ).run();
  } catch (err) {
    console.warn("[TRUST:OTP:AUTO-SEND]", err.message);
  }
}

/**
 * GET /api/customer/trust/status
 */
export async function getVerificationStatus(request, env, auth) {
  try {
    const db = getDB(env);
    const user = await db.prepare(
      `SELECT email, verified_at FROM users WHERE id = ?`
    ).bind(auth.user_id).first();

    if (!user) return error("User not found", "NOT_FOUND", null, 404);

    const pending = await db.prepare(
      `SELECT otp_expires_at, attempts FROM email_verifications
       WHERE user_id = ? AND otp_hash IS NOT NULL AND otp_expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    ).bind(auth.user_id).first();

    return json({
      email: user.email,
      verified: !!user.verified_at,
      verified_at: user.verified_at || null,
      otp_pending: !!pending,
      otp_expires_at: pending?.otp_expires_at || null,
      otp_attempts_used: pending?.attempts || 0,
      otp_attempts_remaining: pending ? Math.max(0, OTP_MAX_ATTEMPTS - (pending.attempts || 0)) : 0,
    });
  } catch (err) {
    console.error("[TRUST:STATUS]", err);
    return error("Status check failed", "SERVER_ERROR", String(err), 500);
  }
}
