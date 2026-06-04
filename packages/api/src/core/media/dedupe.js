/**
 * myPilotPost — Image Deduplication
 * Rejects: same URL, same author >2, same dimensions.
 * Goal: never show "office photo × 5".
 */

export function dedupe(images) {
  const seenUrls  = new Set();
  const seenIds   = new Set();
  const authorCount = {};
  const out = [];

  for (const img of images) {
    if (!img?.url) continue;
    if (seenUrls.has(img.url)) continue;
    const id = img.external_id || img.id;
    if (id && seenIds.has(id)) continue;

    const author = (img.author || 'unknown').toLowerCase();
    if ((authorCount[author] || 0) >= 2) continue;

    seenUrls.add(img.url);
    if (id) seenIds.add(id);
    authorCount[author] = (authorCount[author] || 0) + 1;
    out.push(img);
  }

  return out;
}
