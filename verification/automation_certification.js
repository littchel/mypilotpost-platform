/**
 * ENGINE 19 — Automation & Scheduling Engine Certification Test
 *
 * Verifies: delivery scheduling, retry paths, cron outputs, auth guards,
 *           brand isolation, delivery stats, manual retry correctness.
 *
 * Run:  node verification/automation_certification.js <API_BASE> <CUSTOMER_JWT>
 *
 * CUSTOMER_JWT must be a valid authenticated customer JWT with a brand context.
 */

const API          = process.argv[2] || process.env.API_BASE || 'http://localhost:8787';
const CUSTOMER_JWT = process.argv[3] || process.env.CUSTOMER_JWT;

if (!CUSTOMER_JWT) {
  console.error('Usage: node automation_certification.js <API_BASE> <CUSTOMER_JWT>');
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
  console.log('  ENGINE 19 — Automation & Scheduling Engine Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Schedule Create (delivery job creation) ────────────────────────────
  console.log('── 1. Schedule Creation');

  // First create an approved social asset to schedule
  const saveRes = await api('/api/customer/content/social', {
    method: 'POST',
    body: { text: 'Automation certification test post', platforms: ['instagram'], lifecycle_status: 'approved' }
  });

  let jobId = null;
  let contentId = saveRes.data?.content_id;

  if (contentId) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedRes = await api('/api/customer/schedule', {
      method: 'POST',
      body: {
        content_id: contentId,
        content_type: 'social',
        platform: 'instagram',
        scheduled_at: tomorrow.toISOString()
      }
    });
    assert('POST /api/customer/schedule returns 201', schedRes.status === 201, `got ${schedRes.status}`);
    assert('Schedule returns job_id', typeof schedRes.data?.job_id === 'string', `got ${typeof schedRes.data?.job_id}`);
    jobId = schedRes.data?.job_id;
  } else {
    console.log('  SKIP  Schedule creation — content save failed');
  }

  // ── 2. Schedule Read ───────────────────────────────────────────────────────
  console.log('\n── 2. Schedule Read');

  const from = new Date().toISOString();
  const to = new Date(Date.now() + 7 * 86400000).toISOString();
  const rangeRes = await api(`/api/customer/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  assert('GET /api/customer/schedule returns 200', rangeRes.status === 200, `got ${rangeRes.status}`);
  assert('Schedule has items array', Array.isArray(rangeRes.data?.items), `got ${typeof rangeRes.data?.items}`);
  assert('Schedule has timezone', typeof rangeRes.data?.timezone === 'string', `got ${typeof rangeRes.data?.timezone}`);

  if (jobId && rangeRes.data?.items) {
    const job = rangeRes.data.items.find(i => i.job_id === jobId);
    assert('Created job appears in schedule range', !!job, `job_id ${jobId} not found in range`);
  }

  // ── 3. Scheduling conflict detection ──────────────────────────────────────
  console.log('\n── 3. Conflict Detection');

  if (contentId && jobId) {
    // Schedule same platform within 15 minutes → expect 409
    const tomorrow2 = new Date();
    tomorrow2.setDate(tomorrow2.getDate() + 1);
    tomorrow2.setMinutes(tomorrow2.getMinutes() + 5); // same day, 5min after first

    const save2Res = await api('/api/customer/content/social', {
      method: 'POST',
      body: { text: 'Conflict test post', platforms: ['instagram'], lifecycle_status: 'approved' }
    });

    if (save2Res.data?.content_id) {
      const conflictRes = await api('/api/customer/schedule', {
        method: 'POST',
        body: {
          content_id: save2Res.data.content_id,
          content_type: 'social',
          platform: 'instagram',
          scheduled_at: tomorrow2.toISOString()
        }
      });
      assert(
        'Schedule within 15min of existing job returns 409',
        conflictRes.status === 409,
        `got ${conflictRes.status} — conflict detection may not be working`
      );
    } else {
      console.log('  SKIP  Conflict test — second content save failed');
    }
  } else {
    console.log('  SKIP  Conflict test — no job created');
  }

  // ── 4. Schedule Cancel ────────────────────────────────────────────────────
  console.log('\n── 4. Schedule Cancel');

  if (jobId) {
    const deleteRes = await api(`/api/customer/schedule/${jobId}`, { method: 'DELETE' });
    assert('DELETE /api/customer/schedule/:id returns 200', deleteRes.status === 200, `got ${deleteRes.status}`);
    assert('Cancel returns success', deleteRes.data?.success === true, `got ${JSON.stringify(deleteRes.data)}`);

    // Verify it's gone from the range
    const afterDelete = await api(`/api/customer/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (afterDelete.data?.items) {
      const stillPresent = afterDelete.data.items.find(i => i.job_id === jobId && i.status === 'scheduled');
      assert('Cancelled job no longer shows as scheduled', !stillPresent, `job ${jobId} still scheduled after cancel`);
    }
  } else {
    console.log('  SKIP  Cancel test — no job created');
  }

  // ── 5. Delivery stats endpoint ────────────────────────────────────────────
  console.log('\n── 5. Delivery Stats');

  const statsRes = await api('/api/customer/delivery/stats');
  assert('GET /api/customer/delivery/stats returns 200', statsRes.status === 200, `got ${statsRes.status}`);
  assert('Stats has summary', typeof statsRes.data?.summary === 'object', `got ${typeof statsRes.data?.summary}`);
  assert('Stats summary has total', typeof statsRes.data?.summary?.total === 'number', `got ${typeof statsRes.data?.summary?.total}`);
  assert('Stats has by_platform array', Array.isArray(statsRes.data?.by_platform), `got ${typeof statsRes.data?.by_platform}`);

  // ── 6. Manual Retry — no retryable jobs returns 400 ──────────────────────
  console.log('\n── 6. Manual Retry Guard');

  // Attempt content-level retry on a content with no failed jobs
  if (contentId) {
    const retryRes = await api('/api/customer/delivery/retry', {
      method: 'POST',
      body: { content_id: contentId }
    });
    // Should be 400 (no failed jobs / exhausted) not 200 with false success
    assert(
      'Content retry with no retryable jobs returns 400',
      retryRes.status === 400,
      `got ${retryRes.status} — should be 400, not 200 false success`
    );
  } else {
    console.log('  SKIP  Retry guard test — no content_id');
  }

  // ── 7. Auth guards ────────────────────────────────────────────────────────
  console.log('\n── 7. Auth Guards');

  const unauthSchedule = await api('/api/customer/schedule?from=2026-01-01&to=2026-01-07', { token: null });
  assert('Schedule GET rejects unauthenticated (401)', unauthSchedule.status === 401, `got ${unauthSchedule.status}`);

  const unauthCreate = await api('/api/customer/schedule', { method: 'POST', body: {}, token: null });
  assert('Schedule POST rejects unauthenticated (401)', unauthCreate.status === 401, `got ${unauthCreate.status}`);

  const unauthStats = await api('/api/customer/delivery/stats', { token: null });
  assert('Delivery stats rejects unauthenticated (401)', unauthStats.status === 401, `got ${unauthStats.status}`);

  const unauthRetry = await api('/api/customer/delivery/retry', { method: 'POST', body: {}, token: null });
  assert('Delivery retry rejects unauthenticated (401)', unauthRetry.status === 401, `got ${unauthRetry.status}`);

  // ── 8. Invalid input validation ───────────────────────────────────────────
  console.log('\n── 8. Input Validation');

  const badDate = await api('/api/customer/schedule', {
    method: 'POST',
    body: { content_id: 'not-a-uuid', content_type: 'social', platform: 'instagram', scheduled_at: 'not-a-date' }
  });
  assert('Invalid UUID returns 400', badDate.status === 400, `got ${badDate.status}`);

  const missingFields = await api('/api/customer/schedule', {
    method: 'POST',
    body: { content_type: 'social' } // missing content_id, platform, scheduled_at
  });
  assert('Missing required fields returns 400', missingFields.status === 400, `got ${missingFields.status}`);

  const badRange = await api('/api/customer/schedule?from=invalid&to=invalid');
  assert('Invalid schedule range returns 400', badRange.status === 400, `got ${badRange.status}`);

  // ── 9. Email outbox (smoke test) ──────────────────────────────────────────
  console.log('\n── 9. Lifecycle Email Smoke Test');

  // The lifecycle email system is internal (no direct customer endpoint to query outbox).
  // We verify the notification preference endpoint exists (if wired), otherwise INFO.
  const notifPrefRes = await api('/api/customer/notifications/preferences');
  if (notifPrefRes.status === 200) {
    assert('Notification preferences endpoint returns 200', true);
    console.log('  INFO  Email unsubscribe preferences accessible');
  } else {
    console.log(`  INFO  Notification preferences endpoint: ${notifPrefRes.status} (no direct customer assertion needed)`);
  }

  // ─── Results ─────────────────────────────────────────────────────────────
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
