/**
 * myPilotPost — notify()
 * Single call to emit in-app notification + external delivery (email/WhatsApp).
 * All platform events flow through here.
 *
 * notify(env, { event, brandId, recipientId, recipientEmail, recipientPhone,
 *               title, message, data, link })
 */

import { getDB } from '../../lib/db.js';
import { deliver } from './engine.js';

const EVENT_TO_COMM_TYPE = {
  approval_requested:   'approval',
  approval_approved:    'approval',
  approval_rejected:    'approval',
  report_shared:        'report',
  report_opened:        'report',
  invite_sent:          'invite',
  schedule_created:     'scheduler',
  schedule_failed:      'scheduler',
  content_published:    'scheduler',
  support_created:      null, // admin-only, no user delivery
  support_replied:      null,
};

export async function notify(env, {
  event,
  brandId,
  recipientId,
  recipientEmail,
  recipientPhone,
  title,
  message,
  data = {},
  link,
}) {
  const db = getDB(env);

  // 1. Insert in-app notification
  try {
    const notifId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO notifications (id, brand_id, recipient_id, recipient_type, type, title, message, data, read, created_at)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, 0, datetime('now'))
    `).bind(notifId, brandId || null, recipientId || null, event, title, message, JSON.stringify({ ...data, link })).run();
  } catch (e) {
    console.error('[NOTIFY] in-app insert failed:', e.message);
  }

  // 2. External delivery (email / WhatsApp) if channel mapped
  const commType = EVENT_TO_COMM_TYPE[event];
  if (!commType) return;
  if (!recipientEmail && !recipientPhone) return;

  try {
    await deliver({
      type: commType,
      brandId,
      userId: recipientId,
      to: { email: recipientEmail, phone: recipientPhone },
      data: { ...data, link },
      env,
    });
  } catch (e) {
    console.error('[NOTIFY] external delivery failed:', e.message);
  }
}
