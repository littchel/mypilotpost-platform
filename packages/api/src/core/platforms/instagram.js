/**
 * Instagram Platform Adapter
 * Standardized Contract V1
 *
 * Flow: create container → poll until FINISHED → media_publish
 * Instagram requires a publicly accessible media URL (no auth headers).
 * Hard fails if media is missing or container does not reach FINISHED.
 */

import { getDB } from "../../lib/db.js";

async function appSecretProof(accessToken, appSecret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Poll container status until FINISHED or ERROR.
 * Instagram documentation: containers may take seconds to minutes to process.
 * We poll up to 20 times with a 3-second gap (60s total max).
 */
async function pollContainer(container_id, access_token, proof, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, 3000));
    }

    const params = new URLSearchParams({ fields: "status_code", access_token });
    if (proof) params.set("appsecret_proof", proof);

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${container_id}?${params}`,
      { method: "GET" }
    );

    if (!res.ok) {
      throw new Error(`INSTAGRAM_POLL_FAILED: HTTP ${res.status} — ${await res.text()}`);
    }

    const data = await res.json();
    const statusCode = data.status_code;

    console.log(`INSTAGRAM: Container ${container_id} status = ${statusCode} (attempt ${i + 1}/${maxAttempts})`);

    if (statusCode === "FINISHED") return;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(`INSTAGRAM_CONTAINER_${statusCode}: Container ${container_id} failed during processing`);
    }
    // IN_PROGRESS or PUBLISHED — keep polling
  }
  throw new Error(`INSTAGRAM_CONTAINER_TIMEOUT: Container ${container_id} did not reach FINISHED after ${maxAttempts} attempts`);
}

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, account_id } = connection;

  if (!media || media.length === 0) {
    throw new Error("INSTAGRAM_REQUIRES_MEDIA");
  }

  // Phase 1: Classification
  let mediaClass = "IMAGE";
  if (content.platform === "instagram_story") {
    mediaClass = "STORY";
  } else if (content.platform === "instagram_reel") {
    mediaClass = "VIDEO";
  } else if (media.length > 1) {
    mediaClass = "CAROUSEL";
  } else {
    const mainItem = media[0];
    const mime = mainItem.mime_type || "";
    if (mime.startsWith("video/") || mainItem.preview_url?.includes(".mp4") || mainItem.preview_url?.includes(".mov")) {
      mediaClass = "VIDEO";
    }
  }

  // Update classification metadata in delivery_jobs table prior to publish
  const db = getDB(env);
  if (content.job_id && db) {
    const metaString = JSON.stringify({ media_class: mediaClass });
    await db.prepare("UPDATE delivery_jobs SET metadata = ? WHERE id = ?")
      .bind(metaString, content.job_id)
      .run()
      .catch((e) => console.error("Failed to store mediaClass metadata in delivery_jobs", e));
  }

  const proof = env?.META_CLIENT_SECRET
    ? await appSecretProof(access_token, env.META_CLIENT_SECRET)
    : null;

  let containerId = null;

  if (mediaClass === "IMAGE") {
    // Phase 2: IMAGE PUBLISHING
    const primaryMedia = media[0];
    const containerBody = {
      image_url:   primaryMedia.preview_url,
      caption:     text,
      access_token,
    };
    if (proof) containerBody.appsecret_proof = proof;

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );

    if (!containerRes.ok) {
      throw new Error(`INSTAGRAM_CONTAINER_FAILED: ${await containerRes.text()}`);
    }

    const container = await containerRes.json();
    if (!container.id) {
      throw new Error(`INSTAGRAM_CONTAINER_NO_ID: ${JSON.stringify(container)}`);
    }
    containerId = container.id;

    console.log(`INSTAGRAM: Image container created — id=${containerId}`);
    await pollContainer(containerId, access_token, proof, 20);

  } else if (mediaClass === "STORY") {
    // Phase 2b: STORY PUBLISHING
    const primaryMedia = media[0];
    const isVideo = primaryMedia.mime_type?.startsWith("video/") || primaryMedia.preview_url?.includes(".mp4") || primaryMedia.preview_url?.includes(".mov");

    const containerBody = {
      media_type: "STORIES",
      access_token,
    };
    if (isVideo) {
      containerBody.video_url = primaryMedia.preview_url;
    } else {
      containerBody.image_url = primaryMedia.preview_url;
    }
    if (proof) containerBody.appsecret_proof = proof;

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );

    if (!containerRes.ok) {
      throw new Error(`INSTAGRAM_STORY_CONTAINER_FAILED: ${await containerRes.text()}`);
    }

    const container = await containerRes.json();
    if (!container.id) {
      throw new Error(`INSTAGRAM_STORY_CONTAINER_NO_ID: ${JSON.stringify(container)}`);
    }
    containerId = container.id;

    console.log(`INSTAGRAM: Story container created — id=${containerId}`);
    await pollContainer(containerId, access_token, proof, 20);

  } else if (mediaClass === "VIDEO") {
    // Phase 3: VIDEO / REELS PUBLISHING
    const primaryMedia = media[0];
    const containerBody = {
      media_type: "REELS",
      video_url: primaryMedia.preview_url,
      caption: text,
      access_token,
    };
    if (proof) containerBody.appsecret_proof = proof;

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );

    if (!containerRes.ok) {
      throw new Error(`INSTAGRAM_VIDEO_CONTAINER_FAILED: ${await containerRes.text()}`);
    }

    const container = await containerRes.json();
    if (!container.id) {
      throw new Error(`INSTAGRAM_VIDEO_CONTAINER_NO_ID: ${JSON.stringify(container)}`);
    }
    containerId = container.id;

    console.log(`INSTAGRAM: Video/Reels container created — id=${containerId}`);
    await pollContainer(containerId, access_token, proof, 20);

  } else if (mediaClass === "CAROUSEL") {
    // Phase 4: CAROUSEL SUPPORT
    const childIds = [];
    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      const mime = item.mime_type || "";
      const isVideo = mime.startsWith("video/") || item.preview_url?.includes(".mp4") || item.preview_url?.includes(".mov");
      
      const containerBody = {
        is_carousel_item: true,
        access_token,
      };
      if (proof) containerBody.appsecret_proof = proof;

      if (isVideo) {
        containerBody.media_type = "VIDEO";
        containerBody.video_url = item.preview_url;
      } else {
        containerBody.image_url = item.preview_url;
      }

      console.log(`INSTAGRAM: Creating carousel item container ${i + 1}/${media.length}`);
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${account_id}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerBody),
        }
      );

      if (!containerRes.ok) {
        throw new Error(`INSTAGRAM_CAROUSEL_ITEM_FAILED at index ${i}: ${await containerRes.text()}`);
      }

      const container = await containerRes.json();
      if (!container.id) {
        throw new Error(`INSTAGRAM_CAROUSEL_ITEM_NO_ID at index ${i}: ${JSON.stringify(container)}`);
      }
      childIds.push(container.id);
    }

    console.log(`INSTAGRAM: Carousel child container IDs: ${childIds.join(", ")}`);
    
    // Poll all child containers in parallel
    await Promise.all(childIds.map(id => pollContainer(id, access_token, proof, 20)));

    // Create Carousel parent container
    const parentBody = {
      media_type: "CAROUSEL",
      children: childIds,
      caption: text,
      access_token,
    };
    if (proof) parentBody.appsecret_proof = proof;

    const parentRes = await fetch(
      `https://graph.facebook.com/v19.0/${account_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentBody),
      }
    );

    if (!parentRes.ok) {
      throw new Error(`INSTAGRAM_CAROUSEL_PARENT_FAILED: ${await parentRes.text()}`);
    }

    const parentContainer = await parentRes.json();
    if (!parentContainer.id) {
      throw new Error(`INSTAGRAM_CAROUSEL_PARENT_NO_ID: ${JSON.stringify(parentContainer)}`);
    }
    containerId = parentContainer.id;

    console.log(`INSTAGRAM: Carousel parent container created — id=${containerId}`);
    await pollContainer(containerId, access_token, proof, 20);
  }

  // Step 3: Publish container
  const publishBody = { creation_id: containerId, access_token };
  if (proof) publishBody.appsecret_proof = proof;

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publishBody),
    }
  );

  if (!publishRes.ok) {
    throw new Error(`INSTAGRAM_PUBLISH_FAILED: ${await publishRes.text()}`);
  }

  const data = await publishRes.json();

  // Persist final container, publish, and post IDs metadata
  if (content.job_id && db) {
    const metaString = JSON.stringify({
      media_class: mediaClass,
      container_id: containerId,
      publish_id: data.id,
      instagram_post_id: data.id
    });
    await db.prepare("UPDATE delivery_jobs SET metadata = ? WHERE id = ?")
      .bind(metaString, content.job_id)
      .run()
      .catch((e) => console.error("Failed to store final metadata in delivery_jobs", e));
  }

  return {
    success:      true,
    external_id:  data.id,
    container_id: containerId,
    publish_id:   data.id,
    instagram_post_id: data.id,
  };
}
