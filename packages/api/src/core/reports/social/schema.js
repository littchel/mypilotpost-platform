/**
 * Social Report Schema
 * Editable narrative + locked data
 */

export const SocialReportSchema = {
  report: {
    title: "Social Media Performance Report",
    period: "June 1 – June 30, 2026"
  },

  client: {
    name: "",
    logo_url: ""
  },

  agency: {
    name: "",
    logo_url: ""
  },

  cover: {
    highlight: "" // EDITABLE
  },

  executive_summary: {
    narrative: "", // EDITABLE
    metrics: [
      { label: "Follower Growth", value: "+12%" },
      { label: "Engagement Rate", value: "4.8%" },
      { label: "Website Clicks", value: "1,240" }
    ]
  },

  dashboard: {
    metrics: [] // LOCKED (system generated)
  },

  platforms: [
    {
      name: "Instagram",
      metrics: [],
      insight: "" // EDITABLE
    }
  ],

  recommendations: [
    {
      title: "",
      description: "" // EDITABLE
    }
  ],

  action_plan: "" // EDITABLE
};
