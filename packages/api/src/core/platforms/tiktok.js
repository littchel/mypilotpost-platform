/**
 * TikTok Delivery Adapter
 * Canon Compliant
 *
 * - Video only
 * - Returns external_post_id
 * - No inference
 */

import { getDB } from "../../lib/db.js";

export async function deliver({ brand_id, content_id, env }) {
  const db = getDB(env);

  const account = await db.prepare(`
    SELECT access_token
    FROM connected_accounts
    WHERE brand_id = ?
    AND platform = 'tiktok'
    LIMIT 1
  `).bind(brand_id).first();

  if (!account) {
    return { success: false, error_code: "not_connected" };
  }

  const content = await db.prepare(`
    SELECT video_url, text_content
    FROM content_social
    WHERE id = ?
  `).bind(content_id).first();

  if (!content?.video_url) {
    return { success: false, error_code: "missing_video" };
  }

  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source_info: {
          source: "PULL_FROM_URL",
          video_url: content.video_url
        },
        post_info: {
          title: content.text_content
        }
      })
    }
  );

  const initData = await initRes.json();

  if (!initRes.ok) {
    return {
      success: false,
      error_code: "tiktok_error",
      error_message: JSON.stringify(initData)
    };
  }

  return {
    success: true,
    external_post_id: initData.data.publish_id
  };
}