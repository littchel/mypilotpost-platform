/**
 * myPilotPost — Media Utilities
 * Handles remote asset fetching, validation, and conversion for publishing.
 */

/**
 * Fetch a media item for publishing.
 * For direct R2 assets (provider='direct'), reads from R2 to avoid Worker-to-Worker
 * loopback issues with %2F-encoded paths in self-referential URLs.
 */
export async function fetchMediaAsset(item, env) {
  if (item.r2_key && env?.MEDIA_BUCKET) {
    const object = await env.MEDIA_BUCKET.get(item.r2_key);
    if (!object) throw new Error(`R2_ASSET_NOT_FOUND: ${item.r2_key}`);
    const buffer = await object.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) throw new Error('FILE_SIZE_EXCEEDED: Limit 10MB');
    const mimeType = object.httpMetadata?.contentType || item.mime_type || 'application/octet-stream';
    return { data: new Uint8Array(buffer), mimeType, size: buffer.byteLength };
  }
  return fetchRemoteAsset(item.preview_url);
}

export async function fetchRemoteAsset(url) {
  if (!url) throw new Error("URL_REQUIRED");

  console.log(`MEDIA: Fetching remote asset from ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout protection (LOCKED)

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`FETCH_FAILED: ${response.statusText}`);
    }

    // 1️⃣ Validate Size (Requirement: <10MB)
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error("FILE_SIZE_EXCEEDED: Limit 10MB");
    }

    const buffer = await response.arrayBuffer();
    
    // Safety check if content-length header was missing
    if (buffer.byteLength > 10 * 1024 * 1024) {
      throw new Error("FILE_SIZE_EXCEEDED: Limit 10MB");
    }

    // 2️⃣ Validate MIME Type
    const mimeType = response.headers.get("content-type");
    if (!mimeType || (!mimeType.startsWith("image/") && !mimeType.startsWith("video/"))) {
      throw new Error(`INVALID_MIME_TYPE: ${mimeType}`);
    }

    return {
      data: new Uint8Array(buffer),
      mimeType,
      size: buffer.byteLength
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("FETCH_TIMEOUT: Remote asset took too long to respond");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
