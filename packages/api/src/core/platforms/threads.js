/**
 * Threads Platform Adapter
 * Standardized Contract V1
 * Two-step: create container → publish
 */

const BASE = "https://graph.threads.net/v1.0";

export async function publish({ content, connection, _env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  if (access_token && access_token.startsWith("mock_")) {
    return { success: true, external_id: `mock_threads_post_${Date.now()}` };
  }

  const primaryMedia = (media || []).find(m => m.role === "primary" || m.position === 0);

  // Step 1: Create media container
  const containerBody = {
    text,
    media_type: primaryMedia ? "IMAGE" : "TEXT",
    access_token,
  };

  if (primaryMedia) {
    containerBody.image_url = primaryMedia.preview_url;
  }

  const containerRes = await fetch(`${BASE}/${account_id}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });

  if (!containerRes.ok) {
    throw new Error(`THREADS_CONTAINER_FAILED: ${await containerRes.text()}`);
  }

  const container = await containerRes.json();

  // Step 2: Publish container
  const publishRes = await fetch(`${BASE}/${account_id}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token,
    }),
  });

  if (!publishRes.ok) {
    throw new Error(`THREADS_PUBLISH_FAILED: ${await publishRes.text()}`);
  }

  const data = await publishRes.json();
  return { success: true, external_id: data.id };
}
