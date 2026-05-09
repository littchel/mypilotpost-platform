/**
 * myPilotPost — REAL-TIME SEO ANALYSIS (Phase 4)
 * AUTHORITATIVE • BRAND-SCOPED • UI-PARITY
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";

/**
 * POST /api/customer/seo/analyze
 * 
 * Body: { content_type: 'social'|'blog', content_id: UUID }
 * OR: { text: string }
 */
export async function analyzeSEO(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", "UNAUTHORIZED", null, 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { content_type, content_id, text } = body;
    const db = getDB(env);
    
    let targetText = text || "";
    
    // 1. Resolve text if content_id provided
    if (content_id && content_type === 'blog') {
      const row = await db.prepare(`SELECT body FROM blog_posts WHERE id = ? AND brand_id = ?`)
        .bind(content_id, auth.brand_id).first();
      if (row) targetText = row.body || "";
    }

    // 2. Perform Deterministic Analysis
    const issues = [];
    const recommendations = [];
    let score = 0;

    if (!targetText || targetText.length < 50) {
      issues.push("Content is too short for meaningful analysis");
      recommendations.push("Add more descriptive detail to improve search visibility");
      score = 20;
    } else {
      // Word count check
      const words = targetText.split(/\s+/).length;
      if (words < 300) {
        issues.push("Word count is under optimal threshold for blog posts");
        recommendations.push("Aim for 600-1000 words for better ranking potential");
        score += 30;
      } else {
        score += 60;
      }

      // Keyword density placeholder check
      const keywordRegex = /pilo/gi; // Example
      const matches = targetText.match(keywordRegex);
      if (!matches) {
        issues.push("Primary brand keywords are missing");
        recommendations.push("Include your brand name and industry keywords naturally");
      } else {
        score += 20;
      }
      
      // Links check
      if (!targetText.includes("<a href=")) {
        issues.push("No internal or external links detected");
        recommendations.push("Add links to relevant content to improve page authority");
      } else {
        score += 20;
      }
    }

    score = Math.min(100, score);

    const words = targetText.split(/\s+/).length;

    // 3. Response Shape (UI Parity)
    return json({
      score,
      issues,
      recommendations,
      keywordCoverage: score > 70 ? "high" : score > 30 ? "medium" : "low",
      readability: words > 100 ? "good" : "low"
    });



  } catch (err) {
    console.error("[SEO ANALYZE FAILED]", err);
    return error("SEO Analysis failed", "SERVER_ERROR", String(err), 500);
  }
}
