/**
 * ENGINE 11 — Growth Engine Certification Script
 * Run with: node verification/growth_certification.js
 * Requires: npx wrangler dev --local (port 8787)
 */

const BASE = "http://localhost:8787";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-token";

let passed = 0;
let failed = 0;
const results = [];

function lock(name, ok, detail = "") {
  if (ok) { passed++; console.log(`  ✅ LOCK ${passed + failed}: ${name}`); }
  else     { failed++; console.log(`  ❌ FAIL ${passed + failed}: ${name}${detail ? " — " + detail : ""}`); }
  results.push({ name, ok, detail });
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, body: json };
}

// ── Source checks ─────────────────────────────────────────────────────────────

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function src(relPath) {
  return readFileSync(resolve(root, relPath), "utf8");
}

async function runCertification() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  ENGINE 11 — GROWTH ENGINE CERTIFICATION");
  console.log("══════════════════════════════════════════════════════════\n");

  // ── LOCK 1: Single canonical growth path ──────────────────────────────────
  console.log("LOCK 1: Single canonical growth path");
  {
    const engineSrc   = src("src/core/growth/engine.js");
    const socialSrc   = src("src/core/content/social.js");
    const experiSrc   = src("src/core/experience/growth.js");

    const noOrphanInEngine  = !engineSrc.includes("growth_activity_log");
    const noOrphanInSocial  = !socialSrc.includes("growth_activity_log");
    const experiReadsProfile = experiSrc.includes("growth_profiles");

    lock("engine.js writes only to growth_activity (no growth_activity_log)", noOrphanInEngine);
    lock("social.js does not write to growth_activity_log", noOrphanInSocial);
    lock("experience/growth.js getGrowthScore reads growth_profiles", experiReadsProfile);
  }

  // ── LOCK 2: Delivery status correct ──────────────────────────────────────
  console.log("\nLOCK 2: Delivery count uses 'published' status");
  {
    const growthEngineSrc = src("src/core/growth/growth_engine.js");
    const noSuccessStatus  = !growthEngineSrc.includes("status = 'success'");
    const hasPublished     = growthEngineSrc.includes("status = 'published'");
    lock("growth_engine.js uses status='published' not status='success'", noSuccessStatus && hasPublished);
  }

  // ── LOCK 3: Streak logic fix ──────────────────────────────────────────────
  console.log("\nLOCK 3: Streak logic reads old last_activity_at before upsert");
  {
    const engineSrc = src("src/core/growth/engine.js");
    const capturesOldProfile    = engineSrc.includes("oldProfile");
    const passesOldToStreak     = engineSrc.includes("oldProfile?.last_activity_at");
    const streakNoLongerReadsDB = engineSrc.includes("async function updateStreak(db, user_id, brand_id, oldLastActivityAt");
    lock("old profile captured before upsert", capturesOldProfile);
    lock("oldLastActivityAt passed to updateStreak", passesOldToStreak);
    lock("updateStreak signature accepts old values (no internal DB read)", streakNoLongerReadsDB);
  }

  // ── LOCK 4: POINT_RULES covers all bus events ────────────────────────────
  console.log("\nLOCK 4: POINT_RULES covers emitted bus events");
  {
    const engineSrc = src("src/core/growth/engine.js");
    lock("report_generated in POINT_RULES", engineSrc.includes("report_generated:"));
    lock("insight_resolved in POINT_RULES", engineSrc.includes("insight_resolved:"));
    lock("invite_accepted in POINT_RULES",  engineSrc.includes("invite_accepted:"));
  }

  // ── LOCK 5: evaluateNudges uses real env ──────────────────────────────────
  console.log("\nLOCK 5: evaluateNudges and checkForRewards use real env");
  {
    const engineSrc = src("src/core/growth/engine.js");
    const noMockEnv  = !engineSrc.includes("{ mypilotpost: db }");
    const nudgesHasEnvParam = engineSrc.includes("async function evaluateNudges(db, user_id, brand_id, env)");
    lock("no mock env ({ mypilotpost: db }) in engine.js", noMockEnv);
    lock("evaluateNudges accepts env parameter", nudgesHasEnvParam);
  }

  // ── LOCK 6: evaluateNudges query is bounded ───────────────────────────────
  console.log("\nLOCK 6: evaluateNudges query has LIMIT or DISTINCT");
  {
    const engineSrc = src("src/core/growth/engine.js");
    const hasBoundedQuery = engineSrc.includes("SELECT DISTINCT action_type FROM growth_activity") &&
                            engineSrc.includes("LIMIT 100");
    lock("evaluateNudges uses DISTINCT + LIMIT on growth_activity", hasBoundedQuery);
  }

  // ── LOCK 7: Roadmap progress uses milestones ──────────────────────────────
  console.log("\nLOCK 7: Roadmap progress is milestone-based");
  {
    const growthEngineSrc = src("src/core/growth/growth_engine.js");
    const hasMilestoneProgress = growthEngineSrc.includes("roadmap.progress = milestones.length === 0");
    lock("roadmap.progress overridden with achievedMilestones / milestones.length", hasMilestoneProgress);
  }

  // ── LOCK 8: Reward redemption route exists ───────────────────────────────
  console.log("\nLOCK 8: Reward redemption endpoint registered");
  {
    const serverSrc   = src("src/server.js");
    const handlersSrc = src("src/core/growth/handlers.js");
    const engineSrc   = src("src/core/growth/engine.js");

    const routeExists      = serverSrc.includes('"/api/customer/growth/reward/redeem"');
    const handlerExists    = handlersSrc.includes("export async function redeemReward");
    const idempotencyCheck = engineSrc.includes("'reward_redemption'") &&
                             engineSrc.includes("alreadyRedeemed");

    lock("POST /api/customer/growth/reward/redeem route registered", routeExists);
    lock("redeemReward handler exported from handlers.js", handlerExists);
    lock("applyReward has idempotency check (reward_redemption dedup)", idempotencyCheck);
  }

  // ── LOCK 9: admin/rewards.js safe query ───────────────────────────────────
  console.log("\nLOCK 9: admin/rewards.js referrals query uses only existing columns");
  {
    const adminSrc = src("src/api/admin/rewards.js");
    const noRiskLevel   = !adminSrc.includes("r.risk_level");
    const noRiskScore   = !adminSrc.includes("r.risk_score");
    const noRewardedAt  = !adminSrc.includes("r.rewarded_at");
    lock("r.risk_level removed from admin referrals query", noRiskLevel);
    lock("r.risk_score removed from admin referrals query", noRiskScore);
    lock("r.rewarded_at removed from admin referrals query", noRewardedAt);
  }

  // ── LOCK 10: Bus coverage ─────────────────────────────────────────────────
  console.log("\nLOCK 10: Growth bus entry points all use canonical emitEvent");
  {
    const busSrc     = src("src/lib/bus.js");
    const posterSrc  = src("src/core/delivery/poster.js");
    const authSrc    = src("src/auth/customer.js");

    const busImportsGrowth   = busSrc.includes("handleGrowthEvent");
    const posterEmitsEvent   = posterSrc.includes("emitEvent") && posterSrc.includes("content_published");
    const loginEmitsEvent    = authSrc.includes("emitEvent") && authSrc.includes("daily_login");

    lock("bus.js imports and calls handleGrowthEvent", busImportsGrowth);
    lock("poster.js fires content_published via emitEvent", posterEmitsEvent);
    lock("customer.js fires daily_login via emitEvent", loginEmitsEvent);
  }

  // ── Final score ───────────────────────────────────────────────────────────
  const total = passed + failed;
  const score = passed;

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  GROWTH ENGINE SCORE: ${score}/${total}`);
  if (score === total) {
    console.log("  VERDICT: PASS — ENGINE 11 CERTIFIED");
    console.log("  ENGINE 11 = LOCKED");
  } else if (score >= 8) {
    console.log("  VERDICT: CONDITIONAL PASS — review failing locks");
  } else {
    console.log("  VERDICT: FAIL — do not lock");
  }
  console.log("══════════════════════════════════════════════════════════\n");

  process.exit(score === total ? 0 : 1);
}

runCertification().catch(err => {
  console.error("Certification runner crashed:", err);
  process.exit(1);
});
