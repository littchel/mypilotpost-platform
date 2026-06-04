/**
 * myPilotPost — Communication Preferences
 * Per-user channel opt-in/out, WhatsApp number, quiet hours.
 */

import { json, error } from '../../lib/json.js';
import { getDB } from '../../lib/db.js';

const CHANNELS  = ['email', 'whatsapp'];
const NOTIF_TYPES = ['approval', 'report', 'invite', 'scheduler', 'digest'];

export async function getCommPreferences(request, env, auth) {
  if (!auth?.user_id) return error('Unauthorized', 401);
  const db = getDB(env);

  const { results } = await db.prepare(`
    SELECT channel, enabled, type_config, whatsapp_number, quiet_start, quiet_end
    FROM communication_preferences
    WHERE user_id = ? AND (brand_id = ? OR brand_id IS NULL)
  `).bind(auth.user_id, auth.brand_id).all();

  const byChannel = {};
  for (const ch of CHANNELS) {
    const row = results?.find(r => r.channel === ch) || {};
    byChannel[ch] = {
      enabled: row.enabled !== undefined ? Boolean(row.enabled) : true,
      types: (() => { try { return JSON.parse(row.type_config || '{}'); } catch { return {}; } })(),
      whatsapp_number: row.whatsapp_number || null,
      quiet_start: row.quiet_start || null,
      quiet_end: row.quiet_end || null,
    };
  }
  return json({ data: byChannel });
}

export async function updateCommPreferences(request, env, auth) {
  if (!auth?.user_id) return error('Unauthorized', 401);
  const body = await request.json().catch(() => ({}));
  const db = getDB(env);

  for (const [channel, cfg] of Object.entries(body)) {
    if (!CHANNELS.includes(channel)) continue;
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO communication_preferences (id, user_id, brand_id, channel, enabled, type_config, whatsapp_number, quiet_start, quiet_end, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, brand_id, channel) DO UPDATE SET
        enabled = excluded.enabled,
        type_config = excluded.type_config,
        whatsapp_number = excluded.whatsapp_number,
        quiet_start = excluded.quiet_start,
        quiet_end = excluded.quiet_end,
        updated_at = datetime('now')
    `).bind(
      id, auth.user_id, auth.brand_id, channel,
      cfg.enabled !== false ? 1 : 0,
      JSON.stringify(cfg.types || {}),
      cfg.whatsapp_number || null,
      cfg.quiet_start || null,
      cfg.quiet_end || null,
    ).run();
  }
  return json({ success: true });
}

/**
 * Resolve channels to deliver a notification type for a user.
 * Returns: { email: boolean, whatsapp: string|null }
 */
export async function resolveChannels(userId, brandId, notifType, db) {
  const { results } = await db.prepare(`
    SELECT channel, enabled, type_config, whatsapp_number, quiet_start, quiet_end
    FROM communication_preferences
    WHERE user_id = ? AND (brand_id = ? OR brand_id IS NULL)
  `).bind(userId, brandId).all().catch(() => ({ results: [] }));

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  function inQuiet(start, end) {
    if (!start || !end) return false;
    return start <= hhmm || hhmm <= end; // handles overnight ranges
  }

  const emailRow  = results?.find(r => r.channel === 'email');
  const waRow     = results?.find(r => r.channel === 'whatsapp');

  const emailEnabled = emailRow ? Boolean(emailRow.enabled) : true;
  const waEnabled    = waRow    ? Boolean(waRow.enabled)    : false;

  const emailTypeOk = emailRow ? (JSON.parse(emailRow.type_config || '{}')[notifType] !== false) : true;
  const waTypeOk    = waRow    ? (JSON.parse(waRow.type_config   || '{}')[notifType] !== false) : true;

  const emailQuiet = emailRow  ? inQuiet(emailRow.quiet_start,  emailRow.quiet_end)  : false;
  const waQuiet    = waRow     ? inQuiet(waRow.quiet_start,     waRow.quiet_end)     : false;

  return {
    email:    emailEnabled && emailTypeOk && !emailQuiet,
    whatsapp: (waEnabled && waTypeOk && !waQuiet && waRow?.whatsapp_number) ? waRow.whatsapp_number : null,
  };
}
