// lib/r2.js

/**
 * Cloudflare R2 helper utilities
 * - Secure uploads
 * - Signed reads
 * - No public access
 */

export async function putObject(env, {
  key,
  body,
  contentType
}) {
  await env.MEDIA_BUCKET.put(key, body, {
    httpMetadata: {
      contentType
    }
  });
}

export async function getSignedReadUrl(env, key, expiresInSeconds = 3600) {
  const url = await env.MEDIA_BUCKET.createSignedUrl(
    key,
    {
      method: "GET",
      expiresIn: expiresInSeconds
    }
  );
  return url;
}

export async function deleteObject(env, key) {
  await env.MEDIA_BUCKET.delete(key);
}
