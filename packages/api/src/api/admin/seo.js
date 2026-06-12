// packages/api/src/api/admin/seo.js
// Content → SEO. Metadata coverage, missing images, suspect links, SEO score.
// No crawler — "broken link" detection is pattern-based (empty/#/http/localhost), not fetched.

import { json } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

function suspectLinks(html) {
  if (!html) return [];
  const hrefs = [...String(html).matchAll(/href\s*=\s*["']([^"']*)["']/gi)].map(m => m[1]);
  return hrefs.filter(h =>
    !h || h === "#" || h.startsWith("javascript:") ||
    h.startsWith("http://") || h.includes("localhost") || h.includes("example.com")
  );
}

function scorePost(p) {
  let s = 0;
  if (p.title && p.title.length >= 10 && p.title.length <= 70) s += 25;
  else if (p.title) s += 12;
  if (p.excerpt && p.excerpt.length >= 50 && p.excerpt.length <= 160) s += 25;
  else if (p.excerpt) s += 12;
  if (p.featured_image) s += 20;
  if (p.slug && /^[a-z0-9-]+$/.test(p.slug)) s += 15;
  const textLen = (p.content_html || "").replace(/<[^>]+>/g, "").length;
  if (textLen >= 300) s += 15;
  else if (textLen > 0) s += 7;
  return Math.min(100, s);
}

/**
 * GET /api/v1/admin/seo/overview
 * Real implementation (replaces the previous "Not implemented" stub).
 */
export async function getAdminSEOOverview(request, env) {
  const db = getDB(env);
  const { results } = await db.prepare(`
    SELECT id, slug, title, excerpt, content_html, featured_image, status, published_at
    FROM marketing_blog_posts
    ORDER BY created_at DESC LIMIT 500
  `).all().catch(() => ({ results: [] }));

  const posts = results || [];
  const total = posts.length;

  let withTitle = 0, withExcerpt = 0, withImage = 0, withSlug = 0;
  let suspectCount = 0;
  const issues = [];
  let scoreSum = 0;

  for (const p of posts) {
    if (p.title)          withTitle++;
    if (p.excerpt)        withExcerpt++;
    if (p.featured_image) withImage++;
    if (p.slug && /^[a-z0-9-]+$/.test(p.slug)) withSlug++;
    const links = suspectLinks(p.content_html);
    suspectCount += links.length;
    const score = scorePost(p);
    scoreSum += score;

    const postIssues = [];
    if (!p.excerpt)        postIssues.push("missing meta description");
    if (!p.featured_image) postIssues.push("missing image");
    if (!p.title || p.title.length > 70) postIssues.push("title length");
    if (links.length)      postIssues.push(`${links.length} suspect link(s)`);
    if (postIssues.length) issues.push({ id: p.id, slug: p.slug, title: p.title, score, issues: postIssues });
  }

  const pct = (n) => total ? Math.round((n / total) * 100) : 0;

  return json({
    total_posts: total,
    metadata_coverage: {
      title:       { count: withTitle,   percent: pct(withTitle) },
      description: { count: withExcerpt, percent: pct(withExcerpt) },
      image:       { count: withImage,   percent: pct(withImage) },
      slug:        { count: withSlug,    percent: pct(withSlug) },
    },
    missing_images: total - withImage,
    suspect_links: suspectCount,
    avg_seo_score: total ? Math.round(scoreSum / total) : 0,
    issues: issues.sort((a, b) => a.score - b.score).slice(0, 100),
    note: "Link checks are pattern-based (no crawler).",
    generated_at: new Date().toISOString(),
  });
}
