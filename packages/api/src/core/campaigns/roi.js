/**
 * Campaign ROI Engine
 * Milestone: 3 — Campaign Engine (Growth Logic)
 * Status: FINAL / LOCKED
 *
 * Rules:
 * - Deterministic
 * - Explainable
 * - Read-only
 * - No ML
 * - No attribution
 * - No writes
 */

/**
 * Resolve the effective campaign time window.
 * Campaign dates override everything.
 */
export function resolveCampaignWindow(campaign, contentLinks = []) {
  let start = campaign.start_date || null;

  if (!start && contentLinks.length > 0) {
    start = contentLinks
      .map(c => c.created_at)
      .sort()[0];
  }

  const end = campaign.end_date || new Date().toISOString();

  return { start, end };
}

/**
 * Core ROI calculation.
 * This function is PURE.
 */
export function calculateROI({ spendRows, outcomeRows }) {
  if (!spendRows || spendRows.length === 0) {
    return {
      status: "NO_SPEND",
      reason: "No spend observations found for campaign window"
    };
  }

  const currencies = new Set(spendRows.map(r => r.currency));
  if (currencies.size > 1) {
    return {
      status: "MIXED_CURRENCY",
      reason: "Multiple currencies detected in spend observations"
    };
  }

  const totalSpend = spendRows.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  if (totalSpend <= 0) {
    return {
      status: "NO_SPEND",
      reason: "Spend observations exist but total spend is zero"
    };
  }

  const revenueRows = outcomeRows.filter(
    o => o.metric === "revenue"
  );

  if (revenueRows.length === 0) {
    return {
      status: "NO_REVENUE",
      total_spend: totalSpend,
      reason: "No revenue outcomes recorded"
    };
  }

  const totalRevenue = revenueRows.reduce(
    (sum, r) => sum + Number(r.value || 0),
    0
  );

  if (totalRevenue <= 0) {
    return {
      status: "NO_REVENUE",
      total_spend: totalSpend,
      reason: "Revenue outcomes recorded but value is zero"
    };
  }

  const roi = (totalRevenue - totalSpend) / totalSpend;

  return {
    status: "OK",
    total_spend: totalSpend,
    total_revenue: totalRevenue,
    roi,
    roi_percent: roi * 100
  };
}

/**
 * Secondary efficiency metrics (explicitly NOT ROI)
 */
export function calculateEfficiencyMetrics({ spendRows, outcomeRows }) {
  const totalSpend = spendRows.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const metrics = {};

  const totals = {};
  for (const row of outcomeRows) {
    totals[row.metric] = (totals[row.metric] || 0) + Number(row.value || 0);
  }

  if (totalSpend > 0 && totals.conversions > 0) {
    metrics.cost_per_conversion = totalSpend / totals.conversions;
  }

  if (totalSpend > 0 && totals.clicks > 0) {
    metrics.cost_per_click = totalSpend / totals.clicks;
  }

  if (totalSpend > 0 && totals.impressions > 0) {
    metrics.cpm = (totalSpend / totals.impressions) * 1000;
  }

  return metrics;
}

/**
 * Explainability contract.
 * If this cannot be generated, the metric must not render.
 */
export function explainROI(result) {
  if (!result || result.status !== "OK") {
    return `ROI unavailable: ${result?.status || "UNKNOWN_STATE"}`;
  }

  return `This campaign spent ${result.total_spend} and generated ${result.total_revenue} in measured revenue, resulting in a ${result.roi_percent.toFixed(
    2
  )}% return.`;
}
