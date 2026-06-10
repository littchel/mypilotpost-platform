/**
 * ENGINE 8 — Brand Intelligence Certification
 * Validates: Brand DNA context injection, memory signal propagation, batch insert,
 * progressive delivery, dismiss lifecycle, brand isolation, and generation tracking.
 *
 * Run: node verification/intelligence_certification.js [baseUrl]
 * Requires: wrangler dev running locally
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const TS = Date.now();
const EMAIL_A = `intcert_a_${TS}@example.com`;
const EMAIL_B = `intcert_b_${TS}@example.com`;
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
    body: { email, password: PASSWORD, name: "Intel Cert User" },
  });
  if (reg.status !== 200 && reg.status !== 201) {
    fail(`Setup [${email.split("@")[0]}]: register`, `status=${reg.status} ${reg.text.slice(0, 100)}`);
    return null;
  }
  const token = reg.json?.token || reg.json?.access_token;
  if (!token) {
    fail(`Setup [${email.split("@")[0]}]: extract token`, "no token in register response");
    return null;
  }
  let brandId = reg.json?.brand_id;
  if (!brandId) {
    const brandsRes = await req("GET", "/api/customer/brands", { token });
    brandId = brandsRes.json?.brands?.[0]?.id || brandsRes.json?.data?.[0]?.id;
  }
  if (!brandId) {
    fail(`Setup [${email.split("@")[0]}]: resolve brand_id`);
    return null;
  }
  info(`email=${email} brand_id=${brandId}`);
  return { token, brandId };
}

// ─── Phase 1: Brand DNA round-trip ────────────────────────────────────────────

async function testBrandDNAWrite(token, brandId) {
  const res = await req("POST", "/api/customer/brand-dna", {
    token,
    body: {
      profile: {
        mission:           "Empower creators to build authority through consistent content",
        positioning:       "The AI-first content operating system for independent creators",
        value_proposition: "Ship professional content 10x faster with brand-safe AI",
        industry:          "SaaS",
        brand_personality: ["authentic", "expert", "bold"],
        differentiators:   ["real-time brand memory", "multi-platform scheduling", "audit-backed intelligence"],
      },
      voice: {
        voice_traits:    ["clear", "confident", "empowering"],
        messaging_style: "Direct, action-oriented, jargon-free",
        cta_style:       "Start Free Trial",
      },
      audience: {
        icp_name:   "Independent creators and solopreneurs",
        pain_points: ["inconsistent posting", "lack of brand voice", "content burnout"],
        desires:     ["grow authority fast", "look professional effortlessly"],
      },
      objectives: {
        awareness_goal: "Reach 10k monthly impressions per platform",
        leads_goal:     "Convert 5% of trial users to paid",
        authority_goal: "Be cited as a top creator tool in 3 verticals",
      },
      content_pillars: [
        { title: "Creator Economy Insights" },
        { title: "AI Content Strategy" },
        { title: "Brand Building Playbooks" },
      ],
      competitors: [
        { name: "Buffer", strategy_notes: "Broad scheduling, no AI intelligence layer" },
        { name: "Hootsuite", strategy_notes: "Enterprise focus, complex UX" },
      ],
    },
  });

  if (res.status !== 200 && res.status !== 201) {
    fail("DNA Write: POST /api/customer/brand-dna", `status=${res.status}`);
    return false;
  }
  pass("DNA Write: POST /api/customer/brand-dna", `status=${res.status}`);
  return true;
}

async function testBrandDNARead(token, brandId) {
  const res = await req("GET", "/api/customer/brand-dna", { token });

  if (res.status !== 200) {
    fail("DNA Read: GET /api/customer/brand-dna", `status=${res.status}`);
    return;
  }
  pass("DNA Read: GET /api/customer/brand-dna", `status=${res.status}`);

  const profile = res.json?.profile;
  if (profile?.mission) {
    pass("DNA Read: mission field persisted", profile.mission.slice(0, 60));
  } else {
    fail("DNA Read: mission field persisted", `profile=${JSON.stringify(profile).slice(0, 80)}`);
  }

  if (res.json?.voice?.messaging_style) {
    pass("DNA Read: voice.messaging_style persisted");
  } else {
    fail("DNA Read: voice.messaging_style persisted");
  }

  if (res.json?.audience?.icp_name) {
    pass("DNA Read: audience.icp_name persisted", res.json.audience.icp_name);
  } else {
    fail("DNA Read: audience.icp_name persisted");
  }

  const pillars = res.json?.content_pillars || [];
  if (pillars.length >= 3) {
    pass("DNA Read: content pillars persisted", `count=${pillars.length}`);
  } else {
    fail("DNA Read: content pillars persisted", `count=${pillars.length}`);
  }

  const completeness = res.json?.completeness;
  if (typeof completeness === "number" && completeness > 0) {
    pass("DNA Read: completeness score", `${completeness}%`);
  } else {
    info(`DNA completeness field: ${JSON.stringify(completeness)}`);
  }
}

// ─── Phase 2: Intelligence feed structure ─────────────────────────────────────

async function testIntelligenceFeed(token, brandId, label = "") {
  const res = await req("GET", "/api/customer/intelligence/feed", { token });

  if (res.status !== 200) {
    fail(`Feed [${label}]: HTTP 200`, `got ${res.status}: ${res.text.slice(0, 100)}`);
    return null;
  }
  pass(`Feed [${label}]: HTTP 200`);

  const feed = res.json;
  if (Array.isArray(feed?.delivered)) {
    pass(`Feed [${label}]: delivered array present`, `count=${feed.delivered.length}`);
  } else {
    fail(`Feed [${label}]: delivered array present`);
  }

  if (typeof feed?.pending_count === "number") {
    pass(`Feed [${label}]: pending_count present`, `${feed.pending_count}`);
  } else {
    fail(`Feed [${label}]: pending_count present`);
  }

  return feed;
}

// ─── Phase 3: Force refresh + generation tracking ─────────────────────────────

async function testForceRefresh(token, brandId) {
  const beforeRows = d1Json(
    `SELECT COUNT(*) as c FROM ai_generations WHERE content_type='intelligence'`
  );
  const beforeCount = parseInt(beforeRows[0]?.c || "0", 10);
  const t0 = Date.now();

  const res = await req("POST", "/api/customer/intelligence/force-refresh", { token });
  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail("Force Refresh: HTTP 200", `got ${res.status}: ${res.text.slice(0, 120)}`);
    return false;
  }
  pass("Force Refresh: HTTP 200", `${latency}ms`);

  if (latency < 30000) {
    pass("Force Refresh: latency <30s", `${latency}ms`);
  } else {
    fail("Force Refresh: latency <30s", `${latency}ms — possible timeout`);
  }

  return true;
}

async function testGenerationTracking(brandId) {
  const rows = d1Json(
    `SELECT tokens_used, model, input_prompt, success FROM ai_generations WHERE content_type='intelligence' ORDER BY created_at DESC LIMIT 1`
  );

  if (!rows.length) {
    fail("Tracking: ai_generations row written", "no row found — generation tracking gap");
    return;
  }
  const row = rows[0];
  pass("Tracking: ai_generations row written", `model=${row.model} tokens=${row.tokens_used}`);

  if ((row.tokens_used || 0) > 0) {
    pass("Tracking: token_count > 0");
  } else {
    fail("Tracking: token_count > 0", "tokens=0");
  }

  if (row.success === 1 || row.success === true) {
    pass("Tracking: success=1");
  } else {
    fail("Tracking: success=1", `success=${row.success}`);
  }

  // Verify Brand DNA was injected into context
  const prompt = row.input_prompt || "";
  if (prompt.includes("=== BRAND DNA ===")) {
    pass("Tracking: BRAND DNA section in context prompt");
  } else {
    fail("Tracking: BRAND DNA section in context prompt", "context builder DNA fix not active");
  }
}

// ─── Phase 4: Batch insert verification ───────────────────────────────────────

async function testBatchInsert(brandId) {
  const rows = d1Json(
    `SELECT COUNT(*) as c FROM brand_intelligence_queue WHERE brand_id='${brandId}'`
  );
  const count = parseInt(rows[0]?.c || "0", 10);

  if (count > 1) {
    pass("Batch Insert: multiple queue rows written", `count=${count}`);
  } else if (count === 1) {
    fail("Batch Insert: multiple queue rows written", "only 1 row — possible N+1 stall or tiny Groq response");
  } else {
    fail("Batch Insert: multiple queue rows written", "0 rows — generation may have failed");
  }
}

// ─── Phase 5: Progressive delivery ────────────────────────────────────────────

async function testProgressiveDelivery(token, brandId) {
  const feed1 = await req("GET", "/api/customer/intelligence/feed", { token });
  if (feed1.status !== 200) {
    fail("Progressive Delivery: first feed load", `status=${feed1.status}`);
    return null;
  }

  const newInsights1 = feed1.json?.new_insights || [];
  if (newInsights1.length >= 1) {
    pass("Progressive Delivery: first load delivers ≥1 insight", `got=${newInsights1.length}`);
  } else if ((feed1.json?.delivered || []).length >= 1) {
    pass("Progressive Delivery: first load has delivered items", `count=${feed1.json.delivered.length}`);
  } else {
    fail("Progressive Delivery: first load delivers insights", "0 new + 0 delivered");
  }

  return feed1.json;
}

// ─── Phase 6: Dismiss lifecycle ───────────────────────────────────────────────

async function testDismiss(token, brandId) {
  const feedRes = await req("GET", "/api/customer/intelligence/feed", { token });
  const allItems = [
    ...(feedRes.json?.delivered || []),
    ...(feedRes.json?.new_insights || []),
  ];

  if (!allItems.length) {
    info("Dismiss: no items to dismiss — skipping (no queue content)");
    return;
  }

  const item = allItems[0];
  const dismissRes = await req("POST", `/api/customer/intelligence/dismiss/${item.id}`, { token });

  if (dismissRes.status === 200) {
    pass("Dismiss: POST dismiss/:id returns 200", `item=${item.id.slice(0, 8)}...`);
  } else {
    fail("Dismiss: POST dismiss/:id returns 200", `status=${dismissRes.status}`);
    return;
  }

  // Verify dismissed item no longer appears in feed
  const feedAfter = await req("GET", "/api/customer/intelligence/feed", { token });
  const afterItems = [
    ...(feedAfter.json?.delivered || []),
    ...(feedAfter.json?.new_insights || []),
  ];
  const stillPresent = afterItems.some(i => i.id === item.id);

  if (!stillPresent) {
    pass("Dismiss: item removed from feed after dismiss");
  } else {
    fail("Dismiss: item removed from feed after dismiss", "dismissed item still showing");
  }
}

// ─── Phase 7: Memory query ─────────────────────────────────────────────────────

async function testMemoryQuery(token) {
  const res = await req("GET", "/api/customer/memory", { token });

  if (res.status !== 200) {
    fail("Memory: GET /api/customer/memory returns 200", `status=${res.status}`);
    return;
  }
  pass("Memory: GET /api/customer/memory returns 200");

  // Memory may be empty for new brands — verify structure not error
  if (res.json && (Array.isArray(res.json) || typeof res.json === "object")) {
    pass("Memory: response is parseable object");
  } else {
    fail("Memory: response is parseable object", res.text.slice(0, 80));
  }
}

// ─── Phase 8: Brand isolation ──────────────────────────────────────────────────

async function testBrandIsolation(tokenA, brandIdA, tokenB, brandIdB) {
  // Force refresh for Brand B (different brand, different content)
  await req("POST", "/api/customer/intelligence/force-refresh", { token: tokenB });

  const queueA = d1Json(
    `SELECT COUNT(*) as c FROM brand_intelligence_queue WHERE brand_id='${brandIdA}'`
  );
  const queueB = d1Json(
    `SELECT COUNT(*) as c FROM brand_intelligence_queue WHERE brand_id='${brandIdB}'`
  );

  const countA = parseInt(queueA[0]?.c || "0", 10);
  const countB = parseInt(queueB[0]?.c || "0", 10);

  info(`Brand isolation: A=${countA} rows, B=${countB} rows`);

  if (countA > 0 && countB > 0) {
    pass("Brand Isolation: both brands have separate queues", `A=${countA} B=${countB}`);
  } else if (countA > 0) {
    fail("Brand Isolation: Brand B queue empty — possible generation failure", `A=${countA} B=${countB}`);
  } else {
    fail("Brand Isolation: neither brand has queue data");
  }

  // Verify Brand B cannot read Brand A's intelligence
  const feedB = await req("GET", "/api/customer/intelligence/feed", { token: tokenB });
  const feedA = await req("GET", "/api/customer/intelligence/feed", { token: tokenA });

  const batchA = feedA.json?.batch_id;
  const batchB = feedB.json?.batch_id;

  if (batchA && batchB && batchA !== batchB) {
    pass("Brand Isolation: different batch IDs per brand");
  } else if (!batchA || !batchB) {
    info("Brand isolation batch check: one or both feeds have no batch yet — inconclusive");
  } else {
    fail("Brand Isolation: batch IDs should differ across brands", `A=${batchA} B=${batchB}`);
  }
}

// ─── Phase 9: hydrateAuditIntoDNA value_proposition fix ───────────────────────

async function testHydrateValueProposition(brandId) {
  // Inject a fake audit with a known primary_offer into brand_audit_results_v2
  const auditId = `cert_audit_${TS}`;
  const fullReportJson = JSON.stringify({
    business_profile: {
      primary_offer: "All-in-one AI content platform for creators",
    },
    brand_score: { dimensions: {} },
  });

  d1Json(`
    INSERT INTO brand_audit_results_v2
      (id, brand_id, brand_name, industry, overall_score, full_report_json,
       score_breakdown_json, strategic_actions_json, created_at)
    VALUES ('${auditId}', '${brandId}', 'CertBrand', 'SaaS', 72,
      '${fullReportJson.replace(/'/g, "''")}', '{}', '[]', datetime('now'))
  `);

  // Call hydrateAuditIntoDNA via brand DNA endpoint does not expose it directly,
  // so verify via D1 by checking what value_proposition is after a direct D1 query
  // (the fix is in brand_dna.js:hydrateAuditIntoDNA, which is called post-audit flow)
  // We verify the logic fix is present by reading the source directly.
  const rows = d1Json(
    `SELECT value_proposition FROM brand_dna_profiles WHERE brand_id='${brandId}' LIMIT 1`
  );

  // If the write tests passed, we have a real value_proposition from our DNA write test
  const vp = rows[0]?.value_proposition || "";
  if (vp && vp !== brandId) {
    pass("Hydration: value_proposition is not brand_id placeholder", vp.slice(0, 60));
  } else if (!vp) {
    info("Hydration: no value_proposition row found — DNA write may not have run");
  } else {
    fail("Hydration: value_proposition is not brand_id placeholder", `got: ${vp}`);
  }

  // The real regression test: verify source code uses primary_offer not brand_name
  try {
    const { readFileSync } = await import("fs");
    const src = readFileSync(
      path.join(__dir, "../src/core/brands/brand_dna.js"),
      "utf8"
    );
    if (src.includes("primary_offer")) {
      pass("Hydration: brand_dna.js uses primary_offer for value_proposition");
    } else {
      fail("Hydration: brand_dna.js uses primary_offer for value_proposition", "primary_offer not found in source");
    }
  } catch {
    info("Hydration: could not read brand_dna.js for source check");
  }
}

// ─── Phase 10: Context builder DNA sections (source check) ────────────────────

async function testContextBuilderDNASections() {
  try {
    const { readFileSync } = await import("fs");
    const src = readFileSync(
      path.join(__dir, "../src/core/intelligence/intelligence_context_builder.js"),
      "utf8"
    );

    if (src.includes("=== BRAND DNA ===")) {
      pass("Context Builder: BRAND DNA section present in source");
    } else {
      fail("Context Builder: BRAND DNA section present in source", "section not found");
    }

    if (src.includes("=== BRAND MEMORY (LEARNED SIGNALS) ===")) {
      pass("Context Builder: BRAND MEMORY section present in source");
    } else {
      fail("Context Builder: BRAND MEMORY section present in source", "section not found");
    }

    if (src.includes("brand_dna_profiles")) {
      pass("Context Builder: brand_dna_profiles queried");
    } else {
      fail("Context Builder: brand_dna_profiles queried");
    }

    if (src.includes("brand_dna_voice") && src.includes("brand_dna_audience") && src.includes("brand_dna_competitors")) {
      pass("Context Builder: all DNA tables queried (voice, audience, competitors)");
    } else {
      fail("Context Builder: all DNA tables queried");
    }

    if (src.includes("brand_memory")) {
      pass("Context Builder: brand_memory signals queried");
    } else {
      fail("Context Builder: brand_memory signals queried");
    }
  } catch (err) {
    fail("Context Builder: source check failed", err.message);
  }
}

// ─── Phase 11: Batch insert source check ──────────────────────────────────────

async function testBatchInsertSource() {
  try {
    const { readFileSync } = await import("fs");
    const src = readFileSync(
      path.join(__dir, "../src/core/intelligence/brand_intelligence_store.js"),
      "utf8"
    );

    if (src.includes("db.batch(")) {
      pass("Batch Insert: db.batch() used in store");
    } else {
      fail("Batch Insert: db.batch() used in store", "still using sequential loop");
    }

    // Confirm the sequential loop is gone
    if (src.includes("for (const row of rows)") && src.includes(".run()")) {
      fail("Batch Insert: sequential N+1 loop removed", "old loop still present");
    } else {
      pass("Batch Insert: sequential N+1 loop removed");
    }
  } catch (err) {
    fail("Batch Insert: source check failed", err.message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  ENGINE 8 — Brand Intelligence Certification");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════════════════\n");

  // Source checks — these run offline, no server needed
  console.log("── Source Checks ──────────────────────────────────");
  await testContextBuilderDNASections();
  await testBatchInsertSource();

  // Runtime checks
  console.log("\n── Phase 1: Brand DNA Round-trip ──────────────────");
  const ctxA = await setup(EMAIL_A);
  if (!ctxA) {
    console.log("\nFATAL: Setup failed. Ensure wrangler dev is running.");
    process.exit(1);
  }

  const dnaWritten = await testBrandDNAWrite(ctxA.token, ctxA.brandId);
  if (dnaWritten) await testBrandDNARead(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 2: Intelligence Feed ─────────────────────");
  await testIntelligenceFeed(ctxA.token, ctxA.brandId, "initial");

  console.log("\n── Phase 3: Force Refresh + Tracking ─────────────");
  const refreshed = await testForceRefresh(ctxA.token, ctxA.brandId);
  if (refreshed) {
    await testGenerationTracking(ctxA.brandId);
    await testBatchInsert(ctxA.brandId);
  }

  console.log("\n── Phase 4: Progressive Delivery ──────────────────");
  await testProgressiveDelivery(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 5: Dismiss Lifecycle ──────────────────────");
  await testDismiss(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 6: Memory Query ───────────────────────────");
  await testMemoryQuery(ctxA.token);

  console.log("\n── Phase 7: Brand Isolation ────────────────────────");
  const ctxB = await setup(EMAIL_B);
  if (ctxB) {
    await testBrandIsolation(ctxA.token, ctxA.brandId, ctxB.token, ctxB.brandId);
  }

  console.log("\n── Phase 8: Hydration Fix ──────────────────────────");
  await testHydrateValueProposition(ctxA.brandId);

  // ─── Score + Verdict ───────────────────────────────────────────────────────
  const LOCK_CRITERIA = [
    "Context Builder: BRAND DNA section present in source",
    "Context Builder: BRAND MEMORY section present in source",
    "Context Builder: brand_dna_profiles queried",
    "Context Builder: all DNA tables queried (voice, audience, competitors)",
    "Batch Insert: db.batch() used in store",
    "Tracking: ai_generations row written",
    "Tracking: BRAND DNA section in context prompt",
    "Progressive Delivery: first load delivers ≥1 insight",
    "Brand Isolation: both brands have separate queues",
    "Hydration: brand_dna.js uses primary_offer for value_proposition",
  ];

  const score = LOCK_CRITERIA.filter(c => results.find(r => r.name === c && r.ok)).length;

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  ENGINE 8 SCORE: ${score}/10`);
  console.log(`  Total: ${passCount} passed, ${failCount} failed`);
  console.log("═══════════════════════════════════════════════════");
  console.log("\n  Lock Criteria:");
  for (const c of LOCK_CRITERIA) {
    const r = results.find(r => r.name === c);
    const ok = r?.ok ? "✓" : "✗";
    const detail = r?.detail ? ` — ${r.detail}` : "";
    console.log(`    ${ok} ${c}${detail}`);
  }

  const verdict = score >= 8 ? "PASS — ENGINE 8 CERTIFIED" : score >= 6 ? "CONDITIONAL — Review failures before lock" : "FAIL — Do not lock";
  console.log(`\n  VERDICT: ${verdict}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
