// packages/api/src/core/onboarding/ingest.js
// myPilotPost — Onboarding Ingestion Engine v1 (AUTHORITATIVE)

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { nanoid } from "nanoid";
import { markOnboardingStep } from "./progress.js";

/*
  POST /api/customer/onboarding/ingest/website
  Seeds brand intelligence from website
*/
export async function ingestWebsite(request, env, auth) {
  const db = getDB(env);
  const { url, snapshot } = await request.json();

  if (!url) {
    return json({ error: "Missing website url" }, 400);
  }

  await db
    .prepare(`
      INSERT INTO seo_snapshots (
        id,
        brand_id,
        url,
        snapshot,
        created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `)
    .bind(
      nanoid(),
      auth.brand_id,
      url,
      snapshot ? JSON.stringify(snapshot) : null
    )
    .run();

  await db
    .prepare(`
      INSERT INTO brand_memory_events (
        id,
        brand_id,
        type,
        source,
        confidence,
        metadata,
        created_at
      ) VALUES (?, ?, 'brand.ingested.website', 'onboarding', 0.9, ?, datetime('now'))
    `)
    .bind(
      nanoid(),
      auth.brand_id,
      JSON.stringify({ url })
    )
    .run();

  // Website usually informs goals + audience
  await markOnboardingStep(env, auth.brand_id, "audience");
  await markOnboardingStep(env, auth.brand_id, "goals");

  return json({ success: true });
}

/*
  POST /api/customer/onboarding/ingest/social
  Seeds brand intelligence from social profiles
*/
export async function ingestSocial(request, env, auth) {
  const db = getDB(env);
  const { platform, profile_url, snapshot } = await request.json();

  if (!platform || !profile_url) {
    return json({ error: "Missing social ingestion data" }, 400);
  }

  await db
    .prepare(`
      INSERT INTO brand_memory_events (
        id,
        brand_id,
        type,
        source,
        confidence,
        metadata,
        created_at
      ) VALUES (?, ?, 'brand.ingested.social', ?, 0.8, ?, datetime('now'))
    `)
    .bind(
      nanoid(),
      auth.brand_id,
      platform,
      JSON.stringify({ profile_url, snapshot })
    )
    .run();

  return json({ success: true });
}
