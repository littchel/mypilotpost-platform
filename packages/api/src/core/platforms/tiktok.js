/**
 * TikTok Platform Adapter
 * Standardized Contract V1
 *
 * Uses PULL_FROM_URL source — TikTok fetches the video directly from R2.
 * This avoids downloading the binary into the Worker (memory + timeout risk).
 * Requires: publicly accessible video URL.
 */

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  if (access_token && access_token.startsWith("mock_")) {
    return { success: true, external_id: `mock_tiktok_post_${Date.now()}` };
  }

  const primaryMedia = media.find(m => m.role === "primary" || m.position === 1);
  if (!primaryMedia) throw new Error("TIKTOK_REQUIRES_VIDEO");

  if (!primaryMedia.preview_url) throw new Error("TIKTOK_NO_MEDIA_URL");

  // Use PULL_FROM_URL — TikTok fetches video from our public R2 URL.
  // This is more reliable than uploading binary through the Worker.
  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_info: {
          source:    "PULL_FROM_URL",
          video_url: primaryMedia.preview_url,
        },
        post_info: {
          title:         text.slice(0, 2200),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet:  false,
          disable_stitch: false,
          disable_comment: false,
        },
      }),
    }
  );

  const initData = await initRes.json();
  if (!initRes.ok) {
    throw new Error(`TIKTOK_INIT_FAILED: ${JSON.stringify(initData.error || initData)}`);
  }

  const publish_id = initData?.data?.publish_id;
  if (!publish_id) {
    throw new Error(`TIKTOK_NO_PUBLISH_ID: ${JSON.stringify(initData)}`);
  }

  return {
    success:    true,
    external_id: publish_id,
    publish_id,
  };
}
