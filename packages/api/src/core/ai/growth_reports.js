/**
 * myPilotPost — AI GROWTH STRATEGY ENGINE
 * Agency-Grade Strategic Reporting & Predictive Insight
 */

import { hardenedRunLLM } from "./ai_client.js";
import { sanitizeActions } from "./ai_utils.js";

/**
 * generateAIStrategyReport(db, brandId, env)
 */
export async function generateAIStrategyReport(db, brandId, env) {
  // 1. Fetch Current Context
  const brand = await db.prepare("SELECT * FROM brands WHERE id = ?").bind(brandId).first();
  const lastReport = await db.prepare("SELECT * FROM brand_growth_reports WHERE brand_id = ? ORDER BY created_at DESC LIMIT 1").bind(brandId).first();

  // 2. Aggregate Data (Cross-platform performance)
  // Reusing strategic context but adding historical deltas
  const stats = await db.prepare(`
    SELECT platform, SUM(impressions) as reach, SUM(interactions) as engagement 
    FROM content_analytics 
    WHERE brand_id = ? AND created_at > date('now', '-30 days')
    GROUP BY platform
  `).bind(brandId).all();

  // 3. Prompt Hardening: Reason-Backed Projections & SWOT Specificity
  const prompt = `You are a Global Strategic Director. Generate a high-authority AI GROWTH STRATEGY REPORT.
Brand: ${brand.name}
Identity: ${brand.archetype} (Level ${brand.archetype_level})
Current Score: ${brand.current_score}/100
Recent Stats: ${JSON.stringify(stats.results)}
Previous Report Score: ${lastReport?.score_at_time || 'N/A'}

Taks:
1. EXECUTIVE SUMMARY: High-level strategic overview with urgency messaging (e.g., "Growth window active").
2. SWOT ANALYSIS: Strengths, Weaknesses, Opportunities, Threats. Be metric-specific.
3. PREDICTIVE PROJECTION: "Expected Growth %". MUST include reasoning starting with "Based on your [metric]...".
4. strategic ROADMAP: 14-day execution plan with platform intent.
5. TOP PATTERN: Identify the #1 performing content pattern.

Respond in JSON:
{
  "summary": string,
  "swot": { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] },
  "projection": { "percentage": string, "reasoning": string },
  "roadmap": [{ "day": string, "platform": string, "intent": string, "action": string }],
  "top_pattern": string,
  "delta_narrative": string
}`;

  const aiResult = await hardenedRunLLM(env, brand, prompt, { mode: 'deep' });
  let content;
  let source = "ai";

  if (!aiResult || (aiResult.summary?.length || 0) < 20) {
     // Trigger Strategic Fallback
     content = { 
       summary: "Analyzing your growth trajectory. Focusing on consistent platform scaling through archetype alignment.",
       swot: { 
          strengths: ["Historical data collection"], 
          weaknesses: ["Growth gap"], 
          opportunities: ["Platform diversification"], 
          threats: ["Inactivity risk"] 
       },
       projection: { percentage: "+5%", reasoning: "Based on initial platform activity and baseline trend." },
       roadmap: [{ day: "Monday", platform: "LinkedIn", intent: "Brand awareness", action: "Post industry insight" }],
       top_pattern: "Text-centric insights",
       delta_narrative: "Establishing baseline."
     };
     source = "fallback";
  } else {
     content = aiResult;
  }

  // Sanitize strategic actions
  content.actions = sanitizeActions(content.actions || []);

  // 4. Persistence & Public ID
  const reportId = crypto.randomUUID();
  const publicId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

  await db.prepare(`
    INSERT INTO brand_growth_reports (id, brand_id, public_id, content_json, score_at_time, previous_report_id, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(reportId, brandId, publicId, JSON.stringify(content), brand.current_score, lastReport?.id || null, source).run();

  return {
     id: reportId,
     public_id: publicId,
     content,
     score: brand.current_score,
     delta: lastReport ? (brand.current_score - lastReport.score_at_time) : 0,
     created_at: new Date().toISOString()
  };
}
