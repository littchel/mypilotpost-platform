import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";

/**
 * GET /api/customer/integrations
 *
 * Returns all integrations connected to the active brand.
 * Read-only. No side effects.
 */
export async function listIntegrations(request, env, auth) {
  const db = getDB(env);

  const result = await db
    .prepare(`
      SELECT
        platform,
        external_account_id,
        display_name,
        capabilities,
        status,
        connected_at,
        last_verified_at
      FROM connected_accounts
      WHERE brand_id = ?
      ORDER BY connected_at DESC
    `)
    .bind(auth.brand_id)
    .all();

  const integrations = (result.results || []).map(row => ({
    platform: row.platform,
    account_id: row.external_account_id,
    name: row.display_name,
    capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
    status: row.status,
    connected_at: row.connected_at,
    last_verified_at: row.last_verified_at
  }));

  return json({ integrations });
}
