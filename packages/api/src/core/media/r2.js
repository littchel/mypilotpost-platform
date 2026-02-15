export async function uploadToR2(env, key, stream, contentType) {
  await env.MEDIA_BUCKET.put(key, stream, {
    httpMetadata: { contentType }
  });

  return {
    bucket: env.MEDIA_BUCKET_NAME,
    key
  };
}

export function buildR2Key({ brandId, assetId, filename }) {
  return `brands/${brandId}/media/${assetId}/${filename}`;
}
