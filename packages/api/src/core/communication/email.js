/**
 * myPilotPost — Communication Email Layer
 * Thin wrapper over existing sendEmail + email_outbox.
 * Queues to outbox for retry support; falls through for immediate sends.
 */

import { sendEmail } from '../email/send-email.js';
import { getDB } from '../../lib/db.js';
import {
  approvalEmailTemplate,
  reportEmailTemplate,
  inviteEmailTemplate,
  scheduleEmailTemplate,
  digestEmailTemplate,
} from './templates.js';

async function queue(db, { to, subject, html, type }) {
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO email_outbox (id, to_email, template, subject, payload, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).bind(id, to, type, subject, html).run().catch(() => {});
  return id;
}

export async function sendApprovalEmail({ to, brand_name, content_title, reviewer_name, approval_url, notes }, env) {
  const tpl = approvalEmailTemplate({ brand_name, content_title, reviewer_name, approval_url, notes });
  return sendEmail({ to, subject: tpl.subject, html: tpl.html, env });
}

export async function sendReportEmail({ to, brand_name, report_title, recipient_name, report_url, expiry_date }, env) {
  const tpl = reportEmailTemplate({ brand_name, report_title, recipient_name, report_url, expiry_date });
  return sendEmail({ to, subject: tpl.subject, html: tpl.html, env });
}

export async function sendInviteEmail({ to, inviter_name, brand_name, role, invite_url }, env) {
  const tpl = inviteEmailTemplate({ inviter_name, brand_name, role, invite_url });
  return sendEmail({ to, subject: tpl.subject, html: tpl.html, env });
}

export async function sendScheduleEmail({ to, brand_name, post_title, scheduled_time, platform, post_url }, env) {
  const tpl = scheduleEmailTemplate({ brand_name, post_title, scheduled_time, platform, post_url });
  return sendEmail({ to, subject: tpl.subject, html: tpl.html, env });
}

export async function sendDigestEmail({ to, brand_name, recipient_name, week, stats, items }, env) {
  const tpl = digestEmailTemplate({ brand_name, recipient_name, week, stats, items });
  return sendEmail({ to, subject: tpl.subject, html: tpl.html, env });
}
