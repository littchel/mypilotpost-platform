/**
 * LinkedIn Platform Adapter
 * Standardized Contract V1
 */

import { fetchMediaAsset } from "../../lib/media_utils.js";

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  // 1. Get Author URN
  let authorUrn = null;
  if (connection.account_id) {
    authorUrn = `urn:li:person:${connection.account_id}`;
  } else {
    let profileId = null;
    const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    if (userinfoRes.ok) {
      const uinfo = await userinfoRes.json();
      profileId = uinfo.sub;
    } else {
      const profileRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "LinkedIn-Version": "202306",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        profileId = profile.id;
      } else {
        throw new Error(`LINKEDIN_PROFILE_FAILED: Unable to resolve profile via /v2/userinfo or /v2/me`);
      }
    }
    authorUrn = `urn:li:person:${profileId}`;
  }

  // 2. Media Upload
  const mediaUrns = [];
  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  const isVideo = primaryMedia && (primaryMedia.mime_type?.startsWith("video/") || primaryMedia.preview_url?.includes(".mp4") || primaryMedia.preview_url?.includes(".mov"));

  if (media && media.length > 0) {
    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      try {
        const asset = await fetchMediaAsset(item, env);
        const itemIsVideo = item.mime_type?.startsWith("video/") || item.preview_url?.includes(".mp4") || item.preview_url?.includes(".mov");
        const recipe = itemIsVideo ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image";

        console.log(`[LINKEDIN] Registering upload for media item ${i + 1}/${media.length}`);
        const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: [recipe],
              owner: authorUrn,
              serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }]
            }
          })
        });

        if (regRes.ok) {
          const regData = await regRes.json();
          const uploadUrl = regData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
          const currentUrn = regData.value.asset;

          console.log(`[LINKEDIN] Uploading binary for media item ${i + 1}/${media.length}`);
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { Authorization: `Bearer ${access_token}` },
            body: asset.data
          });

          if (putRes.ok) {
            mediaUrns.push({
              urn: currentUrn,
              isVideo: itemIsVideo
            });
          } else {
            console.error(`[LINKEDIN] Uploader upload PUT failed for index ${i}: Status ${putRes.status}`);
          }
        } else {
          console.error(`[LINKEDIN] Asset registration failed for index ${i}: ${await regRes.text()}`);
        }
      } catch (err) {
        console.error(`LinkedIn Adapter: Media upload failed at index ${i}`, err);
      }
    }
  }

  // 3. Publish
  const mediaCategory = isVideo ? "VIDEO" : (mediaUrns.length > 0 ? "IMAGE" : "NONE");
  
  const shareMediaList = mediaUrns.map((item, idx) => ({
    status: "READY",
    description: { text: item.isVideo ? "Video Content" : "Image Content" },
    media: item.urn,
    title: { text: item.isVideo ? `Video ${idx + 1}` : `Image ${idx + 1}` }
  }));

  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: mediaCategory,
        media: shareMediaList.length > 0 ? shareMediaList : undefined
      }
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`LINKEDIN_PUBLISH_FAILED: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    success: true,
    external_id: data.id
  };
}