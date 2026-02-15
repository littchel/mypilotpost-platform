import { json } from "../../lib/json.js";

/**
 * GET /api/v1/admin/seo/overview
 * High-level SEO health snapshot
 */
export async function getSeoOverview(request, env) {
  try {
    const brandsWithKnowledge = await env.ADMIN_DB.prepare(`
      SELECT COUNT(DISTINCT brand_id) AS count
      FROM seo_brand_knowledge
    `).first();

    const totalBrands = await env.ADMIN_DB.prepare(`
      SELECT COUNT(*) AS count
      FROM customers
    `).first();

    const issues = await env.ADMIN_DB.prepare(`
      SELECT severity, COUNT(*) AS count
      FROM seo_audit_issues
      GROUP BY severity
    `).all();

    const openIssues = { high: 0, medium: 0, low: 0 };
    for (const row of issues.results || []) {
      openIssues[row.severity] = row.count;
    }

    return json({
      brands_with_knowledge: brandsWithKnowledge?.count || 0,
      brands_missing_knowledge:
        Math.max((totalBrands?.count || 0) - (brandsWithKnowledge?.count || 0), 0),
      open_issues: openIssues,
    });
  } catch (err) {
    return json(
      {
        error: "Failed to load SEO overview",
        detail: err?.message || String(err),
      },
      500
    );
  }
}

/**
 * GET /api/v1/admin/seo/audits/recent
 * Recent SEO audits (append-only)
 */
export async function getRecentSeoAudits(request, env) {
  const limit = Number(request.query?.limit || 20);

  const audits = await env.ADMIN_DB.prepare(`
    SELECT
      a.id AS audit_id,
      a.brand_id,
      a.blog_post_id,
      a.created_at,
      COUNT(i.id) AS issue_count
    FROM seo_audits a
    LEFT JOIN seo_audit_issues i ON i.audit_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `)
    .bind(limit)
    .all();

  return json(audits.results || []);
}

/**
 * GET /api/v1/admin/seo/issues
 * Latest SEO issues (by severity)
 */
export async function getSeoIssues(request, env) {
  const severity = request.query?.severity || null;

  const stmt = severity
    ? `
      SELECT *
      FROM seo_audit_issues
      WHERE severity = ?
      ORDER BY created_at DESC
      LIMIT 100
    `
    : `
      SELECT *
      FROM seo_audit_issues
      ORDER BY created_at DESC
      LIMIT 100
    `;

  const issues = severity
    ? await env.ADMIN_DB.prepare(stmt).bind(severity).all()
    : await env.ADMIN_DB.prepare(stmt).all();

  return json(issues.results || []);
}

/**
 * GET /api/v1/admin/seo/rank-snapshots
 * Latest rank per keyword/location
 */
export async function getSeoRankSnapshots(request, env) {
  const rows = await env.ADMIN_DB.prepare(`
    SELECT
      k.keyword,
      r.brand_id,
      r.location,
      r.rank,
      r.checked_at
    FROM seo_rank_history r
    JOIN seo_keywords k ON k.id = r.keyword_id
    WHERE r.checked_at = (
      SELECT MAX(checked_at)
      FROM seo_rank_history r2
      WHERE r2.keyword_id = r.keyword_id
        AND r2.location = r.location
    )
    ORDER BY r.checked_at DESC
    LIMIT 100
  `).all();

  return json(rows.results || []);
}

/**
 * GET /api/v1/admin/seo/brand-knowledge
 * Brand knowledge coverage (read-only)
 */
export async function getSeoBrandKnowledgeCoverage(request, env) {
  const rows = await env.ADMIN_DB.prepare(`
    SELECT
      c.brand_id,
      c.name AS brand_name,
      CASE
        WHEN k.id IS NOT NULL THEN 1
        ELSE 0
      END AS has_knowledge,
      k.updated_at
    FROM customers c
    LEFT JOIN seo_brand_knowledge k
      ON k.brand_id = c.brand_id
    ORDER BY c.created_at DESC
  `).all();

  return json(rows.results || []);
}
