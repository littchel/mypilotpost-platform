/**
 * myPilotPost — WhatsApp Business Cloud API
 * Meta Graph API v18. Business-initiated messages only.
 * Env vars required: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
 *
 * Approval: requires pre-approved Meta template IDs configured in env:
 *   WHATSAPP_TEMPLATE_APPROVAL (default: "mpp_approval_v1")
 *   WHATSAPP_TEMPLATE_REPORT   (default: "mpp_report_v1")
 *   WHATSAPP_TEMPLATE_INVITE   (default: "mpp_invite_v1")
 *
 * Falls back to text messages when templates not configured (dev/test).
 */

const META_API = 'https://graph.facebook.com/v18.0';

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function e164(phone) {
  // Normalise to E.164 — strip spaces, dashes, parens; ensure leading +
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

async function sendRaw(phoneId, token, body) {
  const res = await fetch(`${META_API}/${phoneId}/messages`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${data.error?.message || res.statusText}`);
  return { provider: 'whatsapp', ref: data.messages?.[0]?.id || crypto.randomUUID() };
}

/**
 * Send a plain text message (for dev / approved text-only flows).
 */
export async function sendWhatsAppText(to, text, env) {
  if (!env?.WHATSAPP_TOKEN || !env?.WHATSAPP_PHONE_ID) {
    console.warn('[WHATSAPP] Not configured — skipping send to', to);
    return { provider: 'stub', ref: crypto.randomUUID() };
  }
  return sendRaw(env.WHATSAPP_PHONE_ID, env.WHATSAPP_TOKEN, {
    messaging_product: 'whatsapp',
    to: e164(to),
    type: 'text',
    text: { body: text, preview_url: true },
  });
}

/**
 * Send an approved template message.
 * components: array of header/body/button component objects per Meta spec.
 */
export async function sendWhatsAppTemplate(to, templateName, language = 'en', components = [], env) {
  if (!env?.WHATSAPP_TOKEN || !env?.WHATSAPP_PHONE_ID) {
    console.warn('[WHATSAPP] Not configured — skipping template to', to);
    return { provider: 'stub', ref: crypto.randomUUID() };
  }
  return sendRaw(env.WHATSAPP_PHONE_ID, env.WHATSAPP_TOKEN, {
    messaging_product: 'whatsapp',
    to: e164(to),
    type: 'template',
    template: { name: templateName, language: { code: language }, components },
  });
}

/**
 * High-level send for each notification type.
 * Uses template when available, falls back to text.
 */
export async function sendApprovalWhatsApp({ to, brand_name, content_title, approval_url }, env) {
  const templateName = env?.WHATSAPP_TEMPLATE_APPROVAL || '';
  if (templateName) {
    return sendWhatsAppTemplate(to, templateName, 'en', [
      { type: 'body', parameters: [
        { type: 'text', text: brand_name },
        { type: 'text', text: content_title },
      ]},
      { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: approval_url }] },
    ], env);
  }
  const { approvalWhatsAppText } = await import('./templates.js');
  return sendWhatsAppText(to, approvalWhatsAppText({ brand_name, content_title, approval_url }), env);
}

export async function sendReportWhatsApp({ to, brand_name, report_title, report_url }, env) {
  const templateName = env?.WHATSAPP_TEMPLATE_REPORT || '';
  if (templateName) {
    return sendWhatsAppTemplate(to, templateName, 'en', [
      { type: 'body', parameters: [
        { type: 'text', text: brand_name },
        { type: 'text', text: report_title },
      ]},
      { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: report_url }] },
    ], env);
  }
  const { reportWhatsAppText } = await import('./templates.js');
  return sendWhatsAppText(to, reportWhatsAppText({ brand_name, report_title, report_url }), env);
}

export async function sendInviteWhatsApp({ to, inviter_name, brand_name, invite_url }, env) {
  const templateName = env?.WHATSAPP_TEMPLATE_INVITE || '';
  if (templateName) {
    return sendWhatsAppTemplate(to, templateName, 'en', [
      { type: 'body', parameters: [
        { type: 'text', text: inviter_name },
        { type: 'text', text: brand_name },
      ]},
      { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: invite_url }] },
    ], env);
  }
  const { inviteWhatsAppText } = await import('./templates.js');
  return sendWhatsAppText(to, inviteWhatsAppText({ inviter_name, brand_name, invite_url }), env);
}
