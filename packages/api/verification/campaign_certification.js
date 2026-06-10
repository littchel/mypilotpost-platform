/**
 * ENGINE 9 — Campaign Engine Certification
 * Validates: campaign creation paths, persistence, orchestration, status lifecycle,
 * timeline completeness, performance scoring, memory logging, brand isolation.
 *
 * Run: node verification/campaign_certification.js [baseUrl]
 * Requires: wrangler dev running locally
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const TS = Date.now();
const EMAIL_A = `campaigncert_a_${TS}@example.com`;
const EMAIL_B = `campaigncert_b_${TS}@example.com`;
const PASSWORD = "CertTestPass99!";

const results = [];
let failCount = 0;
let passCount = 0;

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  passCount++;
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  failCount++;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function info(msg) {
  console.log(`      ${msg}`);
}

async function req(method, urlPath, { token, body, headers = {} } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${urlPath}`, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { status: res.status, json, text };
  } catch (err) {
    return { status: 0, json: null, text: err.message };
  }
}

function d1Json(sql) {
  try {
    const out = execSync(
      `npx wrangler d1 execute mypilotpost --local --json --command ${JSON.stringify(sql)}`,
      { cwd: path.join(__dir, ".."), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const parsed = JSON.parse(out);
    const block = Array.isArray(parsed) ? parsed[0] : parsed;
    return block?.results || [];
  } catch {
    return [];
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup(email) {
  const reg = await req("POST", "/api/customer/register", {
    body: { email, password: PASSWORD, name: "Campaign Cert User" },
  });
  if (reg.status !== 200 && reg.status !== 201) {
    fail(`Setup [${email.split("@")[0].slice(-10)}]: register`, `status=${reg.status} ${reg.text.slice(0, 100)}`);
    return null;
  }
  const token = reg.json?.token || reg.json?.access_token;
  if (!token) {
    fail(`Setup: extract token`);
    return null;
  }
  let brandId = reg.json?.brand_id;
  if (!brandId) {
    const b = await req("GET", "/api/customer/brands", { token });
    brandId = b.json?.brands?.[0]?.id || b.json?.data?.[0]?.id;
  }
  if (!brandId) { fail(`Setup: resolve brand_id`); return null; }
  info(`email=${email} brand_id=${brandId}`);
  return { token, brandId };
}

// ─── Phase 1: Manual Campaign Creation ───────────────────────────────────────

async function testManualCampaign(token, brandId) {
  const res = await req("POST", "/api/customer/campaigns/create", {
    token,
    body: {
      name: `CertCampaign_${TS}`,
      objective_type: "awareness",
      objective_text: "Drive brand awareness for our certification test",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
  });

  if (res.status !== 200 && res.status !== 201) {
    fail("Manual Campaign: POST /campaigns/create", `status=${res.status} ${res.text.slice(0, 100)}`);
    return null;
  }
  const campaignId = res.json?.id;
  if (!campaignId) {
    fail("Manual Campaign: returns id", `response=${JSON.stringify(res.json).slice(0, 80)}`);
    return null;
  }
  pass("Manual Campaign: POST /campaigns/create", `id=${campaignId.slice(0, 8)}...`);

  // Verify persisted in DB
  const rows = d1Json(`SELECT id, status, name FROM campaigns WHERE id='${campaignId}'`);
  if (rows.length && rows[0].status === "active") {
    pass("Manual Campaign: persisted in DB with status=active");
  } else {
    fail("Manual Campaign: persisted in DB", `rows=${JSON.stringify(rows)}`);
  }

  return campaignId;
}

// ─── Phase 2: AI Campaign (Template Engine) ───────────────────────────────────

async function testAICampaign(token, brandId) {
  const t0 = Date.now();
  const res = await req("POST", "/api/customer/templates/generate-campaign", {
    token,
    body: { goal: "Increase trial signups for our AI content platform" },
  });
  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail("AI Campaign: POST /templates/generate-campaign", `status=${res.status}`);
    return null;
  }
  pass("AI Campaign: HTTP 200", `${latency}ms`);

  const aiCampaignId = res.json?.id;
  if (!aiCampaignId) {
    fail("AI Campaign: id returned");
    return null;
  }
  pass("AI Campaign: id returned", aiCampaignId.slice(0, 8));

  if (res.json?.campaign_name || res.json?.campaign_objective) {
    pass("AI Campaign: plan fields present", `name="${(res.json.campaign_name || "").slice(0, 40)}"`);
  } else {
    fail("AI Campaign: plan fields present");
  }

  if (latency < 30000) {
    pass("AI Campaign: latency <30s", `${latency}ms`);
  } else {
    fail("AI Campaign: latency <30s", `${latency}ms`);
  }

  // Verify persisted
  const rows = d1Json(`SELECT id FROM campaigns WHERE id='${aiCampaignId}'`);
  if (rows.length) {
    pass("AI Campaign: persisted in DB");
  } else {
    fail("AI Campaign: persisted in DB", "no row found");
  }

  return aiCampaignId;
}

// ─── Phase 3: Studio Campaign Generation ─────────────────────────────────────

async function testStudioCampaign(token, brandId, campaignId) {
  const t0 = Date.now();
  const res = await req("POST", "/api/customer/studio/campaign", {
    token,
    body: {
      campaign_name: `Studio Cert Campaign ${TS}`,
      offer: "14-day free trial of AI content scheduling",
      goal: "conversions",
      channels: ["linkedin", "instagram"],
      campaign_id: campaignId,
    },
  });
  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail("Studio Campaign: POST /studio/campaign", `status=${res.status}`);
    return;
  }
  pass("Studio Campaign: HTTP 200", `${latency}ms`);

  const cards = res.json?.cards || [];
  if (cards.length >= 4) {
    pass("Studio Campaign: 4–6 cards returned", `count=${cards.length}`);
  } else if (cards.length > 0) {
    fail("Studio Campaign: 4–6 cards returned", `only ${cards.length} cards`);
  } else {
    fail("Studio Campaign: cards returned", "0 cards");
    return;
  }

  const card = cards[0];
  if (card.caption && !card.caption.includes("[PLACEHOLDER]")) {
    pass("Studio Campaign: no [PLACEHOLDER] in captions");
  } else {
    fail("Studio Campaign: no [PLACEHOLDER] in captions", `caption="${(card.caption || "").slice(0, 60)}"`);
  }

  if (card.campaign_id === campaignId) {
    pass("Studio Campaign: campaign_id threaded in cards");
  } else {
    fail("Studio Campaign: campaign_id threaded in cards", `got=${card.campaign_id}`);
  }

  if (res.json?.campaign_summary) {
    pass("Studio Campaign: campaign_summary present");
  } else {
    fail("Studio Campaign: campaign_summary present");
  }

  if (latency < 30000) {
    pass("Studio Campaign: latency <30s", `${latency}ms`);
  } else {
    fail("Studio Campaign: latency <30s", `${latency}ms`);
  }
}

// ─── Phase 4: Content Linking ─────────────────────────────────────────────────

async function testContentLink(token, brandId, campaignId) {
  // Inject a social_asset into the DB for linking
  const assetId = crypto.randomUUID();
  d1Json(`INSERT INTO social_assets (id, brand_id, title, text, status, created_at) VALUES ('${assetId}', '${brandId}', 'Cert Test Post', 'Test caption', 'draft', datetime('now'))`);
  d1Json(`INSERT INTO content_vault (id, brand_id, title, body, content_type, lifecycle_status, source, created_at, updated_at) VALUES ('${assetId}', '${brandId}', 'Cert Test Post', 'Test caption', 'social', 'draft', 'editor', datetime('now'), datetime('now'))`);

  // Link to campaign
  const linkRes = await req("POST", "/api/customer/campaigns/link", {
    token,
    body: { campaign_id: campaignId, content_id: assetId, content_type: "social" },
  });

  if (linkRes.status !== 200) {
    fail("Content Link: POST /campaigns/link", `status=${linkRes.status} ${linkRes.text.slice(0, 80)}`);
    return null;
  }
  pass("Content Link: POST /campaigns/link", `asset=${assetId.slice(0, 8)}...`);

  // Verify social_assets.campaign_id updated
  const rows = d1Json(`SELECT campaign_id FROM social_assets WHERE id='${assetId}'`);
  if (rows[0]?.campaign_id === campaignId) {
    pass("Content Link: social_assets.campaign_id updated");
  } else {
    fail("Content Link: social_assets.campaign_id updated", `got=${rows[0]?.campaign_id}`);
  }

  // Verify join table entry
  const linkRows = d1Json(`SELECT id FROM campaign_content_links WHERE campaign_id='${campaignId}' AND content_id='${assetId}'`);
  if (linkRows.length) {
    pass("Content Link: campaign_content_links entry created");
  } else {
    fail("Content Link: campaign_content_links entry created", "no join row found");
  }

  return assetId;
}

// ─── Phase 5: Campaign Details ────────────────────────────────────────────────

async function testCampaignDetails(token, brandId, campaignId) {
  const res = await req("GET", `/api/customer/campaigns/${campaignId}`, { token });

  if (res.status !== 200) {
    fail("Campaign Details: GET /campaigns/:id", `status=${res.status}`);
    return;
  }
  pass("Campaign Details: HTTP 200");

  if (res.json?.campaign?.id === campaignId) {
    pass("Campaign Details: campaign object present");
  } else {
    fail("Campaign Details: campaign object present", JSON.stringify(res.json?.campaign).slice(0, 60));
  }

  if (Array.isArray(res.json?.content?.social)) {
    pass("Campaign Details: content.social array", `count=${res.json.content.social.length}`);
  } else {
    fail("Campaign Details: content.social array");
  }

  if (Array.isArray(res.json?.content?.blog)) {
    pass("Campaign Details: content.blog array present");
  } else {
    fail("Campaign Details: content.blog array present");
  }
}

// ─── Phase 6: Campaign Timeline ──────────────────────────────────────────────

async function testCampaignTimeline(token, campaignId) {
  const res = await req("GET", `/api/customer/campaigns/${campaignId}/timeline`, { token });

  if (res.status !== 200) {
    fail("Timeline: GET /campaigns/:id/timeline", `status=${res.status}`);
    return;
  }
  pass("Timeline: HTTP 200");

  if (Array.isArray(res.json?.data)) {
    pass("Timeline: data array present", `count=${res.json.data.length}`);
  } else {
    fail("Timeline: data array present");
  }
}

// ─── Phase 7: Campaign Status Update (PATCH) ──────────────────────────────────

async function testCampaignStatusUpdate(token, brandId, campaignId) {
  // Pause
  const pauseRes = await req("PATCH", `/api/customer/campaigns/${campaignId}`, {
    token,
    body: { status: "paused" },
  });

  if (pauseRes.status !== 200) {
    fail("Status Update: PATCH /campaigns/:id (pause)", `status=${pauseRes.status} ${pauseRes.text.slice(0, 80)}`);
    return false;
  }
  pass("Status Update: pause → HTTP 200");

  const rows = d1Json(`SELECT status FROM campaigns WHERE id='${campaignId}'`);
  if (rows[0]?.status === "paused") {
    pass("Status Update: status=paused persisted in DB");
  } else {
    fail("Status Update: status=paused persisted", `got=${rows[0]?.status}`);
  }

  // Resume (active)
  const resumeRes = await req("PATCH", `/api/customer/campaigns/${campaignId}`, {
    token,
    body: { status: "active" },
  });
  if (resumeRes.status === 200) {
    pass("Status Update: resume active → HTTP 200");
  } else {
    fail("Status Update: resume active", `status=${resumeRes.status}`);
  }

  // Archive
  const archiveRes = await req("PATCH", `/api/customer/campaigns/${campaignId}`, {
    token,
    body: { status: "archived" },
  });
  if (archiveRes.status === 200) {
    pass("Status Update: archive → HTTP 200");
  } else {
    fail("Status Update: archive", `status=${archiveRes.status}`);
  }

  // Invalid status rejected
  const badRes = await req("PATCH", `/api/customer/campaigns/${campaignId}`, {
    token,
    body: { status: "deleted" },
  });
  if (badRes.status === 400) {
    pass("Status Update: invalid status rejected with 400");
  } else {
    fail("Status Update: invalid status rejected", `got=${badRes.status}`);
  }

  return true;
}

// ─── Phase 8: Performance Cache + Score ──────────────────────────────────────

async function testPerformanceCache(brandId, campaignId) {
  // Trigger cache via content link (already done in phase 4)
  // Just verify the cache row was written
  const rows = d1Json(`SELECT score, metrics_json FROM campaign_metrics_cache WHERE campaign_id='${campaignId}'`);

  if (rows.length) {
    pass("Performance Cache: row exists after content link", `score=${rows[0].score}`);
  } else {
    fail("Performance Cache: row exists after content link", "no cache row — refreshPerformanceCache not called");
    return;
  }

  // Score should be ≥ 0 (not necessarily > 0 with no published content yet)
  if (typeof rows[0].score === "number" || rows[0].score !== null) {
    pass("Performance Cache: score is a number", `score=${rows[0].score}`);
  } else {
    fail("Performance Cache: score is a number", `score=${rows[0].score}`);
  }
}

// ─── Phase 9: Memory Events ───────────────────────────────────────────────────

async function testMemoryEvents(brandId, campaignId) {
  // campaign_link event should have been written to memory_events when we linked content
  const rows = d1Json(
    `SELECT tool, event, metadata FROM memory_events WHERE brand_id='${brandId}' AND tool='campaigns' ORDER BY created_at DESC LIMIT 5`
  );

  if (rows.length) {
    pass("Memory Events: canonical memory_events table used", `count=${rows.length} event=${rows[0].event}`);
  } else {
    fail("Memory Events: canonical memory_events table used", "no rows in memory_events for campaigns tool — still using brand_memory_events?");
  }

  // Verify no bleed into old legacy table for this campaign
  const legacyRows = d1Json(
    `SELECT COUNT(*) as c FROM brand_memory_events WHERE brand_id='${brandId}' AND source_engine='campaign'`
  );
  const legacyCount = parseInt(legacyRows[0]?.c || "0", 10);
  if (legacyCount === 0) {
    pass("Memory Events: no writes to legacy brand_memory_events");
  } else {
    fail("Memory Events: no writes to legacy brand_memory_events", `${legacyCount} rows still written to old table`);
  }
}

// ─── Phase 10: Campaign List ──────────────────────────────────────────────────

async function testCampaignList(token) {
  const res = await req("GET", "/api/customer/campaigns", { token });

  if (res.status !== 200) {
    fail("Campaign List: GET /campaigns", `status=${res.status}`);
    return;
  }
  pass("Campaign List: HTTP 200");

  const items = res.json?.data || [];
  if (Array.isArray(items)) {
    pass("Campaign List: data array present", `count=${items.length}`);
  } else {
    fail("Campaign List: data array present");
    return;
  }

  // Verify content_count column is present
  if (items.length > 0 && "content_count" in items[0]) {
    pass("Campaign List: content_count column present");
  } else if (items.length > 0) {
    fail("Campaign List: content_count column present", `keys=${Object.keys(items[0]).join(",")}`);
  }
}

// ─── Phase 11: Brand Isolation ────────────────────────────────────────────────

async function testBrandIsolation(tokenA, brandIdA, tokenB, brandIdB) {
  // Create campaign for brand B
  const resB = await req("POST", "/api/customer/campaigns/create", {
    token: tokenB,
    body: { name: `BrandBCampaign_${TS}`, objective_type: "leads" },
  });

  if (resB.status !== 200 && resB.status !== 201) {
    fail("Brand Isolation: setup brand B campaign", `status=${resB.status}`);
    return;
  }

  const campaignIdB = resB.json?.id;

  // Brand A should not see Brand B's campaigns
  const listA = await req("GET", "/api/customer/campaigns", { token: tokenA });
  const idsA = (listA.json?.data || []).map(c => c.id);
  if (!idsA.includes(campaignIdB)) {
    pass("Brand Isolation: Brand A cannot see Brand B's campaigns");
  } else {
    fail("Brand Isolation: Brand A cannot see Brand B's campaigns", "Brand B campaign visible in Brand A list");
  }

  // Brand A should not be able to PATCH Brand B's campaign
  const patchRes = await req("PATCH", `/api/customer/campaigns/${campaignIdB}`, {
    token: tokenA,
    body: { status: "archived" },
  });
  if (patchRes.status === 404 || patchRes.status === 403 || patchRes.status === 401) {
    pass("Brand Isolation: cannot PATCH another brand's campaign", `status=${patchRes.status}`);
  } else {
    fail("Brand Isolation: cannot PATCH another brand's campaign", `status=${patchRes.status} — cross-brand write allowed`);
  }

  // Brand A cannot read Brand B's campaign details
  const detailRes = await req("GET", `/api/customer/campaigns/${campaignIdB}`, { token: tokenA });
  if (detailRes.status === 404 || detailRes.status === 403) {
    pass("Brand Isolation: cannot GET another brand's campaign details", `status=${detailRes.status}`);
  } else {
    fail("Brand Isolation: cannot GET another brand's campaign details", `status=${detailRes.status}`);
  }
}

// ─── Phase 12: Source Checks ──────────────────────────────────────────────────

async function testSourceChecks() {
  const { readFileSync } = await import("fs");
  const src = readFileSync(
    path.join(__dir, "../src/core/campaigns/campaigns.js"),
    "utf8"
  );

  if (src.includes("LIMIT 200")) {
    pass("Source: getCampaigns has LIMIT 200");
  } else {
    fail("Source: getCampaigns has LIMIT 200", "unbounded query still present");
  }

  if (src.includes("UNION ALL")) {
    pass("Source: getTimeline uses UNION ALL for blog + social");
  } else {
    fail("Source: getTimeline uses UNION ALL for blog + social", "blog delivery jobs excluded");
  }

  if (src.includes("memory_events") && !src.includes("INSERT INTO brand_memory_events")) {
    pass("Source: writeBrandMemoryEvent uses canonical memory_events table");
  } else if (src.includes("INSERT INTO brand_memory_events")) {
    fail("Source: writeBrandMemoryEvent still writing to legacy brand_memory_events");
  } else {
    fail("Source: memory_events reference not found");
  }

  if (src.includes("calculateCampaignScore(db, campaignId, metrics)")) {
    pass("Source: calculateCampaignScore receives live metrics (no chicken-and-egg)");
  } else {
    fail("Source: calculateCampaignScore receives live metrics", "still calls calculateCampaignScore without metrics param");
  }

  if (src.includes("export async function updateCampaignStatus")) {
    pass("Source: updateCampaignStatus exported");
  } else {
    fail("Source: updateCampaignStatus exported", "status update handler missing");
  }

  // Verify server.js wires PATCH route
  const serverSrc = readFileSync(
    path.join(__dir, "../src/server.js"),
    "utf8"
  );
  if (serverSrc.includes('updateCampaignStatus') && serverSrc.includes('"PATCH"')) {
    pass("Source: server.js wires PATCH /campaigns/:id");
  } else {
    fail("Source: server.js wires PATCH /campaigns/:id");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  ENGINE 9 — Campaign Engine Certification");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log("── Source Checks ──────────────────────────────────");
  await testSourceChecks();

  console.log("\n── Phase 1: Manual Campaign ───────────────────────");
  const ctxA = await setup(EMAIL_A);
  if (!ctxA) {
    console.log("\nFATAL: Setup failed. Is wrangler dev running?");
    process.exit(1);
  }

  const campaignId = await testManualCampaign(ctxA.token, ctxA.brandId);
  if (!campaignId) {
    console.log("FATAL: Manual campaign creation failed. Aborting remaining runtime tests.");
    process.exit(1);
  }

  console.log("\n── Phase 2: AI Campaign (Template) ────────────────");
  await testAICampaign(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 3: Studio Campaign Content ───────────────");
  await testStudioCampaign(ctxA.token, ctxA.brandId, campaignId);

  console.log("\n── Phase 4: Content Linking ────────────────────────");
  const assetId = await testContentLink(ctxA.token, ctxA.brandId, campaignId);

  console.log("\n── Phase 5: Campaign Details ───────────────────────");
  await testCampaignDetails(ctxA.token, ctxA.brandId, campaignId);

  console.log("\n── Phase 6: Campaign Timeline ──────────────────────");
  await testCampaignTimeline(ctxA.token, campaignId);

  console.log("\n── Phase 7: Status Lifecycle (PATCH) ──────────────");
  await testCampaignStatusUpdate(ctxA.token, ctxA.brandId, campaignId);

  console.log("\n── Phase 8: Performance Cache ──────────────────────");
  await testPerformanceCache(ctxA.brandId, campaignId);

  console.log("\n── Phase 9: Memory Events ──────────────────────────");
  await testMemoryEvents(ctxA.brandId, campaignId);

  console.log("\n── Phase 10: Campaign List ─────────────────────────");
  await testCampaignList(ctxA.token);

  console.log("\n── Phase 11: Brand Isolation ───────────────────────");
  const ctxB = await setup(EMAIL_B);
  if (ctxB) await testBrandIsolation(ctxA.token, ctxA.brandId, ctxB.token, ctxB.brandId);

  // ─── Score + Verdict ───────────────────────────────────────────────────────
  const LOCK_CRITERIA = [
    "Source: getCampaigns has LIMIT 200",
    "Source: getTimeline uses UNION ALL for blog + social",
    "Source: writeBrandMemoryEvent uses canonical memory_events table",
    "Source: calculateCampaignScore receives live metrics (no chicken-and-egg)",
    "Source: updateCampaignStatus exported",
    "Manual Campaign: POST /campaigns/create",
    "Content Link: social_assets.campaign_id updated",
    "Status Update: PATCH /campaigns/:id (pause)",
    "Performance Cache: row exists after content link",
    "Brand Isolation: cannot GET another brand's campaign details",
  ];

  const score = LOCK_CRITERIA.filter(c => results.find(r => r.name === c && r.ok)).length;

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  ENGINE 9 SCORE: ${score}/10`);
  console.log(`  Total: ${passCount} passed, ${failCount} failed`);
  console.log("═══════════════════════════════════════════════════");
  console.log("\n  Lock Criteria:");
  for (const c of LOCK_CRITERIA) {
    const r = results.find(r => r.name === c);
    const ok = r?.ok ? "✓" : "✗";
    const detail = r?.detail ? ` — ${r.detail}` : "";
    console.log(`    ${ok} ${c}${detail}`);
  }

  const verdict =
    score >= 8 ? "PASS — ENGINE 9 CERTIFIED" :
    score >= 6 ? "CONDITIONAL — Review failures before lock" :
    "FAIL — Do not lock";
  console.log(`\n  VERDICT: ${verdict}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
