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
  let mediaUrn = null;
  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  const isVideo = primaryMedia && (primaryMedia.mime_type?.startsWith("video/") || primaryMedia.preview_url?.includes(".mp4") || primaryMedia.preview_url?.includes(".mov"));

  if (primaryMedia) {
    try {
      const asset = await fetchMediaAsset(primaryMedia, env);
      const recipe = isVideo ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image";

      // Register
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
        mediaUrn = regData.value.asset;

        await fetch(uploadUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${access_token}` },
          body: asset.data
        });
      }
    } catch (err) {
      console.error("LinkedIn Adapter: Media upload failed", err);
    }
  }

  // 3. Publish
  const mediaCategory = isVideo ? "VIDEO" : "IMAGE";
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: mediaUrn ? mediaCategory : "NONE",
        media: mediaUrn ? [{
          status: "READY",
          description: { text: isVideo ? "Post Video" : "Post Image" },
          media: mediaUrn,
          title: { text: isVideo ? "Video Content" : "Image Content" }
        }] : undefined
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