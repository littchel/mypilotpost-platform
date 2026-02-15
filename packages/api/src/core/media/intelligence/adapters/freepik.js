/**
 * Freepik Adapter — READ ONLY (v1)
 * No uploads, no writes
 */

export async function fetchFreepikMedia({
  query,
  limit = 10
}) {
  // v1: stubbed adapter
  // Replace with Freepik API later

  return Array.from({ length: limit }).map((_, i) => ({
    id: `freepik-${i}`,
    source: "stock",
    type: "image",
    tags: [query],
    usage_count: 0,
    platform_fit: ["Instagram", "LinkedIn"],
    preview_url: `https://freepik.com/preview/${i}`
  }));
}
