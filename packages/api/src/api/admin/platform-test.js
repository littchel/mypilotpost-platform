/**
 * Platform Adapter Sandbox — Admin Only
 * Runs a platform adapter directly against a real connection.
 * Bypasses scheduler, queue, and content pipeline entirely.
 * Returns the raw request and response so adapter behaviour can be verified.
 */

import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";
import { decrypt } from "../../lib/crypto.js";

import * as facebook       from "../../core/platforms/facebook.js";
import * as instagram      from "../../core/platforms/instagram.js";
import * as linkedin       from "../../core/platforms/linkedin.js";
import * as x              from "../../core/platforms/x.js";
import * as threads        from "../../core/platforms/threads.js";
import * as pinterest      from "../../core/platforms/pinterest.js";
import * as tiktok         from "../../core/platforms/tiktok.js";
import * as google         from "../../core/platforms/google.js";
import * as wordpress      from "../../core/platforms/wordpress.js";
import * as google_business from "../../core/platforms/google_business.js";

const ADAPTERS = {
  facebook, instagram, linkedin, x, threads,
  pinterest, tiktok, google, wordpress, google_business,
};

export async function runPlatformTest(request, env) {
  const body = await request.json().catch(() => ({}));
  const { platform, brand_id, caption, media_url } = body;

  if (!platform || !brand_id) {
    return error("platform and brand_id are required", "VALIDATION_ERROR", null, 400);
  }

  const adapter = ADAPTERS[platform];
  if (!adapter) {
    return error(`No adapter registered for platform: ${platform}`, "UNSUPPORTED_PLATFORM", null, 400);
  }

  const db = getDB(env);

  // Fetch connection
  const connection = await db.prepare(`
    SELECT id, platform, account_id, platform_username, access_token, refresh_token, meta
    FROM social_connections
    WHERE brand_id = ? AND platform = ? AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(brand_id, platform).first();

  if (!connection) {
    return error(`No active ${platform} connection for brand ${brand_id}`, "CONNECTION_NOT_FOUND", null, 404);
  }

  // Decrypt token
  let access_token;
  try {
    access_token = await decrypt(connection.access_token, env.ENCRYPTION_SECRET);
  } catch (err) {
    return error(`Token decryption failed: ${err.message}`, "TOKEN_DECRYPTION_FAILED", null, 500);
  }

  let meta = {};
  try { meta = JSON.parse(connection.meta || "{}"); } catch (_) {}

  // Build content + connection objects (same shape as resolver output)
  const content = {
    id:     `sandbox-test-${Date.now()}`,
    text:   caption || "Test post from myPilotPost platform sandbox",
    title:  "Sandbox Test",
    media:  media_url
      ? [{ id: "sandbox-media", preview_url: media_url, mime_type: "image/jpeg", role: "primary", position: 1 }]
      : [],
    type:   "social",
  };

  const conn = {
    id:           connection.id,
    platform:     connection.platform,
    account_id:   connection.account_id,
    account_name: connection.platform_username,
    access_token: access_token,
    metadata:     meta,
  };

  const start = Date.now();
  let result = null;
  let testError = null;

  try {
    result = await Promise.race([
      adapter.publish({ content, connection: conn, env }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT after 25s")), 25000)),
    ]);
  } catch (err) {
    testError = err.message;
  }

  const duration_ms = Date.now() - start;

  const outcome = {
    platform,
    account_id:       connection.account_id,
    account_name:     connection.platform_username,
    caption_length:   content.text.length,
    media_url:        media_url || null,
    media_attached:   content.media.length > 0,
    duration_ms,
    status:           result ? "PASS" : "FAIL",
    external_id:      result?.external_id || null,
    result,
    error:            testError || null,
  };

  // Persist result to delivery_logs for audit trail
  db.prepare(`
    INSERT INTO delivery_logs (job_id, brand_id, platform, attempt_number,
      media_url, resolver_summary, adapter_response, external_id, duration_ms, status, error_message, created_at)
    VALUES ('sandbox-test', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    brand_id, platform,
    media_url || null,
    JSON.stringify({ caption_length: content.text.length, sandbox: true }),
    JSON.stringify(result || {}),
    result?.external_id || null,
    duration_ms,
    result ? 'success' : 'failed',
    testError || null,
  ).run().catch(() => {});

  return json(outcome);
}

/**
 * GET /api/v1/admin/platform-test/connections?brand_id=xxx
 * Lists available connections for sandbox testing.
 */
export async function listTestableConnections(request, env) {
  const db = getDB(env);
  const url = new URL(request.url);
  const brand_id = url.searchParams.get("brand_id");

  const query = brand_id
    ? `SELECT platform, account_id, platform_username, status, updated_at
       FROM social_connections
       WHERE brand_id = ? AND status = 'active'
         AND platform IN ('facebook','instagram','linkedin','x','threads','pinterest','tiktok','google','wordpress','google_business')
       ORDER BY platform`
    : `SELECT DISTINCT platform, account_id, platform_username, brand_id, status, updated_at
       FROM social_connections
       WHERE status = 'active'
         AND platform IN ('facebook','instagram','linkedin','x','threads','pinterest','tiktok','google','wordpress','google_business')
       ORDER BY platform`;

  const { results } = brand_id
    ? await db.prepare(query).bind(brand_id).all()
    : await db.prepare(query).all();

  return json({ connections: results || [] });
}
