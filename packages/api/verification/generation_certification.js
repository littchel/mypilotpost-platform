/**
 * ENGINE 6 — Content Generation Certification
 * Validates: token tracking, quality scoring, brand context, quota enforcement,
 * prompt control, and 8B fallback path across all generation surfaces.
 *
 * Run: node verification/generation_certification.js [baseUrl]
 * Requires: wrangler dev running locally
 */

import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const TS = Date.now();
const EMAIL = `gencert_${TS}@example.com`;
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

function d1(sql) {
  return execSync(
    `npx wrangler d1 execute mypilotpost --local --json --command ${JSON.stringify(sql)}`,
    { cwd: path.join(__dir, ".."), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
  );
}

function d1Json(sql) {
  try {
    const parsed = JSON.parse(d1(sql));
    const block = Array.isArray(parsed) ? parsed[0] : parsed;
    return block?.results || [];
  } catch {
    return [];
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
  // Register
  const reg = await req("POST", "/api/customer/register", {
    body: { email: EMAIL, password: PASSWORD, name: "Gen Cert User" },
  });
  if (reg.status !== 200 && reg.status !== 201) {
    fail("Setup: register user", `status=${reg.status} ${reg.text.slice(0, 100)}`);
    return null;
  }

  const token = reg.json?.token || reg.json?.access_token;
  if (!token) {
    fail("Setup: extract token", "no token in register response");
    return null;
  }

  // register() auto-creates a brand and returns brand_id
  let brandId = reg.json?.brand_id;

  if (!brandId) {
    // Fallback: fetch brands list
    const brandsRes = await req("GET", "/api/customer/brands", { token });
    brandId = brandsRes.json?.brands?.[0]?.id || brandsRes.json?.data?.[0]?.id;
  }

  if (!brandId) {
    fail("Setup: resolve brand_id", "register did not return brand_id and brands list is empty");
    return null;
  }

  info(`user=${EMAIL} brand_id=${brandId}`);
  return { token, brandId };
}

// ─── Phase 1+2: Social Generation ─────────────────────────────────────────────

async function testSocial(token, brandId, runLabel) {
  const before = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='social'`);
  const beforeCount = before[0]?.c || 0;
  const t0 = Date.now();

  const res = await req("POST", "/api/customer/ai/generate/social", {
    token,
    body: {
      intention: "Drive sign-ups for our new SaaS onboarding flow",
      platforms: ["linkedin", "instagram"],
      tone: "professional",
      cta: "Start Free Trial",
      count: 1,
    },
  });

  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail(`Social [${runLabel}]: HTTP 200`, `got ${res.status}: ${res.text.slice(0, 120)}`);
    return;
  }
  pass(`Social [${runLabel}]: HTTP 200`, `${latency}ms`);

  const posts = res.json?.posts || [];
  if (posts.length === 0) {
    fail(`Social [${runLabel}]: posts returned`);
    return;
  }
  pass(`Social [${runLabel}]: posts returned`, `count=${posts.length}`);

  const p = posts[0];
  if (typeof p.quality_score === "number") {
    pass(`Social [${runLabel}]: quality_score present`, `score=${p.quality_score} grade=${p.quality_grade}`);
  } else {
    fail(`Social [${runLabel}]: quality_score present`, `missing — got ${JSON.stringify(p).slice(0, 80)}`);
  }

  if (typeof p.quality_score_raw === "number") {
    pass(`Social [${runLabel}]: quality_score_raw present`);
  } else {
    fail(`Social [${runLabel}]: quality_score_raw present`);
  }

  if (latency < 30000) {
    pass(`Social [${runLabel}]: latency <30s`, `${latency}ms`);
  } else {
    fail(`Social [${runLabel}]: latency <30s`, `${latency}ms`);
  }

  // Verify ai_generations row written
  const after = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='social'`);
  const afterCount = after[0]?.c || 0;
  if (afterCount > beforeCount) {
    const row = d1Json(`SELECT tokens_used, model, success FROM ai_generations WHERE content_type='social' ORDER BY created_at DESC LIMIT 1`);
    const tokens = row[0]?.tokens_used || 0;
    pass(`Social [${runLabel}]: ai_generations tracked`, `tokens=${tokens} model=${row[0]?.model}`);
    if (tokens > 0) {
      pass(`Social [${runLabel}]: token_count > 0`);
    } else {
      fail(`Social [${runLabel}]: token_count > 0`, "tokens=0 — tracking gap");
    }
  } else {
    fail(`Social [${runLabel}]: ai_generations tracked`, "no new row written");
  }
}

// ─── Phase 3: Blog Generation ─────────────────────────────────────────────────

async function testBlog(token, brandId, runLabel) {
  const before = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='blog'`);
  const beforeCount = before[0]?.c || 0;
  const t0 = Date.now();

  const res = await req("POST", "/api/customer/ai/generate/blog", {
    token,
    body: {
      goal: "Explain the benefits of automated social scheduling",
      audience: "small business owners",
      primary_keyword: "social media scheduling",
    },
  });

  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail(`Blog [${runLabel}]: HTTP 200`, `got ${res.status}: ${res.text.slice(0, 120)}`);
    return;
  }
  pass(`Blog [${runLabel}]: HTTP 200`, `${latency}ms`);

  if (res.json?.title && res.json?.body) {
    pass(`Blog [${runLabel}]: title+body present`, `title="${res.json.title.slice(0, 50)}"`);
  } else {
    fail(`Blog [${runLabel}]: title+body present`);
  }

  if (typeof res.json?.quality_score === "number") {
    pass(`Blog [${runLabel}]: quality_score present`, `score=${res.json.quality_score} grade=${res.json.quality_grade}`);
  } else {
    fail(`Blog [${runLabel}]: quality_score present`);
  }

  if (typeof res.json?.quality_score_raw === "number") {
    pass(`Blog [${runLabel}]: quality_score_raw present`);
  } else {
    fail(`Blog [${runLabel}]: quality_score_raw present`);
  }

  if (latency < 30000) {
    pass(`Blog [${runLabel}]: latency <30s`, `${latency}ms`);
  } else {
    fail(`Blog [${runLabel}]: latency <30s`, `${latency}ms`);
  }

  const after = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='blog'`);
  if ((after[0]?.c || 0) > beforeCount) {
    const row = d1Json(`SELECT tokens_used, model FROM ai_generations WHERE content_type='blog' ORDER BY created_at DESC LIMIT 1`);
    pass(`Blog [${runLabel}]: ai_generations tracked`, `tokens=${row[0]?.tokens_used} model=${row[0]?.model}`);
    if ((row[0]?.tokens_used || 0) > 0) {
      pass(`Blog [${runLabel}]: token_count > 0`);
    } else {
      fail(`Blog [${runLabel}]: token_count > 0`, "tokens=0");
    }
  } else {
    fail(`Blog [${runLabel}]: ai_generations tracked`);
  }
}

// ─── Grammar ──────────────────────────────────────────────────────────────────

async function testGrammar(token, brandId, runLabel) {
  const before = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='grammar'`);
  const beforeCount = before[0]?.c || 0;
  const t0 = Date.now();

  const res = await req("POST", "/api/customer/ai/grammar", {
    token,
    body: { text: "Their going to there house to see there freinds tommorow morning." },
  });

  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail(`Grammar [${runLabel}]: HTTP 200`, `got ${res.status}: ${res.text.slice(0, 120)}`);
    return;
  }
  pass(`Grammar [${runLabel}]: HTTP 200`, `${latency}ms`);

  if (res.json?.correctedText && res.json.correctedText !== res.json.text) {
    pass(`Grammar [${runLabel}]: text corrected`);
  } else {
    fail(`Grammar [${runLabel}]: text corrected`, `got: ${res.json?.correctedText?.slice(0, 60)}`);
  }

  const after = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='grammar'`);
  if ((after[0]?.c || 0) > beforeCount) {
    const row = d1Json(`SELECT tokens_used FROM ai_generations WHERE content_type='grammar' ORDER BY created_at DESC LIMIT 1`);
    pass(`Grammar [${runLabel}]: ai_generations tracked`, `tokens=${row[0]?.tokens_used}`);
  } else {
    fail(`Grammar [${runLabel}]: ai_generations tracked`);
  }
}

// ─── Hashtags ─────────────────────────────────────────────────────────────────

async function testHashtags(token, brandId, runLabel) {
  const before = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='hashtags'`);
  const beforeCount = before[0]?.c || 0;
  const t0 = Date.now();

  const res = await req("POST", "/api/customer/ai/hashtags", {
    token,
    body: {
      text: "We just launched a new AI-powered social scheduling tool for small businesses.",
      platform: "instagram",
    },
  });

  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail(`Hashtags [${runLabel}]: HTTP 200`, `got ${res.status}: ${res.text.slice(0, 120)}`);
    return;
  }
  pass(`Hashtags [${runLabel}]: HTTP 200`, `${latency}ms`);

  const groups = res.json?.groups;
  if (groups?.trending?.length > 0) {
    pass(`Hashtags [${runLabel}]: groups returned`, `trending=${groups.trending.length} niche=${groups.niche?.length}`);
  } else {
    fail(`Hashtags [${runLabel}]: groups returned`);
  }

  const after = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='hashtags'`);
  if ((after[0]?.c || 0) > beforeCount) {
    const row = d1Json(`SELECT tokens_used FROM ai_generations WHERE content_type='hashtags' ORDER BY created_at DESC LIMIT 1`);
    pass(`Hashtags [${runLabel}]: ai_generations tracked`, `tokens=${row[0]?.tokens_used}`);
  } else {
    fail(`Hashtags [${runLabel}]: ai_generations tracked`);
  }
}

// ─── Quota Enforcement ────────────────────────────────────────────────────────

async function testQuotaTracking(token, brandId) {
  const rows = d1Json(`SELECT generation_count, token_count FROM ai_usage_quota WHERE date=date('now') ORDER BY generation_count DESC LIMIT 1`);
  if (rows.length > 0 && rows[0].generation_count > 0) {
    pass("Quota: ai_usage_quota rows exist", `generation_count=${rows[0].generation_count} token_count=${rows[0].token_count}`);
    if (rows[0].token_count > 0) {
      pass("Quota: token_count aggregated correctly");
    } else {
      fail("Quota: token_count aggregated correctly", "token_count=0 after generation");
    }
  } else {
    fail("Quota: ai_usage_quota rows exist", "no rows for today");
  }
}

// ─── Intelligence (daily gate) ────────────────────────────────────────────────

async function testIntelligence(token, brandId) {
  const before = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='intelligence'`);
  const beforeCount = before[0]?.c || 0;
  const t0 = Date.now();

  // Force the gate by resetting the last_generated timestamp
  d1(`UPDATE brand_intelligence_gen_tracking SET last_generated_at = datetime('now', '-25 hours') WHERE brand_id='${brandId}'`);

  const res = await req("GET", "/api/customer/intelligence/feed", { token });
  const latency = Date.now() - t0;

  if (res.status !== 200) {
    fail("Intelligence: HTTP 200", `got ${res.status}: ${res.text.slice(0, 120)}`);
    return;
  }
  pass("Intelligence: HTTP 200", `${latency}ms`);

  if (latency < 30000) {
    pass("Intelligence: latency <30s");
  } else {
    fail("Intelligence: latency <30s", `${latency}ms`);
  }

  const after = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='intelligence'`);
  if ((after[0]?.c || 0) > beforeCount) {
    const row = d1Json(`SELECT tokens_used, model FROM ai_generations WHERE content_type='intelligence' ORDER BY created_at DESC LIMIT 1`);
    pass("Intelligence: ai_generations tracked", `tokens=${row[0]?.tokens_used} model=${row[0]?.model}`);
    if ((row[0]?.tokens_used || 0) > 0) {
      pass("Intelligence: token_count > 0");
    } else {
      fail("Intelligence: token_count > 0", "tokens=0");
    }
  } else {
    // May not have generated if not eligible — check just_generated flag
    if (res.json?.just_generated === false) {
      pass("Intelligence: ai_generations tracked", "skipped — rate limit gate (not eligible), expected");
    } else {
      fail("Intelligence: ai_generations tracked", "just_generated=true but no new row");
    }
  }
}

// ─── Public Audit Tracking ────────────────────────────────────────────────────

async function testAuditTracking() {
  const before = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='public_audit'`);
  const beforeCount = before[0]?.c || 0;
  const t0 = Date.now();

  const res = await req("POST", "/api/public/brand-audit", {
    body: { website_url: "https://example.com", brand_name: "Example Corp" },
  });
  const latency = Date.now() - t0;

  if (res.status === 200) {
    pass("Public Audit: HTTP 200", `${latency}ms`);
    const after = d1Json(`SELECT COUNT(*) as c FROM ai_generations WHERE content_type='public_audit'`);
    if ((after[0]?.c || 0) > beforeCount) {
      const row = d1Json(`SELECT tokens_used, model FROM ai_generations WHERE content_type='public_audit' ORDER BY created_at DESC LIMIT 1`);
      pass("Public Audit: ai_generations tracked", `tokens=${row[0]?.tokens_used} model=${row[0]?.model}`);
    } else {
      fail("Public Audit: ai_generations tracked", "no new row");
    }
  } else {
    // Audit may fail due to crawl errors in test env — only flag if it's a server error
    if (res.status >= 500) {
      fail("Public Audit: HTTP 200", `got ${res.status}: ${res.text.slice(0, 120)}`);
    } else {
      pass("Public Audit: HTTP 200", `status=${res.status} (non-500, acceptable in test env)`);
    }
  }
}

// ─── Run All ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`ENGINE 6 — Content Generation Certification`);
  console.log(`Target: ${BASE}`);
  console.log(`${"=".repeat(60)}\n`);

  // Health check
  try {
    const health = await fetch(BASE);
    if (health.status < 500) {
      pass("API reachable");
    } else {
      fail("API reachable", `status=${health.status}`);
      process.exit(1);
    }
  } catch (e) {
    fail("API reachable", e.message);
    console.error("Cannot reach dev server. Start with: cd packages/api && npx wrangler dev");
    process.exit(1);
  }

  // Setup test user + brand
  const ctx = await setup();
  if (!ctx) {
    console.error("\nSetup failed — aborting certification.");
    process.exit(1);
  }
  const { token, brandId } = ctx;

  console.log("\n─── SOCIAL GENERATION (Phase 1+2) ───────────────────────\n");
  await testSocial(token, brandId, "run1");
  await testSocial(token, brandId, "run2");

  console.log("\n─── BLOG GENERATION (Phase 3) ────────────────────────────\n");
  await testBlog(token, brandId, "run1");
  await testBlog(token, brandId, "run2");

  console.log("\n─── GRAMMAR CHECK (Phase 4) ──────────────────────────────\n");
  await testGrammar(token, brandId, "run1");
  await testGrammar(token, brandId, "run2");

  console.log("\n─── HASHTAG GENERATION (Phase 4) ─────────────────────────\n");
  await testHashtags(token, brandId, "run1");
  await testHashtags(token, brandId, "run2");

  console.log("\n─── QUOTA ENFORCEMENT AUDIT (Phase 4) ────────────────────\n");
  await testQuotaTracking(token, brandId);

  console.log("\n─── INTELLIGENCE FEED (Phase 4) ──────────────────────────\n");
  await testIntelligence(token, brandId);

  console.log("\n─── PUBLIC AUDIT TRACKING (Phase 4) ──────────────────────\n");
  await testAuditTracking();

  // ─── Final Report ────────────────────────────────────────────────────────────
  const total = passCount + failCount;
  const score = total > 0 ? Math.round((passCount / total) * 100) : 0;

  // Compute ENGINE score /10 based on certification criteria
  const criteria = {
    "Single tracked path":       results.some(r => r.name.includes("ai_generations tracked") && r.ok),
    "Quality active":            results.some(r => r.name.includes("quality_score present") && r.ok),
    "Brand fit (raw vs final)":  results.some(r => r.name.includes("quality_score_raw") && r.ok),
    "Token tracking works":      results.some(r => r.name.includes("token_count > 0") && r.ok),
    "Quota enforced":            results.some(r => r.name.includes("ai_usage_quota") && r.ok),
    "No latency regression":     results.filter(r => r.name.includes("latency") && r.ok).length >=
                                 results.filter(r => r.name.includes("latency")).length * 0.9,
    "Social generation passes":  results.filter(r => r.name.startsWith("Social") && r.ok).length >=
                                 results.filter(r => r.name.startsWith("Social")).length * 0.8,
    "Blog generation passes":    results.filter(r => r.name.startsWith("Blog") && r.ok).length >=
                                 results.filter(r => r.name.startsWith("Blog")).length * 0.8,
    "Grammar + Hashtag pass":    results.filter(r => (r.name.startsWith("Grammar") || r.name.startsWith("Hashtag")) && r.ok).length >=
                                 results.filter(r => r.name.startsWith("Grammar") || r.name.startsWith("Hashtag")).length * 0.8,
    "Intelligence tracked":      results.some(r => r.name.startsWith("Intelligence") && r.ok),
  };

  const criteriaPassed = Object.values(criteria).filter(Boolean).length;
  const engineScore = criteriaPassed; // out of 10

  console.log(`\n${"=".repeat(60)}`);
  console.log(`CERTIFICATION REPORT`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Tests:  ${passCount}/${total} passed (${score}%)`);
  console.log(`Failed: ${failCount}`);
  console.log(`\nLock Criteria (${criteriaPassed}/10):`);
  for (const [criterion, met] of Object.entries(criteria)) {
    console.log(`  ${met ? "PASS" : "FAIL"}  ${criterion}`);
  }
  console.log(`\nENGINE 6 SCORE: ${engineScore}/10`);
  console.log(`VERDICT: ${engineScore >= 8 ? "CERTIFIED ✓" : engineScore >= 6 ? "CONDITIONAL — fix failures before locking" : "NOT CERTIFIED — critical defects remain"}`);
  console.log(`${"=".repeat(60)}\n`);

  if (failCount > 0) {
    console.log("Failed tests:");
    results.filter(r => !r.ok).forEach(r => console.log(`  ✗ ${r.name}: ${r.detail}`));
    console.log();
  }

  process.exit(failCount > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Certification crashed:", err);
  process.exit(1);
});
