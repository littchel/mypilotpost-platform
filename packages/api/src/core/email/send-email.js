/**
 * Abstract email sender — Resend provider.
 * Requires RESEND_API_KEY secret set via `wrangler secret put RESEND_API_KEY`.
 * Falls back to console-only logging when the key is absent (dev / CI safety net).
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM_ADDRESS = "MyPilotPost <notifications@mypilotpost.com>";

/**
 * @param {object} opts
 * @param {string} opts.to        — recipient email
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {object} [opts.env]     — Worker env (provides RESEND_API_KEY secret)
 * @returns {{ provider: string, ref: string }}
 */
export async function sendEmail({ to, subject, html, text, env }) {
  if (!env?.RESEND_API_KEY) {
    console.warn(`[EMAIL] RESEND_API_KEY not configured — skipping send to ${to}`);
    return { provider: "stub", ref: crypto.randomUUID() };
  }

  const body = {
    from: FROM_ADDRESS,
    to: [to],
    subject,
    html,
    ...(text ? { text } : {}),
  };

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return { provider: "resend", ref: data.id || crypto.randomUUID() };
}
