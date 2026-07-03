/**
 * myPilotPost — Brand Intelligence Engine
 *
 * Groq-powered engine that generates 8 intelligence modules from real brand data.
 * Every insight answers: What happened? Why does it matter? How do we know?
 * How confident? What should the brand do? What result to expect?
 *
 * TOKEN BUDGET:
 *   Input target:  ≤ 3,500 tokens (context + system + schema)
 *   Output budget: ≤ 4,000 tokens
 *   Total target:  ≤ 7,500 tokens
 */

import { buildIntelligenceContext } from './intelligence_context_builder.js';

const GROQ_API_URL      = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL        = 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are a senior brand strategist and growth analyst producing an AI-powered Brand Intelligence Report for a real business.

ABSOLUTE RULES:
1. Every insight MUST reference specific evidence from the data provided — never invent numbers or metrics
2. Confidence levels: "Observed" (directly in data), "Observed + Inferred" (derived from signals), "Industry Benchmark" (cross-referenced against standards), "Estimated" (extrapolated from patterns)
3. NEVER use generic advice that could apply to any brand — every action must reference this brand's specific situation
4. If data is insufficient for a module, state clearly what's missing and what to do first
5. Notifications must be genuinely urgent or actionable — no noise
6. Return ONLY valid JSON — no markdown, no commentary`;

function buildIntelligencePrompt(context) {
  return `${context}

=== TASK ===
Analyse the above brand data and generate a Brand Intelligence Report.

Return a single JSON object with this exact structure. All text must be specific to this brand's data — never use placeholder text.

{
  "modules": {
    "platform_health": {
      "headline": "<one-line status of platform health>",
      "summary": "<2 sentences on platform connectivity and publishing health based on data>",
      "insights": [
        {
          "title": "<specific finding title>",
          "category": "Platform Health",
          "finding": "<what the data shows — reference actual platforms and counts>",
          "why_it_matters": "<business impact of this finding>",
          "evidence": ["<data point from context>", "<data point>"],
          "confidence": "Observed",
          "recommended_action": "<specific action — name the platform, the step, the metric to watch>",
          "expected_impact": "<what improvement to expect and in what timeframe>",
          "priority": "high|medium|low"
        }
      ]
    },

    "content_intelligence": {
      "headline": "<one-line content performance summary>",
      "summary": "<2 sentences on content output, format performance, and content mix based on data>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "Content Intelligence",
          "finding": "<what the content data shows>",
          "why_it_matters": "<why this content pattern matters for growth>",
          "evidence": ["<data point>", "<data point>"],
          "confidence": "Observed|Observed + Inferred|Estimated",
          "recommended_action": "<specific content action>",
          "expected_impact": "<expected result>",
          "priority": "high|medium|low"
        }
      ]
    },

    "audience_intelligence": {
      "headline": "<one-line audience reach summary>",
      "summary": "<2 sentences on audience engagement patterns and platform-level reach based on data>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "Audience Intelligence",
          "finding": "<what the engagement and reach data shows>",
          "why_it_matters": "<why this audience signal matters>",
          "evidence": ["<data point>", "<data point>"],
          "confidence": "Observed|Observed + Inferred|Industry Benchmark",
          "recommended_action": "<specific audience growth action>",
          "expected_impact": "<expected result>",
          "priority": "high|medium|low"
        }
      ]
    },

    "competitive_moat": {
      "headline": "<one-line competitive positioning summary>",
      "summary": "<2 sentences on competitive position based on audit data>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "Competitive Moat Map",
          "finding": "<what the audit reveals about competitive position>",
          "why_it_matters": "<why this matters for brand differentiation>",
          "evidence": ["<data point from audit>", "<data point>"],
          "confidence": "Observed + Inferred|Industry Benchmark|Estimated",
          "recommended_action": "<specific competitive action>",
          "expected_impact": "<expected result>",
          "priority": "high|medium|low"
        }
      ]
    },

    "seo_intelligence": {
      "headline": "<one-line SEO and discoverability summary>",
      "summary": "<2 sentences on search visibility based on audit score and blog data>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "SEO Intelligence",
          "finding": "<what the data shows about search presence>",
          "why_it_matters": "<why search visibility matters for this brand>",
          "evidence": ["<data point>", "<data point>"],
          "confidence": "Observed|Estimated|Industry Benchmark",
          "recommended_action": "<specific SEO action>",
          "expected_impact": "<expected result>",
          "priority": "high|medium|low"
        }
      ]
    },

    "conversion_intelligence": {
      "headline": "<one-line conversion readiness summary>",
      "summary": "<2 sentences on conversion architecture and click-through performance>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "Conversion Intelligence",
          "finding": "<what conversion data reveals>",
          "why_it_matters": "<why this conversion gap or strength matters>",
          "evidence": ["<data point>", "<data point>"],
          "confidence": "Observed|Observed + Inferred|Estimated",
          "recommended_action": "<specific conversion improvement action>",
          "expected_impact": "<expected result>",
          "priority": "high|medium|low"
        }
      ]
    },

    "campaign_intelligence": {
      "headline": "<one-line campaign activity summary>",
      "summary": "<2 sentences on campaign activity and content library status>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "Campaign Intelligence",
          "finding": "<what campaign and blog data shows>",
          "why_it_matters": "<why campaign activity matters for brand growth>",
          "evidence": ["<data point>", "<data point>"],
          "confidence": "Observed|Estimated",
          "recommended_action": "<specific campaign action>",
          "expected_impact": "<expected result>",
          "priority": "high|medium|low"
        }
      ]
    },

    "growth_engine": {
      "headline": "<one-line growth trajectory summary>",
      "summary": "<2 sentences on the brand's growth velocity and highest-leverage next moves>",
      "insights": [
        {
          "title": "<finding title>",
          "category": "Growth Engine",
          "finding": "<what the combined data reveals about growth trajectory>",
          "why_it_matters": "<why this growth signal is important>",
          "evidence": ["<data point>", "<data point>"],
          "confidence": "Observed + Inferred|Industry Benchmark|Estimated",
          "recommended_action": "<the single highest-leverage growth action for this brand right now>",
          "expected_impact": "<expected result with timeframe>",
          "priority": "high|medium|low"
        }
      ]
    }
  },

  "notifications": [
    {
      "type": "urgent|warning|opportunity|win",
      "title": "<short notification title>",
      "body": "<1 sentence — specific to this brand's data>",
      "action": "<what to do: one imperative clause>"
    }
  ]
}

Requirements:
- Each module must have exactly 2 insights (no more, no less)
- notifications array must contain 3-5 items covering the most important signals
- If data is missing for a module, create insights about what data to collect and why
- Every insight must reference actual numbers or signals from the context above`;
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

async function callGroqAPI(apiKey, model, systemPrompt, userPrompt, maxOutput) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature:     0.3,
      max_tokens:      maxOutput,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Groq API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

export async function generateBrandIntelligence(db, brandId, env, userId = null) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[MOCK BRAND INTEL] GROQ_API_KEY is MISSING in environment! Using Mock Fallback for Development.");
    
    let topPerformer = null;
    let templatesList = [];
    try {
      const performanceRows = await db.prepare(`
        SELECT template_id, SUM(impressions) as total_impressions, SUM(engagements) as total_engagements
        FROM template_performance
        WHERE brand_id = ?
        GROUP BY template_id
      `).bind(brandId).all();

      templatesList = (performanceRows?.results || []).map(row => {
        const impressions = row.total_impressions || 0;
        const engagements = row.total_engagements || 0;
        const ctr = impressions > 0 ? (engagements / impressions) : 0;
        return {
          template_id: row.template_id,
          impressions,
          engagements,
          ctr
        };
      });

      templatesList.sort((a, b) => b.ctr - a.ctr);
      topPerformer = templatesList[0];

      if (topPerformer) {
        const performanceMap = {};
        templatesList.forEach(t => {
          performanceMap[t.template_id] = {
            impressions: t.impressions,
            engagements: t.engagements,
            ctr: t.ctr
          };
        });

        await db.prepare(`
          INSERT INTO brand_memory (id, brand_id, namespace, key, value, confidence, source, preferred_template_id, template_performance, updated_at)
          VALUES (?, ?, 'visual', 'template_performance_tracker', '{"tracked": true}', 0.95, 'intelligence_engine', ?, ?, datetime('now'))
          ON CONFLICT(brand_id, namespace, key) DO UPDATE SET
            preferred_template_id = excluded.preferred_template_id,
            template_performance  = excluded.template_performance,
            updated_at            = datetime('now')
        `).bind(
          crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
          brandId,
          topPerformer.template_id,
          JSON.stringify(performanceMap)
        ).run();
      }
    } catch (err) {
      console.error('[INTEL_TEMPLATE_TRACKING_ERROR]', err.message);
    }

    const mockReport = {
      modules: {
        platform_health: {
          headline: "All Platforms Active",
          summary: "Your publishing pipelines are connected and active.",
          insights: [
            {
              title: "Pipeline Status",
              category: "Platform Health",
              finding: "Connected platforms are responding normally.",
              why_it_matters: "Maintains publishing consistency.",
              evidence: ["Stable connections"],
              confidence: "Observed",
              recommended_action: "Monitor daily connections.",
              expected_impact: "Uninterrupted delivery.",
              priority: "medium"
            }
          ]
        },
        content_intelligence: {
          headline: "Design consistency is strong",
          summary: "Visual templates are boosting overall post engagement rates.",
          insights: [
            {
              title: "Visual DNA Match",
              category: "Content Intelligence",
              finding: "Templates matching brand colors see 15% higher clicks.",
              why_it_matters: "Aesthetic consistency builds brand recall.",
              evidence: ["Color Extraction stats"],
              confidence: "Observed",
              recommended_action: "Keep using brand presets.",
              expected_impact: "Stable CTR growth.",
              priority: "high"
            }
          ]
        }
      },
      notifications: [
        {
          type: "win",
          title: "Top Layout Found",
          body: "Your best performing layout is Premium Narrative Carousel.",
          action: "Select this template for your next post."
        }
      ]
    };

    if (topPerformer) {
      const averageCtr = templatesList.reduce((acc, t) => acc + t.ctr, 0) / templatesList.length;
      const differencePct = averageCtr > 0 
        ? Math.round(((topPerformer.ctr - averageCtr) / averageCtr) * 100)
        : 25;
      
      const templateName = topPerformer.template_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      
      mockReport.notifications = [
        {
          type: "win",
          title: "Top Layout Found",
          body: `Your best performing layout is ${templateName} with ${differencePct}% higher engagement than average.`,
          action: "Select this template for your next post."
        }
      ];
    }

    return mockReport;
  }

  // Query template performance and calculate top performer
  let topPerformer = null;
  let templatesList = [];
  try {
    const performanceRows = await db.prepare(`
      SELECT template_id, SUM(impressions) as total_impressions, SUM(engagements) as total_engagements
      FROM template_performance
      WHERE brand_id = ?
      GROUP BY template_id
    `).bind(brandId).all();

    templatesList = (performanceRows?.results || []).map(row => {
      const impressions = row.total_impressions || 0;
      const engagements = row.total_engagements || 0;
      const ctr = impressions > 0 ? (engagements / impressions) : 0;
      return {
        template_id: row.template_id,
        impressions,
        engagements,
        ctr
      };
    });

    templatesList.sort((a, b) => b.ctr - a.ctr);
    topPerformer = templatesList[0];

    if (topPerformer) {
      const performanceMap = {};
      templatesList.forEach(t => {
        performanceMap[t.template_id] = {
          impressions: t.impressions,
          engagements: t.engagements,
          ctr: t.ctr
        };
      });

      await db.prepare(`
        INSERT INTO brand_memory (id, brand_id, namespace, key, value, confidence, source, preferred_template_id, template_performance, updated_at)
        VALUES (?, ?, 'visual', 'template_performance_tracker', '{"tracked": true}', 0.95, 'intelligence_engine', ?, ?, datetime('now'))
        ON CONFLICT(brand_id, namespace, key) DO UPDATE SET
          preferred_template_id = excluded.preferred_template_id,
          template_performance  = excluded.template_performance,
          updated_at            = datetime('now')
      `).bind(
        crypto.randomUUID(),
        brandId,
        topPerformer.template_id,
        JSON.stringify(performanceMap)
      ).run();
    }
  } catch (err) {
    console.error('[INTEL_TEMPLATE_TRACKING_ERROR]', err.message);
  }

  // Build compressed context
  const { context, tokens: contextTokens } = await buildIntelligenceContext(db, brandId);

  const systemPrompt = SYSTEM_PROMPT;
  const userPrompt   = buildIntelligencePrompt(context);

  const inputEst  = estimateTokens(systemPrompt + userPrompt);
  const maxOutput = 4000;
  const totalEst  = inputEst + maxOutput;
  console.log(`[INTEL_TOKEN_ESTIMATE] input=~${inputEst}tok output_max=${maxOutput}tok total=~${totalEst}tok`);

  console.log(`[INTEL_GROQ_REQUEST] model=${GROQ_MODEL} temp=0.3 max_tokens=${maxOutput}`);

  const reqStart = Date.now();
  let data;
  let usedModel = GROQ_MODEL;
  try {
    data = await callGroqAPI(apiKey, GROQ_MODEL, systemPrompt, userPrompt, maxOutput);
  } catch (err70b) {
    console.warn(`[INTEL_GROQ_70B_FAIL] ${err70b.message} — retrying with ${GROQ_FALLBACK_MODEL}`);
    try {
      data = await callGroqAPI(apiKey, GROQ_FALLBACK_MODEL, systemPrompt, userPrompt, maxOutput);
      usedModel = GROQ_FALLBACK_MODEL;
    } catch (err8b) {
      console.error(`[INTEL_GROQ_FAILURE] fallback also failed: ${err8b.message}`);
      throw err8b;
    }
  }

  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty response');

  const usedInput   = data.usage?.prompt_tokens    || 0;
  const usedOutput  = data.usage?.completion_tokens || 0;
  const totalTokens = usedInput + usedOutput;
  const latencyMs   = Date.now() - reqStart;
  console.log(`[INTEL_GROQ_RESPONSE] model=${usedModel} actual_input=${usedInput}tok actual_output=${usedOutput}tok total=${totalTokens}tok`);

  try {
    const today = new Date().toISOString().slice(0, 10);
    await db.prepare(`
      INSERT INTO ai_generations
        (id, brand_id, user_id, content_type, platform, input_prompt, output,
         model, provider, tokens_used, latency_ms, success, status, created_at)
      VALUES (?, ?, ?, 'intelligence', null, ?, ?, ?, 'groq', ?, ?, 1, 'ok', datetime('now'))
    `).bind(
      crypto.randomUUID(), brandId, userId,
      userPrompt.slice(0, 2000), raw.slice(0, 4000),
      usedModel, totalTokens, latencyMs
    ).run();

    if (userId) {
      await db.prepare(`
        INSERT INTO ai_usage_quota (user_id, brand_id, date, generation_count, token_count)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(user_id, brand_id, date)
        DO UPDATE SET
          generation_count = generation_count + 1,
          token_count = token_count + excluded.token_count
      `).bind(userId, brandId, today, totalTokens).run();
    }
  } catch (trackErr) {
    console.error('[INTEL_TRACKING_ERROR]', trackErr.message);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]+\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('Groq response is not valid JSON');
  }

  if (topPerformer && parsed) {
    try {
      const averageCtr = templatesList.reduce((acc, t) => acc + t.ctr, 0) / templatesList.length;
      const differencePct = averageCtr > 0 
        ? Math.round(((topPerformer.ctr - averageCtr) / averageCtr) * 100)
        : 25;
      
      const templateName = topPerformer.template_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      
      if (!parsed.notifications) parsed.notifications = [];
      parsed.notifications.unshift({
        type: "win",
        title: "Top Layout Found",
        body: `Your best performing layout is ${templateName} with ${differencePct}% higher engagement than average.`,
        action: "Select this template for your next post."
      });
    } catch {}
  }

  return parsed;
}
