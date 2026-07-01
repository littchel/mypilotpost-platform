/**
 * myPilotPost — Adobe Stock Provider
 * Fetches search results from Adobe Stock REST API.
 * Accepts: { query, limit }
 * Returns: normalized array of images
 */

function normalize(file) {
  const url = file.thumbnail_1000_url || file.thumbnail_500_url || file.thumbnail_url || '';
  const preview = file.thumbnail_220_url || file.thumbnail_url || url;
  const w = file.width || 0;
  const h = file.height || 1;
  const author = file.creator_name || 'Unknown';
  return {
    id: String(file.id),
    external_id: String(file.id),
    url,
    preview,
    thumbnail_url: preview,
    author,
    author_url: '',
    width: w,
    height: h,
    ratio: w / h,
    alt: file.title || '',
    avg_color: '',
    attribution: `Photo by ${author} on Adobe Stock`,
    provider: 'adobe_stock',
  };
}

export async function fetchAdobeStock({ query, limit = 40 }, env) {
  const key = env?.ADOBE_CLIENT_ID;
  if (!key || key.includes("placeholder") || key.includes("your_")) return [];

  try {
    const url = `https://stock.adobe.io/Rest/Media/1/Search/Files?locale=en_US&search_parameters[words]=${encodeURIComponent(query)}&search_parameters[limit]=${limit}`;
    const res = await fetch(url, {
      headers: {
        "x-api-key": key,
        "x-product": "myPilotPost/1.0",
      },
    });

    if (!res.ok) {
      console.error('[ADOBE STOCK API ERROR]', res.status);
      return [];
    }

    const data = await res.json();
    const files = data.files || [];
    return files.map(normalize);
  } catch (err) {
    console.error('[ADOBE STOCK PROVIDER ERROR]', err?.message);
    return [];
  }
}
