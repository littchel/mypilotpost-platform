/**
 * Validation Script — Brand Audit Engine V2
 */

import { runPublicAudit } from "./public_audit.js";

async function validate() {
  console.log("🚀 Validating Public Audit Engine...");

  const mockEnv = {
    mypilotpost: {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: async () => {
            console.log(`[SQL] Executing: ${sql}`);
            console.log(`[SQL] Params: ${JSON.stringify(args)}`);
            return { success: true };
          }
        })
      })
    }
  };

  const mockRequest = {
    json: async () => ({
      brand_name: "Antigravity AI",
      website_url: "https://antigravity.ai",
      social_handles: ["@antigravity", "@pilotpost"]
    })
  };

  const response = await runPublicAudit(mockRequest, mockEnv);
  const data = await response.json();

  console.log("✅ Audit Result:", JSON.stringify(data, null, 2));

  if (data.overall_score > 0 && data.top_insights.length > 0) {
    console.log("🎉 SUCCESS: Public Audit generated with score and insights!");
  } else {
    console.error("❌ FAILURE: Audit generation returned invalid data.");
  }
}

validate().catch(console.error);
