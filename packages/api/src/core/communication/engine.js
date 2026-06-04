/**
 * myPilotPost — Communication Engine
 * Single entry point for all notification delivery.
 * Resolves channel preferences → dispatches email and/or WhatsApp.
 * Never throws — failures are logged, never bubble to callers.
 */

import { getDB } from '../../lib/db.js';
import { resolveChannels } from './preferences.js';
import {
  sendApprovalEmail, sendReportEmail, sendInviteEmail,
  sendScheduleEmail, sendDigestEmail,
} from './email.js';
import {
  sendApprovalWhatsApp, sendReportWhatsApp, sendInviteWhatsApp,
} from './whatsapp.js';
import { trackEvent } from './tracking.js';

const TAG = '[COMM_ENGINE]';

async function log(db, { notifId, userId, channel, status, providerRef }) {
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO notification_delivery_logs (id, notification_id, user_id, channel, status, provider_ref, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, notifId || null, userId || null, channel, status, providerRef || null)
    .run().catch(() => {});
}

async function tryDeliver(fn, db, meta) {
  try {
    const result = await fn();
    await log(db, { ...meta, status: 'sent', providerRef: result?.ref });
    return result;
  } catch (err) {
    console.error(`${TAG} delivery failed [${meta.channel}]:`, err.message);
    await log(db, { ...meta, status: 'failed' });
    return null;
  }
}

/**
 * deliver({ type, to, data, notifId?, userId?, env })
 *
 * type: 'approval' | 'report' | 'invite' | 'scheduler' | 'digest'
 * to:   { email?, phone?, user_id?, brand_id? }
 * data: type-specific payload
 */
export async function deliver({ type, to, data, notifId, userId, brandId, env }) {
  const db = getDB(env);
  const uid = userId || to?.user_id;

  // Resolve channel preferences if we have a user
  let channels = { email: Boolean(to?.email), whatsapp: to?.phone || null };
  if (uid && brandId) {
    try {
      channels = await resolveChannels(uid, brandId, type, db);
      // Override: if caller explicitly passed email/phone, respect them
      if (to?.email) channels.email = true;
      if (to?.phone) channels.whatsapp = to.phone;
    } catch { /* use fallback */ }
  }

  const meta = { notifId, userId: uid };

  // ── Email ─────────────────────────────────────────────────────────────────
  if (channels.email && to?.email) {
    const addr = to.email;
    switch (type) {
      case 'approval':  await tryDeliver(() => sendApprovalEmail({ to: addr, ...data }, env), db, { ...meta, channel: 'email' }); break;
      case 'report':    await tryDeliver(() => sendReportEmail({ to: addr, ...data }, env), db, { ...meta, channel: 'email' }); break;
      case 'invite':    await tryDeliver(() => sendInviteEmail({ to: addr, ...data }, env), db, { ...meta, channel: 'email' }); break;
      case 'scheduler': await tryDeliver(() => sendScheduleEmail({ to: addr, ...data }, env), db, { ...meta, channel: 'email' }); break;
      case 'digest':    await tryDeliver(() => sendDigestEmail({ to: addr, ...data }, env), db, { ...meta, channel: 'email' }); break;
      default: console.warn(`${TAG} Unknown type for email: ${type}`);
    }
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  if (channels.whatsapp) {
    const phone = channels.whatsapp;
    switch (type) {
      case 'approval': await tryDeliver(() => sendApprovalWhatsApp({ to: phone, ...data }, env), db, { ...meta, channel: 'whatsapp' }); break;
      case 'report':   await tryDeliver(() => sendReportWhatsApp({ to: phone, ...data }, env), db, { ...meta, channel: 'whatsapp' }); break;
      case 'invite':   await tryDeliver(() => sendInviteWhatsApp({ to: phone, ...data }, env), db, { ...meta, channel: 'whatsapp' }); break;
      default: break; // schedule/digest not on WhatsApp per spec
    }
  }

  if (notifId) await trackEvent(notifId, 'queued', null, uid, { type }, env);
}
