/**
 * myPilotPost — ACCOUNT SETTINGS
 * AUTHORITATIVE • V1 LOCKED • GLOBAL
 */

import { json, error } from "../../lib/json.js";
import { getDB } from "../../lib/db.js";
import { checkFeatureAccess } from "../billing/billing.js";

/**
 * GET Agency Branding (Global Account Level)
 */
export async function getAgencyBranding(_req, env, auth) {
  const db = getDB(env);
  const userId = auth.userId;

  const user = await db.prepare(`
    SELECT agency_name, agency_logo_url
    FROM users
    WHERE id = ?
  `).bind(userId).first();

  return json({
    agency_name: user?.agency_name || "",
    agency_logo_url: user?.agency_logo_url || ""
  });
}

/**
 * UPDATE Agency Branding (Global Account Level)
 */
export async function updateAgencyBranding(request, env, auth) {
  const access = await checkFeatureAccess(request, env, auth, 'white_label');
  if (!access.allowed) return access.response;

  const db = getDB(env);
  const userId = auth.userId;
  const { agency_name, agency_logo_url } = await request.json();

  await db.prepare(`
    UPDATE users
    SET agency_name = ?, 
        agency_logo_url = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `)
  .bind(agency_name || null, agency_logo_url || null, userId)
  .run();

  return json({ success: true });
}
