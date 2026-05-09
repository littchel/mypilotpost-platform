/**
 * Instagram Platform Adapter
 * Standardized Contract V1
 */

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  if (!primaryMedia) throw new Error("INSTAGRAM_REQUIRES_MEDIA");

  // 1. Create Media Container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: primaryMedia.preview_url,
        caption: text,
        access_token: access_token
      })
    }
  );

  if (!containerRes.ok) {
    throw new Error(`INSTAGRAM_CONTAINER_FAILED: ${await containerRes.text()}`);
  }

  const container = await containerRes.json();

  // 2. Publish Media
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: access_token
      })
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