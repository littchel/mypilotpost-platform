/**
 * myPilotPost — Publishing Media Validation & Pre-flight Service
 * File: packages/api/src/core/delivery/validation.js
 */

import { getDB } from "../../lib/db.js";

/**
 * Validates a media item's size, accessibility, and MIME type.
 * Returns { valid: boolean, error?: string, contentType?: string, size?: number }
 */
export async function validateMediaForPublishing(item, env) {
  if (!item.preview_url) {
    return { valid: false, error: "MEDIA_URL_MISSING" };
  }

  // 1. Direct R2 asset validation
  if (item.provider === "direct" && env?.MEDIA_BUCKET) {
    const r2Key = item.r2_key || item.external_id;
    try {
      const obj = await env.MEDIA_BUCKET.head(r2Key);
      if (!obj) {
        return { valid: false, error: "MEDIA_R2_OBJECT_NOT_FOUND" };
      }
      const contentType = obj.httpMetadata?.contentType || item.mime_type || "application/octet-stream";
      const size = obj.size || 0;

      return { valid: true, contentType, size };
    } catch (err) {
      return { valid: false, error: `MEDIA_R2_HEAD_FAILED: ${err.message}` };
    }
  }

  // 2. External URL validation (Pexels, Freepik, etc.) via HEAD request
  try {
    const res = await fetch(item.preview_url, {
      method: "HEAD",
      headers: { "User-Agent": "facebookexternalhit/1.1" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { valid: false, error: `MEDIA_URL_HTTP_ERR_${res.status}` };
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const size = parseInt(res.headers.get("content-length") || "0", 10);

    return { valid: true, contentType, size };
  } catch (err) {
    return { valid: false, error: `MEDIA_URL_FETCH_FAILED: ${err.message}` };
  }
}

/**
 * Runs pre-flight checks for Instagram connection and account status.
 */
export async function preflightInstagramPublish({ connection, content, env }) {
  const { access_token, account_id } = connection;
  const { media } = content;

  // 1. Instagram requires at least one media asset
  const primaryMedia = media?.find(m => m.role === "primary" || m.position === 1) || media?.[0];
  if (!primaryMedia) {
    throw new Error("INSTAGRAM_REQUIRES_MEDIA: Instagram posts must contain an image or video.");
  }

  // 2. Query Meta API to check account status and permissions
  try {
    const testRes = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}?fields=id,username&access_token=${access_token}`,
      { method: "GET" }
    );

    if (!testRes.ok) {
      const errorText = await testRes.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = null; }

      const err = errorData?.error || {};
      const subcode = err.error_subcode || 0;
      const code = err.code || 0;

      if (code === 25 || subcode === 2207050 || err.message?.includes("restricted")) {
        throw new Error(`ACCOUNT_RESTRICTED: The connected Instagram profile is restricted or flagged by Meta. Message: ${err.message || "User is restricted."}`);
      }
      if (code === 190 || err.message?.includes("token")) {
        throw new Error(`TOKEN_EXPIRED: The Facebook/Instagram session has expired or been revoked.`);
      }
      throw new Error(`META_ACCOUNT_CHECK_FAILED: ${err.message || errorText}`);
    }
  } catch (err) {
    if (err.message.startsWith("ACCOUNT_RESTRICTED") || err.message.startsWith("TOKEN_EXPIRED")) {
      throw err;
    }
    throw new Error(`PREFLIGHT_NETWORK_ERROR: Unable to communicate with Meta API during pre-flight check (${err.message}).`);
  }

  // 3. Preflight Media checks (size, MIME type, aspect ratio, duration limits)
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const validation = await validateMediaForPublishing(item, env);
    if (!validation.valid) {
      throw new Error(`MEDIA_UNREACHABLE: Attached media at index ${i} is unreachable. Reason: ${validation.error}`);
    }

    const mime = validation.contentType || item.mime_type || "";
    const sizeMb = (validation.size || 0) / (1024 * 1024);

    if (mime.startsWith("image/")) {
      if (sizeMb > 8) {
        throw new Error(`MEDIA_INVALID: Image at index ${i} size exceeds Instagram limit of 8MB (actual: ${sizeMb.toFixed(1)}MB).`);
      }
      if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
        throw new Error(`MEDIA_INVALID: Instagram only supports JPEG, PNG, and WebP images. (MIME: ${mime} at index ${i})`);
      }
      if (item.width && item.height) {
        const ar = item.width / item.height;
        if (ar < 0.56 || ar > 1.92) {
          throw new Error(`MEDIA_INVALID: Image at index ${i} aspect ratio must be between 9:16 (0.56) and 1.91:1 (1.91) (actual: ${ar.toFixed(2)}).`);
        }
      }
    } else if (mime.startsWith("video/")) {
      if (sizeMb > 100) {
        throw new Error(`MEDIA_INVALID: Video at index ${i} size exceeds Instagram limit of 100MB (actual: ${sizeMb.toFixed(1)}MB).`);
      }
      if (mime !== "video/mp4" && mime !== "video/quicktime") {
        throw new Error(`MEDIA_INVALID: Instagram only supports MP4 and QuickTime (MOV) videos. (MIME: ${mime} at index ${i})`);
      }
      if (item.duration_seconds !== undefined && item.duration_seconds !== null) {
        if (item.duration_seconds < 3 || item.duration_seconds > 90) {
          throw new Error(`MEDIA_INVALID: Video at index ${i} duration must be between 3 and 90 seconds (actual: ${item.duration_seconds}s).`);
        }
      }
      if (item.width && item.height) {
        const ar = item.width / item.height;
        if (ar < 0.56 || ar > 1.92) {
          throw new Error(`MEDIA_INVALID: Video at index ${i} aspect ratio must be between 9:16 (0.56) and 1.91:1 (1.91) (actual: ${ar.toFixed(2)}).`);
        }
      }
    } else {
      throw new Error(`MEDIA_INVALID: Unsupported media type for Instagram: ${mime} at index ${i}`);
    }
  }

  return { success: true };
}
