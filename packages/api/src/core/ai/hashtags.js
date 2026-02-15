import { json } from "../../lib/json.js";
import { logEvent } from "../../lib/events.js";

/* ======================================================
   AI — HASHTAG ANALYSIS & RECOMMENDATION
   (Advisory, NOT auto-applied)
====================================================== */

/**
 * POST /api/customer/ai/hashtags
 *
 * Input:
 * {
 *   text: string,              // post content
 *   platform: string,          // instagram | facebook | linkedin | twitter
 *   industry?: string,         // optional (marketing, fintech, ecommerce, etc.)
 *   region?: string            // optional (ZA, NG, KE, UK, US, etc.)
 * }
 */
export async function generateHashtags(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    text,
    platform,
    industry = "general",
    region = "global",
    content_id = null
  } = body || {};

  if (!text || !platform) {
    return json(
      { error: "text and platform are required for hashtag analysis" },
      400
    );
  }

  /**
   * NOTE:
   * This is a deterministic Phase-2 analyzer.
   * Replace internals with real trend / performance data in Phase-3+.
   */
  const analysis = analyzeHashtags({
    text,
    platform,
    industry,
    region
  });

  /* ===============================
     EVENT LOGGING (NON-BLOCKING)
  =============================== */
  try {
    await logEvent(env, {
      event_type: "hashtags_analyzed",
      brand_id: auth.brand_id,
      user_id: auth.user_id || null,
      content_id,
      metadata: {
        platform,
        industry,
        region,
        recommended_count: analysis.recommended.length,
        risky_count: analysis.risky.length,
        banned_count: analysis.banned.length
      }
    });
  } catch (err) {
    // Advisory analytics must never block user flow
    console.error("[hashtags:event]", err?.message || err);
  }

  return json(analysis);
}

/* ======================================================
   ANALYSIS ENGINE (PHASE-2 SAFE)
====================================================== */

function analyzeHashtags({ text, platform, industry, region }) {
  // Base keyword extraction (placeholder)
  const baseKeywords = extractKeywords(text);

  // Simulated intelligence layers
  const recommended = baseKeywords.slice(0, 5).map((tag, i) => ({
    tag: `#${tag}`,
    score: 90 - i * 5,
    trend: i === 0 ? "rising" : "stable"
  }));

  const banned = getBannedHashtags(platform).map(tag => ({
    tag,
    reason: "platform policy / shadowban risk"
  }));

  const risky = [
    {
      tag: "#follow4follow",
      reason: "low-quality engagement / reduced reach"
    }
  ];

  const newTags = [
    {
      tag: "#aicontent",
      trend: "new"
    }
  ];

  return {
    platform,
    region,
    industry,
    recommended,
    risky,
    banned,
    new: newTags
  };
}

/* ======================================================
   HELPERS
====================================================== */

function extractKeywords(text) {
  // Very naive Phase-2 implementation
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 4)
    .slice(0, 8);
}

function getBannedHashtags(platform) {
  const common = ["#spam", "#like4like"];

  switch (platform) {
    case "instagram":
      return [...common, "#followme"];
    case "twitter":
      return [...common, "#retweet"];
    default:
      return common;
  }
}
