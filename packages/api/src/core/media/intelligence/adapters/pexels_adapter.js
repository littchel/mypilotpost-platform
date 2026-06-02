export function adaptPexelsResults(photos) {
  return photos.map(photo => ({
    provider: "pexels",
    external_id: String(photo.id),
    preview_url: photo.src?.large2x || photo.src?.original,
    thumbnail_url: photo.src?.medium || photo.src?.small,
    type: "image",
    width: photo.width || null,
    height: photo.height || null,
    attribution_text: photo.photographer
      ? `Photo by ${photo.photographer} on Pexels`
      : "Photo from Pexels",
    license: "pexels-license",
  }));
}
