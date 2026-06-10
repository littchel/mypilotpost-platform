/**
 * ENGINE 15 ADDENDUM — Admin Portal Frontend Certification
 * Run against local wrangler dev (port 8788).
 * Usage: node verification/admin_frontend_certification.js
 */

const BASE = process.env.API_BASE || "http://localhost:8788/api";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@mypilotpost.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword";

let token = null;
const results = [];

async function login() {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`Login failed: ${data.error || res.status}`);
  token = data.token;
  console.log("✓ Login succeeded");
}

async function check(label, fn) {
  try {
    const ok = await fn();
    results.push({ label, ok, error: null });
    console.log(`${ok ? "✓" : "✗"} ${label}`);
  } catch (e) {
    results.push({ label, ok: false, error: e.message });
    console.log(`✗ ${label} — ${e.message}`);
  }
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...opts,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function run() {
  console.log(`\n=== Admin Portal Frontend Certification ===`);
  console.log(`API: ${BASE}\n`);

  await login();

  // ── Auth ──────────────────────────────────────────────────────────────────
  await check("GET /admin/session returns admin profile", async () => {
    const { status, body } = await api("/admin/session");
    return status === 200 && !!body?.email;
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  await check("GET /v1/admin/overview returns users + brands + delivery + alerts", async () => {
    const { status, body } = await api("/v1/admin/overview");
    return status === 200 && body?.users !== undefined && body?.brands !== undefined
      && body?.delivery !== undefined && body?.alerts !== undefined;
  });
  await check("GET /v1/admin/billing/overview returns MRR + distribution", async () => {
    const { status, body } = await api("/v1/admin/billing/overview");
    return status === 200 && body?.mrr !== undefined;
  });
  await check("GET /v1/admin/system/status returns operational status", async () => {
    const { status, body } = await api("/v1/admin/system/status");
    return status === 200 && body?.status !== undefined;
  });

  // ── Customers ─────────────────────────────────────────────────────────────
  await check("GET /v1/admin/customers returns data array", async () => {
    const { status, body } = await api("/v1/admin/customers");
    return status === 200 && Array.isArray(body?.data);
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  await check("GET /v1/admin/analytics/delivery returns total_jobs", async () => {
    const { status, body } = await api("/v1/admin/analytics/delivery");
    return status === 200 && body?.total_jobs !== undefined;
  });

  // ── Billing ───────────────────────────────────────────────────────────────
  await check("GET /v1/admin/billing/mrr-history returns history array", async () => {
    const { status, body } = await api("/v1/admin/billing/mrr-history");
    return status === 200 && Array.isArray(body?.history);
  });

  // ── Pricing ───────────────────────────────────────────────────────────────
  await check("GET /v1/admin/pricing returns plans array", async () => {
    const { status, body } = await api("/v1/admin/pricing");
    return status === 200 && Array.isArray(body?.plans);
  });

  // ── Promotions ────────────────────────────────────────────────────────────
  await check("GET /v1/admin/promotions returns promotions array", async () => {
    const { status, body } = await api("/v1/admin/promotions");
    return status === 200 && Array.isArray(body?.promotions);
  });

  // ── Blog ──────────────────────────────────────────────────────────────────
  await check("GET /v1/admin/blog returns posts", async () => {
    const { status, body } = await api("/v1/admin/blog");
    return status === 200 && (Array.isArray(body) || Array.isArray(body?.posts));
  });

  // ── Emails ────────────────────────────────────────────────────────────────
  await check("GET /v1/admin/emails/campaigns returns structured data (not 500)", async () => {
    const { status } = await api("/v1/admin/emails/campaigns");
    return status !== 500 && status !== 404;
  });
  await check("GET /v1/admin/emails/messages returns structured data (not 500)", async () => {
    const { status } = await api("/v1/admin/emails/messages");
    return status !== 500 && status !== 404;
  });

  // ── Campaigns ─────────────────────────────────────────────────────────────
  await check("GET /v1/admin/campaigns returns campaigns array", async () => {
    const { status, body } = await api("/v1/admin/campaigns");
    return status === 200 && Array.isArray(body?.campaigns);
  });

  // ── Approvals ─────────────────────────────────────────────────────────────
  await check("GET /v1/admin/approvals returns approvals array", async () => {
    const { status, body } = await api("/v1/admin/approvals?status=pending");
    return status === 200 && Array.isArray(body?.approvals);
  });

  // ── Support ───────────────────────────────────────────────────────────────
  await check("GET /v1/admin/support/threads returns threads", async () => {
    const { status, body } = await api("/v1/admin/support/threads");
    return status === 200 && Array.isArray(body?.threads);
  });
  await check("GET /v1/admin/support/requests returns paginated data", async () => {
    const { status, body } = await api("/v1/admin/support/requests?status=open");
    return status === 200 && Array.isArray(body?.data);
  });

  // ── Comms ─────────────────────────────────────────────────────────────────
  await check("GET /v1/admin/comms/delivery returns data array", async () => {
    const { status, body } = await api("/v1/admin/comms/delivery");
    return status === 200 && Array.isArray(body?.data);
  });

  // ── Memory ────────────────────────────────────────────────────────────────
  await check("GET /v1/admin/memory/events returns data array", async () => {
    const { status, body } = await api("/v1/admin/memory/events");
    return status === 200 && Array.isArray(body?.data);
  });
  await check("GET /v1/admin/memory/features returns data array", async () => {
    const { status, body } = await api("/v1/admin/memory/features");
    return status === 200 && Array.isArray(body?.data);
  });
  await check("GET /v1/admin/memory/brands returns data array", async () => {
    const { status, body } = await api("/v1/admin/memory/brands");
    return status === 200 && Array.isArray(body?.data);
  });

  // ── Operations ────────────────────────────────────────────────────────────
  await check("GET /v1/admin/operations/health returns health metrics", async () => {
    const { status, body } = await api("/v1/admin/operations/health");
    return status === 200 && body?.ai_generations_last_hour !== undefined;
  });

  // ── Controls ──────────────────────────────────────────────────────────────
  await check("GET /v1/admin/controls returns controls array", async () => {
    const { status, body } = await api("/v1/admin/controls");
    return status === 200 && Array.isArray(body?.controls);
  });

  // ── Audit Log ─────────────────────────────────────────────────────────────
  await check("GET /v1/admin/audit-log returns items + total", async () => {
    const { status, body } = await api("/v1/admin/audit-log");
    return status === 200 && Array.isArray(body?.items) && body?.total !== undefined;
  });
  await check("GET /v1/admin/audit-log supports action filter", async () => {
    const { status, body } = await api("/v1/admin/audit-log?action=login");
    return status === 200 && Array.isArray(body?.items);
  });

  // ── Integrations ──────────────────────────────────────────────────────────
  await check("GET /v1/admin/integrations/diagnostics returns brands + summary", async () => {
    const { status, body } = await api("/v1/admin/integrations/diagnostics");
    return status === 200 && body?.summary !== undefined && Array.isArray(body?.brands);
  });
  await check("GET /v1/admin/integrations/backfill/status returns runs", async () => {
    const { status, body } = await api("/v1/admin/integrations/backfill/status");
    return status === 200 && Array.isArray(body?.runs);
  });

  // ── Attribution ───────────────────────────────────────────────────────────
  await check("GET /v1/admin/attribution/diagnostics returns summary", async () => {
    const { status, body } = await api("/v1/admin/attribution/diagnostics");
    return status === 200 && body?.summary !== undefined;
  });

  // ── System Events ─────────────────────────────────────────────────────────
  await check("GET /v1/admin/system/events returns events array", async () => {
    const { status, body } = await api("/v1/admin/system/events");
    return status === 200 && Array.isArray(body?.events);
  });

  // ── Compliance ────────────────────────────────────────────────────────────
  await check("GET /v1/admin/compliance/deletions returns deletions", async () => {
    const { status, body } = await api("/v1/admin/compliance/deletions?status=pending");
    return status === 200 && Array.isArray(body?.deletions);
  });
  await check("GET /v1/admin/compliance/exports returns exports", async () => {
    const { status, body } = await api("/v1/admin/compliance/exports");
    return status === 200 && Array.isArray(body?.exports);
  });
  await check("GET /v1/admin/compliance/audit-log returns events", async () => {
    const { status, body } = await api("/v1/admin/compliance/audit-log");
    return status === 200 && (Array.isArray(body?.events) || Array.isArray(body?.results));
  });

  // ── Stubs return 503 (not fake 200) ───────────────────────────────────────
  await check("GET /v1/admin/memory (stub) returns 503 with stub:true", async () => {
    const { status, body } = await api("/v1/admin/memory");
    return status === 503 && body?.stub === true;
  });
  await check("GET /v1/admin/seo/overview (stub) returns 503", async () => {
    const { status } = await api("/v1/admin/seo/overview");
    return status === 503;
  });
  await check("GET /v1/admin/automation/rules (stub) returns 503", async () => {
    const { status } = await api("/v1/admin/automation/rules");
    return status === 503;
  });

  // ── Approval PATCH ────────────────────────────────────────────────────────
  await check("PATCH /v1/admin/approvals/:id rejects unknown ID with 404", async () => {
    const { status } = await api("/v1/admin/approvals/nonexistent-id", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
    });
    return status === 404;
  });
  await check("PATCH /v1/admin/approvals/:id rejects invalid status with 400", async () => {
    const { status } = await api("/v1/admin/approvals/nonexistent-id", {
      method: "PATCH",
      body: JSON.stringify({ status: "invalid_status" }),
    });
    return status === 400;
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  const pct  = Math.round((pass / results.length) * 100);

  console.log(`\n──────────────────────────────────────────`);
  console.log(`PASS: ${pass}  FAIL: ${fail}  TOTAL: ${results.length}  (${pct}%)`);

  if (fail > 0) {
    console.log(`\nFailed checks:`);
    results.filter(r => !r.ok).forEach(r => console.log(`  ✗ ${r.label}${r.error ? ` — ${r.error}` : ""}`));
  }

  const verdict = pct === 100 ? "LOCKED" : pct >= 85 ? "CONDITIONAL" : "FAIL";
  console.log(`\nVERDICT: ${verdict}`);
  if (verdict !== "LOCKED") process.exit(1);
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
