/**
 * myPilotPost — SEO Audit Report Controller
 * File: packages/api/src/core/reports/seo/controller.js
 *
 * Responsibilities:
 * - Build SEO audit report JSON
 * - Allow agency-side editable sections
 * - Serve canonical data for HTML → PDF rendering
 *
 * Phase: 2 (Read + Generate, no crawling yet)
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { SEO_AUDIT_SCHEMA } from "./schema.js";
import { calculateOverallScore } from "./scoring.js";

/* ======================================================
   GET /api/customer/reports/seo
   Returns full SEO audit report (JSON)
====================================================== */
export async function getSeoReport(request, env, auth) {
  if (!auth?.brand_id) {
    return error("Unauthorized", 401);
  }

  const db = getDB(env);
  const brandId = auth.brand_id;

  /* ---------------------------------------------
     BASIC CONTEXT (SAFE — existing tables only)
  --------------------------------------------- */

  const brand = await db
    .prepare(`SELECT name FROM brands WHERE id = ?`)
    .bind(brandId)
    .first();

  /* ---------------------------------------------
     METRIC SOURCES (Phase-2 placeholders)
     These will be replaced by real audits in Phase-3
  --------------------------------------------- */

  const technicalScore = 72;
  const contentScore = 68;
  const uxScore = 75;
  const keywordScore = 70;

  const overallScore = calculateOverallScore({
    technical: technicalScore,
    content: contentScore,
    ux: uxScore,
    keywords: keywordScore
  });

  const scoreLabel =
    overallScore >= 80 ? "good" :
    overallScore >= 60 ? "warning" :
    "critical";

  /* ---------------------------------------------
     BUILD REPORT (SCHEMA-FIRST)
  --------------------------------------------- */

  const report = {
    ...SEO_AUDIT_SCHEMA,

    meta: {
      client_name: brand?.name || "Client",
      client_logo_url: null,
      report_period: "Current",
      generated_at: new Date().toISOString(),
      overall_score: overallScore,
      score_label: scoreLabel
    },

    executive_summary: {
      key_highlight:
        "Strong technical foundation with opportunities to improve content depth and internal linking.",
      top_wins: [
        "Site is fully HTTPS secured",
        "Clean URL structure across core pages",
        "Mobile usability passes baseline checks"
      ],
      top_fixes: [
        "Improve page speed on mobile",
        "Expand content depth for primary keywords",
        "Strengthen internal linking"
      ],
      estimated_impact:
        "Potential 15–30% increase in organic traffic over 3–6 months.",
      time_to_implement: {
        quick_wins: [
          "Optimize images",
          "Improve meta descriptions"
        ],
        long_term: [
          "Content expansion",
          "Structured data rollout"
        ]
      }
    },

    technical_audit: {
      url_structure: {
        score: 80,
        checks: {
          keyword_in_url: true,
          https_enabled: true,
          canonical_tags: true
        }
      },
      page_speed: {
        mobile_score: 62,
        desktop_score: 88,
        core_web_vitals: {
          lcp: "3.1s",
          fid: "45ms",
          cls: "0.09"
        },
        issues: [
          "Large hero images",
          "Render-blocking CSS"
        ]
      },
      mobile_usability: {
        score: 85,
        issues: []
      },
      schema_markup: {
        implemented: ["OpenGraph"],
        missing: ["Article", "FAQ"]
      }
    },

    content_optimization: {
      title_tags: {
        status: "needs_improvement",
        notes: "Some titles exceed optimal length"
      },
      meta_descriptions: {
        status: "missing",
        notes: "Multiple pages lack meta descriptions"
      },
      headers: {
        status: "ok"
      },
      content_quality: {
        word_count: "Below competitor average",
        freshness: "Moderate"
      },
      internal_links: {
        count: "Low",
        orphan_pages: true
      }
    },

    on_page_elements: {
      images: {
        optimization_needed: true,
        missing_alt_text: true
      },
      ux_signals: {
        readability: "Good",
        intrusive_popups: false
      },
      engagement_elements: {
        comments_enabled: false,
        social_sharing: true
      }
    },

    keyword_optimization: {
      primary_keyword: {
        keyword: "example keyword",
        intent_match: "informational",
        placement_score: 6
      },
      secondary_keywords: [
        { term: "related keyword 1", strength: "weak" },
        { term: "related keyword 2", strength: "moderate" }
      ],
      topic_coverage: {
        score: 6,
        missing_topics: [
          "Comparison content",
          "FAQs"
        ]
      }
    },

    action_plan: {
      critical: [
        {
          issue: "Missing meta descriptions",
          impact: "High",
          fix: "Write unique meta descriptions",
          time: "2 hours"
        }
      ],
      high: [
        {
          issue: "Slow mobile LCP",
          impact: "Medium-High",
          fix: "Optimize hero images",
          time: "1 day"
        }
      ],
      medium: [],
      low: []
    },

    benchmarks: {
      pre_audit: {
        organic_traffic: "Unknown",
        avg_position: "Unknown"
      },
      tracking_plan: {
        review_cycle: "30 / 60 / 90 days",
        success_metrics: [
          "Ranking improvement",
          "Traffic growth",
          "Engagement increase"
        ]
      }
    }
  };

  return json({
    brand_id: brandId,
    report
  });
}
