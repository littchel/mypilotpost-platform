/**
 * myPilotPost — AI INTELLIGENCE CORE
 * SENIOR STRATEGIST LAYER
 */

import { hardenedRunLLM, runLLM } from "./ai_client.js";
import { sanitizeActions, getCacheTTL } from "./ai_utils.js";
import { getAnalyticsOverview, getAnalyticsDetailed } from "../analytics/analytics.js";

const AI_COOLDOWN_SECONDS = 30;
const CACHE_EXPIRY_MINUTES = 5;

/**
 * getAIAnalysis(db, brandId, type, contextId, env)
 * Entry point with caching and cooldown protection.
 */
export async function getAIAnalysis(db, brandId, type, contextId, env, forceRefresh = false, options = {}) {
  const now = new Date();
  
  // 1. Plan & Meta Collection
  const [customer, brand] = await Promise.all([
    db.prepare("SELECT plan FROM customers WHERE brand_id = ?").bind(brandId).first(),
    db.prepare("SELECT first_ai_run_at, current_score, archetype FROM brands WHERE id = ?").bind(brandId).first()
  ]);
  
  const isStarter = customer?.plan === 'starter' || customer?.plan === 'free';

  // 2. Starter Strategy (On-the-fly, No Cache, No Limit)
  if (isStarter) {
    const data = await aggregateBrandData(db, brandId, type, contextId, env);
    return generateStarterInsight(data, brand?.archetype);
  }

  // 3. Cache & smart Rate Limit (10/hr with 30m override)
  const cached = await db.prepare(`
    SELECT * FROM brand_ai_cache 
    WHERE brand_id = ? AND type = ? AND (context_id = ? OR context_id IS NULL)
    ORDER BY last_generated_at DESC LIMIT 1
  `).bind(brandId, type, contextId).first();

  if (cached && !forceRefresh) {
    const lastGenAt = new Date(cached.last_generated_at);
    const hourlyCalls = await db.prepare("SELECT COUNT(*) as count FROM brand_ai_cache WHERE brand_id = ? AND last_generated_at > datetime('now', '-1 hour')").bind(brandId).first();
    
    // Check if limit exceeded AND cache is fresh enough (< 30m)
    const isLimitExceeded = (hourlyCalls?.count || 0) >= 10;
    const isCacheStale = (now - lastGenAt) > 30 * 60 * 1000;

    if (isLimitExceeded && !isCacheStale) {
      return normalizeResponse(JSON.parse(cached.content), cached.source);
    }
    
    if (new Date(cached.expires_at) > now) {
      return normalizeResponse(JSON.parse(cached.content), cached.source);
    }
  }

  // 4. Data Collection
  const data = await aggregateBrandData(db, brandId, type, contextId, env);
  
  // 5. Hardened Generation
  const result = await triggerHardenedGeneration(db, brandId, type, data, env, options);
  
  // 6. Cache Persistence (Differentiated TTL)
  if (result) {
    const cacheId = crypto.randomUUID();
    const ttl = getCacheTTL(result.source);
    const expiresAt = new Date(now.getTime() + ttl).toISOString();
    
    await db.prepare(`
      INSERT INTO brand_ai_cache (id, brand_id, type, context_id, content, expires_at, source, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cacheId, brandId, type, contextId, JSON.stringify(result), expiresAt, result.source, options.priority || 'normal'
    ).run();
  }

  return normalizeResponse(result, result.source);
}

/**
 * triggerHardenedGeneration
 */
async function triggerHardenedGeneration(db, brandId, type, data, env, options) {
  const brandMeta = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(brandId).first();
  
  const prompt = buildStrategicPrompt(type, data, brandMeta);
  const aiResult = await hardenedRunLLM(env, brandMeta, prompt, options);

  let finalOutput;
  let source = "ai";

  if (!aiResult || (aiResult.summary?.length || 0) < 20) {
    // TRIGGER ARCHETYPE FALLBACK
    finalOutput = generateArchetypeFallback(brandMeta.archetype, data);
    source = "fallback";
  } else {
    finalOutput = aiResult;
    // Success Persistence: Update Success Memory
    await db.prepare(`
      UPDATE brands 
      SET last_ai_model = ?, 
          last_ai_success_at = CURRENT_TIMESTAMP, 
          first_ai_run_at = COALESCE(first_ai_run_at, CURRENT_TIMESTAMP),
          last_ai_performance_logs = ?
      WHERE id = ?
    `).bind(aiResult._performance.model, JSON.stringify(aiResult._performance), brandId).run();
  }

  // Action Sanity Filter
  finalOutput.actions = sanitizeActions(finalOutput.actions || finalOutput.recommendations);
  
  return { ...finalOutput, source };
}

function buildStrategicPrompt(type, data, brand) {
  return `Analyze this brand data and provide expert strategry.
Brand: ${brand.name} | Identity: ${brand.archetype}
Stats: ${JSON.stringify(data.overview.summary)}
Constraint: Use "Based on [metric]" reasoning. Keep actions tactical.
Respond in JSON: { "summary": string, "actions": string[] }`;
}

function generateStarterInsight(data, archetype) {
  return {
    insight: "Not enough data available yet. Start publishing content to generate insights.",
    summary: "Not enough data available yet. Start publishing content to generate insights.",
    actions: [],
    confidence: "neutral",
    source: "limited"
  };
}

function generateArchetypeFallback(archetype, data) {
  return {
    insight: "Factual data aggregation complete. Strategic insights require more historical performance metrics.",
    summary: "Factual data aggregation complete. Strategic insights require more historical performance metrics.",
    actions: ["Continue publishing scheduled content"],
    confidence: "neutral",
    source: "fallback"
  };
}

function normalizeResponse(result, source) {
  const labels = { ai: "AI Insight", fallback: "Strategic Insight", limited: "Basic Insight" };
  return {
    ...result,
    source_label: labels[source] || "Insight",
    source: source // Keeping raw for logic if needed
  };
}

/**
 * aggregateBrandData(db, brandId, type, contextId)
 */
async function aggregateBrandData(db, brandId, type, contextId, env) {
  // Common Data
  const postCount = await db.prepare("SELECT COUNT(*) as total FROM delivery_jobs WHERE brand_id = ?").bind(brandId).first();
  const totalPosts = postCount?.total || 0;
  
  const firstPost = await db.prepare("SELECT MIN(created_at) as first_seen FROM delivery_jobs WHERE brand_id = ?").bind(brandId).first();
  const daysActive = firstPost?.first_seen 
    ? (Date.now() - new Date(firstPost.first_seen).getTime()) / (24 * 60 * 60 * 1000)
    : 0;

  // Analytics Snapshot
  const auth = { brand_id: brandId }; // Mock auth for core internal calls
  const overviewRes = await getAnalyticsOverview(null, env, auth, contextId);
  const overview = await overviewRes.json();
  
  const detailedRes = await getAnalyticsDetailed(null, env, auth, contextId);
  const detailed = await detailedRes.json();

  const failures = await db.prepare(`
    SELECT platform, last_error FROM delivery_jobs 
    WHERE brand_id = ? AND status = 'failed' 
    ORDER BY created_at DESC LIMIT 3
  `).bind(brandId).all();

  return {
    totalPosts,
    daysActive,
    overview,
    detailed,
    failures: failures.results || []
  };
}

async function triggerAIGeneration(type, data, env) {
  const systemPrompt = `You are a senior social media strategist and growth advisor.
Analyze the data and provide clear, concise, and actionable insights.

Rules:
- Use actual numbers
- Explain WHY trends occur
- Provide max 2 recommendations
- Avoid generic advice
- Keep response short and professional
- Respond in JSON format: { "summary": string, "recommendations": string[], "drivers": string[] }`;

  const userPrompt = `
Brand Context: ${data.daysActive.toFixed(1)} days active, ${data.totalPosts} total posts.
Current Week Stats: ${JSON.stringify(data.overview.summary)}
Growth Trends: ${JSON.stringify(data.overview.growth)}
Platform Breakdown: ${JSON.stringify(data.detailed.platforms)}
Recent Failures: ${JSON.stringify(data.failures)}

Focus on: ${type === 'strategic' ? 'Long-term growth and consistency' : 'Campaign performance and conversion'}
  `;

  const { output } = await runLLM(env, `${systemPrompt}\n\n${userPrompt}`);
  
  try {
    // Attempt to parse JSON from Markdown or raw text
    const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("AI returned malformed JSON, cleaning up...", output);
    return {
       summary: output.slice(0, 300),
       recommendations: ["Review platform analytics for detailed specifics."],
       drivers: ["data_complexity"]
    };
  }
}

/**
 * getBrandAudit(db, brandId, env, forceRefresh)
 * The "WOW Moment" feature logic.
 */
export async function getBrandAudit(db, brandId, env, forceRefresh) {
  const now = new Date();
  
  // 1. Data Collection
  const [brand, achievements, socialCount] = await Promise.all([
     db.prepare("SELECT * FROM brands WHERE id = ?").bind(brandId).first(),
     db.prepare("SELECT achievement_key FROM brand_achievements WHERE brand_id = ?").bind(brandId).all(),
     db.prepare("SELECT COUNT(*) as total FROM social_connections WHERE brand_id = ?").bind(brandId).first()
  ]);

  if (!brand) throw new Error("Brand not found");

  const baseData = await aggregateBrandData(db, brandId, 'strategic', null, env);
  const previousScore = brand.current_score || 0;

  // 2. Multi-Dimensional Scoring (Task 10)
  const postsPerMonth = Math.round((baseData.totalPosts / (baseData.daysActive || 1)) * 30);
  const consistencyScore = Math.min(100, Math.max(10, postsPerMonth * 8));

  const hasWebsite = (brand.website || "").length > 5 ? 40 : 0;
  const platformVariety = Math.min(60, (socialCount?.total || 0) * 15);
  const contentScore = hasWebsite + platformVariety;

  const reachGrowth = parseFloat(baseData.overview.growth?.reach || "0");
  const growthScore = Math.min(100, Math.max(0, 40 + (reachGrowth * 5)));

  const totalScore = Math.round((consistencyScore * 0.4) + (contentScore * 0.4) + (growthScore * 0.2));
  const delta = previousScore > 0 ? (totalScore - previousScore) : 0;

  // 3. AI Strategic Narrative & Tactical Fixes
  const prompt = `You are a Senior Social Strategy Architect. Perform a CRITICAL brand audit.
Brand: ${brand.name} | Website: ${brand.website || 'None'} | Platforms: ${socialCount?.total || 0}
Scores: Content ${contentScore}, Consistency ${consistencyScore}, Growth ${growthScore} (Total: ${totalScore}/100)
Context: ${baseData.totalPosts} posts over ${baseData.daysActive.toFixed(1)} days.

Respond in JSON:
{
  "summary": string,
  "tactical_fixes": [
    { "title": string, "issue": string, "fix": string, "impact": "High"|"Medium"|"Low" }
  ],
  "recommended_plan": "launch"|"growth"|"scale"|"dominance"
}`;

  const aiResult = await hardenedRunLLM(env, brand, prompt);
  const aiContent = aiResult || {
    summary: "Your brand is in a foundational phase. Consistency is key to unlocking initial algorithm reach.",
    tactical_fixes: [
      { title: "Platform Expansion", issue: "Low platform coverage", fix: "Connect at least 2 more platforms", impact: "High" }
    ],
    recommended_plan: "launch"
  };

  // 4. Update Database
  const auditId = crypto.randomUUID();
  await db.batch([
    db.prepare(`
      INSERT INTO brand_audit_results (id, brand_id, scores_json, recommendations_json, weekly_fixes_json, recommended_plan, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditId, brandId, 
      JSON.stringify({ content: contentScore, consistency: consistencyScore, growth: growthScore }), 
      JSON.stringify(aiContent.tactical_fixes), 
      JSON.stringify(aiContent.tactical_fixes.slice(0, 2)),
      aiContent.recommended_plan, 
      aiContent.summary
    ),
    db.prepare(`
      UPDATE brands 
      SET previous_score = ?, current_score = ?, score_delta = ?, 
          audit_last_run_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(previousScore, totalScore, delta, brandId)
  ]);

  return {
    id: auditId,
    score: totalScore,
    score_delta: delta,
    breakdown: { content: contentScore, consistency: consistencyScore, growth: growthScore },
    summary: aiContent.summary,
    tactical_fixes: aiContent.tactical_fixes,
    recommended_plan: aiContent.recommended_plan,
    generated_at: now.toISOString()
  };
}

/**
 * getWeeklyPlan(db, brandId, env)
 * Generates an ACTIVE weekly plan with "Fix My Week" suggestions.
 */
async function getWeeklyPlan(db, brandId, env) {
  const audit = await db.prepare("SELECT current_score, archetype, goals FROM brands WHERE id = ?").bind(brandId).first();
  
  // Get upcoming 7 days queue
  const upcoming = await db.prepare(`
    SELECT scheduled_at, platform FROM delivery_jobs 
    WHERE brand_id = ? AND status = 'scheduled' 
    AND scheduled_at > CURRENT_TIMESTAMP AND scheduled_at < date('now', '+7 days')
  `).bind(brandId).all();

  const prompt = `You are a Social Strategy Architect. Review this brand's schedule and audit state.
Audit Score: ${audit?.current_score}
Archetype: ${audit?.archetype}
Current Schedule: ${JSON.stringify(upcoming.results)}

Tasks:
1. Identify "Missed Windows" (Gaps in consistency).
2. Suggest "Fixes" (Reschedule or add content).
3. Provide a 7-day tactical plan.

Respond in JSON:
{
  "gaps": string[],
  "fixes": [{ "day": string, "action": string, "impact": string }],
  "narrative": string
}`;

  const { output } = await runLLM(env, prompt);
  try {
    const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
    return JSON.parse(jsonStr);
  } catch (e) {
    return { gaps: ["Low frequency mid-week"], fixes: [{ day: "Wednesday", action: "Add image post", impact: "Fills mid-week reach gap" }], narrative: "Maintaining daily peaks is your highest priority this week." };
  }
}

/**
 * getWeeklyReport(db, brandId, env, forceRefresh)
 */
async function getWeeklyReport(db, brandId, env, forceRefresh) {
  const now = new Date();
  
  // Aggregated data for last 7 days
  const data = await aggregateBrandData(db, brandId, 'strategic', null, env);
  
  const prompt = `You are a Global Social Strategist. Generate a WEEKLY GROWTH REPORT.
Data Snapshot: ${JSON.stringify(data.overview)}
Recent Failures: ${JSON.stringify(data.failures)}

Respond in JSON with this structure:
{
  "worked": string,
  "hurt": string,
  "actions": string[]
}
Keep it punchy, raw, and highly professional.`;

  const { output } = await runLLM(env, prompt);
  let aiContent;
  try {
    const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
    aiContent = JSON.parse(jsonStr);
  } catch (e) {
     aiContent = { worked: "Active data collection", hurt: "Low posting frequency", actions: ["Post 3x this week"] };
  }

  // Log to Brand Memory
  await writeBrandMemoryEvent(db, {
     brandId,
     eventType: "weekly_report_generated",
     snapshot: aiContent
  });

  return {
    ...aiContent,
    generated_at: now.toISOString()
  };
}

/**
 * getCoPilotGuidance(db, brandId, params, env)
 */
export async function getCoPilotGuidance(db, brandId, params, env) {
  const { platform, time, content } = params;
  
  // Pull latest strategy from memory/cache
  const audit = await db.prepare("SELECT current_score, delta_drivers FROM brands WHERE id = ?").bind(brandId).first();
  
  const prompt = `You are an AI Co-Pilot for a content creator.
Brand Strategy: Score ${audit?.current_score || 'N/A'}, Drivers ${audit?.delta_drivers || '[]'}
Context: Posting to ${platform || 'unknown'} at ${time || 'unknown'}.
Content Snippet: "${content.slice(0, 500)}"

Provide 2 immediate tactical tips.
Rules:
- Be reactive to the platform and time.
- If it's peak time, tell them.
- If reach is low for this type of content, suggest an adjustment.
- Keep tips < 15 words.
Respond in JSON: { "tips": string[] }`;

  const { output } = await runLLM(env, prompt);
  try {
    const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
    return JSON.parse(jsonStr);
  } catch (e) {
    return { tips: ["Keep it consistent to grow reach.", "Engagement is higher with media assets."] };
  }
}

function calculateBrandScores(data, achievements = []) {
  const reasons = [];

  // 1. Consistency (0-100)
  const postsPerMonth = Math.round((data.totalPosts / (data.daysActive || 1)) * 30);
  const consistency = Math.min(100, postsPerMonth * 10);
  if (consistency > 80) reasons.push({ type: 'consistency', points: +10, label: 'High Posting Frequency' });
  
  // 2. Content Quality (0-100)
  const hasSocial = data.detailed.platforms?.length > 0 ? 50 : 0;
  const hasVariety = data.detailed.platforms?.length > 2 ? 50 : 25;
  const content = hasSocial + hasVariety;
  if (hasVariety > 25) reasons.push({ type: 'content', points: +5, label: 'Platform Diversification' });

  // 3. Growth (0-100)
  const reachGrowth = parseFloat(data.overview.growth?.reach || "0");
  const growth = Math.min(100, Math.max(0, 50 + (reachGrowth * 2)));
  if (reachGrowth > 5) reasons.push({ type: 'growth', points: +15, label: 'Reach Expansion' });

  // 4. Outcomes Bonus (NEW)
  const milestoneBonus = achievements.length * 5;
  if (achievements.length > 0) reasons.push({ type: 'achievements', points: milestoneBonus, label: 'Achievement Momentum' });

  const total = Math.min(100, Math.round((consistency * 0.4 + content * 0.4 + growth * 0.2)) + milestoneBonus);

  return {
    total,
    breakdown: { consistency, content, growth },
    reasons
  };
}

/**
 * writeBrandMemoryEvent
 */
export async function writeBrandMemoryEvent(db, brandId, eventType, metadata) {
  try {
    await db.prepare(`
      INSERT INTO brand_memory_events (id, brand_id, event_type, source_engine, entity_type, entity_id, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), brandId, eventType, 'intelligence', 'brand', brandId, JSON.stringify(metadata)
    ).run();
  } catch (e) {
    console.error("Brand Memory Logging Failed", e);
  }
}
