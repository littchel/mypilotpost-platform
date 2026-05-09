/**
 * TikTok Platform Adapter
 * Standardized Contract V1
 */

import { fetchRemoteAsset } from "../../lib/media_utils.js";

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  if (!primaryMedia) throw new Error("TIKTOK_REQUIRES_VIDEO");

  // TikTok v2 API supports PULL_FROM_URL or FILE_UPLOAD
  // We prioritize FILE_UPLOAD for reliability with remote assets
  let assetData = null;
  try {
    const asset = await fetchRemoteAsset(primaryMedia.preview_url);
    assetData = asset.data;
  } catch (err) {
    throw new Error(`TIKTOK_MEDIA_FETCH_FAILED: ${err.message}`);
  }

  // 1. Initialize Upload
  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: assetData.byteLength
        },
        post_info: {
          title: text,
          privacy_level: "PUBLIC_TO_EVERYONE"
        }
      })
    }
  );

  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(`TIKTOK_INIT_FAILED: ${JSON.stringify(initData)}`);

  // 2. Upload Binary
  const uploadUrl = initData.data.upload_url;
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { 
      "Content-Range": `bytes 0-${assetData.byteLength - 1}/${assetData.byteLength}`,
      "Content-Type": "video/mp4"
    },
    body: assetData
  });

  if (!uploadRes.ok) throw new Error(`TIKTOK_UPLOAD_FAILED: ${await uploadRes.text()}`);

  return {
    success: true,
    external_id: initData.data.publish_id
  };
}