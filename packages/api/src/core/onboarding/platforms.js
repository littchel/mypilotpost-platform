// packages/api/src/core/onboarding/platforms.js
// myPilotPost — Onboarding Platforms Engine v1 (AUTHORITATIVE)

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { markOnboardingStep } from "./progress.js";
import { checkAndIncrement } from "../billing/enforcement.js";

// Locked enum — frontend must mirror
const SUPPORTED_PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "tiktok",
  "youtube",
  "pinterest",
  "threads"
];

/*
  GET /api/customer/onboarding/platforms
  Returns supported platforms + brand state
*/
export async function listPlatforms(request, env, auth) {
  const db = getDB(env);

  const rows = await db
    .prepare(
      `SELECT platform, status, connected_at
       FROM brand_platforms
       WHERE brand_id = ?`
    )
    .bind(auth.brand_id)
    .all();

  const map = {};
  for (const r of rows?.results || []) {
    map[r.platform] = r;
  }

  const platforms = SUPPORTED_PLATFORMS.map((p) => ({
    platform: p,
    selected: !!map[p],
    status: map[p]?.status || "not_selected",
    connected_at: map[p]?.connected_at || null
  }));

  return json({ platforms });
}

/*
  POST /api/customer/onboarding/platforms
  Saves selected platforms (idempotent)
*/
export async function savePlatforms(request, env, auth) {
  const { platforms } = await request.json();

  if (!Array.isArray(platforms)) {
    return json({ error: "Invalid platforms payload" }, 400);
  }

  const selected = platforms
    .map((p) => String(p).toLowerCase())
    .filter((p) => SUPPORTED_PLATFORMS.includes(p));

  const db = getDB(env);
  const statements = [];

  if (selected.length === 0) {
    statements.push(
      db.prepare(`DELETE FROM brand_platforms WHERE brand_id = ?`).bind(auth.brand_id)
    );
  } else {
    statements.push(
      db.prepare(
        `DELETE FROM brand_platforms
         WHERE brand_id = ?
           AND platform NOT IN (${selected.map(() => "?").join(",")})`
      ).bind(auth.brand_id, ...selected)
    );
    for (const platform of selected) {
      statements.push(
        db.prepare(
          `INSERT INTO brand_platforms (brand_id, platform, status)
           VALUES (?, ?, 'selected')
           ON CONFLICT(brand_id, platform)
           DO UPDATE SET status = 'selected'`
        ).bind(auth.brand_id, platform)
      );
    }
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  try {
    await markOnboardingStep(env, auth.brand_id, "platforms");
  } catch (e) {
    console.warn("[PLATFORMS] progress update failed:", e.message);
  }

  return json({ success: true, platforms: selected });
}

/*
  POST /api/customer/onboarding/platforms/:platform/connect
  OAuth completion hook (future-safe)
*/
export async function connectPlatform(request, env, auth, platform) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return json({ error: "Unsupported platform" }, 400);
  }

  const db = getDB(env);

  // Enforcement Check
  await checkAndIncrement(db, auth.user_id, "accounts");

  await db
    .prepare(
      `UPDATE brand_platforms
       SET status = 'connected',
           connected_at = datetime('now')
       WHERE brand_id = ? AND platform = ?`
    )
    .bind(auth.brand_id, platform)
    .run();

  return json({ success: true, platform });
}

/*
  POST /api/customer/onboarding/platforms/:platform/disconnect
*/
export async function disconnectPlatform(request, env, auth, platform) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return json({ error: "Unsupported platform" }, 400);
  }

  const db = getDB(env);

  await db
    .prepare(
      `UPDATE brand_platforms
       SET status = 'selected',
           connected_at = NULL
       WHERE brand_id = ? AND platform = ?`
    )
    .bind(auth.brand_id, platform)
    .run();

  return json({ success: true, platform });
}
