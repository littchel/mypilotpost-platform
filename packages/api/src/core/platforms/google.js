/**
 * Google (YouTube) Platform Adapter
 * Standardized Contract V1
 */

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  if (!media || media.length === 0) {
    throw new Error("GOOGLE_REQUIRES_MEDIA");
  }

  // YouTube Data API v3
  const res = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,status", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        title: text.slice(0, 70),
        description: text,
        categoryId: "22"
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false
      }
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`GOOGLE_PUBLISH_FAILED: ${data.error?.message || res.statusText}`);

  return {
    success: true,
    external_id: data.id,
    url: `https://youtube.com/watch?v=${data.id}`
  };
}
