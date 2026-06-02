/**
 * Instagram Platform Adapter
 * Standardized Contract V1
 *
 * Flow: create container → poll until FINISHED → media_publish
 * Instagram requires a publicly accessible media URL (no auth headers).
 * Hard fails if media is missing or container does not reach FINISHED.
 */

async function appSecretProof(accessToken, appSecret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Poll container status until FINISHED or ERROR.
 * Instagram documentation: containers may take seconds to minutes to process.
 * We poll up to 12 times with a 3-second gap (36s total max).
 */
async function pollContainer(container_id, access_token, proof, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, 3000));
    }

    const params = new URLSearchParams({ fields: "status_code", access_token });
    if (proof) params.set("appsecret_proof", proof);

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${container_id}?${params}`,
      { method: "GET" }
    );

    if (!res.ok) {
      throw new Error(`INSTAGRAM_POLL_FAILED: HTTP ${res.status} — ${await res.text()}`);
    }

    const data = await res.json();
    const statusCode = data.status_code;

    console.log(`INSTAGRAM: Container ${container_id} status = ${statusCode} (attempt ${i + 1}/${maxAttempts})`);

    if (statusCode === "FINISHED") return;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(`INSTAGRAM_CONTAINER_${statusCode}: Container ${container_id} failed during processing`);
    }
    // IN_PROGRESS or PUBLISHED — keep polling
  }
  throw new Error(`INSTAGRAM_CONTAINER_TIMEOUT: Container ${container_id} did not reach FINISHED after ${maxAttempts} attempts`);
}

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  const primaryMedia = media.find(m => m.role === "primary" || m.position === 1);
  if (!primaryMedia) throw new Error("INSTAGRAM_REQUIRES_MEDIA");

  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(access_token, env.META_CLIENT_SECRET)
    : null;

  // Step 1: Create media container
  const containerBody = {
    image_url:   primaryMedia.preview_url,
    caption:     text,
    access_token,
  };
  if (proof) containerBody.appsecret_proof = proof;

  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    }
  );

  if (!containerRes.ok) {
    throw new Error(`INSTAGRAM_CONTAINER_FAILED: ${await containerRes.text()}`);
  }

  const container = await containerRes.json();
  if (!container.id) {
    throw new Error(`INSTAGRAM_CONTAINER_NO_ID: ${JSON.stringify(container)}`);
  }

  console.log(`INSTAGRAM: Container created — id=${container.id}`);

  // Step 2: Poll until FINISHED
  await pollContainer(container.id, access_token, proof);

  // Step 3: Publish
  const publishBody = { creation_id: container.id, access_token };
  if (proof) publishBody.appsecret_proof = proof;

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publishBody),
    }
  );

  if (!publishRes.ok) {
    throw new Error(`INSTAGRAM_PUBLISH_FAILED: ${await publishRes.text()}`);
  }

  const data = await publishRes.json();
  return {
    success:      true,
    external_id:  data.id,
    container_id: container.id,
  };
}
