import { db } from "../../lib/db.js";

export async function writeVersion(env, {
  contentId,
  contentType,
  payload,
  version,
}) {
  await db(env).prepare(
    `INSERT INTO content_versions
     (id, content_id, content_type, version, payload)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    contentId,
    contentType,
    version,
    JSON.stringify(payload)
  ).run();
}
