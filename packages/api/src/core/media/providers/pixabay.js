/**
 * myPilotPost — Pixabay Provider
 * Fetches search results from Pixabay API.
 * Accepts: { query, orientation, limit }
 * Returns: normalized array of images
 */

function normalize(hit) {
  const url = hit.largeImageURL || hit.webformatURL || '';
  const preview = hit.webformatURL || hit.previewURL || url;
  const w = hit.imageWidth || 0;
  const h = hit.imageHeight || 1;
  const author = hit.user || 'Unknown';
  return {
    id: String(hit.id),
    external_id: String(hit.id),
    url,
    preview,
    thumbnail_url: preview,
    author,
    author_url: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
    width: w,
    height: h,
    ratio: w / h,
    alt: hit.tags || '',
    avg_color: '', // Pixabay does not supply average hex color
    attribution: `Photo by ${author} on Pixabay`,
    provider: 'pixabay',
  };
}

export async function fetchPixabay({ query, orientation = 'landscape', limit = 40 }, env) {
  const key = env?.PIXABAY_API_KEY;
  if (!key || key.includes("your_pixabay")) return [];

  try {
    // Pixabay supports "all", "horizontal", "vertical"
    let pixabayOrientation = 'horizontal';
    if (orientation === 'portrait') pixabayOrientation = 'vertical';

    const res = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=${limit}&orientation=${pixabayOrientation}&image_type=photo`
    );

    if (!res.ok) {
      console.error('[PIXABAY API ERROR]', res.status);
      return [];
    }

    const data = await res.json();
    const hits = data.hits || [];
    return hits.map(normalize);
  } catch (err) {
    console.error('[PIXABAY PROVIDER ERROR]', err?.message);
    return [];
  }
}
