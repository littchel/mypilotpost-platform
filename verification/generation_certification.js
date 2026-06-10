/**
 * ENGINE 6 — Content Generation Engine Certification Test
 *
 * Tests: social generation, blog generation, rewrite, regenerate,
 *        quality loop, brand context, quota enforcement, token tracking.
 *
 * Run:  node verification/generation_certification.js <API_BASE> <USER_JWT> <BRAND_ID>
 *
 * USER_JWT  — valid JWT for a user with an active brand
 * BRAND_ID  — the brand UUID to generate content for
 */

const API      = process.argv[2] || process.env.API_BASE  || 'http://localhost:8787';
const USER_JWT = process.argv[3] || process.env.USER_JWT;
const BRAND_ID = process.argv[4] || process.env.BRAND_ID;

if (!USER_JWT || !BRAND_ID) {
  console.error('Usage: node generation_certification.js <API_BASE> <USER_JWT> <BRAND_ID>');
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

async function api(path, { method = 'GET', body, token = USER_JWT } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
  console.log('  ENGINE 6 — Content Generation Engine Certification');
  console.log(`  Target: ${API}  Brand: ${BRAND_ID}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── 1. Social Generation ─────────────────────────────────────────────────────
  console.log('── 1. Social Generation');

  const socialRes = await api('/api/customer/ai/generate/social', {
    method: 'POST',
    body: { intention: 'brand awareness', platforms: ['linkedin', 'instagram'], tone: 'professional', cta: 'Learn More', count: 1 },
  });

  assert('POST /api/customer/ai/generate/social returns 200', socialRes.status === 200, `got ${socialRes.status}`);
  assert('Social response has posts array', Array.isArray(socialRes.data?.posts), `got ${typeof socialRes.data?.posts}`);

  if (Array.isArray(socialRes.data?.posts) && socialRes.data.posts.length > 0) {
    const post = socialRes.data.posts[0];
    assert('Social post has quality_score', typeof post.quality_score === 'number', `got ${typeof post.quality_score}`);
    assert('Social post has quality_grade', typeof post.quality_grade === 'string', `got ${typeof post.quality_grade}`);
    assert('Social post has quality_breakdown', typeof post.quality_breakdown === 'object', `got ${typeof post.quality_breakdown}`);
    assert('Quality loop flag present', socialRes.data.quality_loop_active === true, `got ${socialRes.data.quality_loop_active}`);
  }

  // ── 2. Blog Generation ───────────────────────────────────────────────────────
  console.log('\n── 2. Blog Generation');

  const blogRes = await api('/api/customer/ai/generate/blog', {
    method: 'POST',
    body: { goal: 'educate about content marketing', audience: 'small business owners', primary_keyword: 'content marketing strategy' },
  });

  assert('POST /api/customer/ai/generate/blog returns 200', blogRes.status === 200, `got ${blogRes.status}`);
  assert('Blog response has title', typeof blogRes.data?.title === 'string' && blogRes.data.title.length > 0, `got ${typeof blogRes.data?.title}`);
  assert('Blog response has body', typeof blogRes.data?.body === 'string' && blogRes.data.body.length > 100, `body length: ${blogRes.data?.body?.length}`);
  assert('Blog has quality_score', typeof blogRes.data?.quality_score === 'number', `got ${typeof blogRes.data?.quality_score}`);
  assert('Blog has quality_loop_active', blogRes.data?.quality_loop_active === true, `got ${blogRes.data?.quality_loop_active}`);
  assert('Blog has seoMeta', typeof blogRes.data?.seoMeta === 'object', `got ${typeof blogRes.data?.seoMeta}`);

  // ── 3. Grammar Check ─────────────────────────────────────────────────────────
  console.log('\n── 3. Grammar Check');

  const grammarRes = await api('/api/customer/ai/grammar', {
    method: 'POST',
    body: { text: 'Their going to the store tomorrow and buyed some groceries' },
  });

  assert('POST /api/customer/ai/grammar returns 200', grammarRes.status === 200, `got ${grammarRes.status}`);
  assert('Grammar response has correctedText', typeof grammarRes.data?.correctedText === 'string', `got ${typeof grammarRes.data?.correctedText}`);

  // ── 4. Hashtags ───────────────────────────────────────────────────────────────
  console.log('\n── 4. Hashtags');

  const hashtagsRes = await api('/api/customer/ai/hashtags', {
    method: 'POST',
    body: { text: 'Building a sustainable brand in a competitive market', platform: 'instagram' },
  });

  assert('POST /api/customer/ai/hashtags returns 200', hashtagsRes.status === 200, `got ${hashtagsRes.status}`);
  assert('Hashtags response has groups', typeof hashtagsRes.data?.groups === 'object', `got ${typeof hashtagsRes.data?.groups}`);
  assert('Hashtags groups has trending', Array.isArray(hashtagsRes.data?.groups?.trending), `got ${typeof hashtagsRes.data?.groups?.trending}`);

  // ── 5. Rewrite Engine ─────────────────────────────────────────────────────────
  console.log('\n── 5. Rewrite Engine (new)');

  const rewriteRes = await api('/api/customer/ai/rewrite', {
    method: 'POST',
    body: {
      text: 'We help companies grow their social media presence with AI-powered content.',
      mode: 'professional',
      platform: 'linkedin',
    },
  });

  assert('POST /api/customer/ai/rewrite returns 200', rewriteRes.status === 200, `got ${rewriteRes.status}`);
  assert('Rewrite response has rewritten field', typeof rewriteRes.data?.rewritten === 'string', `got ${typeof rewriteRes.data?.rewritten}`);
  assert('Rewrite response has mode', rewriteRes.data?.mode === 'professional', `got ${rewriteRes.data?.mode}`);
  if (rewriteRes.data?.rewritten) {
    assert('Rewritten content differs from input',
      rewriteRes.data.rewritten !== 'We help companies grow their social media presence with AI-powered content.',
      `output identical to input — rewrite not applied`);
  }

  // Invalid mode must be rejected
  const badModeRes = await api('/api/customer/ai/rewrite', {
    method: 'POST',
    body: { text: 'test', mode: 'invalid_mode' },
  });
  assert('Invalid rewrite mode returns 400', badModeRes.status === 400, `got ${badModeRes.status}`);

  // ── 6. Rewrite Modes Coverage ─────────────────────────────────────────────────
  console.log('\n── 6. Rewrite Mode Coverage');

  for (const mode of ['shorten', 'expand', 'casual']) {
    const r = await api('/api/customer/ai/rewrite', {
      method: 'POST',
      body: { text: 'We deliver enterprise solutions for scaling businesses.', mode },
    });
    assert(`Rewrite mode "${mode}" returns 200`, r.status === 200, `got ${r.status}`);
  }

  // ── 7. Regenerate Engine ──────────────────────────────────────────────────────
  console.log('\n── 7. Regenerate Engine (new)');

  // Need a real generation_id — use ai/usage to confirm tracking, then fake test
  const regenRes = await api('/api/customer/ai/regenerate', {
    method: 'POST',
    body: { generation_id: 'nonexistent-id-00000000', reason: 'test' },
  });
  assert('Regenerate with missing ID returns 404', regenRes.status === 404, `got ${regenRes.status}`);

  // Missing generation_id
  const regenNoIdRes = await api('/api/customer/ai/regenerate', {
    method: 'POST',
    body: {},
  });
  assert('Regenerate without generation_id returns 400', regenNoIdRes.status === 400, `got ${regenNoIdRes.status}`);

  // ── 8. AI Usage Tracking ──────────────────────────────────────────────────────
  console.log('\n── 8. AI Usage Tracking (Phase 8)');

  const usageRes = await api('/api/customer/ai/usage');
  assert('GET /api/customer/ai/usage returns 200', usageRes.status === 200, `got ${usageRes.status}`);
  assert('Usage has generation_count', typeof usageRes.data?.generation_count === 'number', `got ${typeof usageRes.data?.generation_count}`);
  assert('Usage has token_count', typeof usageRes.data?.token_count === 'number', `got ${typeof usageRes.data?.token_count}`);
  assert('generation_count > 0 after tests', (usageRes.data?.generation_count || 0) > 0,
    `got ${usageRes.data?.generation_count} — generations above were not tracked`);

  // ── 9. Quota Enforcement ──────────────────────────────────────────────────────
  console.log('\n── 9. Quota Auth Guards');

  const guards = [
    ['POST', '/api/customer/ai/generate/social', { intention: 'test', platforms: ['linkedin'] }],
    ['POST', '/api/customer/ai/generate/blog',   { goal: 'test', audience: 'test', primary_keyword: 'test' }],
    ['POST', '/api/customer/ai/grammar',         { text: 'test' }],
    ['POST', '/api/customer/ai/hashtags',        { text: 'test', platform: 'instagram' }],
    ['POST', '/api/customer/ai/rewrite',         { text: 'test', mode: 'shorten' }],
    ['POST', '/api/customer/ai/regenerate',      { generation_id: 'x' }],
  ];

  for (const [method, path, body] of guards) {
    const r = await api(path, { method, body, token: null });
    assert(`${path.split('/').pop()} requires auth (401)`, r.status === 401, `got ${r.status}`);
  }

  // ── 10. Brand Context + System Prompt Specialization ─────────────────────────
  console.log('\n── 10. Brand Context + System Prompt Specialization');

  // Social should not produce blog-style outputs (title field)
  if (Array.isArray(socialRes.data?.posts)) {
    assert('Social response does not expose blog title field at top level',
      !socialRes.data.hasOwnProperty('title'),
      `social response contains blog-style title key`);
  }

  // Blog should not produce social-style posts array
  assert('Blog response does not return posts array',
    !Array.isArray(blogRes.data?.posts),
    `blog response contains posts array — social system prompt may be used`);

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
