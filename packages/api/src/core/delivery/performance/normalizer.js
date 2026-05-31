/**
 * Platform Metrics Normalizer
 *
 * Maps raw platform API responses (stored in performance_snapshots.metrics_json)
 * into a standard schema consumed by content_analytics and daily_analytics.
 *
 * Standard output shape:
 *   { impressions, engagements, clicks, comments, shares, saves }
 *
 * All values are integers >= 0. Unknown fields default to 0.
 */

function int(v) {
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

// Extract a named metric from Instagram/Threads insights data array
function igInsight(data, name) {
  const item = (data || []).find(d => d.name === name);
  return int(item?.values?.[0]?.value ?? item?.value ?? 0);
}

// Extract a named metric from Facebook insights data array
function fbInsight(data, name) {
  const item = (data || []).find(d => d.name === name);
  return int(item?.values?.[0]?.value ?? 0);
}

const NORMALIZERS = {
  facebook(raw) {
    const data = raw?.insights?.data || [];
    const impressions  = fbInsight(data, "post_impressions");
    const engaged      = fbInsight(data, "post_engaged_users");
    const clicks       = fbInsight(data, "post_clicks");
    const shares       = int(raw?.shares?.count);
    const likes        = int(raw?.likes?.summary?.total_count);
    const comments     = int(raw?.comments?.summary?.total_count);
    return {
      impressions,
      engagements: engaged || (likes + comments + shares),
      clicks,
      comments,
      shares,
      saves: 0,
    };
  },

  instagram(raw) {
    const data         = raw?.insights?.data || [];
    const basic        = raw?.basic || {};
    const impressions  = igInsight(data, "impressions") || igInsight(data, "reach");
    const engagement   = igInsight(data, "engagement");
    const saved        = igInsight(data, "saved");
    const shares       = igInsight(data, "shares");
    const likes        = int(basic.like_count);
    const comments     = int(basic.comments_count);
    return {
      impressions,
      engagements: engagement || (likes + comments + shares + saved),
      clicks: 0,
      comments,
      shares,
      saves: saved,
    };
  },

  threads(raw) {
    const data         = raw?.insights?.data || [];
    const basic        = raw?.basic || {};
    const views        = igInsight(data, "views");
    const likes        = igInsight(data, "likes") || int(basic.like_count);
    const replies      = igInsight(data, "replies") || int(basic.replies_count);
    const reposts      = igInsight(data, "reposts") || int(basic.repost_count);
    const quotes       = igInsight(data, "quotes") || int(basic.quote_count);
    return {
      impressions: views,
      engagements: likes + replies + reposts + quotes,
      clicks: 0,
      comments: replies,
      shares: reposts + quotes,
      saves: 0,
    };
  },

  x(raw) {
    const m = raw?.data?.public_metrics || {};
    const likes     = int(m.like_count);
    const retweets  = int(m.retweet_count);
    const replies   = int(m.reply_count);
    const quotes    = int(m.quote_count);
    const bookmarks = int(m.bookmark_count);
    return {
      impressions: int(m.impression_count),
      engagements: likes + retweets + replies + quotes + bookmarks,
      clicks: 0,
      comments: replies,
      shares: retweets + quotes,
      saves: bookmarks,
    };
  },

  linkedin(raw) {
    const likes    = int(raw?.likesSummary?.totalLikes);
    const comments = int(raw?.commentsSummary?.aggregatedTotalComments
                      ?? raw?.commentsSummary?.totalFirstLevelComments);
    return {
      impressions: 0,  // Requires separate Analytics API call — not in socialActions response
      engagements: likes + comments,
      clicks: 0,
      comments,
      shares: 0,
      saves: 0,
    };
  },

  tiktok(raw) {
    const stats = raw?.data?.videos?.[0]?.statistics || {};
    const plays    = int(stats.play_count);
    const likes    = int(stats.like_count);
    const comments = int(stats.comment_count);
    const shares   = int(stats.share_count);
    return {
      impressions: plays,
      engagements: likes + comments + shares,
      clicks: 0,
      comments,
      shares,
      saves: 0,
    };
  },

  pinterest(raw) {
    const m = raw?.metrics || {};
    return {
      impressions: int(m.impression),
      engagements: int(m.engagement),
      clicks: int(m.outbound_click),
      comments: 0,
      shares: 0,
      saves: int(m.save),
    };
  },

  youtube(raw) {
    const stats = raw?.items?.[0]?.statistics || {};
    const views    = int(stats.viewCount);
    const likes    = int(stats.likeCount);
    const comments = int(stats.commentCount);
    const shares   = int(stats.shareCount);
    return {
      impressions: views,
      engagements: likes + comments + shares,
      clicks: 0,
      comments,
      shares,
      saves: 0,
    };
  },

  "google-analytics"(raw) {
    // GA returns session/user data, not post-level metrics — skip
    return null;
  },
};

/**
 * Normalize raw platform metrics into the standard content_analytics shape.
 * Returns null if the platform has no normalizer or data is missing.
 */
export function normalizeMetrics(platform, metricsJson) {
  const normalizer = NORMALIZERS[platform];
  if (!normalizer) return null;
  try {
    const raw = typeof metricsJson === "string" ? JSON.parse(metricsJson) : metricsJson;
    return normalizer(raw);
  } catch {
    return null;
  }
}
