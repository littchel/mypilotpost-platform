
import { nowISO } from "../../lib/dates";
import { db } from "../../lib/db";
import { emitMission } from "./missions.js";

/**
 * Run a deterministic SEO audit for a blog post
 */
export async function runSeoAudit({
  brand_id,
  blog_post_id,
  triggered_by = "manual"
}) {
  // 1. Load blog
  const blog = await db.get(
    `SELECT * FROM blog_posts WHERE id = ? AND brand_id = ?`,
    [blog_post_id, brand_id]
  );

  if (!blog || blog.status !== "published") {
    throw new Error("SEO audit requires published blog content");
  }

  // 2. Create audit record
  const auditId = crypto.randomUUID();

  await db.run(
    `
    INSERT INTO seo_audits (
      id, brand_id, blog_post_id, audit_type, created_at
    ) VALUES (?, ?, ?, ?, ?)
    `,
    [
      auditId,
      brand_id,
      blog_post_id,
      "on-page",
      nowISO()
    ]
  );

  const issues = [];

  // 3. Run rule groups
  runStructureRules(blog, issues);
  runContentRules(blog, issues);
  runFreshnessRules(blog, issues);
  runLinkingRules(blog, issues);

  // 4. Persist issues
  for (const issue of issues) {
    await db.run(
      `
      INSERT INTO seo_audit_issues (
        id, audit_id, issue_code, severity,
        description, recommendation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nanoid(),
        auditId,
        issue.code,
        issue.severity,
        issue.description,
        issue.recommendation,
        nowISO()
      ]
    );
  }

  // 5. Emit mission
  await emitMission({
    brand_id,
    type: "seo_audit_run",
    ref_id: blog_post_id,
    meta: {
      audit_id: auditId,
      issue_count: issues.length,
      triggered_by
    }
  });

  // 6. Return explainable summary
  return {
    audit_id: auditId,
    issues_found: issues.length,
    issues
  };
}
