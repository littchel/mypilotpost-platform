/**
 * Instagram Platform Adapter
 * Standardized Contract V1
 */

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

  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  if (!primaryMedia) throw new Error("INSTAGRAM_REQUIRES_MEDIA");

  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(access_token, env.META_CLIENT_SECRET)
    : null;

  const containerBody = {
    image_url: primaryMedia.preview_url,
    caption: text,
    access_token,
  };
  if (proof) containerBody.appsecret_proof = proof;

  // 1. Create Media Container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody)
    }
  );

  if (!containerRes.ok) {
    throw new Error(`INSTAGRAM_CONTAINER_FAILED: ${await containerRes.text()}`);
  }

  const container = await containerRes.json();

  const publishBody = {
    creation_id: container.id,
    access_token,
  };
  if (proof) publishBody.appsecret_proof = proof;

  // 2. Publish Media
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publishBody)
    }
  );

  if (!publishRes.ok) {
    throw new Error(`INSTAGRAM_PUBLISH_FAILED: ${await publishRes.text()}`);
  }

  const data = await publishRes.json();
  return {
    success: true,
    external_id: data.id
  };
}
