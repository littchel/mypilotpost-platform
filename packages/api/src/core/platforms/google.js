/**
 * Google (YouTube) Platform Adapter
 * Standardized Contract V1
 *
 * Video upload uses YouTube Data API v3 multipart upload.
 * Metadata + video binary sent in a single multipart/related request.
 * Max file size: 256 GB. Worker fetch limit: 10 MB (media_utils enforces this).
 * For larger videos, resumable upload should be used instead.
 */

import { fetchMediaAsset } from "../../lib/media_utils.js";

const YOUTUBE_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3/videos";

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  const primaryMedia = media.find(m => m.role === "primary" || m.position === 1);
  if (!primaryMedia) throw new Error("GOOGLE_REQUIRES_MEDIA");

  // Fetch video binary
  const asset = await fetchMediaAsset(primaryMedia, env);

  if (!asset.mimeType.startsWith("video/")) {
    throw new Error(`GOOGLE_REQUIRES_VIDEO: Got ${asset.mimeType}`);
  }

  // Build multipart/related request body
  // Part 1: JSON metadata
  // Part 2: video binary
  const boundary = `mpp_yt_${Date.now()}`;
  const metadata = JSON.stringify({
    snippet: {
      title:       text.slice(0, 100),
      description: text,
      categoryId:  "22",
    },
    status: {
      privacyStatus:             "public",
      selfDeclaredMadeForKids:   false,
    },
  });

  // Manually build multipart body as Uint8Array
  const enc    = new TextEncoder();
  const part1  = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`);
  const part2h = enc.encode(`--${boundary}\r\nContent-Type: ${asset.mimeType}\r\n\r\n`);
  const part2f = enc.encode(`\r\n--${boundary}--`);

  const bodyParts = [part1, part2h, asset.data, part2f];
  const totalLen  = bodyParts.reduce((acc, p) => acc + p.byteLength, 0);
  const body      = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of bodyParts) {
    body.set(part, offset);
    offset += part.byteLength;
  }

  const res = await fetch(
    `${YOUTUBE_UPLOAD_BASE}?uploadType=multipart&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GOOGLE_UPLOAD_FAILED: ${errBody}`);
  }

  const data = await res.json();

  if (!data.id) {
    throw new Error(`GOOGLE_NO_VIDEO_ID: ${JSON.stringify(data)}`);
  }

  return {
    success:     true,
    external_id: data.id,
    url:         `https://youtube.com/watch?v=${data.id}`,
  };
}
