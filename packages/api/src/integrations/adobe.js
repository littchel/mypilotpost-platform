// packages/api/src/integrations/adobe.js
// Adobe integration surface.
//   - Adobe Express Embed: client-side SDK keyed by a PUBLIC, domain-allowlisted client_id.
//   - Adobe Stock: requires the Stock API entitlement on the key + a client secret (licensing).
//     The current ADOBE_CLIENT_ID returns ErrInvalidAPIKey from Stock, so Stock is reported
//     unavailable rather than stubbed.

import { json } from "../lib/json.js";

/**
 * GET /api/customer/integrations/adobe/config
 * Returns the public Express Embed client_id for the frontend SDK.
 * (Embed client IDs are public and domain-restricted — safe to expose, like a Maps key.)
 */
export function getAdobeConfig(env) {
  return json({
    express_enabled: true,
    client_id: env.ADOBE_CLIENT_ID || "demo_adobe_express_client_id_placeholder",
    app_name: "MyPilotPost",
  });
}

/**
 * GET /api/customer/integrations/adobe/status
 * Honest capability status for both Adobe products.
 */
export function getAdobeStatus(env) {
  return json({
    express: {
      available: Boolean(env.ADOBE_CLIENT_ID),
      status: env.ADOBE_CLIENT_ID ? "configured" : "not_configured",
      note: env.ADOBE_CLIENT_ID
        ? "Express Embed SDK uses this client_id in-browser; the domain must be allow-listed in the Adobe project."
        : "Set ADOBE_CLIENT_ID to enable Adobe Express.",
    },
    stock: {
      available: false,
      status: "unavailable",
      reason: "ADOBE_CLIENT_ID is not entitled for the Adobe Stock API (Stock returns ErrInvalidAPIKey / 403003). Add the Adobe Stock API to the project and provide a client secret for licensing.",
    },
  });
}
