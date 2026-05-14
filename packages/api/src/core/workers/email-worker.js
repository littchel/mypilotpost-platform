import { getDB } from "../../lib/db.js";
import { sendEmail } from "../email/send-email.js";
import { TEMPLATE_REGISTRY } from "../email/templates/index.js";

const MAX_RETRY = 3;

export async function runEmailWorker(env) {
  const db = getDB(env);

  const pending = await db.prepare(`
    SELECT *
    FROM email_outbox
    WHERE status = 'pending'
       OR (status = 'failed' AND retry_count < ${MAX_RETRY})
    ORDER BY created_at ASC
    LIMIT 25
  `).all();

  for (const email of pending.results || []) {
    try {
      let html = null;
      let text = null;

      // Step 1: try pre-rendered HTML/text from payload (lifecycle emails)
      if (email.payload) {
        try {
          const p = JSON.parse(email.payload);
          html = p.html || null;
          text = p.text || null;

          // Step 2: if no pre-rendered HTML, use template + templateData
          if (!html && email.template && TEMPLATE_REGISTRY[email.template]) {
            const rendered = TEMPLATE_REGISTRY[email.template](p.templateData || p);
            html = rendered.html;
            text = rendered.text;
          }
        } catch {
          // non-JSON payload — fall through to generic
        }
      }

      // Step 3: for OTP template, render from payload fields
      if (!html && email.template === "otp_verification" && email.payload) {
        try {
          const p = JSON.parse(email.payload);
          const rendered = TEMPLATE_REGISTRY.otp_verification({
            otp: p.otp,
            expires_minutes: p.expires_minutes || 15,
          });
          html = rendered.html;
          text = rendered.text;
        } catch { /* ignore */ }
      }

      const result = await sendEmail({
        to: email.to_email,
        subject: email.subject,
        html: html || `<p>${email.subject}</p>`,
        text: text || email.subject,
      });

      await db.prepare(`
        UPDATE email_outbox
        SET status = 'sent', provider = ?, provider_ref = ?, sent_at = datetime('now')
        WHERE id = ?
      `).bind(result.provider, result.ref, email.id).run();

    } catch (err) {
      console.error(`[EMAIL-WORKER] Failed outbox ${email.id} (attempt ${(email.retry_count || 0) + 1}):`, err.message);

      const newRetry = (email.retry_count || 0) + 1;
      const newStatus = newRetry >= MAX_RETRY ? "dead_letter" : "failed";

      await db.prepare(`
        UPDATE email_outbox
        SET status = ?, retry_count = ?, last_error = ?
        WHERE id = ?
      `).bind(newStatus, newRetry, err.message?.slice(0, 500), email.id).run();
    }
  }
}
