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
  const isVideo = primaryMedia && (primaryMedia.mime_type?.startsWith("video/") || primaryMedia.preview_url?.includes(".mp4") || primaryMedia.preview_url?.includes(".mov"));

  // ── FACEBOOK STORY PUBLISHING ─────────────────────────────────────────
  if (content.platform === "facebook_story") {
    if (!primaryMedia) {
      throw new Error("FACEBOOK_STORY_REQUIRES_MEDIA");
    }

    console.log(`[FB_STORY] Fetching media asset for story`);
    const asset = await fetchMediaAsset(primaryMedia, env);

    if (isVideo) {
      console.log(`[FB_STORY] Initializing video story session`);
      // 1. Initialize video story
      const initRes = await fetch(`https://graph.facebook.com/v19.0/${account_id}/video_stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_phase: "start", access_token })
      });
      if (!initRes.ok) {
        throw new Error(`FACEBOOK_STORY_INIT_FAILED: ${await initRes.text()}`);
      }
      const initData = await initRes.json();

      console.log(`[FB_STORY] Uploading raw video data`);
      // 2. Binary upload
      const uploadRes = await fetch(initData.upload_url, {
        method: "POST",
        headers: {
          "Authorization": `OAuth ${access_token}`,
          "file_offset": "0",
          "Content-Type": asset.mimeType || "video/mp4"
        },
        body: asset.data
      });
      if (!uploadRes.ok) {
        throw new Error(`FACEBOOK_STORY_UPLOAD_FAILED: ${await uploadRes.text()}`);
      }

      console.log(`[FB_STORY] Finalizing video story publishing`);
      // 3. Finalize video story
      const finishRes = await fetch(`https://graph.facebook.com/v19.0/${account_id}/video_stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "finish",
          video_id: initData.video_id,
          access_token
        })
      });
      if (!finishRes.ok) {
        throw new Error(`FACEBOOK_STORY_FINISH_FAILED: ${await finishRes.text()}`);
      }
      return { success: true, external_id: initData.video_id };

    } else {
      console.log(`[FB_STORY] Uploading unpublished photo`);
      // Photo story: upload unpublished photo first
      const formData = new FormData();
      formData.append("source", new Blob([asset.data], { type: asset.mimeType || "image/jpeg" }));
      formData.append("published", "false");
      formData.append("access_token", access_token);
      if (proof) formData.append("appsecret_proof", proof);

      const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${account_id}/photos`, {
        method: "POST",
        body: formData
      });
      if (!uploadRes.ok) {
        throw new Error(`FACEBOOK_STORY_PHOTO_UPLOAD_FAILED: ${await uploadRes.text()}`);
      }
      const photoData = await uploadRes.json();

      console.log(`[FB_STORY] Linking photo to story`);
      // Link photo as story
      const storyRes = await fetch(`https://graph.facebook.com/v19.0/${account_id}/photo_stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_id: photoData.id,
          access_token
        })
      });
      if (!storyRes.ok) {
        throw new Error(`FACEBOOK_STORY_PHOTO_PUBLISH_FAILED: ${await storyRes.text()}`);
      }
      const storyData = await storyRes.json();
      return { success: true, external_id: storyData.id || photoData.id };
    }
  }

  // ── FACEBOOK REEL PUBLISHING ──────────────────────────────────────────
  if (content.platform === "facebook_reel") {
    if (!primaryMedia || !isVideo) {
      throw new Error("FACEBOOK_REEL_REQUIRES_VIDEO");
    }

    console.log(`[FB_REEL] Fetching video asset for reel`);
    const asset = await fetchMediaAsset(primaryMedia, env);

    console.log(`[FB_REEL] Initializing video reel session`);
    // 1. Initialize video reel
    const initRes = await fetch(`https://graph.facebook.com/v19.0/${account_id}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "start", access_token })
    });
    if (!initRes.ok) {
      throw new Error(`FACEBOOK_REEL_INIT_FAILED: ${await initRes.text()}`);
    }
    const initData = await initRes.json();

    console.log(`[FB_REEL] Uploading raw video data`);
    // 2. Binary upload (resumable)
    const uploadRes = await fetch(initData.upload_url, {
      method: "POST",
      headers: {
        "Authorization": `OAuth ${access_token}`,
        "file_offset": "0",
        "Content-Type": asset.mimeType || "video/mp4"
      },
      body: asset.data
    });
    if (!uploadRes.ok) {
      throw new Error(`FACEBOOK_REEL_UPLOAD_FAILED: ${await uploadRes.text()}`);
    }

    console.log(`[FB_REEL] Finalizing video reel publishing`);
    // 3. Finalize video reel
    const finishRes = await fetch(`https://graph.facebook.com/v19.0/${account_id}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "finish",
        video_id: initData.video_id,
        video_state: "PUBLISHED",
        description: text || "",
        access_token
      })
    });
    if (!finishRes.ok) {
      throw new Error(`FACEBOOK_REEL_FINISH_FAILED: ${await finishRes.text()}`);
    }
    return { success: true, external_id: initData.video_id };
  }

  // ── STANDARD FACEBOOK POSTS (FEED) ────────────────────────────────────
  if (primaryMedia) {
    // Hard fail if media fetch fails — no silent text fallback.
    const asset = await fetchMediaAsset(primaryMedia, env);

    const formData = new FormData();
    formData.append("source", new Blob([asset.data], { type: asset.mimeType }));
    formData.append(isVideo ? "description" : "caption", text);
    formData.append("access_token", access_token);
    if (proof) formData.append("appsecret_proof", proof);

    const endpoint = isVideo ? "videos" : "photos";
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/${endpoint}`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FACEBOOK_${isVideo ? "VIDEO" : "PHOTO"}_FAILED: ${body}`);
    }

    const data = await res.json();

    if (isVideo) {
      return {
        success: true,
        external_id: data.id,
      };
    }

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
