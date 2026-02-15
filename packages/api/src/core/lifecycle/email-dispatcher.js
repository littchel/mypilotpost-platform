import { getDB } from "../../lib/db.js";
import { EMAIL_RULES } from "./email-rules.js";

/**
 * Convert lifecycle events → email outbox entries
 */
export async function enqueueLifecycleEmails(env) {
  const db = getDB(env);

  const events = await db.prepare(`
    SELECT *
    FROM lifecycle_events
    WHERE id NOT IN (
      SELECT payload FROM email_outbox
    )
  `).all();

  for (const event of events.results || []) {
    const rule = EMAIL_RULES[event.type];
    if (!rule) continue;

    await db.prepare(`
      INSERT INTO email_outbox (
        id,
        customer_id,
        template,
        to_email,
        subject,
        payload,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `)
      .bind(
        crypto.randomUUID(),
        event.customer_id,
        rule.template,
        event.payload?.email || "",
        rule.subject,
        JSON.stringify(event)
      )
      .run();
  }
}
