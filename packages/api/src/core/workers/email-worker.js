import { getDB } from "../lib/db.js";
import { sendEmail } from "../core/email/send-email.js";

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
      const result = await sendEmail({
        to: email.to_email,
        subject: email.subject,
        html: "<p>Email content</p>",
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
