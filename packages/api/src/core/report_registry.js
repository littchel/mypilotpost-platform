/**
 * myPilotPost — Report Registry
 * Maps 12 report type IDs to renderer template + config.
 * Single source of truth for all report type → template resolution.
 */

export const REPORT_REGISTRY = {
  exec_growth:     { template: 'executive',   label: 'Executive Growth Report',        whiteLabelEnabled: false },
  social_perf:     { template: 'agency',      label: 'Social Performance Report',      whiteLabelEnabled: false },
  seo_vis:         { template: 'executive',   label: 'SEO Visibility Report',          whiteLabelEnabled: false },
  comp_bench:      { template: 'agency',      label: 'Competitive Benchmark Report',   whiteLabelEnabled: false },
  brand_health:    { template: 'executive',   label: 'Brand Health Report',            whiteLabelEnabled: false },
  qbr:             { template: 'executive',   label: 'Quarterly Business Review',      whiteLabelEnabled: false },
  content_perf:    { template: 'agency',      label: 'Content Performance Report',     whiteLabelEnabled: false },
  audience_intel:  { template: 'executive',   label: 'Audience Intelligence Report',   whiteLabelEnabled: false },
  campaign_impact: { template: 'agency',      label: 'Campaign Impact Report',         whiteLabelEnabled: false },
  whitelabel:      { template: 'white_label', label: 'White-label Client Report',      whiteLabelEnabled: true  },
  boardroom:       { template: 'executive',   label: 'Boardroom Strategic Report',     whiteLabelEnabled: false },
  agency_perf:     { template: 'agency',      label: 'Agency Performance Report',      whiteLabelEnabled: false },
};

export function resolveReportConfig(reportTypeId) {
  return REPORT_REGISTRY[reportTypeId] || REPORT_REGISTRY.exec_growth;
}
