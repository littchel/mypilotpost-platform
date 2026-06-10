/**
 * ENGINE 15 — Admin, Governance & Platform Operations Certification Test
 *
 * Verifies: admin isolation, RBAC, audit trail coverage, ops security,
 *           customer data protection, stub endpoint auth.
 *
 * Run:  node verification/admin_certification.js <API_BASE> <ADMIN_JWT>
 *
 * Optional env vars:
 *   CUSTOMER_JWT  — JWT for a regular customer (brand 'admin' role) — for escalation tests
 *
 * All assertions print PASS / FAIL with root-cause detail.
 */

const API        = process.argv[2] || process.env.API_BASE || 'http://localhost:8787';
const ADMIN_JWT  = process.argv[3] || process.env.ADMIN_JWT;
const CUSTOMER_JWT = process.env.CUSTOMER_JWT;

if (!ADMIN_JWT) {
  console.error('Usage: node admin_certification.js <API_BASE> <ADMIN_JWT>');
  console.error('       Set CUSTOMER_JWT env var to run escalation tests');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
    failures.push({ label, detail });
  }
}

async function api(path, { method = 'GET', body, token = ADMIN_JWT } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ENGINE 15 — Admin & Governance Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Admin Auth Gate ───────────────────────────────────────────────────────
  console.log('── 1. Admin Auth Gate');

  // Unauthenticated requests to admin routes must be rejected
  const unauthUsers = await api('/api/v1/admin/users', { token: null });
  assert('Unauthenticated admin request returns 401', unauthUsers.status === 401, `got ${unauthUsers.status}`);

  const unauthBilling = await api('/api/v1/admin/billing/overview', { token: null });
  assert('Unauthenticated billing/overview returns 401', unauthBilling.status === 401, `got ${unauthBilling.status}`);

  // ── 2. Admin Session & Profile ───────────────────────────────────────────────
  console.log('\n── 2. Admin Session & Profile');

  const sessionRes = await api('/api/admin/session');
  assert('Admin session returns 200', sessionRes.status === 200, `got ${sessionRes.status}`);
  assert('Session has user_id', Boolean(sessionRes.data?.user_id), `data=${JSON.stringify(sessionRes.data)}`);
  assert('Session has role', Boolean(sessionRes.data?.role), `got role=${sessionRes.data?.role}`);

  const profileRes = await api('/api/admin/profile');
  assert('Admin profile returns 200', profileRes.status === 200, `got ${profileRes.status}`);
  assert('Profile has is_admin:true', profileRes.data?.is_admin === true, `got is_admin=${profileRes.data?.is_admin}`);

  // ── 3. Admin User Management ─────────────────────────────────────────────────
  console.log('\n── 3. Admin User Management');

  const usersRes = await api('/api/v1/admin/users');
  assert('GET /api/v1/admin/users returns 200', usersRes.status === 200, `got ${usersRes.status}`);
  assert('Users list has data array', Array.isArray(usersRes.data?.data), `got ${typeof usersRes.data?.data}`);

  // ── 4. Stub Endpoints Require Auth ────────────────────────────────────────────
  console.log('\n── 4. Stub Endpoint Auth (REPAIRED — was unauthenticated)');

  const stubPaths = [
    '/api/v1/admin/memory',
    '/api/v1/admin/seo/overview',
    '/api/v1/admin/automation/rules',
    '/api/v1/admin/ml/health',
    '/api/v1/admin/experiments',
  ];

  for (const stubPath of stubPaths) {
    const unauthRes = await api(stubPath, { token: null });
    assert(
      `${stubPath} requires auth (401 without token)`,
      unauthRes.status === 401,
      `got ${unauthRes.status}`,
    );
  }

  // Stub endpoints should also return 200 WITH a valid admin token
  const stubAuth = await api('/api/v1/admin/memory');
  assert('Admin stub /memory accessible with admin token', stubAuth.status === 200, `got ${stubAuth.status}`);

  // ── 5. Internal Ops — Customer JWT Escalation Prevention (REPAIRED) ─────────
  console.log('\n── 5. Internal Ops Escalation Prevention (REPAIRED)');

  if (CUSTOMER_JWT) {
    // A customer JWT (even with brand role 'admin') must not access internal ops endpoints.
    // These were previously protected by requireAdmin (customer-compatible) — now requireAdminAuth.
    const internalDelivery = await api('/api/internal/delivery/run', {
      method: 'POST',
      token: CUSTOMER_JWT,
    });
    assert(
      'Customer JWT cannot call /api/internal/delivery/run (401/403)',
      internalDelivery.status === 401 || internalDelivery.status === 403,
      `got ${internalDelivery.status}`,
    );

    const internalIntelligence = await api('/api/internal/intelligence/run', {
      method: 'POST',
      token: CUSTOMER_JWT,
    });
    assert(
      'Customer JWT cannot call /api/internal/intelligence/run (401/403)',
      internalIntelligence.status === 401 || internalIntelligence.status === 403,
      `got ${internalIntelligence.status}`,
    );
  } else {
    console.log('  SKIP  CUSTOMER_JWT not set — escalation tests skipped');
  }

  // Admin JWT should be able to call internal ops (operations check)
  const adminDeliveryRes = await api('/api/internal/delivery/run', { method: 'POST' });
  assert(
    'Admin JWT can call /api/internal/delivery/run (200)',
    adminDeliveryRes.status === 200,
    `got ${adminDeliveryRes.status}`,
  );

  // ── 6. Billing & MRR ─────────────────────────────────────────────────────────
  console.log('\n── 6. Admin Billing & MRR');

  const billingRes = await api('/api/v1/admin/billing/overview');
  assert('Billing overview returns 200', billingRes.status === 200, `got ${billingRes.status}`);

  const mrrRes = await api('/api/v1/admin/billing/mrr-history');
  assert('MRR history returns 200', mrrRes.status === 200, `got ${mrrRes.status}`);
  assert('MRR history has array', Array.isArray(mrrRes.data?.history), `got ${typeof mrrRes.data?.history}`);

  // ── 7. Support Administration ────────────────────────────────────────────────
  console.log('\n── 7. Support Administration');

  const supportRes = await api('/api/v1/admin/support/requests');
  assert('Support requests returns 200', supportRes.status === 200, `got ${supportRes.status}`);
  assert('Support has data array', Array.isArray(supportRes.data?.data), `got ${typeof supportRes.data?.data}`);

  const threadsRes = await api('/api/v1/admin/support/threads');
  assert('Support threads returns 200', threadsRes.status === 200, `got ${threadsRes.status}`);

  // Test support update with invalid status (now validated)
  const invalidStatusUpdate = await api('/api/v1/admin/support/requests/nonexistent-id', {
    method: 'PUT',
    body: { status: 'totally_invalid_status' },
  });
  assert(
    'Support update with invalid status returns 400',
    invalidStatusUpdate.status === 400,
    `got ${invalidStatusUpdate.status}`,
  );

  // ── 8. Pricing & Plans ───────────────────────────────────────────────────────
  console.log('\n── 8. Pricing Administration');

  const pricingRes = await api('/api/v1/admin/pricing');
  assert('Pricing list returns 200', pricingRes.status === 200, `got ${pricingRes.status}`);
  assert('Pricing has plans array', Array.isArray(pricingRes.data?.plans), `got ${typeof pricingRes.data?.plans}`);

  // ── 9. Compliance & Audit ────────────────────────────────────────────────────
  console.log('\n── 9. Compliance & Audit Trail');

  const auditRes = await api('/api/v1/admin/compliance/audit-log');
  assert('Compliance audit-log returns 200', auditRes.status === 200, `got ${auditRes.status}`);

  const deletionsRes = await api('/api/v1/admin/compliance/deletions');
  assert('Compliance deletions returns 200', deletionsRes.status === 200, `got ${deletionsRes.status}`);

  const exportsRes = await api('/api/v1/admin/compliance/exports');
  assert('Compliance exports returns 200', exportsRes.status === 200, `got ${exportsRes.status}`);

  // ── 10. System Status & Observability ────────────────────────────────────────
  console.log('\n── 10. System Status & Observability');

  const statusRes = await api('/api/v1/admin/system/status');
  assert('System status returns 200', statusRes.status === 200, `got ${statusRes.status}`);

  const eventsRes = await api('/api/v1/admin/system/events');
  assert('System events returns 200', eventsRes.status === 200, `got ${eventsRes.status}`);

  const opsHealthRes = await api('/api/v1/admin/operations/health');
  assert('Operations health returns 200', opsHealthRes.status === 200, `got ${opsHealthRes.status}`);

  // ── 11. Delivery Analytics ───────────────────────────────────────────────────
  console.log('\n── 11. Delivery Analytics');

  const deliveryRes = await api('/api/v1/admin/analytics/delivery');
  assert('Delivery analytics returns 200', deliveryRes.status === 200, `got ${deliveryRes.status}`);

  // ── Results ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} PASSED, ${failed} FAILED`);

  if (failures.length > 0) {
    console.log('\n  Failed assertions:');
    for (const f of failures) {
      console.log(`    • ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
    }
  }

  const verdict = failed === 0 ? 'PASS' : failed <= 2 ? 'CONDITIONAL' : 'FAIL';
  console.log(`\n  Verdict: ${verdict}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Certification runner crashed:', err);
  process.exit(2);
});
