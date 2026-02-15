import { putObject } from "../../lib/r2.js";
import { registerMedia } from "./media.js";

/**
 * Shared importer utility
 */
export async function importBinary({
  env,
  brandId,
  customerId,
  source,
  sourceRef,
  filename,
  mimeType,
  buffer,
  sizeBytes
}) {
  const r2Key = `${customerId}/${brandId}/${crypto.randomUUID()}-${filename}`;

  await putObject(env, {
    key: r2Key,
    body: buffer,
    contentType: mimeType
  });

  return registerMedia({
    env,
    brandId,
    customerId,
    source,
    sourceRef,
    filename,
    mimeType,
    sizeBytes,
    r2Key
  });
}
