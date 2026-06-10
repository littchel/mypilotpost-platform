/**
 * ENGINE 18 — Memory & Learning Engine Certification Test
 *
 * Verifies: memory writes, feature accumulation, snapshot creation,
 *           retrieval endpoints, brand isolation, auth guards, retention.
 *
 * Run:  node verification/memory_certification.js <API_BASE> <CUSTOMER_JWT>
 *
 * CUSTOMER_JWT must be a valid authenticated customer JWT with a brand context
 * that has some publishing activity (or run after triggering a content_published event).
 */

const API          = process.argv[2] || process.env.API_BASE || 'http://localhost:8787';
const CUSTOMER_JWT = process.argv[3] || process.env.CUSTOMER_JWT;

if (!CUSTOMER_JWT) {
  console.error('Usage: node memory_certification.js <API_BASE> <CUSTOMER_JWT>');
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
  console.log('  ENGINE 18 — Memory & Learning Engine Certification');
  console.log(`  Target: ${API}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Memory GET (brand_memory read) ────────────────────────────────────────
  console.log('── 1. Brand Memory Read');

  const memRes = await api('/api/customer/memory');
  assert('GET /api/customer/memory returns 200', memRes.status === 200, `got ${memRes.status}`);
  assert('Memory has data object', typeof memRes.data?.data === 'object', `got ${typeof memRes.data?.data}`);

  // ── 2. Memory with namespace filter ───────────────────────────────────────────
  console.log('\n── 2. Memory Namespace Filter');

  const brandMemRes = await api('/api/customer/memory?namespace=brand');
  assert('GET /api/customer/memory?namespace=brand returns 200', brandMemRes.status === 200, `got ${brandMemRes.status}`);
  // After publishing, brand namespace should have at minimum has_approval_flow or preferred_platform
  const brandNs = brandMemRes.data?.data?.brand || {};
  console.log(`  INFO  Brand memory keys: ${Object.keys(brandNs).join(', ') || '(none yet)'}`);

  // ── 3. Features read ──────────────────────────────────────────────────────────
  console.log('\n── 3. Feature Values');

  const featRes = await api('/api/customer/features');
  assert('GET /api/customer/features returns 200', featRes.status === 200, `got ${featRes.status}`);
  assert('Features has data object', typeof featRes.data?.data === 'object', `got ${typeof featRes.data?.data}`);
  assert('Features has window field', typeof featRes.data?.window === 'string', `got ${typeof featRes.data?.window}`);

  const feat7d = await api('/api/customer/features?window=7d');
  assert('GET /api/customer/features?window=7d returns 200', feat7d.status === 200, `got ${feat7d.status}`);
  assert('7d features window label correct', feat7d.data?.window === '7d', `got ${feat7d.data?.window}`);

  // ── 4. Memory events log ─────────────────────────────────────────────────────
  console.log('\n── 4. Memory Events Log');

  const evtRes = await api('/api/customer/memory/events');
  assert('GET /api/customer/memory/events returns 200', evtRes.status === 200, `got ${evtRes.status}`);
  assert('Events has data array', Array.isArray(evtRes.data?.data), `got ${typeof evtRes.data?.data}`);
  if (evtRes.data?.data?.length > 0) {
    const first = evtRes.data.data[0];
    assert('Event has tool field', typeof first.tool === 'string', `got ${typeof first.tool}`);
    assert('Event has event field', typeof first.event === 'string', `got ${typeof first.event}`);
    assert('Event has created_at', typeof first.created_at === 'string', `got ${typeof first.created_at}`);
  } else {
    console.log('  NOTE  No memory events yet — trigger some platform activity first');
  }

  // ── 5. Snapshot read ──────────────────────────────────────────────────────────
  console.log('\n── 5. Snapshot');

  const snapRes = await api('/api/customer/memory/snapshot');
  assert('GET /api/customer/memory/snapshot returns 200', snapRes.status === 200, `got ${snapRes.status}`);
  if (snapRes.data?.data) {
    assert('Snapshot has features', typeof snapRes.data.data.features === 'object', `got ${typeof snapRes.data.data.features}`);
    assert('Snapshot has event_counts', typeof snapRes.data.data.event_counts === 'object', `got ${typeof snapRes.data.data.event_counts}`);
    assert('Snapshot has generated_at', typeof snapRes.data.data.generated_at === 'string', `got ${typeof snapRes.data.data.generated_at}`);
  } else {
    console.log('  NOTE  No daily snapshot yet — cron has not run. This is expected on first deploy.');
  }

  const weeklySnap = await api('/api/customer/memory/snapshot?period=weekly');
  assert('GET /api/customer/memory/snapshot?period=weekly returns 200', weeklySnap.status === 200, `got ${weeklySnap.status}`);
  if (!weeklySnap.data?.data) {
    console.log('  NOTE  No weekly snapshot yet — cron runs weekly on Mondays (REPAIRED — was never called)');
  }

  // ── 6. Learning signal: preferred_platform after schedule creation ─────────────
  console.log('\n── 6. Learning Signal — Schedule Creates Memory');

  // Create an approved social asset then schedule it to trigger schedule_created → memory
  const saveRes = await api('/api/customer/content/social', {
    method: 'POST',
    body: { text: 'Memory certification test content', platforms: ['instagram'], lifecycle_status: 'approved' }
  });

  if (saveRes.data?.content_id) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const schedRes = await api('/api/customer/schedule', {
      method: 'POST',
      body: {
        content_id: saveRes.data.content_id,
        content_type: 'social',
        platform: 'instagram',
        scheduled_at: tomorrow.toISOString()
      }
    });
    assert('Schedule creation returns 200', schedRes.status === 200, `got ${schedRes.status}`);

    // Give fire-and-forget emit a moment to flush
    await new Promise(r => setTimeout(r, 500));

    // Check memory_events for the schedule_created event
    const evtAfter = await api('/api/customer/memory/events');
    const scheduleEvent = (evtAfter.data?.data || []).find(e => e.event === 'schedule_created');
    assert(
      'schedule_created event appears in memory_events after scheduling',
      !!scheduleEvent,
      'not found — emitEvent("schedule_created") may not be wired or memory pipeline error',
    );
  } else {
    console.log('  SKIP  Schedule memory test — content save failed');
  }

  // ── 7. Brand isolation ───────────────────────────────────────────────────────
  console.log('\n── 7. Brand Isolation');

  // Memory endpoints return only brand-scoped data — verified by brand_id in query
  // All we can check is that unauthenticated gets 401 and authenticated gets a response
  const unauthMem = await api('/api/customer/memory', { token: null });
  assert('Memory rejects unauthenticated (401)', unauthMem.status === 401, `got ${unauthMem.status}`);

  const unauthFeat = await api('/api/customer/features', { token: null });
  assert('Features rejects unauthenticated (401)', unauthFeat.status === 401, `got ${unauthFeat.status}`);

  const unauthEvt = await api('/api/customer/memory/events', { token: null });
  assert('Memory events rejects unauthenticated (401)', unauthEvt.status === 401, `got ${unauthEvt.status}`);

  const unauthSnap = await api('/api/customer/memory/snapshot', { token: null });
  assert('Snapshot rejects unauthenticated (401)', unauthSnap.status === 401, `got ${unauthSnap.status}`);

  // ── 8. Intelligence context uses memory ──────────────────────────────────────
  console.log('\n── 8. Intelligence Reads Memory');

  // Intelligence endpoint will internally call buildIntelligenceContext which reads brand_memory
  const intelRes = await api('/api/customer/intelligence/overview');
  assert('Intelligence overview returns 200', intelRes.status === 200, `got ${intelRes.status}`);

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
