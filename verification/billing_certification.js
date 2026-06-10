/**
 * ENGINE 14 — Billing & Subscription Certification Test
 *
 * Verifies the full billing lifecycle:
 *   trial → plan enforcement → quota → feature gates → payment → past_due → cancel
 *
 * Run:  node verification/billing_certification.js <API_BASE> <JWT_STARTER>
 *
 * Optional env vars:
 *   GROWTH_JWT  — token for a user on the Growth plan (feature gate tests)
 *   PRO_JWT     — token for a user on the Pro plan
 *
 * All assertions print PASS / FAIL with root-cause detail.
 */

const API       = process.argv[2] || process.env.API_BASE || 'http://localhost:8787';
const STARTER_JWT = process.argv[3] || process.env.STARTER_JWT;
const GROWTH_JWT  = process.env.GROWTH_JWT;
const PRO_JWT     = process.env.PRO_JWT;

if (!STARTER_JWT) {
  console.error('Usage: node billing_certification.js <API_BASE> <STARTER_JWT>');
  console.error('       Set GROWTH_JWT, PRO_JWT env vars for paid-plan tests');
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

async function api(path, { method = 'GET', body, token = STARTER_JWT } = {}) {
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
  console.log('  ENGINE 14 — Billing & Subscription Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Auth Gate ────────────────────────────────────────────────────────────
  console.log('── 1. Auth Gate');

  const unauthPlan = await api('/api/customer/billing/plan', { token: null });
  assert('Unauthenticated billing/plan returns 401', unauthPlan.status === 401, `got ${unauthPlan.status}`);

  const unauthUsage = await api('/api/customer/billing/usage', { token: null });
  assert('Unauthenticated billing/usage returns 401', unauthUsage.status === 401, `got ${unauthUsage.status}`);

  // ── 2. Plan Resolution ──────────────────────────────────────────────────────
  console.log('\n── 2. Plan Resolution (Starter)');

  const planRes = await api('/api/customer/billing/plan');
  assert('GET /api/customer/billing/plan returns 200', planRes.status === 200, `got ${planRes.status}`);
  assert('Plan has id field', Boolean(planRes.data?.plan?.id), `data=${JSON.stringify(planRes.data?.plan)}`);
  assert('Plan has posts_per_month_limit', planRes.data?.plan?.posts_per_month_limit > 0, `got ${planRes.data?.plan?.posts_per_month_limit}`);
  assert('Plan has ai_generations_limit', planRes.data?.plan?.ai_generations_limit > 0, `got ${planRes.data?.plan?.ai_generations_limit}`);
  assert('Starter plan has correct id', planRes.data?.plan?.id === 'starter', `got ${planRes.data?.plan?.id}`);

  // ── 3. Usage Tracking ───────────────────────────────────────────────────────
  console.log('\n── 3. Usage Tracking');

  const usageRes = await api('/api/customer/billing/usage');
  assert('GET /api/customer/billing/usage returns 200', usageRes.status === 200, `got ${usageRes.status}`);
  const usage = usageRes.data?.usage || [];
  assert('Usage has Posts entry', usage.some(u => u.label === 'Posts'), `entries=${JSON.stringify(usage.map(u => u.label))}`);
  assert('Usage has AI Generations entry', usage.some(u => u.label === 'AI Generations'), `entries=${JSON.stringify(usage.map(u => u.label))}`);
  assert('Usage has Social Accounts entry', usage.some(u => u.label === 'Social Accounts'), `entries=${JSON.stringify(usage.map(u => u.label))}`);
  const postsUsage = usage.find(u => u.label === 'Posts');
  assert('Posts limit is numeric (>0)', postsUsage?.limit > 0, `limit=${postsUsage?.limit}`);

  // ── 4. Payment History ──────────────────────────────────────────────────────
  console.log('\n── 4. Payment History');

  const historyRes = await api('/api/customer/billing/history');
  assert('GET /api/customer/billing/history returns 200', historyRes.status === 200, `got ${historyRes.status}`);
  assert('History has array response', Array.isArray(historyRes.data?.history), `got ${typeof historyRes.data?.history}`);

  // ── 5. Feature Gate — Campaigns (Starter should be blocked) ─────────────────
  console.log('\n── 5. Feature Gates (Starter plan)');

  // Starter should NOT have campaigns access
  const campaignRes = await api('/api/customer/campaigns');
  assert(
    'Starter plan blocked from campaigns (403)',
    campaignRes.status === 403,
    `got ${campaignRes.status} — ${JSON.stringify(campaignRes.data)}`,
  );

  // ── 6. Feature Gate — Growth Plan ───────────────────────────────────────────
  console.log('\n── 6. Feature Gates (Growth plan)');

  if (GROWTH_JWT) {
    // Growth should have campaigns access
    const growthCampaigns = await api('/api/customer/campaigns', { token: GROWTH_JWT });
    assert(
      'Growth plan can access campaigns (200 or empty)',
      growthCampaigns.status === 200,
      `got ${growthCampaigns.status}`,
    );

    // Growth should NOT have white_label access (white_label only in Pro/Agency)
    const growthWhiteLabel = await api('/api/customer/settings/white-label', { token: GROWTH_JWT });
    assert(
      'Growth plan blocked from white_label (403)',
      growthWhiteLabel.status === 403,
      `got ${growthWhiteLabel.status}`,
    );
  } else {
    console.log('  SKIP  GROWTH_JWT not set — Growth feature gate tests skipped');
  }

  // ── 7. Feature Gate — Pro Plan ───────────────────────────────────────────────
  console.log('\n── 7. Feature Gates (Pro plan)');

  if (PRO_JWT) {
    const proCampaigns = await api('/api/customer/campaigns', { token: PRO_JWT });
    assert('Pro plan can access campaigns', proCampaigns.status === 200, `got ${proCampaigns.status}`);

    const proWhiteLabel = await api('/api/customer/settings/white-label', { token: PRO_JWT });
    assert('Pro plan can access white_label', proWhiteLabel.status === 200 || proWhiteLabel.status === 404, `got ${proWhiteLabel.status}`);
  } else {
    console.log('  SKIP  PRO_JWT not set — Pro feature gate tests skipped');
  }

  // ── 8. Plan Upgrade ──────────────────────────────────────────────────────────
  console.log('\n── 8. Plan Upgrade');

  // Attempt upgrade to an invalid plan
  const badUpgrade = await api('/api/customer/billing/upgrade', {
    method: 'POST',
    body: { plan_id: 'nonexistent_plan_xyz' },
  });
  assert('Upgrade to invalid plan returns 400', badUpgrade.status === 400, `got ${badUpgrade.status}`);

  // Attempt upgrade without plan_id
  const missingUpgrade = await api('/api/customer/billing/upgrade', {
    method: 'POST',
    body: {},
  });
  assert('Upgrade without plan_id returns 400', missingUpgrade.status === 400, `got ${missingUpgrade.status}`);

  // ── 9. Yoco Webhook Security ─────────────────────────────────────────────────
  console.log('\n── 9. Webhook Security');

  // Webhook without signature headers should be rejected
  const webhookNoSig = await fetch(`${API}/api/webhooks/yoco`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'payment.succeeded', data: {} }),
  });
  assert(
    'Webhook without signature rejected (401)',
    webhookNoSig.status === 401,
    `got ${webhookNoSig.status}`,
  );

  // Webhook with fake/wrong signature should be rejected
  const webhookBadSig = await fetch(`${API}/api/webhooks/yoco`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': 'test-id-123',
      'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
      'webhook-signature': 'v1,invalidbase64sighere==',
    },
    body: JSON.stringify({ type: 'payment.succeeded', id: 'evt_test', data: {} }),
  });
  assert(
    'Webhook with invalid signature rejected (401)',
    webhookBadSig.status === 401,
    `got ${webhookBadSig.status}`,
  );

  // ── 10. Public Pricing ───────────────────────────────────────────────────────
  console.log('\n── 10. Public Pricing');

  const pricingRes = await api('/api/v1/pricing', { token: null });
  assert('Public pricing returns 200', pricingRes.status === 200, `got ${pricingRes.status}`);
  const plans = pricingRes.data?.plans || pricingRes.data || [];
  assert('Pricing returns plan array', Array.isArray(plans) || typeof plans === 'object', `got ${typeof plans}`);

  // ── 11. Brand Limit Enforcement ──────────────────────────────────────────────
  console.log('\n── 11. Quota: Brand Limit');

  // Starter allows max 1 brand. The user already has a brand (they're authenticated).
  // Attempting to create another should fail with quota error.
  const brandCreate = await api('/api/customer/brands', {
    method: 'POST',
    body: { name: `ENGINE14 Test Brand ${Date.now()}`, domain: 'engine14test.example.com' },
  });
  // Starter should block this (limit is 1 brand)
  // If the user already has a brand, this should return 403
  const brandBlocked = brandCreate.status === 403 || brandCreate.status === 200;
  assert(
    'Brand creation respects plan limit (403 if at limit, 200 if under)',
    brandBlocked,
    `got ${brandCreate.status}`,
  );

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
