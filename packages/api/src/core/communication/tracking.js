/**
 * myPilotPost — Notification Event Tracking
 * Records open / click / complete / dismiss events.
 * GET /api/t/:notif_id/open.gif — 1×1 pixel for email open tracking
 */

import { getDB } from '../../lib/db.js';
import { json } from '../../lib/json.js';

const PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1×1 transparent GIF (base64)

export async function trackEvent(notifId, event, channel, userId, metadata, env) {
  const db = getDB(env);
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO notification_events (id, notification_id, user_id, event, channel, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, notifId, userId || null, event, channel || null, metadata ? JSON.stringify(metadata) : null)
    .run().catch(() => {});
}

/** GET /api/t/:notif_id/open.gif — email open pixel */
export async function handleOpenPixel(request, env) {
  const parts = request.url.split('/');
  const notifId = parts[parts.length - 2]; // /api/t/{notifId}/open.gif
  if (notifId) await trackEvent(notifId, 'opened', 'email', null, null, env);
  return new Response(Buffer.from(PIXEL, 'base64'), {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}

/** POST /api/customer/notifications/:id/event */
export async function recordNotificationEvent(request, env, auth) {
  const parts = request.url.split('/');
  const notifId = parts[parts.length - 2];
  const body = await request.json().catch(() => ({}));
  await trackEvent(notifId, body.event || 'clicked', body.channel || 'in_app', auth?.user_id, body.metadata, env);
  return json({ success: true });
}
