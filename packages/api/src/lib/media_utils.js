/**
 * myPilotPost — Media Utilities
 * Handles remote asset fetching, validation, and conversion for publishing.
 */

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
