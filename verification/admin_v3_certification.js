/**
 * ADMIN V3 — WORKSPACE OPERATING SYSTEM
 * Certification suite — 45 checks
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BASE = process.env.API_BASE ?? "http://localhost:8788/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@mypilotpost.com";
const ADMIN_PASS  = process.env.ADMIN_PASS  ?? "adminpassword";

let adminToken = null;
const results = [];
let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
    failed++;
  }
  results.push({ name, ok, detail });
}

async function api(path, opts = {}, token = adminToken) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

// ── 1. FILE STRUCTURE ─────────────────────────────────────────────────────────

console.log("\n[1] File structure");

const V3 = path.resolve("packages/admin-v3/src");
const requiredFiles = [
  "app/layout.tsx",
  "app/providers.tsx",
  "app/page.tsx",
  "app/login/page.tsx",
  "app/customers/page.tsx",
  "app/support/page.tsx",
  "app/billing/page.tsx",
  "app/commercial/page.tsx",
  "app/operations/page.tsx",
  "app/content/page.tsx",
  "app/config/page.tsx",
  "lib/api.ts",
  "lib/auth.ts",
  "lib/roles.ts",
  "lib/query.ts",
  "lib/utils.ts",
  "types/index.ts",
  "context/SessionContext.tsx",
  "components/auth/RoleGuard.tsx",
  "components/layout/Sidebar.tsx",
  "components/layout/TopBar.tsx",
  "components/layout/WorkspaceLayout.tsx",
  "components/ui/Card.tsx",
  "components/ui/Badge.tsx",
  "components/ui/Button.tsx",
  "components/ui/Input.tsx",
  "components/ui/StatCard.tsx",
  "components/ui/Drawer.tsx",
  "components/ui/EmptyState.tsx",
];

for (const f of requiredFiles) {
  const exists = fs.existsSync(path.join(V3, f));
  check(`File exists: ${f}`, exists);
}

// ── 2. CONFIG ─────────────────────────────────────────────────────────────────

console.log("\n[2] Config files");

const pkgJson = JSON.parse(fs.readFileSync("packages/admin-v3/package.json", "utf8"));
check("package.json has next@15", pkgJson.dependencies.next?.startsWith("^15"));
check("package.json has @tanstack/react-query@5", pkgJson.dependencies["@tanstack/react-query"]?.startsWith("^5"));
check("package.json has lucide-react", !!pkgJson.dependencies["lucide-react"]);
check("package.json has recharts", !!pkgJson.dependencies.recharts);
check("package.json has deploy script", !!pkgJson.scripts.deploy);

const nextConfig = fs.readFileSync("packages/admin-v3/next.config.ts", "utf8");
check("next.config.ts has output: export", nextConfig.includes('"export"'));
check("next.config.ts has NEXT_PUBLIC_API_BASE", nextConfig.includes("NEXT_PUBLIC_API_BASE"));

const wranglerToml = fs.readFileSync("packages/admin-v3/wrangler.toml", "utf8");
check("wrangler.toml has correct account_id", wranglerToml.includes("2e36b917221c87af13a139c07842b5b2"));
check("wrangler.toml has assets.directory ./out", wranglerToml.includes("./out"));

// ── 3. ROLE SYSTEM ────────────────────────────────────────────────────────────

console.log("\n[3] Role system (static analysis)");

const rolesTs = fs.readFileSync(path.join(V3, "lib/roles.ts"), "utf8");
check("roles.ts defines super_admin workspace set", rolesTs.includes("super_admin"));
check("roles.ts defines support workspace set", rolesTs.includes("support"));
check("roles.ts has canAccessWorkspace", rolesTs.includes("canAccessWorkspace"));
check("roles.ts has getWorkspacesForRole", rolesTs.includes("getWorkspacesForRole"));
check("roles.ts has 8 workspaces", ["today","customers","support","billing","commercial","operations","content","config"].every((w) => rolesTs.includes(`"${w}"`)));

// ── 4. API CLIENT ──────────────────────────────────────────────────────────────

console.log("\n[4] API client (static analysis)");

const apiTs = fs.readFileSync(path.join(V3, "lib/api.ts"), "utf8");
check("api.ts has apiLogin", apiTs.includes("apiLogin"));
check("api.ts has apiListCustomers", apiTs.includes("apiListCustomers"));
check("api.ts has apiGetCommercialMetrics", apiTs.includes("apiGetCommercialMetrics"));
check("api.ts has apiListKillSwitches", apiTs.includes("apiListKillSwitches"));
check("api.ts has apiGetTokenOps", apiTs.includes("apiGetTokenOps"));
check("api.ts has ApiResponseError class", apiTs.includes("ApiResponseError"));
check("api.ts auto-redirects to /login/ on 401", apiTs.includes("/login/"));

// ── 5. AUTH ───────────────────────────────────────────────────────────────────

console.log("\n[5] Auth layer (static analysis)");

const authTs = fs.readFileSync(path.join(V3, "lib/auth.ts"), "utf8");
check("auth.ts reads/writes adminToken key", authTs.includes("adminToken"));
check("auth.ts decodes JWT without library", authTs.includes("base64urlDecode"));
check("auth.ts checks token expiry", authTs.includes("exp") && authTs.includes("Date.now"));
check("auth.ts has logout redirect", authTs.includes("/login/"));

// ── 6. WORKSPACES ─────────────────────────────────────────────────────────────

console.log("\n[6] Workspace pages (static analysis)");

const workspaceChecks = [
  ["customers", "Customer 360",     ["apiListCustomers", "Drawer", 'workspace="customers"']],
  ["support",   "Support Center",   ["apiListSupportThreads", "ThreadDetail", "MessageBubble"]],
  ["billing",   "Billing Ops",      ["apiGetBillingOverview", "Promotions", "Subscriptions"]],
  ["commercial","Commercial Control",["apiListPlans", "apiListEntitlements", "EntitlementRow"]],
  ["operations","Platform Ops",     ["apiGetOperationsHealth", "PlatformRow", "apiGetDeliveryStats"]],
  ["content",   "Content Ops",      ["apiListBlogPosts", "apiListApprovals", "BlogCMS"]],
  ["config",    "Platform Config",  ["apiListKillSwitches", "KillSwitchRow", "AuditLogTab"]],
];

for (const [ws, label, symbols] of workspaceChecks) {
  const src = fs.readFileSync(path.join(V3, `app/${ws}/page.tsx`), "utf8");
  const hasAll = symbols.every((s) => src.includes(s));
  check(`${label}: has required symbols (${symbols.join(", ")})`, hasAll);
}

// ── 7. LIVE API CHECKS ────────────────────────────────────────────────────────

console.log("\n[7] Live API checks (requires wrangler dev on :8788)");

// Login
{
  const { status, body } = await api("/v1/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  }, null);
  check("Admin login returns 200", status === 200);
  check("Login returns JWT token", !!body.token);
  if (body.token) adminToken = body.token;
}

// Commercial
{
  const { status, body } = await api("/v1/admin/commercial/plans");
  check("GET /commercial/plans returns 200", status === 200);
  check("Plans response has plans array", Array.isArray(body.plans));
}

{
  const { status, body } = await api("/v1/admin/commercial/metrics");
  check("GET /commercial/metrics returns 200", status === 200);
  check("Metrics has revenue.mrr", body.revenue?.mrr !== undefined);
  check("Metrics has subscribers.active", body.subscribers?.active !== undefined);
}

// Users
{
  const { status, body } = await api("/v1/admin/users");
  check("GET /admin/users returns 200", status === 200, `got ${status}`);
}

// Overview
{
  const { status } = await api("/v1/admin/overview");
  check("GET /admin/overview returns 200", status === 200, `got ${status}`);
}

// Kill switches
{
  const { status, body } = await api("/v1/admin/ops/kill-switches");
  check("GET /admin/ops/kill-switches returns 200", status === 200, `got ${status}`);
}

// Unauthenticated access rejected
{
  const { status } = await api("/v1/admin/users", {}, "");
  check("Unauthenticated admin request returns 401", status === 401);
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────

const score = ((passed / (passed + failed)) * 10).toFixed(1);
const certified = failed === 0;

console.log("\n" + "═".repeat(60));
console.log(`ADMIN V3 CERTIFICATION — ${certified ? "✅ LOCKED" : "❌ NOT CERTIFIED"}`);
console.log(`Score: ${score}/10  |  Passed: ${passed}  |  Failed: ${failed}`);
console.log("═".repeat(60));

if (failed > 0) {
  console.log("\nFailing checks:");
  results.filter((r) => !r.ok).forEach((r) => console.log(`  • ${r.name}${r.detail ? " — " + r.detail : ""}`));
}

process.exit(certified ? 0 : 1);
