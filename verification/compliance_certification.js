/**
 * ENGINE 22 — Support, Trust & Compliance Engine Certification Test
 *
 * Tests: deletion lifecycle, GDPR export, live support, email trust,
 *        unsubscribe security, consent, audit log, open redirect guard.
 *
 * Run:  node verification/compliance_certification.js <API_BASE> <USER_JWT> [ADMIN_JWT]
 *
 * USER_JWT  — valid JWT for a regular customer
 * ADMIN_JWT — optional JWT for an admin user (enables admin endpoint tests)
 */

const API       = process.argv[2] || process.env.API_BASE  || 'http://localhost:8787';
const USER_JWT  = process.argv[3] || process.env.USER_JWT;
const ADMIN_JWT = process.argv[4] || process.env.ADMIN_JWT || null;

if (!USER_JWT) {
  console.error('Usage: node compliance_certification.js <API_BASE> <USER_JWT> [ADMIN_JWT]');
  process.exit(1);
}

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

async function api(path, { method = 'GET', body, token = USER_JWT, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, headers: res.headers };
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ENGINE 22 — Support, Trust & Compliance Engine Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 1. Deletion Lifecycle ────────────────────────────────────────────────────
  console.log('── 1. Deletion Lifecycle');

  const deleteReqRes = await api('/api/customer/account/delete-request', {
    method: 'POST',
    body: { reason: 'cert_test' },
  });
  assert('POST /api/customer/account/delete-request returns 200',
    deleteReqRes.status === 200,
    `got ${deleteReqRes.status}`);
  assert('Response has scheduled_for',
    typeof deleteReqRes.data?.scheduled_for === 'string' || deleteReqRes.data?.already_pending === true,
    `got ${JSON.stringify(deleteReqRes.data)}`);

  const statusRes = await api('/api/customer/account/delete-status');
  assert('GET /api/customer/account/delete-status returns 200', statusRes.status === 200, `got ${statusRes.status}`);
  if (statusRes.data?.deletion_request) {
    assert('Delete status has status field',
      typeof statusRes.data.deletion_request.status === 'string',
      `got ${JSON.stringify(statusRes.data.deletion_request)}`);
  }

  const cancelRes = await api('/api/customer/account/delete-request', { method: 'DELETE' });
  assert('DELETE /api/customer/account/delete-request returns 200 or 404',
    [200, 404].includes(cancelRes.status),
    `got ${cancelRes.status}`);

  // Old dead route must be gone
  const oldRouteRes = await api('/api/customer/compliance/delete-account', { method: 'DELETE' });
  assert('Old DELETE /api/customer/compliance/delete-account returns 404 (route removed)',
    oldRouteRes.status === 404,
    `got ${oldRouteRes.status} — old parallel deletion route must be removed`);

  // ── 2. GDPR Data Export ──────────────────────────────────────────────────────
  console.log('\n── 2. GDPR Data Export');

  const exportRes = await fetch(`${API}/api/customer/data/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${USER_JWT}` },
  });
  assert('POST /api/customer/data/export returns 200', exportRes.status === 200, `got ${exportRes.status}`);

  if (exportRes.status === 200) {
    let exportData;
    try { exportData = await exportRes.json(); } catch { exportData = null; }

    assert('Export has completeness report', typeof exportData?.completeness === 'object',
      `got ${JSON.stringify(exportData)}`);
    assert('Export has delivery_jobs field (not scheduled_posts)',
      Array.isArray(exportData?.delivery_jobs),
      `got ${Object.keys(exportData || {}).join(', ')}`);
    assert('Export has connections field (not oauth_connections)',
      Array.isArray(exportData?.connections),
      `got ${Object.keys(exportData || {}).join(', ')}`);
    assert('Export has consent_history field',
      Array.isArray(exportData?.consent_history),
      `got ${Object.keys(exportData || {}).join(', ')}`);
    assert('Export does NOT have scheduled_posts field',
      !exportData?.hasOwnProperty('scheduled_posts'),
      `export contains deprecated scheduled_posts key`);
    assert('Export does NOT have oauth_connections field',
      !exportData?.hasOwnProperty('oauth_connections'),
      `export contains deprecated oauth_connections key`);
  }

  const historyRes = await api('/api/customer/data/export/history');
  assert('GET /api/customer/data/export/history returns 200', historyRes.status === 200, `got ${historyRes.status}`);

  // ── 3. Consent ────────────────────────────────────────────────────────────────
  console.log('\n── 3. Consent Management');

  const consentUpdateRes = await api('/api/customer/consent', {
    method: 'POST',
    body: { analytics_consent: true, marketing_consent: false },
  });
  assert('POST /api/customer/consent returns 200', consentUpdateRes.status === 200, `got ${consentUpdateRes.status}`);
  assert('Consent response has consent object',
    typeof consentUpdateRes.data?.consent === 'object',
    `got ${JSON.stringify(consentUpdateRes.data)}`);

  const consentGetRes = await api('/api/customer/consent');
  assert('GET /api/customer/consent returns 200', consentGetRes.status === 200, `got ${consentGetRes.status}`);

  // ── 4. Unsubscribe Security ──────────────────────────────────────────────────
  console.log('\n── 4. Unsubscribe Security');

  const unsubStatusRes = await api('/api/customer/lifecycle/unsubscribe-status');
  assert('GET /api/customer/lifecycle/unsubscribe-status returns 200',
    unsubStatusRes.status === 200, `got ${unsubStatusRes.status}`);
  assert('Unsubscribe status does NOT expose token',
    unsubStatusRes.data && !unsubStatusRes.data.hasOwnProperty('token'),
    `response contains token field — security leak`);
  assert('Unsubscribe status has subscribed field',
    typeof unsubStatusRes.data?.subscribed === 'boolean',
    `got ${JSON.stringify(unsubStatusRes.data)}`);

  // Category validation — invalid category must be rejected
  const badCategoryRes = await api('/api/unsubscribe/category', {
    method: 'POST',
    body: { token: 'fake_token', category: 'arbitrary_garbage' },
    token: null,
  });
  assert('Invalid unsubscribe category returns 400',
    badCategoryRes.status === 400,
    `got ${badCategoryRes.status} — arbitrary categories must be rejected`);

  // Valid categories should be accepted (will fail on invalid token, not category validation)
  const validCategoryRes = await api('/api/unsubscribe/category', {
    method: 'POST',
    body: { token: 'fake_token', category: 'marketing' },
    token: null,
  });
  assert('Valid unsubscribe category passes validation (fails on token, not category)',
    validCategoryRes.status === 404 || validCategoryRes.status === 400,
    `got ${validCategoryRes.status} — must be 404 (bad token) not 400 (bad category)`);
  if (validCategoryRes.status === 400) {
    assert('Valid category 400 error is not about category',
      !JSON.stringify(validCategoryRes.data).includes('Invalid category'),
      `got ${JSON.stringify(validCategoryRes.data)}`);
  }

  // ── 5. Open Redirect Guard ───────────────────────────────────────────────────
  console.log('\n── 5. Open Redirect Guard');

  // Attempt redirect to external domain — must be intercepted
  const externalRedirect = await fetch(
    `${API}/api/track/click?url=${encodeURIComponent('https://evil.example.com/steal')}`,
    { redirect: 'manual' }
  );
  const redirectTarget = externalRedirect.headers.get('location') || '';
  assert('trackEmailClick blocks external domain redirects',
    !redirectTarget.includes('evil.example.com'),
    `redirected to ${redirectTarget} — open redirect not blocked`);
  assert('trackEmailClick falls back to app.mypilotpost.com for invalid dest',
    redirectTarget.includes('mypilotpost.com') || externalRedirect.status === 302,
    `got ${externalRedirect.status} → ${redirectTarget}`);

  // Attempt javascript: URI
  const jsRedirect = await fetch(
    `${API}/api/track/click?url=${encodeURIComponent('javascript:alert(1)')}`,
    { redirect: 'manual' }
  );
  const jsTarget = jsRedirect.headers.get('location') || '';
  assert('trackEmailClick blocks javascript: URIs',
    !jsTarget.startsWith('javascript:'),
    `redirected to ${jsTarget}`);

  // Same-origin redirect must work
  const safeRedirect = await fetch(
    `${API}/api/track/click?url=${encodeURIComponent('https://app.mypilotpost.com/dashboard')}`,
    { redirect: 'manual' }
  );
  const safeTarget = safeRedirect.headers.get('location') || '';
  assert('trackEmailClick allows redirect to app.mypilotpost.com',
    safeTarget.includes('app.mypilotpost.com'),
    `got ${safeTarget}`);

  // ── 6. Live Support Bootstrap ────────────────────────────────────────────────
  console.log('\n── 6. Live Support Bootstrap (support_tickets table)');

  const supportAuthRes = await api('/api/v1/support/authorize', {
    method: 'POST',
    body: { other_id: crypto.randomUUID() },
  });
  // 200 = success, 500 = table missing (critical C3), 400 = validation error
  assert('POST /api/v1/support/authorize returns 200 or 400 (not 500)',
    [200, 400].includes(supportAuthRes.status),
    `got ${supportAuthRes.status} — 500 indicates support_tickets table is missing`);
  if (supportAuthRes.status === 200) {
    assert('Support authorize returns ticket ID',
      typeof supportAuthRes.data?.ticket === 'string',
      `got ${JSON.stringify(supportAuthRes.data)}`);
  }

  // ── 7. Support Endpoints Guarded ─────────────────────────────────────────────
  console.log('\n── 7. Support Auth Guards');

  const unauthHistory = await api('/api/v1/support/history/fake_id', { token: null });
  assert('Support history requires auth (401)', unauthHistory.status === 401, `got ${unauthHistory.status}`);

  const unauthUnread = await api('/api/v1/support/unread-count', { token: null });
  assert('Support unread-count requires auth (401)', unauthUnread.status === 401, `got ${unauthUnread.status}`);

  // test-broadcast must be removed
  const testBroadcastRes = await api('/api/v1/support/test-broadcast');
  assert('GET /api/v1/support/test-broadcast returns 404 (endpoint removed)',
    testBroadcastRes.status === 404,
    `got ${testBroadcastRes.status} — test endpoint must be removed from production`);

  // ── 8. Conversations Pagination ───────────────────────────────────────────────
  console.log('\n── 8. Conversations Pagination');

  if (ADMIN_JWT) {
    const convsRes = await api('/api/v1/support/conversations?limit=10&offset=0', { token: ADMIN_JWT });
    assert('GET /api/v1/support/conversations returns 200 for admin',
      convsRes.status === 200, `got ${convsRes.status}`);
    assert('Conversations response includes limit and offset',
      typeof convsRes.data?.limit === 'number' && typeof convsRes.data?.offset === 'number',
      `got ${JSON.stringify(convsRes.data)}`);
  } else {
    console.log('  INFO  No ADMIN_JWT provided — conversations pagination test skipped');
  }

  // ── 9. Admin Compliance Pagination ───────────────────────────────────────────
  console.log('\n── 9. Admin Compliance Pagination');

  if (ADMIN_JWT) {
    const deletionsRes = await api('/api/v1/admin/compliance/deletions?limit=10&offset=0', { token: ADMIN_JWT });
    assert('GET /api/v1/admin/compliance/deletions returns 200', deletionsRes.status === 200, `got ${deletionsRes.status}`);
    assert('Deletions response has limit and offset', typeof deletionsRes.data?.limit === 'number', `got ${JSON.stringify(deletionsRes.data)}`);

    const auditRes = await api('/api/v1/admin/compliance/audit-log?limit=10&offset=0', { token: ADMIN_JWT });
    assert('GET /api/v1/admin/compliance/audit-log returns 200', auditRes.status === 200, `got ${auditRes.status}`);
    assert('Audit log has ip_masked (not ip_address)',
      !auditRes.data?.events?.[0]?.hasOwnProperty?.('ip_address') || auditRes.data?.events?.length === 0,
      `response exposes raw ip_address — must be masked`);

    const exportsRes = await api('/api/v1/admin/compliance/exports?limit=10&offset=0', { token: ADMIN_JWT });
    assert('GET /api/v1/admin/compliance/exports returns 200', exportsRes.status === 200, `got ${exportsRes.status}`);
    assert('Exports response has offset', typeof exportsRes.data?.offset === 'number', `got ${JSON.stringify(exportsRes.data)}`);
  } else {
    console.log('  INFO  No ADMIN_JWT provided — admin compliance pagination tests skipped');
  }

  // ── 10. Auth Guards on Compliance Endpoints ───────────────────────────────────
  console.log('\n── 10. Compliance Auth Guards');

  const guards = [
    ['POST', '/api/customer/account/delete-request', 'delete request'],
    ['DELETE', '/api/customer/account/delete-request', 'delete cancel'],
    ['GET', '/api/customer/account/delete-status', 'delete status'],
    ['POST', '/api/customer/data/export', 'data export'],
    ['GET', '/api/customer/data/export/history', 'export history'],
    ['GET', '/api/customer/consent', 'consent get'],
    ['POST', '/api/customer/consent', 'consent update'],
  ];

  for (const [method, path, label] of guards) {
    const res = await api(path, { method, body: method === 'POST' ? {} : undefined, token: null });
    assert(`${label} requires auth (401)`, res.status === 401, `got ${res.status}`);
  }

  // ─── Results ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} PASSED, ${failed} FAILED`);

  if (failures.length > 0) {
    console.log('\n  Failed assertions:');
    for (const f of failures) {
      console.log(`    • ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
    }
  }

  const verdict = failed === 0 ? 'LOCKED' : failed <= 3 ? 'CONDITIONAL' : 'FAIL';
  console.log(`\n  Verdict: ${verdict}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Certification runner crashed:', err);
  process.exit(2);
});
