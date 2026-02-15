export function adaptFreepikResults(items) {
  return items.map(item => ({
    provider: "freepik",
    external_id: item.id,
    preview_url: item.image?.source?.url,
    thumbnail_url: item.image?.preview?.url,
    type: "image",
    width: item.image?.width || null,
    height: item.image?.height || null,
    attribution_text: item.author?.name
      ? `Image by ${item.author.name} on Freepik`
      : "Image from Freepik",
    license: item.license || "freepik-standard"
  }));
}
