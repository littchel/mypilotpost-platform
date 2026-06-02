/**
 * X (Twitter) Platform Adapter
 * Standardized Contract V1
 */

import { fetchMediaAsset } from "../../lib/media_utils.js";

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  let mediaId = null;

  // 1. Media Handling (if primary image exists)
  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  if (primaryMedia) {
    try {
      const asset = await fetchMediaAsset(primaryMedia, env);
      
      const formData = new FormData();
      formData.append("media", new Blob([asset.data], { type: asset.mimeType }));

      const uploadRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}` },
        body: formData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        mediaId = uploadData.media_id_string;
      }
    } catch (err) {
      console.error("X Adapter: Media upload failed", err);
    }
  }

  // 2. Create Tweet (API v2)
  const payload = { text };
  if (mediaId) {
    payload.media = { media_ids: [mediaId] };
  }

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.text();
    throw new Error(`X_PUBLISH_FAILED: ${errData}`);
  }

  const data = await res.json();
  return {
    success: true,
    external_id: data.data.id
  };
}
