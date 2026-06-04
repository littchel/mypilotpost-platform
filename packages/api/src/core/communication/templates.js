/**
 * myPilotPost — Communication Templates
 * Email HTML + WhatsApp text for each notification type.
 * Extends existing email/templates/index.js layouts.
 */

const APP_URL  = 'https://app.mypilotpost.com';
const SITE_URL = 'https://mypilotpost.com';
const BRAND_COLOR = '#6C63FF';

// ── Shared base layout (thin, inline-CSS safe) ────────────────────────────────
function base(subject, body, preheader = '') {
  return {
    subject,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Inter',Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#0f0f1a;padding:24px 40px;text-align:center;">
  <span style="font-size:20px;font-weight:900;color:#fff;">my<span style="color:${BRAND_COLOR}">Pilot</span>Post</span>
  <div style="height:3px;background:linear-gradient(90deg,${BRAND_COLOR},#9c88ff);border-radius:2px;margin-top:14px;"></div>
</td></tr>
<tr><td style="padding:40px;">${body}</td></tr>
<tr><td style="background:#f4f4f8;padding:20px 40px;text-align:center;border-top:1px solid #e8e8f0;">
  <p style="margin:0;font-size:12px;color:#90909a;">© ${new Date().getFullYear()} myPilotPost · <a href="${SITE_URL}/unsubscribe" style="color:${BRAND_COLOR};text-decoration:none;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  };
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin-top:20px;">${text}</a>`;
}
function h1(t) { return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1a1a2e;">${t}</h1>`; }
function p(t)  { return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4a4a6a;">${t}</p>`; }
function box(t) { return `<div style="background:#f0eeff;border-left:4px solid ${BRAND_COLOR};padding:14px 18px;border-radius:0 8px 8px 0;margin:18px 0;font-size:14px;color:#1a1a2e;">${t}</div>`; }

// ── Email Templates ───────────────────────────────────────────────────────────

export function approvalEmailTemplate({ brand_name, content_title, reviewer_name, approval_url, notes }) {
  return base(
    `Action required: Review "${content_title}" from ${brand_name}`,
    h1(`You have content to review`) +
    p(`Hi ${reviewer_name || 'there'},`) +
    p(`<strong>${brand_name}</strong> has shared a piece of content for your review.`) +
    box(`<strong>${content_title}</strong>${notes ? `<br><span style="color:#4a4a6a;font-size:13px;">${notes}</span>` : ''}`) +
    p(`Click below to approve, request changes, or reject.`) +
    btn('Review Content →', approval_url),
    `${brand_name} wants your approval on "${content_title}"`
  );
}

export function reportEmailTemplate({ brand_name, report_title, recipient_name, report_url, expiry_date }) {
  return base(
    `Your report is ready: ${report_title}`,
    h1(`${report_title}`) +
    p(`Hi ${recipient_name || 'there'},`) +
    p(`<strong>${brand_name}</strong> has shared a strategic report with you.`) +
    (expiry_date ? box(`This report link expires on <strong>${expiry_date}</strong>.`) : '') +
    p(`Open the report to view insights, download a PDF, or share with your team.`) +
    btn('Open Report →', report_url),
    `${brand_name} shared a report with you`
  );
}

export function inviteEmailTemplate({ inviter_name, brand_name, role, invite_url }) {
  return base(
    `You've been invited to collaborate on ${brand_name}`,
    h1(`You're invited`) +
    p(`Hi there,`) +
    p(`<strong>${inviter_name}</strong> has invited you to collaborate on <strong>${brand_name}</strong> as a <strong>${role}</strong>.`) +
    box(`myPilotPost is a brand intelligence platform — collaborate on content, approvals, and strategic reports.`) +
    btn('Accept Invitation →', invite_url),
    `${inviter_name} invited you to ${brand_name}`
  );
}

export function scheduleEmailTemplate({ brand_name, post_title, scheduled_time, platform, post_url }) {
  return base(
    `Scheduled: "${post_title}" goes live soon`,
    h1(`Post scheduled`) +
    p(`<strong>${post_title}</strong> is scheduled to publish on <strong>${platform}</strong> at <strong>${scheduled_time}</strong>.`) +
    (post_url ? btn('View Post →', post_url) : ''),
    `${post_title} is scheduled`
  );
}

export function digestEmailTemplate({ brand_name, recipient_name, week, stats, items }) {
  const rows = (items || []).slice(0, 5).map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f0eeff;font-size:14px;color:#1a1a2e;">${i.title}</td><td style="padding:8px 0;border-bottom:1px solid #f0eeff;font-size:14px;color:#6c63ff;text-align:right;">${i.status}</td></tr>`
  ).join('');
  return base(
    `${brand_name} — Weekly digest`,
    h1(`Weekly digest`) +
    p(`Hi ${recipient_name || 'there'}, here's what happened this week.`) +
    (stats ? box(`${stats}`) : '') +
    (rows ? `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>` : '') +
    btn('View Dashboard →', APP_URL),
    `${brand_name} weekly performance summary`
  );
}

// ── WhatsApp Text Templates ───────────────────────────────────────────────────
// Kept short — mobile first. Links truncated by Meta if over 1024 chars.

export function approvalWhatsAppText({ brand_name, content_title, approval_url }) {
  return `✅ *${brand_name}* sent you content to review.\n\n📄 *${content_title}*\n\nOpen to approve, request changes, or reject:\n${approval_url}`;
}

export function reportWhatsAppText({ brand_name, report_title, report_url }) {
  return `📊 *${brand_name}* shared a report with you.\n\n*${report_title}*\n\nView it here:\n${report_url}`;
}

export function inviteWhatsAppText({ inviter_name, brand_name, invite_url }) {
  return `👋 *${inviter_name}* invited you to collaborate on *${brand_name}* via myPilotPost.\n\nAccept here:\n${invite_url}`;
}

export function scheduleWhatsAppText({ post_title, platform, scheduled_time }) {
  return `📅 *${post_title}* is scheduled on *${platform}* for ${scheduled_time}.`;
}
