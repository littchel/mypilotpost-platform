/**
 * Facebook Platform Adapter
 * Standardized Contract V1
 */

import { fetchRemoteAsset } from "../../lib/media_utils.js";

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  // 1. Prepare Content
  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  
  let publishUrl = `https://graph.facebook.com/v19.0/${account_id}/feed`;
  let options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      access_token: access_token
    })
  };

  // 2. Media Support
  if (primaryMedia) {
    try {
      const asset = await fetchRemoteAsset(primaryMedia.preview_url);
      publishUrl = `https://graph.facebook.com/v19.0/${account_id}/photos`;
      
      const formData = new FormData();
      formData.append("source", new Blob([asset.data], { type: asset.mimeType }));
      formData.append("caption", text);
      formData.append("access_token", access_token);

      options = {
        method: "POST",
        body: formData
      };
    } catch (err) {
      console.error("Facebook Adapter: Media upload failed, fallback to text", err);
    }
  }

  // 3. Publish
  const res = await fetch(publishUrl, options);

  if (!res.ok) {
    throw new Error(`FACEBOOK_PUBLISH_FAILED: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    success: true,
    external_id: data.id
  };
}