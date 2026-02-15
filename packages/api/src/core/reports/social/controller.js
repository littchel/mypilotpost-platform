import { json } from "../../../lib/json.js";
import { buildSocialReport } from "./service.js";
import { renderPDF } from "../../../lib/pdf.js";

export async function getSocialReport(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const period =
    url.searchParams.get("period") || "This Month";

  const report = await buildSocialReport(
    env,
    auth.brand_id,
    period
  );

  return json(report);
}

/**
 * POST /api/customer/reports/social/pdf
 * Body: same schema as GET, optionally overridden by agency edits
 */
export async function generateSocialReportPDF(request, env, auth) {
  if (!auth?.brand_id) {
    return json({ error: "Unauthorized" }, 401);
  }

  const reportData = await request.json();

  const pdf = await renderPDF({
    template: "reports/social_report.html",
    data: reportData,
    env
  });

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        "attachment; filename=social-report.pdf"
    }
  });
}
