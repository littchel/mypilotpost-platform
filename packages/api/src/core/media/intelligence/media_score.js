export function scoreMedia({
  media,
  content,
  brand,
  platform
}) {
  let score = 0;
  const reasons = [];

  if (content.keywords?.some(k => media.tags?.includes(k))) {
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
