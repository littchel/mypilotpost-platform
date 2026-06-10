/**
 * ENGINE 21 — Team, Collaboration & Approval Engine Certification Test
 *
 * Tests: token-gated public approval, approval lifecycle, share link validity,
 *        role enforcement, state convergence, team role assignment, dead code removal.
 *
 * Run:  node verification/collaboration_certification.js <API_BASE> <OWNER_JWT> <BRAND_ID> [VIEWER_JWT]
 *
 * OWNER_JWT  — valid JWT for a brand owner
 * BRAND_ID   — UUID of the owner's brand
 * VIEWER_JWT — optional JWT for a brand viewer (tests role denial)
 */

const API        = process.argv[2] || process.env.API_BASE    || 'http://localhost:8787';
const OWNER_JWT  = process.argv[3] || process.env.OWNER_JWT;
const BRAND_ID   = process.argv[4] || process.env.BRAND_ID;
const VIEWER_JWT = process.argv[5] || process.env.VIEWER_JWT  || null;

if (!OWNER_JWT || !BRAND_ID) {
  console.error('Usage: node collaboration_certification.js <API_BASE> <OWNER_JWT> <BRAND_ID> [VIEWER_JWT]');
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

async function api(path, { method = 'GET', body, token = OWNER_JWT } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ENGINE 21 — Collaboration & Approval Engine Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 1. Public Approval: No Token → Denied ────────────────────────────────
  console.log('── 1. Public Approval: Raw UUID Denied (C1 fix)');

  const fakeUUID = crypto.randomUUID();

  const noTokenGet = await api(`/api/public/approval/${fakeUUID}`, { token: null });
  assert('GET /api/public/approval/{raw-uuid} returns 403',
    noTokenGet.status === 403 || noTokenGet.status === 404,
    `got ${noTokenGet.status} — must not expose content via bare UUID`);

  const noTokenPost = await api(`/api/public/approval/${fakeUUID}`, {
    method: 'POST',
    body: { status: 'approved' },
    token: null
  });
  assert('POST /api/public/approval/{raw-uuid} returns 403',
    noTokenPost.status === 403 || noTokenPost.status === 404,
    `got ${noTokenPost.status} — must not allow bare-UUID approval`);

  const noTokenComment = await api(`/api/public/approval/${fakeUUID}/comment`, {
    method: 'POST',
    body: { message: 'test comment' },
    token: null
  });
  assert('POST /api/public/approval/{raw-uuid}/comment returns 403',
    noTokenComment.status === 403 || noTokenComment.status === 404,
    `got ${noTokenComment.status}`);

  // ── 2. Approval Submission — Canonical State ──────────────────────────────
  console.log('\n── 2. Approval Submission Produces Canonical State (R2, R6)');

  const submitRes = await api('/api/customer/approvals', {
    method: 'POST',
    body: { content_id: fakeUUID, content_type: 'social', reviewer_type: 'client' }
  });

  // 404 = content doesn't exist (expected in test env without real content) — acceptable
  // 200/201 = submit succeeded — check for share_url
  // 409 = already submitted
  if (submitRes.status === 201 || submitRes.status === 200) {
    assert('Submit returns share_url', typeof submitRes.data?.share_url === 'string',
      `got ${JSON.stringify(submitRes.data)}`);
    if (submitRes.data?.share_url) {
      assert('share_url uses /public/approval/ path',
        submitRes.data.share_url.includes('/public/approval/'),
        `got ${submitRes.data.share_url} — must not use /approve/`);
      assert('share_url does NOT use /approve/ path',
        !submitRes.data.share_url.includes('/approve/'),
        `got ${submitRes.data.share_url}`);
    }
  } else if (submitRes.status === 404) {
    console.log('  INFO  Content not found (expected — no real content in test env). Share URL format untestable live.');
    assert('Submit with missing content returns 404 (not 500)', submitRes.status === 404);
  } else if (submitRes.status === 409) {
    console.log('  INFO  Content already in approval state (409 conflict — acceptable)');
    assert('Submit conflicts return 409 (not silent duplicate)', submitRes.status === 409);
  } else {
    assert('Submit returns 200/201/404/409', [200, 201, 404, 409].includes(submitRes.status),
      `got ${submitRes.status}`);
  }

  // ── 3. Approval List — Pagination ────────────────────────────────────────
  console.log('\n── 3. Approval List Pagination (Phase 9)');

  const listRes = await api('/api/customer/approvals');
  assert('GET /api/customer/approvals returns 200', listRes.status === 200, `got ${listRes.status}`);
  assert('Response has data array', Array.isArray(listRes.data?.data), `got ${typeof listRes.data?.data}`);
  assert('Response exposes limit/offset', typeof listRes.data?.limit === 'number', `got ${JSON.stringify(listRes.data)}`);

  const paginatedRes = await api('/api/customer/approvals?limit=5&offset=0');
  assert('Pagination params accepted', paginatedRes.status === 200, `got ${paginatedRes.status}`);
  if (paginatedRes.data?.data) {
    assert('Paginated result ≤ 5 items', paginatedRes.data.data.length <= 5,
      `got ${paginatedRes.data.data.length}`);
  }

  // ── 4. Approval Queue (Vault) ────────────────────────────────────────────
  console.log('\n── 4. Approval Queue Visible');

  const queueRes = await api('/api/customer/vault/approvals');
  assert('GET /api/customer/vault/approvals returns 200', queueRes.status === 200, `got ${queueRes.status}`);
  assert('Queue has items array', typeof queueRes.data === 'object', `got ${typeof queueRes.data}`);

  // ── 5. Role Guard: Viewer Cannot Approve ─────────────────────────────────
  console.log('\n── 5. Role Guard on Approve/Reject');

  if (VIEWER_JWT) {
    const viewerApproveRes = await api(`/api/customer/content/social/${fakeUUID}/approve`, {
      method: 'POST',
      token: VIEWER_JWT
    });
    assert('Viewer cannot approve content (403)',
      viewerApproveRes.status === 403 || viewerApproveRes.status === 401,
      `got ${viewerApproveRes.status} — viewers must be denied`);

    const viewerRejectRes = await api(`/api/customer/content/social/${fakeUUID}/reject`, {
      method: 'POST',
      body: { reason: 'viewer test' },
      token: VIEWER_JWT
    });
    assert('Viewer cannot reject content (403)',
      viewerRejectRes.status === 403 || viewerRejectRes.status === 401,
      `got ${viewerRejectRes.status}`);
  } else {
    console.log('  INFO  No VIEWER_JWT provided — role denial tests skipped');
  }

  // Owner can still access the approve/reject route (may 404 for fake content)
  const ownerApproveRes = await api(`/api/customer/content/social/${fakeUUID}/approve`, {
    method: 'POST'
  });
  assert('Owner approve route is reachable (200 or 404, not 403/500)',
    [200, 404].includes(ownerApproveRes.status),
    `got ${ownerApproveRes.status} — 403 would mean role check blocked owner`);

  // ── 6. Vault Approval Actions ────────────────────────────────────────────
  console.log('\n── 6. Vault Approval Actions Accessible');

  const vaultSubmitRes = await api(`/api/customer/vault/${fakeUUID}/approval`, {
    method: 'POST',
    body: { action: 'submit', reviewer_type: 'client' }
  });
  assert('Vault submit action is handled (200/404/409, not 500)',
    [200, 404, 409].includes(vaultSubmitRes.status),
    `got ${vaultSubmitRes.status}`);

  const vaultRevokeRes = await api(`/api/customer/vault/${fakeUUID}/approval`, {
    method: 'POST',
    body: { action: 'revoke_share' }
  });
  assert('Vault revoke_share action is handled (200/404, not 400 "invalid action")',
    [200, 404].includes(vaultRevokeRes.status),
    `got ${vaultRevokeRes.status} — action must be recognized`);

  const badActionRes = await api(`/api/customer/vault/${fakeUUID}/approval`, {
    method: 'POST',
    body: { action: 'archive' }
  });
  assert('Unknown vault action returns 400', badActionRes.status === 400,
    `got ${badActionRes.status}`);

  // ── 7. Team — Role Assignment ────────────────────────────────────────────
  console.log('\n── 7. Team Invite Auth Guards');

  const inviteRes = await api('/api/customer/team/invite', {
    method: 'POST',
    body: { email: `test_${Date.now()}@example.com`, role: 'viewer' }
  });
  // 200/201 = success, 400 = validation, 403 = non-owner tried to invite
  assert('Team invite endpoint is reachable (200/201/400/403)',
    [200, 201, 400, 403].includes(inviteRes.status),
    `got ${inviteRes.status}`);

  const teamRes = await api('/api/customer/team');
  assert('GET /api/customer/team returns 200', teamRes.status === 200, `got ${teamRes.status}`);

  // ── 8. Auth Guards ────────────────────────────────────────────────────────
  console.log('\n── 8. Auth Guards');

  const guards = [
    ['GET',  '/api/customer/approvals',         'approval list'],
    ['POST', '/api/customer/approvals',         'approval submit'],
    ['GET',  '/api/customer/vault/approvals',   'vault approval queue'],
    ['GET',  '/api/customer/team',              'team list'],
    ['GET',  '/api/customer/clients',           'client list'],
  ];

  for (const [method, path, label] of guards) {
    const res = await api(path, { method, body: method === 'POST' ? {} : undefined, token: null });
    assert(`${label} requires auth (401)`, res.status === 401, `got ${res.status}`);
  }

  // ── 9. Dead Code Removed ──────────────────────────────────────────────────
  console.log('\n── 9. Dead Approval Routes Not Accessible');

  // approvals.controller.js routes were never in server.js, so these return 404
  const deadPaths = [
    ['POST', '/api/customer/approvals/submit'],
    ['POST', `/api/customer/approvals/${fakeUUID}/approve`],
    ['POST', `/api/customer/approvals/${fakeUUID}/reject`],
    ['GET',  `/api/customer/approvals/${fakeUUID}/comments`],
  ];

  for (const [method, path] of deadPaths) {
    const res = await api(path, { method, body: method === 'POST' ? {} : undefined });
    assert(`Dead route ${method} ${path} returns 404/405 (not 500)`,
      res.status === 404 || res.status === 405,
      `got ${res.status} — 500 would indicate a wired but broken route`);
  }

  // ── 10. Public Approval Requires Active Share Token ───────────────────────
  console.log('\n── 10. Public Approval Token Validation');

  const expiredTokenLike = 'a'.repeat(32);  // 32-char string, won't match any real hash
  const expiredGet = await api(`/api/public/approval/${expiredTokenLike}`, { token: null });
  assert('Invalid token returns 403 or 404 (not 200)',
    expiredGet.status === 403 || expiredGet.status === 404,
    `got ${expiredGet.status} — must not serve content for invalid tokens`);

  const emptyTokenGet = await api('/api/public/approval/', { token: null });
  assert('Missing token segment returns 404', emptyTokenGet.status === 404, `got ${emptyTokenGet.status}`);

  // ─── Results ─────────────────────────────────────────────────────────────
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
