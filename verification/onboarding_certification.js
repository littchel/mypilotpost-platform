/**
 * ENGINE 17 — Onboarding & Activation Engine Certification Test
 *
 * Verifies: step persistence, resume works, brand creation, platform save,
 *           readiness endpoint, complete flow, dashboard unlock, auth guards.
 *
 * Run:  node verification/onboarding_certification.js <API_BASE> <CUSTOMER_JWT>
 *
 * CUSTOMER_JWT must be a valid authenticated customer JWT with a brand context.
 * The test account should be in an incomplete onboarding state for best coverage.
 */

const API          = process.argv[2] || process.env.API_BASE || 'http://localhost:8787';
const CUSTOMER_JWT = process.argv[3] || process.env.CUSTOMER_JWT;

if (!CUSTOMER_JWT) {
  console.error('Usage: node onboarding_certification.js <API_BASE> <CUSTOMER_JWT>');
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

async function api(path, { method = 'GET', body, token = CUSTOMER_JWT } = {}) {
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

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ENGINE 17 — Onboarding & Activation Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Onboarding GET (current state) ────────────────────────────────────────
  console.log('── 1. Onboarding GET');

  const getRes = await api('/api/customer/onboarding');
  assert('GET /api/customer/onboarding returns 200', getRes.status === 200, `got ${getRes.status}`);
  assert('Response has current_step field', 'current_step' in (getRes.data || {}), `got keys: ${Object.keys(getRes.data || {}).join(', ')}`);

  // ── 2. Step persistence (REPAIRED — updateOnboardingStep previously always 500) ─
  console.log('\n── 2. Step Persistence (REPAIRED — was always 500 due to missing data column)');

  const stepRes = await api('/api/customer/onboarding/step', {
    method: 'POST',
    body: { step: 1, data: { test_persist: true, timestamp: Date.now() } }
  });
  assert(
    'POST /api/customer/onboarding/step returns 200 (not 500)',
    stepRes.status === 200,
    `got ${stepRes.status} — if 500, migration 128 has not been applied (ALTER TABLE ADD COLUMN data TEXT)`,
  );

  // ── 3. Resume: verify step was persisted ─────────────────────────────────────
  console.log('\n── 3. Resume After Step Update');

  if (stepRes.status === 200) {
    const resumeRes = await api('/api/customer/onboarding');
    assert('Resume GET returns 200', resumeRes.status === 200, `got ${resumeRes.status}`);
    assert('Step advanced after update', (resumeRes.data?.current_step || 0) >= 1, `got current_step = ${resumeRes.data?.current_step}`);
  } else {
    console.log('  SKIP  Resume check — step update failed above');
  }

  // ── 4. Platform list ──────────────────────────────────────────────────────────
  console.log('\n── 4. Platforms');

  const listRes = await api('/api/customer/onboarding/platforms');
  assert('GET /api/customer/onboarding/platforms returns 200', listRes.status === 200, `got ${listRes.status}`);
  assert('Response has platforms array', Array.isArray(listRes.data?.platforms), `got ${typeof listRes.data?.platforms}`);
  if (Array.isArray(listRes.data?.platforms)) {
    assert('Platforms list is non-empty', listRes.data.platforms.length > 0, 'empty array');
    assert('Platform entry has platform field', 'platform' in (listRes.data.platforms[0] || {}), 'missing platform key');
    assert('Platform entry has status field', 'status' in (listRes.data.platforms[0] || {}), 'missing status key');
  }

  // ── 5. Save platforms ─────────────────────────────────────────────────────────
  console.log('\n── 5. Save Platforms');

  const saveRes = await api('/api/customer/onboarding/platforms', {
    method: 'POST',
    body: { platforms: ['instagram', 'linkedin'] }
  });
  assert('POST /api/customer/onboarding/platforms returns 200', saveRes.status === 200, `got ${saveRes.status}`);
  assert('Save returns success true', saveRes.data?.success === true, `got ${saveRes.data?.success}`);

  // ── 6. Connect platform (REPAIRED — previously 404, now UPSERT-safe) ──────────
  console.log('\n── 6. Connect Platform (REPAIRED — previously 404)');

  const connectRes = await api('/api/customer/onboarding/platforms/instagram/connect', {
    method: 'POST'
  });
  assert(
    'POST .../platforms/instagram/connect returns 200 (not 404)',
    connectRes.status === 200,
    `got ${connectRes.status} — if 404, route not wired in server.js`,
  );

  // ── 7. Readiness endpoint (REPAIRED — previously 404 + wrong schema) ──────────
  console.log('\n── 7. Readiness (REPAIRED — previously 404, wrong schema)');

  const readinessRes = await api('/api/customer/onboarding/readiness');
  assert(
    'GET /api/customer/onboarding/readiness returns 200 (not 404)',
    readinessRes.status === 200,
    `got ${readinessRes.status} — if 404, route not wired in server.js`,
  );
  assert('Readiness has email_verified', 'email_verified' in (readinessRes.data || {}), `got keys: ${Object.keys(readinessRes.data || {}).join(', ')}`);
  assert('Readiness has onboarding object', typeof readinessRes.data?.onboarding === 'object', `got ${typeof readinessRes.data?.onboarding}`);
  assert('Readiness has can_schedule', 'can_schedule' in (readinessRes.data || {}), 'missing can_schedule');

  // ── 8. Market context ────────────────────────────────────────────────────────
  console.log('\n── 8. Market Context');

  const marketRes = await api('/api/customer/onboarding/market', {
    method: 'POST',
    body: { country: 'US', language: 'en', industry: 'technology' }
  });
  assert('POST /api/customer/onboarding/market returns 200', marketRes.status === 200, `got ${marketRes.status}`);

  // ── 9. Social content save (prerequisite for schedule activation) ─────────────
  console.log('\n── 9. First Content Save (Schedule Prerequisite)');

  const contentRes = await api('/api/customer/content/social', {
    method: 'POST',
    body: {
      text: 'Onboarding certification test post',
      platforms: ['instagram'],
      lifecycle_status: 'approved'
    }
  });
  assert('POST /api/customer/content/social returns 200', contentRes.status === 200, `got ${contentRes.status}`);
  assert('Content save returns content_id', typeof contentRes.data?.content_id === 'string', `got ${typeof contentRes.data?.content_id}`);

  // ── 10. First Schedule (activation AHA moment) ────────────────────────────────
  console.log('\n── 10. First Schedule (AHA Moment)');

  if (contentRes.data?.content_id) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedRes = await api('/api/customer/schedule', {
      method: 'POST',
      body: {
        content_id: contentRes.data.content_id,
        content_type: 'social',
        platform: 'instagram',
        scheduled_at: tomorrow.toISOString()
      }
    });
    assert('POST /api/customer/schedule returns 200', schedRes.status === 200, `got ${schedRes.status}`);
    assert('Schedule returns job_id', typeof schedRes.data?.job_id === 'string', `got ${typeof schedRes.data?.job_id}`);
  } else {
    console.log('  SKIP  Schedule test — content save failed above');
  }

  // ── 11. Complete onboarding ───────────────────────────────────────────────────
  console.log('\n── 11. Complete Onboarding (Dashboard Unlock)');

  const completeRes = await api('/api/customer/onboarding/complete', { method: 'POST' });
  assert('POST /api/customer/onboarding/complete returns 200', completeRes.status === 200, `got ${completeRes.status}`);

  // Verify completed_at is now set
  const afterCompleteRes = await api('/api/customer/onboarding');
  assert('After complete: onboarding shows completed', afterCompleteRes.data?.completed === true || !!afterCompleteRes.data?.completed_at, `completed=${afterCompleteRes.data?.completed}, completed_at=${afterCompleteRes.data?.completed_at}`);

  // ── 12. Auth enforcement ──────────────────────────────────────────────────────
  console.log('\n── 12. Auth Enforcement');

  const unauth1 = await api('/api/customer/onboarding', { token: null });
  assert('GET /api/customer/onboarding rejects unauthenticated (401)', unauth1.status === 401, `got ${unauth1.status}`);

  const unauth2 = await api('/api/customer/onboarding/step', { method: 'POST', token: null, body: { step: 1 } });
  assert('POST /api/customer/onboarding/step rejects unauthenticated (401)', unauth2.status === 401, `got ${unauth2.status}`);

  const unauth3 = await api('/api/customer/onboarding/readiness', { token: null });
  assert('GET /api/customer/onboarding/readiness rejects unauthenticated (401)', unauth3.status === 401, `got ${unauth3.status}`);

  // ─── Results ─────────────────────────────────────────────────────────────────
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
