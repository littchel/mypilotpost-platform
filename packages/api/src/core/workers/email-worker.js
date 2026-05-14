import { getDB } from "../../lib/db.js";
import { sendEmail } from "../email/send-email.js";

export async function runEmailWorker(env) {
  const db = getDB(env);

  const pending = await db.prepare(`
    SELECT *
    FROM email_outbox
    WHERE status = 'pending'
    LIMIT 25
  `).all();

  for (const email of pending.results || []) {
    try {
      let html = null;
      let text = null;

      // Lifecycle emails store rendered HTML/text in payload.html / payload.text
      if (email.payload) {
        try {
          const p = JSON.parse(email.payload);
          html = p.html || null;
          text = p.text || null;
        } catch {
          // non-JSON payload — ignore
        }
      }

      const result = await sendEmail({
        to: email.to_email,
        subject: email.subject,
        html: html || `<p>${email.subject}</p>`,
        text: text || email.subject,
      });

      await db.prepare(`
        UPDATE email_outbox
        SET
          status = 'sent',
          provider = ?,
          provider_ref = ?,
          sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
        .bind(result.provider, result.ref, email.id)
        .run();
    } catch (err) {
      console.error(`[EMAIL-WORKER] Failed to send outbox ${email.id}:`, err.message);
      await db.prepare(`
        UPDATE email_outbox
        SET status = 'failed'
        WHERE id = ?
      `)
        .bind(email.id)
        .run();
    }
  }
}
