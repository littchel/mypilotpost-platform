function cleanAuthor(name) {
  if (!name) return 'unknown';
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(on pexels|on unsplash|on pixabay|on adobe|pexels|unsplash|pixabay)/gi, '')
    .trim();
}

export function dedupe(images) {
  const seenUrls  = new Set();
  const seenIds   = new Set();
  const seenDims  = new Set();
  const authorCount = {};
  const out = [];

  for (const img of images) {
    if (!img?.url) continue;
    if (seenUrls.has(img.url)) continue;
    const id = img.external_id || img.id;
    if (id && seenIds.has(id)) continue;

    // Deduplicate same image size signature (cross-platform duplicates)
    if (img.width > 0 && img.height > 0) {
      const dimSig = `${img.width}x${img.height}`;
      if (seenDims.has(dimSig)) continue;
      seenDims.add(dimSig);
    }

    const author = cleanAuthor(img.author);
    if ((authorCount[author] || 0) >= 2) continue;

    seenUrls.add(img.url);
    if (id) seenIds.add(id);
    authorCount[author] = (authorCount[author] || 0) + 1;
    out.push(img);
  }

  return out;
}
