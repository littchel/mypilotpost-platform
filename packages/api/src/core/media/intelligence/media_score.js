export function scoreMedia({
  media,
  content,
  brand,
  platform
}) {
  let score = 0;
  const reasons = [];

  let keywords = [];
  if (typeof content === "string") {
    const stopwords = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "for", "with", "by", "about", "against", "during", "before", "after", "above", "below", "from", "up", "down", "over", "under", "again", "further", "then", "once", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "this", "that", "these", "those"]);
    keywords = content
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length > 3 && !stopwords.has(w));
  } else if (content && typeof content === "object") {
    keywords = content.keywords || [];
    if (keywords.length === 0 && typeof content.text === "string") {
      const stopwords = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "for", "with", "by", "about", "against", "during", "before", "after", "above", "below", "from", "up", "down", "over", "under", "again", "further", "then", "once", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "this", "that", "these", "those"]);
      keywords = content.text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(w => w.length > 3 && !stopwords.has(w));
    }
  }

  const mediaTags = (media.tags || (media.alt ? media.alt.split(/[^a-z0-9]+/) : [])).map(t => t.toLowerCase());

  if (keywords.some(k => mediaTags.includes(k))) {
    score += 30;
    reasons.push("Keyword match");
  }

  if (media.platform_fit?.includes(platform)) {
    score += 25;
    reasons.push("Platform fit");
  }

  if (media.industry === brand.industry) {
    score += 15;
    reasons.push("Brand relevance");
  }

  if (media.usage_count > 5) {
    score -= 10;
    reasons.push("Overused asset");
  }

  return {
    score: Math.min(score, 100),
    reasons
  };
}
