/**
 * Platform Certification API
 * Real delivery verification — no mocked status.
 */

import { getDB } from "../../lib/db.js";
import { json, error } from "../../lib/json.js";

const KNOWN_PLATFORMS = [
  'facebook', 'instagram', 'linkedin', 'x', 'threads',
  'pinterest', 'tiktok', 'youtube', 'wordpress', 'google_business',
];

export async function getCertificationMatrix(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const db = getDB(env);
  const brand_id = auth.brand_id;

  const [
    { results: connections },
    { results: jobs },
    { results: withImage },
    { results: withVideo },
    { results: withCarousel },
    { results: analyticsRows },
    { results: backfillRows },
    { results: healthRows },
    { results: recentAttempts },
  ] = await Promise.all([
    db.prepare(`SELECT platform FROM social_connections WHERE brand_id=? AND status='active'`).bind(brand_id).all(),
    db.prepare(`
      SELECT platform,
        SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as total_published,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as total_failed,
        COUNT(*) as total,
        MAX(CASE WHEN status='published' THEN published_at END) as last_published_at,
        MAX(CASE WHEN status='published' THEN external_post_id END) as last_external_id
      FROM delivery_jobs WHERE brand_id=? GROUP BY platform
    `).bind(brand_id).all(),
    db.prepare(`
      SELECT dj.platform, COUNT(DISTINCT dj.id) as count
      FROM delivery_jobs dj
      JOIN content_media_links cml ON cml.content_id=dj.content_id
      JOIN media_assets ma ON ma.id=cml.media_id
      WHERE dj.brand_id=? AND dj.status='published' AND (ma.mime_type LIKE 'image/%' OR ma.mime_type IS NULL)
      GROUP BY dj.platform
    `).bind(brand_id).all(),
    db.prepare(`
      SELECT dj.platform, COUNT(DISTINCT dj.id) as count
      FROM delivery_jobs dj
      JOIN content_media_links cml ON cml.content_id=dj.content_id
      JOIN media_assets ma ON ma.id=cml.media_id
      WHERE dj.brand_id=? AND dj.status='published' AND ma.mime_type LIKE 'video/%'
      GROUP BY dj.platform
    `).bind(brand_id).all(),
    db.prepare(`
      SELECT dj.platform, COUNT(DISTINCT dj.id) as count
      FROM delivery_jobs dj
      JOIN (SELECT content_id, COUNT(*) as cnt FROM content_media_links GROUP BY content_id HAVING cnt>=2) m
        ON m.content_id=dj.content_id
      WHERE dj.brand_id=? AND dj.status='published'
      GROUP BY dj.platform
    `).bind(brand_id).all(),
    db.prepare(`SELECT platform, COUNT(*) as count FROM performance_snapshots WHERE brand_id=? GROUP BY platform`).bind(brand_id).all(),
    db.prepare(`SELECT platform, COUNT(*) as count FROM performance_snapshots WHERE brand_id=? AND backfilled=1 GROUP BY platform`).bind(brand_id).all(),
    db.prepare(`SELECT * FROM platform_health`).all(),
    db.prepare(`
      SELECT da.platform, da.status, da.error_message, COUNT(*) as count
      FROM delivery_attempts da
      JOIN delivery_jobs dj ON dj.id=da.job_id
      WHERE dj.brand_id=? AND da.created_at > datetime('now','-7 days')
      GROUP BY da.platform, da.status, da.error_message
    `).bind(brand_id).all(),
  ]);

  const connectedSet   = new Set((connections   || []).map(c => c.platform));
  const jobMap         = Object.fromEntries((jobs         || []).map(j => [j.platform, j]));
  const imageMap       = Object.fromEntries((withImage    || []).map(m => [m.platform, m.count > 0]));
  const videoMap       = Object.fromEntries((withVideo    || []).map(m => [m.platform, m.count > 0]));
  const carouselMap    = Object.fromEntries((withCarousel || []).map(m => [m.platform, m.count > 0]));
  const analyticsMap   = Object.fromEntries((analyticsRows|| []).map(a => [a.platform, a.count > 0]));
  const backfillMap    = Object.fromEntries((backfillRows || []).map(b => [b.platform, b.count > 0]));
  const healthMap      = Object.fromEntries((healthRows   || []).map(h => [h.platform, h]));

  const errorsByPlatform = {};
  for (const a of (recentAttempts || [])) {
    if (!errorsByPlatform[a.platform]) errorsByPlatform[a.platform] = [];
    if (a.status === 'failed' && a.error_message)
      errorsByPlatform[a.platform].push({ message: a.error_message, count: a.count });
  }

  const matrix = KNOWN_PLATFORMS.map(platform => {
    const connected    = connectedSet.has(platform);
    const job          = jobMap[platform] || { total_published: 0, total_failed: 0, total: 0 };
    const h            = healthMap[platform];
    const hasPublished = job.total_published > 0;
    const hasImage     = imageMap[platform]    || false;
    const hasVideo     = videoMap[platform]    || false;
    const hasCarousel  = carouselMap[platform] || false;
    const hasAnalytics = analyticsMap[platform] || false;
    const hasBackfill  = backfillMap[platform]  || false;

    let healthStatus = 'untested';
    if (h) {
      healthStatus = h.status === 'healthy' ? 'pass' : h.status === 'degraded' ? 'warn' : 'fail';
    } else if (job.total > 0) {
      const rate = job.total_published / job.total;
      healthStatus = rate >= 0.8 ? 'pass' : rate >= 0.5 ? 'warn' : 'fail';
    }

    let status = 'untested';
    if (!connected && !hasPublished) status = 'untested';
    else if (!connected && hasPublished) status = 'warn'; // was connected, now disconnected
    else if (connected && hasPublished && hasAnalytics) status = 'certified';
    else if (connected && hasPublished) status = 'warn';
    else if (connected) status = 'pending';

    const successRate = job.total > 0 ? Math.round((job.total_published / job.total) * 100) : null;

    return {
      platform,
      connected,
      publish:     hasPublished  ? 'pass' : connected ? 'warn' : 'untested',
      image:       hasImage      ? 'pass' : hasPublished ? 'warn' : 'untested',
      video:       hasVideo      ? 'pass' : 'untested',
      carousel:    hasCarousel   ? 'pass' : 'untested',
      analytics:   hasAnalytics  ? 'pass' : hasPublished ? 'warn' : 'untested',
      backfill:    hasBackfill   ? 'pass' : hasAnalytics ? 'warn' : 'untested',
      attribution: 'untested',
      health:      healthStatus,
      last_verified:    job.last_published_at  || null,
      last_external_id: job.last_external_id   || null,
      total_published:  job.total_published    || 0,
      total_failed:     job.total_failed       || 0,
      total_jobs:       job.total              || 0,
      success_rate:     successRate,
      recent_errors:    (errorsByPlatform[platform] || []).slice(0, 5),
      status,
    };
  });

  const certified = matrix.filter(p => p.status === 'certified').length;
  const warned    = matrix.filter(p => p.status === 'warn').length;
  const pending   = matrix.filter(p => p.status === 'pending').length;
  const untested  = matrix.filter(p => p.status === 'untested').length;

  return json({
    summary: { certified, warned, pending, untested, total: KNOWN_PLATFORMS.length },
    matrix,
    generated_at: new Date().toISOString(),
  });
}

export async function validateMediaUrl(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);

  const { url } = await request.json().catch(() => ({}));
  if (!url || typeof url !== 'string') return error("url required", "VALIDATION_ERROR", null, 400);

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'facebookexternalhit/1.1' }, // use crawler UA to detect bot-blocks
    });
    clearTimeout(id);

    const contentType    = res.headers.get('content-type')    || '';
    const contentLength  = parseInt(res.headers.get('content-length') || '0');

    const issues = [];
    if (!res.ok)                                               issues.push(`Server returned HTTP ${res.status}`);
    if (res.ok && !contentType)                                issues.push('No Content-Type header — platform crawlers may reject');
    if (res.ok && contentType && !contentType.startsWith('image/') && !contentType.startsWith('video/'))
      issues.push(`Unexpected Content-Type: ${contentType}`);
    if (contentLength > 8 * 1024 * 1024)                      issues.push('File > 8 MB — may exceed platform limits');

    return json({
      url,
      status_code:    res.status,
      ok:             res.ok,
      content_type:   contentType,
      content_length: contentLength,
      size_mb:        contentLength ? Math.round(contentLength / 1024 / 1024 * 100) / 100 : null,
      is_image:       contentType.startsWith('image/'),
      is_video:       contentType.startsWith('video/'),
      is_public:      res.ok,
      issues,
    });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return json({
      url, ok: false, status_code: 0, is_public: false,
      error: isTimeout ? 'Request timed out' : err.message,
      issues: [isTimeout ? 'URL unreachable from Cloudflare edge — platform crawlers will fail' : `Network error: ${err.message}`],
    });
  }
}

export async function getPlatformDeliveryHistory(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", "UNAUTHORIZED", null, 401);
  const db = getDB(env);
  const brand_id = auth.brand_id;

  const url      = new URL(request.url);
  const platform = url.searchParams.get('platform');
  const limit    = Math.min(parseInt(url.searchParams.get('limit') || '25'), 100);

  const base = `
    SELECT dj.id, dj.platform, dj.status, dj.created_at, dj.scheduled_at,
           dj.published_at, dj.external_post_id, dj.last_error, dj.delivery_attempts,
           (SELECT COUNT(*) FROM content_media_links cml WHERE cml.content_id=dj.content_id) as media_count,
           (SELECT GROUP_CONCAT(da.error_message,' | ') FROM delivery_attempts da WHERE da.job_id=dj.id AND da.status='failed') as error_trail
    FROM delivery_jobs dj
    WHERE dj.brand_id=?
  `;

  const { results } = platform
    ? await db.prepare(base + ` AND dj.platform=? ORDER BY dj.created_at DESC LIMIT ?`).bind(brand_id, platform, limit).all()
    : await db.prepare(base + ` ORDER BY dj.created_at DESC LIMIT ?`).bind(brand_id, limit).all();

  return json({ jobs: results || [] });
}
