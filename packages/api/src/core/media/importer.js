import { uploadToR2, buildR2Key } from "./r2.js";
import { downloadGoogleDriveFile } from "./providers/google-drive.js";
import { downloadDropboxFile } from "./providers/dropbox.js";
import { downloadCanvaAsset } from "./providers/canva.js";
import { decrypt } from "../../lib/crypto.js";

const PROVIDERS = {
  google_drive: downloadGoogleDriveFile,
  dropbox: downloadDropboxFile,
  canva: downloadCanvaAsset
};

export async function importMediaAsset({
  env,
  brandId,
  provider,
  providerAssetId,
  filename,
  mimeType,
  sizeBytes,
  encryptedToken
}) {
  const token = await decrypt(encryptedToken, env.ENCRYPTION_SECRET);
  const downloader = PROVIDERS[provider];

  if (!downloader) {
    throw new Error("Unsupported provider");
  }

  const { stream, contentType } =
    await downloader(token, providerAssetId);

  const assetId = crypto.randomUUID();
  const r2Key = buildR2Key({ brandId, assetId, filename });

  const { bucket, key } = await uploadToR2(
    env,
    r2Key,
    stream,
    contentType || mimeType
  );

  await env.mypilotpost.prepare(`
    INSERT INTO media_assets (
      id,
      brand_id,
      provider,
      provider_asset_id,
      filename,
      mime_type,
      size_bytes,
      r2_bucket,
      r2_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    assetId,
    brandId,
    provider,
    providerAssetId,
    filename,
    mimeType,
    sizeBytes,
    bucket,
    key
  ).run();

  return {
    id: assetId,
    filename,
    provider
  };
}
