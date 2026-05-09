/**
 * myPilotPost — BRAND INTELLIGENCE ENGINE
 * AUTHORITATIVE • V2 • THE BRAIN
 * 
 * Responsibilities:
 * - Data sufficiency guarding
 * - Pattern detection (Growth, Warnings, Opportunities)
 * - Insight deduplication and lifecycle management
 * - Brand memory event logging
 */

import { checkFeatureAccess } from "../billing/billing.js";
import { getAIAnalysis, writeBrandMemoryEvent } from "../ai/ai_intelligence.js";
import { calculateBrandScore } from "./scoring.js";
import { generateStrategicAnalysis } from "./analysis_engine.js";
import { generateNextSteps } from "./next_steps_generator.js";
import { buildAuditReport } from "../reports/report_builder.js";
import { emitEvent } from "../../lib/bus.js";

/* ======================================================
   HELPERS — UTILS
   ====================================================== */

const INSIGHT_EXPIRY = {
  growth: 48,
  warning: 0, // Persistent until resolved
  opportunity: 48,
  consistency: 24,
  performance: 48
};

const getSignature = (brandId, type, title) => {
  return `${brandId}:${type}:${title}`.toLowerCase().replace(/\s+/g, '_');
};

/* ======================================================
   PATTERN DETECTION ENGINE
   ====================================================== */

/**
 * detectPatterns(db, brandId, userId)
 * Analyzes delivery and analytics to find actionable intelligence.
 */
async function detectPatterns(db, brandId, userId) {
  const patterns = [];

  // 1. DATA SUFFICIENCY CHECK
  const postCountRow = await db.prepare(`
    SELECT COUNT(*) as total FROM delivery_jobs WHERE brand_id = ?
  `).bind(brandId).first();
  const totalPosts = postCountRow?.total || 0;

  const firstPostRow = await db.prepare(`
    SELECT MIN(created_at) as first_seen FROM delivery_jobs WHERE brand_id = ?
  `).bind(brandId).first();
  
  const daysActive = firstPostRow?.first_seen 
    ? (Date.now() - new Date(firstPostRow.first_seen).getTime()) / (24 * 60 * 60 * 1000)
    : 0;

  if (totalPosts < 3 || daysActive < 7) {
    return [{
      type: 'consistency',
      title: 'Data Collection Phase',
      message: 'Start posting to unlock actionable insights. We need at least 3 posts over 7 days to analyze patterns.',
      priority: 'low',
      expiry: 24
    }];
  }

  // 2. QUIET PERIOD DETECTION
  const lastPostRow = await db.prepare(`
    SELECT MAX(created_at) as last_seen FROM delivery_jobs WHERE brand_id = ?
  `).bind(brandId).first();
  const daysSinceLastPost = lastPostRow?.last_seen
    ? (Date.now() - new Date(lastPostRow.last_seen).getTime()) / (24 * 60 * 60 * 1000)
    : 100;

  if (daysSinceLastPost > 3) {
    patterns.push({
      type: 'consistency',
      title: 'It’s been quiet',
      message: 'You haven’t posted in over 3 days. Post something today to keep your audience engaged.',
      priority: 'high',
      expiry: 24
    });
  } else if (daysSinceLastPost < 1 && totalPosts > 5) {
     patterns.push({
       type: 'consistency',
       title: 'You’re on a roll 🔥',
       message: 'Consistent posting is the key to growth. Great job maintaining your momentum!',
       priority: 'low',
       expiry: 24
     });
  }

  // 3. FAILURE SEVERITY ANALYSIS
  const recentFailures = await db.prepare(`
    SELECT platform, last_error, created_at, delivery_attempts
    FROM delivery_jobs
    WHERE brand_id = ? AND status = 'failed'
    ORDER BY created_at DESC LIMIT 5
  `).bind(brandId).all();

  if (recentFailures.results?.length > 0) {
    const uniqueErrors = new Set(recentFailures.results.map(f => f.last_error));
    for (const err of uniqueErrors) {
      let priority = 'low';
      if (err?.includes('AUTH') || err?.includes('token')) priority = 'high';
      else if (err?.includes('RATE') || err?.includes('limit')) priority = 'medium';

      patterns.push({
        type: 'warning',
        title: priority === 'high' ? 'Account Connection Issue' : 'Delivery Warning',
        message: `We've detected issues delivering to some platforms: ${err}. Check your integrations.`,
        priority,
        expiry: 0 // Persistent
      });
    }
  }

  // 4. PLATFORM WINNER DETECTION
  const platformStats = await db.prepare(`
    SELECT platform, SUM(impressions) as reach, AVG(engagements) as avg_eng
    FROM content_analytics
    WHERE brand_id = ?
    GROUP BY platform
    HAVING reach > 0
  `).bind(brandId).all();

  if (platformStats.results?.length > 1) {
    const sortedByReach = [...platformStats.results].sort((a,b) => b.reach - a.reach);
    const winner = sortedByReach[0];
    const second = sortedByReach[1];

    if (winner.reach > second.reach * 1.5) {
      patterns.push({
        type: 'performance',
        title: `${winner.platform.toUpperCase()} is your star`,
        message: `Your reach is significantly higher on ${winner.platform}. Consider tailoring more content for this audience.`,
        priority: 'medium',
        expiry: 48
      });
    }
  }

  // 5. CONTENT INTELLIGENCE (Media vs Text)
  // Note: Simplified logic for brevity, would ideally JOIN with social_assets
  const mediaPerformance = await db.prepare(`
    SELECT 
      CASE WHEN media_count > 0 THEN 'media' ELSE 'text' END as has_media,
      AVG(impressions) as avg_reach
    FROM content_analytics
    WHERE brand_id = ?
    GROUP BY has_media
  `).bind(brandId).all();

  const mediaGroup = mediaPerformance.results?.find(r => r.has_media === 'media');
  const textGroup = mediaPerformance.results?.find(r => r.has_media === 'text');

  if (mediaGroup && textGroup && mediaGroup.avg_reach > textGroup.avg_reach * 1.2) {
    patterns.push({
      type: 'opportunity',
      title: 'Visuals drive reach',
      message: `Your posts with images or video perform ${((mediaGroup.avg_reach/textGroup.avg_reach - 1)*100).toFixed(0)}% better. Use more media!`,
      priority: 'medium',
      expiry: 48
    });
  }

  // 6. SEO CTR ANOMALY DETECTION (PRECISION)
  const seoStats = await db.prepare(`
    SELECT AVG(ctr) as avg_ctr, SUM(impressions) as total_imps
    FROM seo_metrics
    WHERE brand_id = ?
  `).bind(brandId).first();

  if (seoStats?.total_imps > 500) {
    const brandAvg = seoStats.avg_ctr;
    
    // Check recent top pages for 30% deviation
    const topPages = await db.prepare(`
      SELECT sp.title, sm.ctr, sm.impressions
      FROM seo_metrics sm
      JOIN seo_pages sp ON sm.content_id = sp.content_id
      WHERE sm.brand_id = ? AND sm.date > date('now', '-7 days')
      ORDER BY sm.impressions DESC LIMIT 3
    `).bind(brandId).all();

    for (const page of topPages.results || []) {
      if (page.impressions > 100) {
         const deviation = Math.abs((page.ctr - brandAvg) / brandAvg);
         if (deviation > 0.3) {
            patterns.push({
              type: 'performance',
              title: page.ctr < brandAvg ? 'SEO CTR Warning' : 'Search Breakthrough 🔥',
              message: page.ctr < brandAvg 
                ? `"${page.title}" has high visibility but low click-through. Improve the title and meta description.` 
                : `"${page.title}" is significantly outperforming your average search CTR! Analyze why this content resonates.`,
              priority: page.ctr < brandAvg ? 'high' : 'medium',
            });
          }
        }
      }
    }

  // 7. SEO CONTENT OPPORTUNITY (GROWTH DRIVER)
  const blogStats = await db.prepare(`
    SELECT COUNT(*) as total, MAX(created_at) as last_blog
    FROM blog_posts
    WHERE brand_id = ? AND status = 'published'
  `).bind(brandId).first();

  const totalBlogs = blogStats?.total || 0;
  const daysSinceLastBlog = blogStats?.last_blog
    ? (Date.now() - new Date(blogStats.last_blog).getTime()) / (24 * 60 * 60 * 1000)
    : 100;

  const socialCountRow = await db.prepare(`SELECT COUNT(*) as total FROM social_assets WHERE brand_id = ?`).bind(brandId).first();
  const hasSocialActivity = (socialCountRow?.total || 0) > 0;

  if (hasSocialActivity && (totalBlogs < 3 || daysSinceLastBlog > 14)) {
     const totalImpressions = seoStats?.total_imps || 0;
     
     if (totalImpressions < 1000) {
        patterns.push({
          type: 'seo_opportunity',
          title: 'Untapped Search Opportunity',
          message: 'Your brand has low search visibility. Publishing 2–3 SEO-focused blog posts per week could significantly increase long-term reach.',
          priority: 'medium',
          expiry: 48
        });
     }
  }

  // 8. REFERRAL OPPORTUNITY (VIRAL LOOP)
  if (totalPosts > 5 && userId) {
     const refCount = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_user_id = ? AND status = 'rewarded'").bind(userId).first();
     if ((refCount?.count || 0) < 2) {
        patterns.push({
          type: 'opportunity',
          title: 'Invite & Earn PRO',
          message: 'You’re an active pilot! Invite a friend to MyPilotPost and you’ll both get 7 days of PRO features for free.',
          priority: 'medium',
          expiry: 48
        });
     }
  }

  // 9. AUDIT CONVERSION NUDGE (NEW)
  const lastAudit = await db.prepare(`
    SELECT overall_score, preview_mode FROM brand_audit_results_v2
    WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1
  `).bind(brandId).first();

  if (lastAudit) {
    if (lastAudit.overall_score < 60) {
      patterns.push({
        type: 'growth',
        title: 'Audit Warning 🚨',
        message: `Your brand audit score is below average (${lastAudit.overall_score}/100). Unlock your full growth strategy to fix critical gaps.`,
        priority: 'high',
        expiry: 24
      });
    } else if (lastAudit.preview_mode === 1) {
      patterns.push({
        type: 'growth',
        title: 'Unlock Full Strategy',
        message: 'Your partial audit is ready. Unlock the full execution roadmap to accelerate your brand growth.',
        priority: 'medium',
        expiry: 24
      });
    }
  }

  return patterns;
}

/* ======================================================
   CORE — INSIGHT GENERATION
   ====================================================== */

/**
 * generateInsights(brandId)
 * Main entry point for the intelligence engine.
 */
export async function generateInsights(env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);

  const access = await checkFeatureAccess(null, env, auth, 'intelligence');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const brandId = auth.brand_id;

  // 1. THROTTLING (5 MIN COOLDOWN)
  const brandRow = await db.prepare(`
    SELECT last_intelligence_run_at FROM brands WHERE id = ?
  `).bind(brandId).first();

  const lastRun = brandRow?.last_intelligence_run_at ? new Date(brandRow.last_intelligence_run_at).getTime() : 0;
  if (Date.now() - lastRun < 5 * 60 * 1000) {
    return getInsights(request, env, auth); // Return cached if recently run
  }

  // 2. RUN DETECTION
  const rawPatterns = await detectPatterns(db, brandId, auth.user_id);

  // 3. PERSIST & DEDUPLICATE
  for (const p of rawPatterns) {
    const signature = getSignature(brandId, p.type, p.title);
    
    // Check if valid insight exists
    const existing = await db.prepare(`
      SELECT id FROM brand_insights 
      WHERE signature = ? AND (expires_at > DATETIME('now') OR expires_at IS NULL)
    `).bind(signature).first();

    if (!existing) {
      const expiresAt = p.expiry > 0 
        ? new Date(Date.now() + p.expiry * 60 * 60 * 1000).toISOString()
        : null;

      await db.prepare(`
        INSERT INTO brand_insights (id, brand_id, type, title, message, priority, signature, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), brandId, p.type, p.title, p.message, p.priority, signature, expiresAt
      ).run();
      
      // LOG TO MEMORY
      await writeBrandMemoryEvent(db, brandId, 'insight_generated', { type: p.type, title: p.title });
    }
  }

  // 4. GENERATE FULL AUDIT (New Strategy)
  const auditData = await generateAuditData(db, brandId, auth.user_id);
  const scoreData = calculateBrandScore(auditData);
  const analysis = generateStrategicAnalysis(auditData.weaknesses);
  const nextSteps = generateNextSteps(scoreData.breakdown);
  const report = buildAuditReport(brandRow, scoreData, analysis, nextSteps);

  const auditId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO brand_audit_results_v2 (
      id, brand_id, brand_name, overall_score, score_breakdown_json, 
      strategic_actions_json, next_steps_json, full_report_json, preview_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).bind(
    auditId,
    brandId,
    brandRow?.name || 'My Brand',
    scoreData.overall_score,
    JSON.stringify(scoreData.breakdown),
    JSON.stringify(analysis),
    JSON.stringify(nextSteps),
    JSON.stringify(report)
  ).run();

  await db.prepare(`
    UPDATE brands SET last_intelligence_run_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(brandId).run();

  await emitEvent(env, 'audit_generated', { brand_id: brandId, audit_id: auditId });

  return getInsights(request, env, auth);
}

/**
 * Aggregates brand metrics for scoring
 */
async function generateAuditData(db, brandId, userId) {
  const postCount = await db.prepare("SELECT COUNT(*) as total FROM delivery_jobs WHERE brand_id = ?").bind(brandId).first();
  const platformCount = await db.prepare("SELECT COUNT(*) as total FROM connected_accounts WHERE brand_id = ?").bind(brandId).first();
  const analytics = await db.prepare("SELECT AVG(engagements) as eng FROM content_analytics WHERE brand_id = ?").bind(brandId).first();
  
  const weaknesses = [];
  if ((postCount?.total || 0) < 10) weaknesses.push('low_consistency');
  if ((platformCount?.total || 0) < 2) weaknesses.push('platform_gap');

  return {
    post_frequency: (postCount?.total || 0) / 4, // Simple weekly avg estimate
    platform_count: platformCount?.total || 1,
    engagement_rate: analytics?.eng || 0.01,
    search_visibility: 0,
    weaknesses
  };
}

/**
 * getInsights(brandId)
 * Returns active, sorted insights.
 */
export async function getInsights(request, env, auth) {
  if (!auth?.brand_id) return error("Unauthorized", 401);
  const db = getDB(env);
  
  const { results } = await db.prepare(`
    SELECT type, title, message, priority, created_at
    FROM brand_insights
    WHERE brand_id = ? 
      AND (expires_at > DATETIME('now') OR expires_at IS NULL)
    ORDER BY 
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC,
      created_at DESC
    LIMIT 5
  `).bind(auth.brand_id).all();

  // AI AUGMENTATION (NEW)
  let ai = null;
  try {
     // We fetch the latest strategic AI insight from cache
     ai = await getAIAnalysis(db, auth.brand_id, 'strategic', null, env, false, { mode: 'fast', priority: 'normal' });
  } catch (e) {
     console.warn("AI Insight retrieval skipped in getInsights", e.message);
  }

  return json({ 
    insights: results || [],
    ai: ai 
  });
}

/* ======================================================
   BRAND MEMORY
   ====================================================== */

