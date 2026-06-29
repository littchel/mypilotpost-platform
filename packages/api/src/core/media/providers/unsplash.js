/**
 * myPilotPost — Unsplash Provider
 * Fetches search results from Unsplash API.
 * Accepts: { query, orientation, limit }
 * Returns: normalized array of images
 */

function normalize(photo) {
  const url = photo.urls?.regular || photo.urls?.full || '';
  const preview = photo.urls?.small || photo.urls?.thumb || url;
  const w = photo.width || 0;
  const h = photo.height || 1;
  const author = photo.user?.name || 'Unknown';
  return {
    id: String(photo.id),
    external_id: String(photo.id),
    url,
    preview,
    thumbnail_url: preview,
    author,
    author_url: photo.user?.links?.html || '',
    width: w,
    height: h,
    ratio: w / h,
    alt: photo.alt_description || photo.description || '',
    avg_color: photo.color || '',
    attribution: `Photo by ${author} on Unsplash`,
    provider: 'unsplash',
  };
}

export async function fetchUnsplash({ query, orientation = 'landscape', limit = 40 }, env) {
  const key = env?.UNSPLASH_API_KEY || env?.UNSPLASH_ACCESS_KEY;
  if (!key || key.includes("your_unsplash")) return [];

  try {
    // Unsplash supports landscape, portrait, squarish
    let unsplashOrientation = 'landscape';
    if (orientation === 'portrait') unsplashOrientation = 'portrait';

    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=${unsplashOrientation}`,
      {
        headers: {
          Authorization: `Client-ID ${key}`,
        },
      }
    );

    if (!res.ok) {
      console.error('[UNSPLASH API ERROR]', res.status);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];
    return results.map(normalize);
  } catch (err) {
    console.error('[UNSPLASH PROVIDER ERROR]', err?.message);
    return [];
  }
}
