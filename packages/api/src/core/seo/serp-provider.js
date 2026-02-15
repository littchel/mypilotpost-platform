/**
 * SERP provider abstraction
 * Can be swapped without touching rank logic
 */
export async function fetchSerpPosition({
  keyword,
  slug,
  location,
}) {
  // STUB IMPLEMENTATION (safe default)
  // Replace with real provider later

  return {
    rank: null,  // NULL = not ranking or unknown
    url: null,
  };
}
