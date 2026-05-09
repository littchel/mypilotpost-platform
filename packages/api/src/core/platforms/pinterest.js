/**
 * Pinterest Platform Adapter
 * Standardized Contract V1
 */

export async function publish({ content, connection, env }) {
  const { text, media } = content;
  const { access_token, metadata } = connection;

  const primaryMedia = media.find(m => m.role === 'primary' || m.position === 0);
  if (!primaryMedia) throw new Error("PINTEREST_REQUIRES_MEDIA");

  // 1. Resolve Board
  let boardId = metadata?.default_board_id;
  if (!boardId) {
    const boardsRes = await fetch("https://api.pinterest.com/v5/boards", {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const boards = await boardsRes.json();
    if (!boards.items || boards.items.length === 0) {
      throw new Error("PINTEREST_NO_BOARDS_FOUND");
    }
    boardId = boards.items[0].id;
  }

  // 2. Create Pin
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: text.slice(0, 100),
      description: text,
      board_id: boardId,
      media_source: {
        source_type: "image_url",
        url: primaryMedia.preview_url
      }
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PINTEREST_PUBLISH_FAILED: ${data.message || res.statusText}`);

  return {
    success: true,
    external_id: data.id,
    url: `https://pinterest.com/pin/${data.id}`
  };
}
