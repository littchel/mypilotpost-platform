/**
 * LinkedIn Platform Adapter
 * Standardized Contract V1
 */

import { fetchRemoteAsset } from "../../lib/media_utils.js";

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token } = connection;

  // 1. Get Author URN
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  if (!profileRes.ok) {
    throw new Error(`LINKEDIN_PROFILE_FAILED: ${await profileRes.text()}`);
  }

  const profile = await profileRes.json();
  const authorUrn = `urn:li:person:${profile.id}`;

  // 2. Media Upload
  let mediaUrn = null;
  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);

  if (primaryMedia) {
    try {
      const asset = await fetchRemoteAsset(primaryMedia.preview_url);

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
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
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
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: mediaUrn ? "IMAGE" : "NONE",
        media: mediaUrn ? [{
          status: "READY",
          description: { text: "Post Image" },
          media: mediaUrn,
          title: { text: "Image Content" }
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