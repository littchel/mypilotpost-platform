/**
 * Facebook Platform Adapter
 * Standardized Contract V1
 *
 * Media rules:
 *   - If media is attached, it MUST publish as a photo post.
 *   - If media fetch fails → hard fail. No text-only fallback.
 *   - Text-only posts use /feed.
 */

import { fetchMediaAsset } from "../../lib/media_utils.js";

async function appSecretProof(accessToken, appSecret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(access_token, env.META_CLIENT_SECRET)
    : null;

  const primaryMedia = media.find(m => m.role === "primary" || m.position === 1);

  if (primaryMedia) {
    // ── PHOTO POST ───────────────────────────────────────────────────────
    // Hard fail if media fetch fails — no silent text fallback.
    const asset = await fetchMediaAsset(primaryMedia, env);

    const formData = new FormData();
    formData.append("source", new Blob([asset.data], { type: asset.mimeType }));
    formData.append("caption", text);
    formData.append("access_token", access_token);
    if (proof) formData.append("appsecret_proof", proof);

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/photos`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FACEBOOK_PHOTO_FAILED: ${body}`);
    }

    const data = await res.json();

    // Facebook /photos returns { id, post_id } — post_id is the feed post
    return {
      success: true,
      external_id: data.post_id || data.id,
      photo_id:    data.id,
      post_id:     data.post_id || null,
    };
  }

  // ── TEXT POST ─────────────────────────────────────────────────────────
  const feedBody = { message: text, access_token };
  if (proof) feedBody.appsecret_proof = proof;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedBody),
    }
  );

  if (!res.ok) {
    throw new Error(`FACEBOOK_FEED_FAILED: ${await res.text()}`);
  }

  const data = await res.json();
  return { success: true, external_id: data.id };
}
