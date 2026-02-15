import { json } from "../../lib/json.js";

/**
 * POST /api/integrations/canva/open
 * Returns a Canva editor URL (no AI, no storage)
 */
export async function openCanvaEditor(request, env) {
  const body = await request.json();
  const { asset_id = null } = body;

  const baseUrl = "https://www.canva.com/design/";
  const editorUrl = asset_id
    ? `${baseUrl}${asset_id}/edit`
    : "https://www.canva.com/design/create";

  return json({
    editor_url: editorUrl,
    mode: "editor_only",
  });
}
