export const SEO_AUDIT_SCHEMA = {
  meta: {
    client_name: "",
    client_logo_url: "",
    report_period: "",
    generated_at: "",
    overall_score: 0,          // 0–100
    score_label: "good",       // good | warning | critical
  },

  executive_summary: {
    key_highlight: "",
    top_wins: [],
    top_fixes: [],
    estimated_impact: "",
    time_to_implement: {
      quick_wins: [],
      long_term: []
    }
  },

  technical_audit: {
    url_structure: {
      score: 0,
      checks: {}
    },
    page_speed: {
      mobile_score: 0,
      desktop_score: 0,
      core_web_vitals: {
        lcp: "",
        fid: "",
        cls: ""
      },
      issues: []
    },
    mobile_usability: {
      score: 0,
      issues: []
    },
    schema_markup: {
      implemented: [],
      missing: []
    }
  },

  content_optimization: {
    title_tags: {},
    meta_descriptions: {},
    headers: {},
    content_quality: {},
    internal_links: {}
  },

  on_page_elements: {
    images: {},
    ux_signals: {},
    engagement_elements: {}
  },

  keyword_optimization: {
    primary_keyword: {},
    secondary_keywords: [],
    topic_coverage: {}
  },

  action_plan: {
    critical: [],
    high: [],
    medium: [],
    low: []
  },

  benchmarks: {
    pre_audit: {},
    tracking_plan: {}
  },

  editable_sections: [
    "executive_summary.key_highlight",
    "executive_summary.estimated_impact",
    "action_plan"
  ]
};
