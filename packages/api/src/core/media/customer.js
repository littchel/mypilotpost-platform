import { importMediaAsset } from "./importer.js";

export async function importMedia(request, env, session) {
  const body = await request.json();
  const {
    brand_id,
    provider,
    provider_asset_id,
    filename,
    mime_type,
    size_bytes,
    connected_account_id
  } = body;

  const account = await env.mypilotpost.prepare(`
    SELECT access_token
    FROM connected_accounts
    WHERE id = ? AND brand_id = ?
  `).bind(connected_account_id, brand_id).first();

  if (!account) {
    return new Response("Invalid connected account", { status: 403 });
  }

  const result = await importMediaAsset({
    env,
    brandId: brand_id,
    provider,
    providerAssetId: provider_asset_id,
    filename,
    mimeType: mime_type,
    sizeBytes: size_bytes,
    encryptedToken: account.access_token
  });

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}
