/**
 * Pinterest Platform Adapter
 * Standardized Contract V1
 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, metadata, selected_resource_id } = connection;

  const primaryMedia = media?.find(m => m.role === 'primary' || m.position === 0) || media?.[0];
  if (!primaryMedia) throw new Error("PINTEREST_REQUIRES_MEDIA");

  // 1. Resolve Board
  let boardId = selected_resource_id || metadata?.default_board_id;
  if (!boardId) {
    const boardsRes = await fetch("https://api.pinterest.com/v5/boards", {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    if (!boardsRes.ok) {
      const errData = await boardsRes.json().catch(() => ({}));
      throw new Error(`Pinterest board fetch failed: ${errData.message || boardsRes.statusText}`);
    }
    const boards = await boardsRes.json();
    if (!boards.items || boards.items.length === 0) {
      throw new Error("PINTEREST_NO_BOARDS_FOUND");
    }
    boardId = boards.items[0].id;
  }

  // Determine media format
  const isVideo = primaryMedia.mime_type?.startsWith("video/") || primaryMedia.preview_url?.endsWith(".mp4");

  let createPayload = {
    title: (content.title || text || "New Pin").slice(0, 100),
    description: text || "",
    board_id: boardId,
  };

  if (content.link) {
    createPayload.link = content.link;
  }

  if (isVideo) {
    // Pinterest Video Upload Flow
    const registerRes = await fetch("https://api.pinterest.com/v5/media", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ media_type: "video" })
    });

    if (!registerRes.ok) {
      const errData = await registerRes.json().catch(() => ({}));
      throw new Error(`Pinterest media registration failed: ${errData.message || registerRes.statusText}`);
    }

    const registerData = await registerRes.json();
    const { media_id, upload_url, upload_parameters } = registerData;

    // Fetch video binary
    const videoFetch = await fetch(primaryMedia.preview_url);
    if (!videoFetch.ok) {
      throw new Error(`Failed to fetch media from preview_url: ${primaryMedia.preview_url}`);
    }
    const videoBlob = await videoFetch.blob();

    // Upload to S3 bucket
    const formData = new FormData();
    for (const [key, value] of Object.entries(upload_parameters)) {
      formData.append(key, value);
    }
    formData.append("file", videoBlob);

    const uploadRes = await fetch(upload_url, {
      method: "POST",
      body: formData
    });

    if (!uploadRes.ok) {
      throw new Error(`Pinterest media AWS upload failed with status ${uploadRes.status}`);
    }

    // Poll status
    let status = "registered";
    let attempts = 0;
    const maxAttempts = 20;
    while (status !== "succeeded" && status !== "failed" && attempts < maxAttempts) {
      await sleep(2000);
      attempts++;
      const checkRes = await fetch(`https://api.pinterest.com/v5/media/${media_id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        status = checkData.status;
      }
    }

    if (status !== "succeeded") {
      throw new Error(`Pinterest video processing failed or timed out. Status: ${status}`);
    }

    createPayload.media_source = {
      source_type: "video_id",
      media_id: media_id
    };
  } else {
    // Image Pin Flow
    createPayload.media_source = {
      source_type: "image_url",
      url: primaryMedia.preview_url
    };
  }

  // 2. Create Pin
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createPayload)
  });

  const data = await res.json();
  if (!res.ok) {
    let errMsg = data.message || res.statusText || "Unknown error";
    if (errMsg.includes("Missing:") || errMsg.includes("sufficient permissions")) {
      throw new Error(`PINTEREST_PUBLISH_FAILED: Insufficient permissions. Pinterest requires the 'boards:write' scope to create pins. Please disconnect and reconnect your Pinterest connection in Integrations to grant this permission.`);
    }
    throw new Error(`PINTEREST_PUBLISH_FAILED: ${errMsg}`);
  }

  return {
    success: true,
    external_id: data.id,
    url: `https://pinterest.com/pin/${data.id}`,
    board_id: boardId,
    published_at: new Date().toISOString()
  };
}
