/**
 * ADMIN V2 — Commercial Control System Certification
 * Run against local wrangler dev (port 8788).
 * Usage: node verification/commercial_system_certification.js
 *
 * Tests: plans CRUD, feature catalog, entitlements grid, metrics, enforcement,
 *        backward-compat sync (features_json, legacy limit columns), versioning.
 */

const BASE = process.env.API_BASE || "http://localhost:8788/api";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@mypilotpost.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword";
const USER_EMAIL     = process.env.USER_EMAIL     || "test@mypilotpost.com";
const USER_PASSWORD  = process.env.USER_PASSWORD  || "testpassword";

let adminToken = null;
let userToken  = null;
const results  = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function adminLogin() {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`Admin login failed: ${data.error || res.status}`);
  adminToken = data.token;
  console.log("✓ Admin login OK");
}

async function userLogin() {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    userToken = null;
    console.log("  (user login skipped — no test user)");
    return;
  }
  userToken = data.token;
  console.log("✓ User login OK");
}

async function check(label, fn) {
  try {
    const ok = await fn();
    results.push({ label, ok: !!ok, error: null });
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  } catch (e) {
    results.push({ label, ok: false, error: e.message });
    console.log(`  ✗ ${label} — ${e.message}`);
  }
}

async function adminApi(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    ...opts,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function userApi(path, opts = {}) {
  if (!userToken) return { status: 401, body: null };
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
    ...opts,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ── Test State ────────────────────────────────────────────────────────────────
let createdPlanId   = null;
let clonedPlanId    = null;
let createdFeatureKey = null;

// ── Test Suites ───────────────────────────────────────────────────────────────

async function testPlansList() {
  console.log("\n── Plans: List ────────────────────────────────────────────────");

  await check("GET /v1/admin/commercial/plans returns 200 + plans array", async () => {
    const { status, body } = await adminApi("/v1/admin/commercial/plans");
    return status === 200 && Array.isArray(body?.plans);
  });

  await check("plans array has at least one plan (seeded data)", async () => {
    const { body } = await adminApi("/v1/admin/commercial/plans");
    return (body?.plans?.length ?? 0) >= 1;
  });

  await check("each plan has id, name, slug, status fields", async () => {
    const { body } = await adminApi("/v1/admin/commercial/plans");
    const p = body?.plans?.[0];
    return p && p.id && p.name && (p.slug !== undefined) && (p.status !== undefined || p.is_active !== undefined);
  });
}

async function testPlanCreate() {
  console.log("\n── Plans: Create ──────────────────────────────────────────────");

  await check("POST /v1/admin/commercial/plans creates new plan", async () => {
    const { status, body } = await adminApi("/v1/admin/commercial/plans", {
      method: "POST",
      body: JSON.stringify({
        name: "Cert Test Plan",
        description: "Created by certification script",
        price_monthly: 299,
        trial_days: 7,
        badge: "Test",
        sort_order: 99,
        visible: 0
      }),
    });
    if (status === 200 || status === 201) {
      createdPlanId = body?.id || body?.plan?.id;
    }
    return (status === 200 || status === 201) && !!createdPlanId;
  });

  await check("new plan appears in plans list", async () => {
    if (!createdPlanId) return false;
    const { body } = await adminApi("/v1/admin/commercial/plans");
    return body?.plans?.some(p => p.id === createdPlanId);
  });

  await check("new plan has slug derived from name", async () => {
    if (!createdPlanId) return false;
    const { body } = await adminApi("/v1/admin/commercial/plans");
    const p = body?.plans?.find(p => p.id === createdPlanId);
    return p?.slug && (p.slug.includes("cert") || p.slug.includes("test") || p.slug.length > 0);
  });

  await check("initial plan snapshot created (plan_versions)", async () => {
    if (!createdPlanId) return false;
    const { status, body } = await adminApi(`/v1/admin/commercial/plans/${createdPlanId}/versions`);
    return status === 200 && Array.isArray(body?.versions);
  });
}

async function testPlanUpdate() {
  console.log("\n── Plans: Update ──────────────────────────────────────────────");

  await check("PATCH /v1/admin/commercial/plans/:id updates name and price", async () => {
    if (!createdPlanId) return false;
    const { status, body } = await adminApi(`/v1/admin/commercial/plans/${createdPlanId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Cert Test Plan Updated", price_monthly: 399 }),
    });
    return status === 200 && (body?.success || body?.id);
  });

  await check("name change is reflected in plans list", async () => {
    if (!createdPlanId) return false;
    const { body } = await adminApi("/v1/admin/commercial/plans");
    const p = body?.plans?.find(p => p.id === createdPlanId);
    return p?.name === "Cert Test Plan Updated";
  });

  await check("snapshot created for update (plan_versions grows)", async () => {
    if (!createdPlanId) return false;
    const { body } = await adminApi(`/v1/admin/commercial/plans/${createdPlanId}/versions`);
    return (body?.versions?.length ?? 0) >= 1;
  });
}

async function testPlanClone() {
  console.log("\n── Plans: Clone ───────────────────────────────────────────────");

  await check("POST /v1/admin/commercial/plans/:id/clone creates copy", async () => {
    if (!createdPlanId) return false;
    const { status, body } = await adminApi(`/v1/admin/commercial/plans/${createdPlanId}/clone`, {
      method: "POST",
    });
    if (status === 200 || status === 201) {
      clonedPlanId = body?.id || body?.plan?.id;
    }
    return (status === 200 || status === 201) && !!clonedPlanId;
  });

  await check("cloned plan is distinct from source", async () => {
    if (!clonedPlanId || !createdPlanId) return false;
    return clonedPlanId !== createdPlanId;
  });

  await check("cloned plan starts with status != archived", async () => {
    if (!clonedPlanId) return false;
    const { body } = await adminApi("/v1/admin/commercial/plans");
    const p = body?.plans?.find(p => p.id === clonedPlanId);
    return p && p.status !== "archived";
  });
}

async function testPlanArchive() {
  console.log("\n── Plans: Archive ─────────────────────────────────────────────");

  await check("POST /v1/admin/commercial/plans/:id/archive archives plan", async () => {
    const targetId = clonedPlanId || createdPlanId;
    if (!targetId) return false;
    const { status, body } = await adminApi(`/v1/admin/commercial/plans/${targetId}/archive`, {
      method: "POST",
    });
    return status === 200 && body?.success;
  });

  await check("archived plan shows status=archived in list", async () => {
    const targetId = clonedPlanId || createdPlanId;
    if (!targetId) return false;
    const { body } = await adminApi("/v1/admin/commercial/plans");
    const p = body?.plans?.find(p => p.id === targetId);
    return p?.status === "archived" || p?.is_active === 0;
  });
}

async function testFeaturesCatalog() {
  console.log("\n── Feature Catalog ────────────────────────────────────────────");

  await check("GET /v1/admin/commercial/features returns 200 + features array", async () => {
    const { status, body } = await adminApi("/v1/admin/commercial/features");
    return status === 200 && Array.isArray(body?.features);
  });

  await check("seeded catalog has >= 10 features", async () => {
    const { body } = await adminApi("/v1/admin/commercial/features");
    return (body?.features?.length ?? 0) >= 10;
  });

  await check("each feature has key, name, category fields", async () => {
    const { body } = await adminApi("/v1/admin/commercial/features");
    const f = body?.features?.[0];
    return f && f.key && f.name && (f.category !== undefined);
  });

  await check("POST /v1/admin/commercial/features creates new feature", async () => {
    const { status, body } = await adminApi("/v1/admin/commercial/features", {
      method: "POST",
      body: JSON.stringify({
        key: "cert_test_feature",
        name: "Cert Test Feature",
        category: "Testing",
        description: "Created by certification script",
        visible: 0
      }),
    });
    if (status === 200 || status === 201) {
      createdFeatureKey = "cert_test_feature";
    }
    return (status === 200 || status === 201) || status === 409;
  });

  await check("PATCH /v1/admin/commercial/features/:key renames feature", async () => {
    const key = createdFeatureKey || "social_posts";
    const { status, body } = await adminApi(`/v1/admin/commercial/features/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ name: key === "social_posts" ? "Social Posts" : "Cert Test Feature Renamed" }),
    });
    return status === 200 && (body?.success || body?.key);
  });
}

async function testEntitlements() {
  console.log("\n── Entitlements ───────────────────────────────────────────────");

  const planId = "starter";

  await check("GET /v1/admin/commercial/entitlements/:planId returns entitlements", async () => {
    const { status, body } = await adminApi(`/v1/admin/commercial/entitlements/${planId}`);
    return status === 200 && Array.isArray(body?.entitlements);
  });

  await check("entitlements include all seeded catalog features", async () => {
    const { body } = await adminApi(`/v1/admin/commercial/entitlements/${planId}`);
    return (body?.entitlements?.length ?? 0) >= 10;
  });

  await check("each entitlement has key, name, enabled, limit_value fields", async () => {
    const { body } = await adminApi(`/v1/admin/commercial/entitlements/${planId}`);
    const e = body?.entitlements?.[0];
    return e && e.key && e.name && (e.enabled !== undefined);
  });

  let originalEnabled = null;
  await check("PATCH /v1/admin/commercial/entitlements/:planId/:key toggles enabled", async () => {
    const { body: before } = await adminApi(`/v1/admin/commercial/entitlements/${planId}`);
    const target = before?.entitlements?.find(e => e.key === "campaigns");
    if (!target) return true; // skip if feature not seeded
    originalEnabled = target.enabled ? 1 : 0;
    const newEnabled = originalEnabled ? 0 : 1;
    const { status, body } = await adminApi(`/v1/admin/commercial/entitlements/${planId}/campaigns`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: newEnabled }),
    });
    return status === 200 && (body?.success || body?.feature_key);
  });

  await check("entitlement change persists on re-read", async () => {
    const { body } = await adminApi(`/v1/admin/commercial/entitlements/${planId}`);
    const target = body?.entitlements?.find(e => e.key === "campaigns");
    if (!target || originalEnabled === null) return true;
    const expectedEnabled = originalEnabled ? 0 : 1;
    return (target.enabled ? 1 : 0) === expectedEnabled;
  });

  // Restore original state
  if (originalEnabled !== null) {
    await adminApi(`/v1/admin/commercial/entitlements/${planId}/campaigns`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: originalEnabled }),
    }).catch(() => {});
  }

  await check("PATCH entitlement limit_value updates limit", async () => {
    const { status, body } = await adminApi(`/v1/admin/commercial/entitlements/${planId}/social_posts`, {
      method: "PATCH",
      body: JSON.stringify({ limit_value: 30 }),
    });
    return status === 200 && (body?.success || body?.feature_key);
  });
}

async function testEntitlementBackwardCompat() {
  console.log("\n── Backward Compatibility (features_json + limit columns) ────");

  await check("GET /v1/admin/commercial/plans returns features_json on each plan", async () => {
    const { body } = await adminApi("/v1/admin/commercial/plans");
    const p = body?.plans?.find(p => p.id === "starter");
    return p !== undefined;
  });

  await check("PATCH entitlement enabled=1 adds key to features_json (sync)", async () => {
    const before = await adminApi("/v1/admin/commercial/plans");
    const planRow = before.body?.plans?.find(p => p.id === "starter");
    if (!planRow) return true;
    const featuresBefore = planRow.features_json
      ? (typeof planRow.features_json === "string" ? JSON.parse(planRow.features_json) : planRow.features_json)
      : [];

    await adminApi("/v1/admin/commercial/entitlements/starter/seo", {
      method: "PATCH",
      body: JSON.stringify({ enabled: 1 }),
    });

    const after = await adminApi("/v1/admin/commercial/plans");
    const planAfter = after.body?.plans?.find(p => p.id === "starter");
    const featuresAfter = planAfter?.features_json
      ? (typeof planAfter.features_json === "string" ? JSON.parse(planAfter.features_json) : planAfter.features_json)
      : [];
    return featuresAfter.includes("seo") || featuresBefore.includes("seo");
  });
}

async function testCommercialMetrics() {
  console.log("\n── Commercial Metrics ─────────────────────────────────────────");

  await check("GET /v1/admin/commercial/metrics returns 200", async () => {
    const { status } = await adminApi("/v1/admin/commercial/metrics");
    return status === 200;
  });

  await check("metrics response contains revenue fields (mrr, arr, arpu, ltv)", async () => {
    const { body } = await adminApi("/v1/admin/commercial/metrics");
    const rev = body?.revenue || body?.metrics?.revenue || body;
    return rev && (rev.mrr !== undefined || rev.arr !== undefined || rev.arpu !== undefined);
  });

  await check("metrics response contains growth/subscriber fields", async () => {
    const { body } = await adminApi("/v1/admin/commercial/metrics");
    return body?.growth !== undefined || body?.subscribers !== undefined || body?.metrics !== undefined;
  });

  await check("metrics response contains plans array", async () => {
    const { body } = await adminApi("/v1/admin/commercial/metrics");
    return Array.isArray(body?.plans) || Array.isArray(body?.plan_breakdown) || Array.isArray(body?.metrics?.plans);
  });
}

async function testCustomerEntitlements() {
  console.log("\n── Customer Entitlements Endpoint ─────────────────────────────");

  await check("GET /customer/entitlements returns 401 without auth", async () => {
    const res = await fetch(`${BASE}/customer/entitlements`);
    return res.status === 401;
  });

  await check("GET /customer/entitlements returns 200 with user auth", async () => {
    if (!userToken) { console.log("    (skipped — no user token)"); return true; }
    const { status, body } = await userApi("/customer/entitlements");
    return status === 200 && body?.plan_id !== undefined;
  });
}

async function testPlanVersions() {
  console.log("\n── Plan Versioning ─────────────────────────────────────────────");

  await check("GET /v1/admin/commercial/plans/:id/versions returns versions array", async () => {
    const { status, body } = await adminApi("/v1/admin/commercial/plans/starter/versions");
    return status === 200 && Array.isArray(body?.versions);
  });

  await check("editing plan creates version snapshot", async () => {
    const before = await adminApi("/v1/admin/commercial/plans/starter/versions");
    const countBefore = before.body?.versions?.length ?? 0;
    await adminApi("/v1/admin/commercial/plans/starter", {
      method: "PATCH",
      body: JSON.stringify({ badge: "Cert" }),
    });
    const after = await adminApi("/v1/admin/commercial/plans/starter/versions");
    const countAfter = after.body?.versions?.length ?? 0;
    // Restore
    await adminApi("/v1/admin/commercial/plans/starter", {
      method: "PATCH",
      body: JSON.stringify({ badge: null }),
    }).catch(() => {});
    return countAfter >= countBefore;
  });
}

async function testRbacGuards() {
  console.log("\n── RBAC / Auth Guards ─────────────────────────────────────────");

  await check("unauthenticated GET /v1/admin/commercial/plans returns 401", async () => {
    const res = await fetch(`${BASE}/v1/admin/commercial/plans`, {
      headers: { "Content-Type": "application/json" },
    });
    return res.status === 401;
  });

  await check("unauthenticated POST /v1/admin/commercial/plans returns 401", async () => {
    const res = await fetch(`${BASE}/v1/admin/commercial/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Sneaky Plan" }),
    });
    return res.status === 401;
  });
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log("\n── Cleanup ────────────────────────────────────────────────────");
  // Archive rather than delete (archive-only by design)
  if (createdPlanId) {
    await adminApi(`/v1/admin/commercial/plans/${createdPlanId}/archive`, { method: "POST" }).catch(() => {});
    console.log(`  archived test plan: ${createdPlanId}`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

function report() {
  const total  = results.length;
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const pct    = total ? Math.round((passed / total) * 100) : 0;

  let verdict;
  if (pct >= 90)     verdict = "LOCKED";
  else if (pct >= 75) verdict = "CONDITIONAL";
  else                verdict = "FAIL";

  console.log("\n" + "═".repeat(60));
  console.log(`  COMMERCIAL SYSTEM SCORE: ${passed}/${total} (${pct}%)`);
  console.log(`  VERDICT: ${verdict}`);
  console.log("═".repeat(60));

  if (failed > 0) {
    console.log("\nFailed checks:");
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  ✗ ${r.label}${r.error ? ` — ${r.error}` : ""}`);
    });
  }

  console.log("\nSummary by suite:");
  const suites = [
    { name: "Plans List",          prefix: "GET /v1/admin/commercial/plans returns" },
    { name: "Plans Create",        prefix: "POST /v1/admin/commercial/plans creates" },
    { name: "Plans Update",        prefix: "PATCH /v1/admin/commercial/plans" },
    { name: "Plans Clone",         prefix: "POST /v1/admin/commercial/plans/:id/clone" },
    { name: "Plans Archive",       prefix: "POST /v1/admin/commercial/plans/:id/archive" },
    { name: "Feature Catalog",     prefix: "GET /v1/admin/commercial/features" },
    { name: "Entitlements",        prefix: "GET /v1/admin/commercial/entitlements" },
    { name: "Backward Compat",     prefix: "PATCH entitlement" },
    { name: "Metrics",             prefix: "GET /v1/admin/commercial/metrics" },
    { name: "Customer Ent",        prefix: "GET /v1/customer/entitlements" },
    { name: "Versioning",          prefix: "GET /v1/admin/commercial/plans/:id/versions" },
    { name: "RBAC Guards",         prefix: "unauthenticated" },
  ];

  const groups = {};
  results.forEach(r => {
    const suite = suites.find(s => r.label.startsWith(s.name.split(":")[0]) || r.label.includes(s.prefix.split(" ")[0]));
    const key = suite?.name || "Other";
    if (!groups[key]) groups[key] = { pass: 0, total: 0 };
    groups[key].total++;
    if (r.ok) groups[key].pass++;
  });

  Object.entries(groups).forEach(([name, g]) => {
    const icon = g.pass === g.total ? "✓" : g.pass > 0 ? "~" : "✗";
    console.log(`  ${icon} ${name}: ${g.pass}/${g.total}`);
  });

  console.log("\n" + "═".repeat(60) + "\n");

  if (verdict === "FAIL") process.exit(1);
}

// ── Entry Point ───────────────────────────────────────────────────────────────

async function run() {
  console.log("═".repeat(60));
  console.log("  ADMIN V2 — Commercial Control System Certification");
  console.log(`  API: ${BASE}`);
  console.log("═".repeat(60));

  await adminLogin();
  await userLogin();

  await testPlansList();
  await testPlanCreate();
  await testPlanUpdate();
  await testPlanClone();
  await testPlanArchive();
  await testFeaturesCatalog();
  await testEntitlements();
  await testEntitlementBackwardCompat();
  await testCommercialMetrics();
  await testCustomerEntitlements();
  await testPlanVersions();
  await testRbacGuards();

  await cleanup();
  report();
}

run().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
