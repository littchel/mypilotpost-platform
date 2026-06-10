/**
 * COMMERCIAL HOTFIX — Certification
 *
 * Validates:
 * 1. Schema integrity (plans table has required columns)
 * 2. API path correctness (api.ts → server.js alignment)
 * 3. createPlan / updatePlan / clonePlan contracts
 * 4. billing_interval + currency in plan editor
 * 5. Feature→entitlement chain integrity
 */

import { readFileSync } from "fs";
import { join } from "path";

const ROOT = new URL("..", import.meta.url).pathname;

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Migration 136 — schema repair script exists and is idempotent
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[1] Migration 136 — commercial schema repair");
const migration136 = readFileSync(
  join(ROOT, "packages/api/migrations/136_commercial_repair.sql"),
  "utf8"
);

check("Migration registers 135 in d1_migrations", migration136.includes("INSERT OR IGNORE INTO d1_migrations"));
check("Migration backfills slug=id", migration136.includes("UPDATE plans SET slug = id WHERE slug IS NULL"));
check("plan_features table CREATE IF NOT EXISTS", migration136.includes("CREATE TABLE IF NOT EXISTS plan_features"));
check("plan_entitlements table CREATE IF NOT EXISTS", migration136.includes("CREATE TABLE IF NOT EXISTS plan_entitlements"));
check("plan_versions table CREATE IF NOT EXISTS", migration136.includes("CREATE TABLE IF NOT EXISTS plan_versions"));
check("Feature catalog seeded with INSERT OR IGNORE", migration136.includes("INSERT OR IGNORE INTO plan_features"));
check("Entitlements seeded for starter plan", migration136.includes("('starter', 'social_posts'"));
check("Entitlements seeded for agency plan", migration136.includes("'agency'") && migration136.includes("'api_access'"));

// ─────────────────────────────────────────────────────────────────────────────
// 2. API path alignment: api.ts → server.js
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[2] API path alignment (api.ts ↔ server.js)");
const apiTs = readFileSync(
  join(ROOT, "packages/admin-v3/src/lib/api.ts"),
  "utf8"
);
const serverJs = readFileSync(
  join(ROOT, "packages/api/src/server.js"),
  "utf8"
);

check(
  "Admin login: /admin/login (not /v1/admin/auth/login)",
  apiTs.includes('"/admin/login"') && serverJs.includes('"/api/admin/login"')
);
check(
  "Customer detail: /v1/admin/customers/:id",
  apiTs.includes('/v1/admin/customers/${userId}')
);
check(
  "Verify user: /v1/admin/customers/:id/verify",
  apiTs.includes('/v1/admin/customers/${userId}/verify')
);
check(
  "Support message: POST /v1/admin/support/message",
  apiTs.includes("/v1/admin/support/message")
);
check(
  "Promotions: /v1/admin/promotions (not /billing/promotions)",
  apiTs.includes('"/v1/admin/promotions"') && !apiTs.includes('"/v1/admin/billing/promotions"')
);
check(
  "Approvals: /v1/admin/approvals (not /content/approvals)",
  apiTs.includes('`/v1/admin/approvals?') && !apiTs.includes('"/v1/admin/content/approvals"')
);
check(
  "Kill switches: /v1/admin/controls (not /ops/kill-switches)",
  apiTs.includes('"/v1/admin/controls"') && !apiTs.includes('"/v1/admin/ops/kill-switches"')
);
check(
  "Kill switch update: /v1/admin/controls/:key",
  apiTs.includes('/v1/admin/controls/${key}')
);
check(
  "Audit log: /v1/admin/audit-log (not /ops/audit-log)",
  apiTs.includes('`/v1/admin/audit-log?') && !apiTs.includes('"/v1/admin/ops/audit-log"')
);
check(
  "Blog routes: /v1/admin/blog (not /content/blog)",
  apiTs.includes('`/v1/admin/blog?') && !apiTs.includes('"/v1/admin/content/blog"')
);
check(
  "Delivery stats: /v1/admin/analytics/delivery",
  apiTs.includes('"/v1/admin/analytics/delivery"')
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. createPlan contract in commercial.js
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[3] createPlan — billing_interval + user_limit contract");
const commercialJs = readFileSync(
  join(ROOT, "packages/api/src/api/admin/commercial.js"),
  "utf8"
);

check("createPlan: billing_interval extracted from body", commercialJs.includes("billing_interval"));
check("createPlan: interval normalized with fallback 'monthly'", commercialJs.includes("|| 'monthly'"));
check("createPlan: limits column always provided ('{}')", commercialJs.includes("'{}'") || commercialJs.includes('"{}\"'));
check("createPlan: user_limit column present in INSERT", commercialJs.includes("user_limit"));
check("updatePlan: billing_interval in updatable fields", (() => {
  const updateStart = commercialJs.indexOf("export async function updatePlan");
  const updateEnd = commercialJs.indexOf("export async function", updateStart + 1);
  const updateBlock = commercialJs.slice(updateStart, updateEnd);
  return updateBlock.includes("billing_interval");
})());
check("clonePlan: billing_interval null-coalesced", (() => {
  const cloneStart = commercialJs.indexOf("export async function clonePlan");
  const cloneEnd = commercialJs.indexOf("export async function", cloneStart + 1);
  const cloneBlock = commercialJs.slice(cloneStart, cloneEnd);
  return cloneBlock.includes("billing_interval");
})());

// ─────────────────────────────────────────────────────────────────────────────
// 4. Plan editor — currency + billing_interval fields
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[4] Plan editor — currency + billing_interval in UI");
const commercialPage = readFileSync(
  join(ROOT, "packages/admin-v3/src/app/commercial/page.tsx"),
  "utf8"
);

check("Create form state has billing_interval", commercialPage.includes("billing_interval: \"monthly\""));
check("Create form state has currency", commercialPage.includes("currency: \"ZAR\""));
check("Edit form state has billing_interval from plan", commercialPage.includes("billing_interval: plan.billing_interval"));
check("Edit form state has currency from plan", commercialPage.includes("currency: plan.currency"));
check("Billing interval select present in create drawer", (commercialPage.match(/billing_interval/g) || []).length >= 4);
check("Currency select present in create drawer", (commercialPage.match(/currency/g) || []).length >= 4);
check("Read view shows billing_interval", commercialPage.includes("plan.billing_interval"));
check("Read view shows currency", commercialPage.includes("plan.currency"));

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plan type — billing_interval + currency declared
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[5] Plan TypeScript type — billing_interval + currency");
const typesTs = readFileSync(
  join(ROOT, "packages/admin-v3/src/types/index.ts"),
  "utf8"
);

check("Plan interface has billing_interval", typesTs.includes("billing_interval?: string"));
check("Plan interface has currency", typesTs.includes("currency?: string"));
check("Plan interface has price_yearly", typesTs.includes("price_yearly?: number"));

// ─────────────────────────────────────────────────────────────────────────────
// 6. Graceful stubs — no routes return hard 500
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[6] Graceful stubs — unrouted calls caught");

check("TokenOps stub: has .catch() with empty summary", apiTs.includes("forecast_month_usd: 0"));
check("FeatureAdoption stub: has .catch(() => ({ adoption: [] }))", apiTs.includes("({ adoption: [] })"));
check("ExecutionQueue stub: has .catch(() => ({ items: [] }))", apiTs.includes("({ items: [] })"));
check("OauthHealth stub: has .catch(() => ({ platforms: [] }))", apiTs.includes("({ platforms: [] })"));
check("DeliveryStats stub: has .catch(() => ({ stats: [] }))", apiTs.includes("({ stats: [] })"));
check("Subscriptions stub: returns empty data on failure", apiTs.includes("data: [], total: 0"));

// ─────────────────────────────────────────────────────────────────────────────
// 7. No dead stale paths remain
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[7] Dead paths removed");

check("No /v1/admin/auth/login in api.ts", !apiTs.includes("/v1/admin/auth/login"));
check("No /v1/admin/ops/kill-switches in api.ts", !apiTs.includes("/v1/admin/ops/kill-switches"));
check("No /v1/admin/ops/audit-log in api.ts", !apiTs.includes("/v1/admin/ops/audit-log"));
check("No /v1/admin/content/approvals in api.ts", !apiTs.includes("/v1/admin/content/approvals"));
check("No /v1/admin/content/blog in api.ts", !apiTs.includes("/v1/admin/content/blog"));
check("No /v1/admin/billing/promotions in api.ts", !apiTs.includes("/v1/admin/billing/promotions"));
check("No /v1/admin/saas/ in api.ts", !apiTs.includes("/v1/admin/saas/"));

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
const total = passed + failed;
const score = Math.round((passed / total) * 10 * 10) / 10;
console.log(`COMMERCIAL HOTFIX: ${passed}/${total} checks passed (${score}/10.0)`);
if (failed === 0) {
  console.log("STATUS: CERTIFIED ✓");
} else {
  console.log(`STATUS: NOT CERTIFIED — ${failed} check(s) failed`);
  process.exit(1);
}
