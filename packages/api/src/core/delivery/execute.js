// packages/api/src/core/delivery/execute.js

import { getDB } from "../../lib/db.js";

/* ======================================================
   DELIVERY EXECUTION (PHASE 3)
====================================================== */

export async function executeDelivery(env, jobId) {
  const db = getDB(env);

  const job = await db.prepare(`
    SELECT dj.*, sv.text AS variant_text
    FROM delivery_jobs dj
    JOIN social_variants sv
      ON sv.content_id = dj.content_id
     AND sv.platform = dj.platform
    WHERE dj.id = ?
  `)
    .bind(jobId)
    .first();

  if (!job) throw new Error("Delivery job not found");

  const metadata = JSON.parse(job.metadata || "{}");
  const hashtags = metadata.hashtags || [];

  const finalText =
    hashtags.length > 0
      ? `${job.variant_text}\n\n${hashtags.join(" ")}`
      : job.variant_text;

  // TODO: send finalText to platform API

  await db.prepare(`
    UPDATE delivery_jobs
    SET status = 'delivered', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
    .bind(jobId)
    .run();

  return finalText;
}
