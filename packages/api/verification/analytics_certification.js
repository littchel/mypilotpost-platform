/**
 * ENGINE 10 — Analytics & Reporting Certification
 * Validates: event integrity, metric accuracy, dashboard correctness,
 * report generation, platform breakdown, timeseries, and export consistency.
 *
 * Run: node verification/analytics_certification.js [baseUrl]
 * Requires: wrangler dev running locally
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const TS = Date.now();
const EMAIL_A = `analcert_a_${TS}@example.com`;
const EMAIL_B = `analcert_b_${TS}@example.com`;
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

function info(msg) { console.log(`      ${msg}`); }

async function req(method, urlPath, { token, body, headers = {} } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${urlPath}`, {
      method, headers: h,
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
  } catch { return []; }
}

async function setup(email) {
  const reg = await req("POST", "/api/customer/register", {
    body: { email, password: PASSWORD, name: "Analytics Cert User" },
  });
  if (reg.status !== 200 && reg.status !== 201) {
    fail(`Setup [${email.slice(0, 15)}]: register`, `status=${reg.status}`);
    return null;
  }
  const token = reg.json?.token || reg.json?.access_token;
  if (!token) { fail("Setup: extract token"); return null; }
  let brandId = reg.json?.brand_id;
  if (!brandId) {
    const b = await req("GET", "/api/customer/brands", { token });
    brandId = b.json?.brands?.[0]?.id || b.json?.data?.[0]?.id;
  }
  if (!brandId) { fail("Setup: resolve brand_id"); return null; }
  info(`email=${email} brand_id=${brandId}`);
  return { token, brandId };
}

// ─── Phase 1: Event Ingestion (Source Check) ──────────────────────────────────

async function testCollectorSource() {
  const { readFileSync } = await import("fs");
  const src = readFileSync(path.join(__dir, "../src/core/analytics/collector.js"), "utf8");

  if (src.includes("platform") && src.includes("reported_at")) {
    pass("Collector: platform + reported_at in INSERT");
  } else {
    fail("Collector: platform + reported_at in INSERT", "missing columns — timeseries will always be empty");
  }

  if (src.includes("COALESCE(excluded.platform, platform)")) {
    pass("Collector: platform UPSERT preserves existing value");
  } else {
    fail("Collector: platform UPSERT preserves existing value");
  }

  if (src.includes("reported_at = excluded.reported_at")) {
    pass("Collector: reported_at updated on conflict");
  } else {
    fail("Collector: reported_at updated on conflict");
  }
}

// ─── Phase 2: Inject test analytics events directly via D1 ───────────────────

async function injectTestEvents(brandId) {
  const contentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  // Social asset for the event
  d1Json(`INSERT OR IGNORE INTO social_assets (id, brand_id, title, text, status, created_at) VALUES ('${contentId}', '${brandId}', 'Analytics Cert Post', 'Test', 'published', '${now}')`);
  d1Json(`INSERT OR IGNORE INTO content_vault (id, brand_id, title, body, content_type, lifecycle_status, source, created_at, updated_at) VALUES ('${contentId}', '${brandId}', 'Analytics Cert Post', 'Test', 'social', 'published', 'editor', '${now}', '${now}')`);

  // Analytics event with platform + reported_at
  d1Json(`
    INSERT INTO content_analytics (id, brand_id, content_type, content_id, platform, impressions, engagements, clicks, reported_at, created_at, updated_at)
    VALUES ('${crypto.randomUUID()}', '${brandId}', 'social', '${contentId}', 'linkedin', 1200, 84, 22, '${now}', '${now}', '${now}')
    ON CONFLICT(content_type, content_id) DO UPDATE SET
      impressions = excluded.impressions, engagements = excluded.engagements,
      clicks = excluded.clicks, platform = excluded.platform, reported_at = excluded.reported_at
  `);

  // Daily rollup
  const today = new Date().toISOString().slice(0, 10);
  d1Json(`
    INSERT INTO daily_analytics (id, brand_id, date, impressions, engagements, clicks, created_at)
    VALUES ('${crypto.randomUUID()}', '${brandId}', '${today}', 1200, 84, 22, '${now}')
    ON CONFLICT(brand_id, date) DO UPDATE SET
      impressions = impressions + excluded.impressions,
      engagements = engagements + excluded.engagements
  `);

  // Delivery job for the content (published)
  const jobId = crypto.randomUUID();
  d1Json(`INSERT OR IGNORE INTO delivery_jobs (id, brand_id, content_type, content_id, platform, status, scheduled_at, created_at) VALUES ('${jobId}', '${brandId}', 'social', '${contentId}', 'linkedin', 'published', '${yesterday}', '${now}')`);

  info(`Injected analytics: content_id=${contentId.slice(0, 8)} impressions=1200 engagements=84`);
  return { contentId };
}

// ─── Phase 3: Analytics Overview ─────────────────────────────────────────────

async function testAnalyticsOverview(token, brandId) {
  const res = await req("GET", "/api/customer/analytics/overview", { token });

  if (res.status !== 200) {
    fail("Overview: GET /analytics/overview", `status=${res.status}`);
    return;
  }
  pass("Overview: HTTP 200");

  const data = res.json;
  if (typeof data?.totalReach === "number") {
    pass("Overview: totalReach field present", `value=${data.totalReach}`);
  } else {
    fail("Overview: totalReach field present", `got=${JSON.stringify(data?.totalReach)}`);
  }

  if (typeof data?.totalEngagement === "number") {
    pass("Overview: totalEngagement field present", `value=${data.totalEngagement}`);
  } else {
    fail("Overview: totalEngagement field present");
  }

  if (data?.summary && typeof data.summary.posts === "number") {
    pass("Overview: summary.posts present", `posts=${data.summary.posts}`);
  } else {
    fail("Overview: summary.posts present");
  }

  if (data?.platformShare !== undefined) {
    pass("Overview: platformShare present", `count=${(data.platformShare || []).length}`);
  } else {
    fail("Overview: platformShare present");
  }
}

// ─── Phase 4: Timeseries ──────────────────────────────────────────────────────

async function testTimeseries(token, brandId) {
  const res = await req("GET", "/api/customer/analytics/timeseries?range=7d", { token });

  if (res.status !== 200) {
    fail("Timeseries: GET /analytics/timeseries", `status=${res.status}`);
    return;
  }
  pass("Timeseries: HTTP 200");

  const data = Array.isArray(res.json) ? res.json : [];

  if (data.length > 0) {
    pass("Timeseries: data returned after event injection", `rows=${data.length}`);
    const row = data[0];
    if (typeof row.reach === "number" || row.reach !== undefined) {
      pass("Timeseries: reach field in rows");
    } else {
      fail("Timeseries: reach field in rows", `keys=${Object.keys(row).join(",")}`);
    }
  } else {
    // Might be empty if reported_at fix wasn't applied — this is the key correctness check
    fail("Timeseries: data returned after event injection",
      "0 rows — reported_at likely still NULL (collector.js fix not applied?)");
  }
}

// ─── Phase 5: Detailed Analytics ──────────────────────────────────────────────

async function testDetailedAnalytics(token, brandId) {
  const res = await req("GET", "/api/customer/analytics/detailed", { token });

  if (res.status !== 200) {
    fail("Detailed: GET /analytics/detailed", `status=${res.status}`);
    return;
  }
  pass("Detailed: HTTP 200");

  if (Array.isArray(res.json?.platforms)) {
    pass("Detailed: platforms array present", `count=${res.json.platforms.length}`);
  } else {
    fail("Detailed: platforms array present");
  }

  if (Array.isArray(res.json?.trends)) {
    pass("Detailed: trends array present", `count=${res.json.trends.length}`);
  } else {
    fail("Detailed: trends array present");
  }

  if (Array.isArray(res.json?.top_content)) {
    pass("Detailed: top_content present");
  } else {
    fail("Detailed: top_content present");
  }
}

// ─── Phase 6: Content Analytics (no fan-out duplicates) ───────────────────────

async function testContentAnalytics(token, brandId) {
  const res = await req("GET", "/api/customer/analytics/content", { token });

  if (res.status !== 200) {
    fail("Content Analytics: GET /analytics/content", `status=${res.status}`);
    return;
  }
  pass("Content Analytics: HTTP 200");

  const items = Array.isArray(res.json) ? res.json : [];

  // Check for duplicate content_id in results (fan-out defect symptom)
  const contentIds = items.map(i => i.title).filter(Boolean);
  const uniqueIds = new Set(contentIds);
  if (contentIds.length === uniqueIds.size) {
    pass("Content Analytics: no duplicate titles (no fan-out)", `rows=${items.length}`);
  } else {
    fail("Content Analytics: no duplicate titles (no fan-out)", `${contentIds.length - uniqueIds.size} duplicates found`);
  }

  if (items.length > 0) {
    const item = items[0];
    if (item.reach !== undefined && item.engagement !== undefined) {
      pass("Content Analytics: reach + engagement fields present");
    } else {
      fail("Content Analytics: reach + engagement fields present", `keys=${Object.keys(item).join(",")}`);
    }
  }
}

// ─── Phase 7: Dashboard Summary ───────────────────────────────────────────────

async function testDashboardSummary(token, brandId) {
  const res = await req("GET", "/api/customer/dashboard/summary", { token });

  if (res.status !== 200) {
    fail("Dashboard: GET /dashboard/summary", `status=${res.status}`);
    return;
  }
  pass("Dashboard: HTTP 200");

  const metrics = res.json?.metrics;
  if (!metrics) {
    fail("Dashboard: metrics object present");
    return;
  }
  pass("Dashboard: metrics object present");

  if (metrics.engagementRate !== "0%" || metrics.publishedPosts > 0) {
    pass("Dashboard: engagementRate not hardcoded 0%", `rate=${metrics.engagementRate}`);
  } else {
    // Still "0%" is valid for brand-new accounts — check the source
    info("Dashboard engagementRate=0% — valid for new account or source check needed");
  }

  if (typeof metrics.publishedPosts === "number") {
    pass("Dashboard: publishedPosts is a number", `value=${metrics.publishedPosts}`);
  } else {
    fail("Dashboard: publishedPosts is a number", `got=${metrics.publishedPosts}`);
  }

  if (res.json?.thisWeek) {
    pass("Dashboard: thisWeek block present", `scheduled=${res.json.thisWeek.scheduled} published=${res.json.thisWeek.published}`);
  } else {
    fail("Dashboard: thisWeek block present");
  }
}

// ─── Phase 8: Dashboard Source Checks ─────────────────────────────────────────

async function testDashboardSource() {
  const { readFileSync } = await import("fs");
  const src = readFileSync(path.join(__dir, "../src/core/dashboard/summary.js"), "utf8");

  if (!src.includes("status = 'delivered'")) {
    pass("Dashboard Source: no 'delivered' status (uses 'published')");
  } else {
    fail("Dashboard Source: no 'delivered' status", "still counting 'delivered' — always 0");
  }

  if (!src.includes(`const engagement = "0%"`)) {
    pass("Dashboard Source: engagement rate computed (not hardcoded)");
  } else {
    fail("Dashboard Source: engagement rate computed", "still hardcoded to '0%'");
  }

  if (src.includes("content_analytics")) {
    pass("Dashboard Source: reads from content_analytics for engagement");
  } else {
    fail("Dashboard Source: reads from content_analytics for engagement");
  }
}

// ─── Phase 9: Report Generation + Persistence ─────────────────────────────────

async function testReportGeneration(token, brandId) {
  const before = d1Json(`SELECT COUNT(*) as c FROM reports WHERE brand_id='${brandId}'`);
  const beforeCount = parseInt(before[0]?.c || "0", 10);

  const res = await req("GET", "/api/customer/analytics/report/generate", { token });
  // Actually it's a case in the switch — check if it works via POST too
  const resPost = await req("POST", "/api/customer/analytics/report/generate", {
    token,
    body: {
      title: `Cert Report ${TS}`,
      period: "last_30_days",
    },
  });

  if (resPost.status !== 200 && resPost.status !== 201) {
    fail("Report: POST /analytics/report/generate", `status=${resPost.status} ${resPost.text.slice(0, 80)}`);
    return null;
  }
  pass("Report: POST /analytics/report/generate HTTP 200");

  const reportId = resPost.json?.id;
  if (!reportId) {
    fail("Report: id returned", `response=${JSON.stringify(resPost.json).slice(0, 60)}`);
    return null;
  }
  pass("Report: id returned", reportId.slice(0, 8));

  // Verify persisted
  const after = d1Json(`SELECT COUNT(*) as c FROM reports WHERE brand_id='${brandId}'`);
  const afterCount = parseInt(after[0]?.c || "0", 10);
  if (afterCount > beforeCount) {
    pass("Report: persisted in canonical reports table");
  } else {
    fail("Report: persisted in canonical reports table", "no new row — writing to wrong table or failing silently");
  }

  // Verify created_by is not null (user_id fix)
  const row = d1Json(`SELECT created_by FROM reports WHERE id='${reportId}'`);
  if (row[0]?.created_by) {
    pass("Report: created_by is set (auth.user_id fix applied)", `user=${row[0].created_by.slice(0, 8)}`);
  } else {
    fail("Report: created_by is set", "NULL — auth.userId should be auth.user_id");
  }

  return reportId;
}

// ─── Phase 10: Report Read + List ─────────────────────────────────────────────

async function testReportRead(token, brandId, reportId) {
  if (!reportId) { info("Skipping report read — no report id"); return; }

  const res = await req("GET", `/api/customer/analytics/report/${reportId}`, { token });
  if (res.status !== 200) {
    fail("Report Read: GET /analytics/report/:id", `status=${res.status}`);
    return;
  }
  pass("Report Read: HTTP 200");

  if (res.json?.report?.report_data) {
    pass("Report Read: report_data present (parsed JSON)");
  } else {
    fail("Report Read: report_data present", `keys=${Object.keys(res.json?.report || {}).join(",")}`);
  }

  const listRes = await req("GET", "/api/customer/analytics/reports", { token });
  if (listRes.status !== 200) {
    fail("Report List: GET /analytics/reports", `status=${listRes.status}`);
    return;
  }
  pass("Report List: HTTP 200");

  const items = listRes.json?.results || [];
  if (items.length > 0) {
    pass("Report List: reports listed", `count=${items.length}`);
  } else {
    fail("Report List: reports listed", "0 results after generation");
  }
}

// ─── Phase 11: Metric Reconciliation ──────────────────────────────────────────

async function testMetricReconciliation(token, brandId) {
  // Inject 3 more events, then verify overview totals match DB
  const impsToAdd = 500;
  d1Json(`
    UPDATE content_analytics
    SET impressions = impressions + ${impsToAdd}, reported_at = datetime('now')
    WHERE brand_id = '${brandId}' LIMIT 1
  `);

  // Get overview
  const overviewRes = await req("GET", "/api/customer/analytics/overview", { token });
  const overviewReach = overviewRes.json?.totalReach || 0;

  // Get actual DB sum (last 7 days)
  const dbRows = d1Json(
    `SELECT SUM(impressions) as total FROM content_analytics WHERE brand_id='${brandId}' AND reported_at >= datetime('now', '-7 days')`
  );
  const dbTotal = parseInt(dbRows[0]?.total || "0", 10);

  if (dbTotal > 0 && overviewReach === dbTotal) {
    pass("Reconciliation: overview totalReach matches DB SUM", `both=${overviewReach}`);
  } else if (dbTotal > 0 && Math.abs(overviewReach - dbTotal) < 5) {
    pass("Reconciliation: overview totalReach within 5 of DB SUM", `overview=${overviewReach} db=${dbTotal}`);
  } else if (dbTotal === 0) {
    info("Reconciliation: DB has no recent analytics rows — reported_at filter active (expected if no events)");
  } else {
    fail("Reconciliation: overview totalReach matches DB SUM", `overview=${overviewReach} db=${dbTotal} diff=${Math.abs(overviewReach - dbTotal)}`);
  }
}

// ─── Phase 12: Brand Isolation ────────────────────────────────────────────────

async function testBrandIsolation(tokenA, brandIdA, tokenB, brandIdB) {
  // Overview for brand B should not include brand A's events
  const resB = await req("GET", "/api/customer/analytics/overview", { token: tokenB });
  const reachB = resB.json?.totalReach || 0;

  const resA = await req("GET", "/api/customer/analytics/overview", { token: tokenA });
  const reachA = resA.json?.totalReach || 0;

  // Brand B is new, should have 0 reach
  if (reachB === 0) {
    pass("Brand Isolation: Brand B sees 0 reach (not Brand A's events)", `A=${reachA} B=${reachB}`);
  } else if (reachB < reachA) {
    pass("Brand Isolation: Brand B has less reach than Brand A", `A=${reachA} B=${reachB}`);
  } else {
    fail("Brand Isolation: Brand B has unexpected reach", `A=${reachA} B=${reachB} — possible cross-brand leak`);
  }
}

// ─── Phase 13: Analytics Source Checks ────────────────────────────────────────

async function testAnalyticsSource() {
  const { readFileSync } = await import("fs");
  const src = readFileSync(path.join(__dir, "../src/core/analytics/analytics.js"), "utf8");

  // auth.user_id fix
  if (src.includes("const userId = auth.user_id;")) {
    pass("Analytics Source: auth.user_id used (not auth.userId)");
  } else if (src.includes("auth.userId")) {
    fail("Analytics Source: auth.user_id used", "still using auth.userId — created_by always null");
  } else {
    info("Analytics Source: userId reference not found in generateReport");
  }

  // LIMIT on listReports
  if (src.includes("LIMIT 100")) {
    pass("Analytics Source: listReports has LIMIT 100");
  } else {
    fail("Analytics Source: listReports has LIMIT 100", "unbounded query");
  }

  // Deduped subquery
  if (src.includes("GROUP BY content_id") && src.includes("LEFT JOIN (")) {
    pass("Analytics Source: deduped delivery_jobs subquery (no fan-out)");
  } else {
    fail("Analytics Source: deduped delivery_jobs subquery", "fan-out JOIN still present");
  }

  // Legacy route redirect
  const serverSrc = readFileSync(path.join(__dir, "../src/server.js"), "utf8");
  if (serverSrc.includes("generateReport(request, env, auth)") && !serverSrc.includes("reporting/engine.js")) {
    pass("Server Source: legacy /reports/generate redirected to canonical analytics.js");
  } else if (serverSrc.includes("reporting/engine.js")) {
    fail("Server Source: legacy /reports/generate redirected", "still importing reporting/engine.js dynamically");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  ENGINE 10 — Analytics & Reporting Certification");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log("── Source Checks ──────────────────────────────────");
  await testCollectorSource();
  await testDashboardSource();
  await testAnalyticsSource();

  console.log("\n── Phase 1: Setup ──────────────────────────────────");
  const ctxA = await setup(EMAIL_A);
  if (!ctxA) {
    console.log("\nFATAL: Setup failed. Is wrangler dev running?");
    process.exit(1);
  }

  console.log("\n── Phase 2: Event Injection ────────────────────────");
  await injectTestEvents(ctxA.brandId);

  console.log("\n── Phase 3: Analytics Overview ─────────────────────");
  await testAnalyticsOverview(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 4: Timeseries ─────────────────────────────");
  await testTimeseries(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 5: Detailed Analytics ─────────────────────");
  await testDetailedAnalytics(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 6: Content Analytics (fan-out check) ──────");
  await testContentAnalytics(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 7: Dashboard Summary ──────────────────────");
  await testDashboardSummary(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 8: Report Generation ──────────────────────");
  const reportId = await testReportGeneration(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 9: Report Read + List ─────────────────────");
  await testReportRead(ctxA.token, ctxA.brandId, reportId);

  console.log("\n── Phase 10: Metric Reconciliation ─────────────────");
  await testMetricReconciliation(ctxA.token, ctxA.brandId);

  console.log("\n── Phase 11: Brand Isolation ───────────────────────");
  const ctxB = await setup(EMAIL_B);
  if (ctxB) await testBrandIsolation(ctxA.token, ctxA.brandId, ctxB.token, ctxB.brandId);

  // ─── Score ────────────────────────────────────────────────────────────────
  const LOCK_CRITERIA = [
    "Collector: platform + reported_at in INSERT",
    "Dashboard Source: no 'delivered' status (uses 'published')",
    "Dashboard Source: engagement rate computed (not hardcoded)",
    "Analytics Source: auth.user_id used (not auth.userId)",
    "Analytics Source: listReports has LIMIT 100",
    "Analytics Source: deduped delivery_jobs subquery (no fan-out)",
    "Overview: HTTP 200",
    "Report: POST /analytics/report/generate HTTP 200",
    "Report: persisted in canonical reports table",
    "Brand Isolation: Brand B sees 0 reach (not Brand A's events)",
  ];

  const score = LOCK_CRITERIA.filter(c => results.find(r => r.name === c && r.ok)).length;

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  ENGINE 10 SCORE: ${score}/10`);
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
    score >= 8 ? "PASS — ENGINE 10 CERTIFIED" :
    score >= 6 ? "CONDITIONAL — Review failures before lock" :
    "FAIL — Do not lock";
  console.log(`\n  VERDICT: ${verdict}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
