/**
 * Facebook Platform Adapter
 * Standardized Contract V1
 */

import { fetchRemoteAsset } from "../../lib/media_utils.js";

async function appSecretProof(accessToken, appSecret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(access_token, env.META_CLIENT_SECRET)
    : null;

  // 1. Prepare Content
  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  
  const feedBody = { message: text, access_token };
  if (proof) feedBody.appsecret_proof = proof;

  let publishUrl = `https://graph.facebook.com/v19.0/${account_id}/feed`;
  let options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedBody)
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
      if (proof) formData.append("appsecret_proof", proof);

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