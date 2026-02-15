import { json } from "../lib/json.js";
import { getDB } from "../lib/db.js";

/**
 * Zapier Integration
 * Purpose: Enable webhook + automation triggers
 * No OAuth redirect — token-based
 */

/* ============================
   CONNECT (GENERATE TOKEN)
============================ */
export async function zapierIntegrationConnect(request, env, auth) {
  const token = crypto.randomUUID();

  const db = getDB(env);
  await db
    .prepare(`
      INSERT INTO connected_accounts (
        id,
        brand_id,
        platform,
        access_token,
        capabilities,
        status,
        connected_at
      ) VALUES (?, ?, 'zapier', ?, ?, 'connected', CURRENT_TIMESTAMP)
    `)
    .bind(
      crypto.randomUUID(),
      auth.brand_id,
      token,
      JSON.stringify(["automation"])
    )
    .run();

  return json({
    success: true,
    token
  });
}

/* ============================
   DISCONNECT
============================ */
export async function zapierIntegrationDisconnect(request, env, auth) {
  const db = getDB(env);

  await db
    .prepare(`
      UPDATE connected_accounts
      SET status = 'disconnected'
      WHERE brand_id = ?
        AND platform = 'zapier'
    `)
    .bind(auth.brand_id)
    .run();

  return json({ success: true });
}
