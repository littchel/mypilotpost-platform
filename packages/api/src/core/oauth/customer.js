import { decrypt } from "../../lib/crypto.js";

export async function listConnectedAccounts(env, brandId) {
  const { results } = await env.mypilotpost.prepare(`
    SELECT id, provider, display_name, status, created_at
    FROM connected_accounts
    WHERE brand_id = ?
  `).bind(brandId).all();

  return results;
}

export async function revokeConnectedAccount(env, id) {
  await env.mypilotpost.prepare(`
    UPDATE connected_accounts
    SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run();
}
