/* ======================================================
   ARTICLE METRICS ENGINE (PHASE-2 SAFE)
====================================================== */

export function analyzeArticle({ title, body, primary_keyword }) {
  const text = stripHtml(body);
  const words = text.split(/\s+/).filter(Boolean);

  const word_count = words.length;

  const readability_score = calculateReadability(text);
  const readability_label = labelReadability(readability_score);

  const seo_score = calculateSEOScore({
    title,
    body: text,
    primary_keyword,
    word_count
  });

  return {
    word_count,
    seo_score,
    readability_score,
    readability_label
  };
}

/* ---------------- HELPERS ---------------- */

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ");
}

function calculateReadability(text) {
  const sentences = text.split(/[.!?]/).filter(Boolean).length || 1;
  const words = text.split(/\s+/).length || 1;
  const syllables = estimateSyllables(text);

  // Flesch Reading Ease (simplified)
  const score =
    206.835 -
    1.015 * (words / sentences) -
    84.6 * (syllables / words);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function labelReadability(score) {
  if (score >= 70) return "excellent";
  if (score >= 55) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function estimateSyllables(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .reduce((count, word) => {
      const matches = word.match(/[aeiouy]+/g);
      return count + (matches ? matches.length : 1);
    }, 0);
}

function calculateSEOScore({ title, body, primary_keyword, word_count }) {
  let score = 0;

  if (title && title.length >= 50 && title.length <= 60) score += 20;
  if (title?.toLowerCase().includes(primary_keyword?.toLowerCase())) score += 15;

  if (body.toLowerCase().includes(primary_keyword?.toLowerCase())) score += 20;
  if (word_count >= 900) score += 15;
  if (word_count >= 1600) score += 10;

  if (body.match(/<h1>|<h2>|<h3>/g)) score += 10;
  if (body.match(/<img[^>]+alt=/g)) score += 10;

  return Math.min(100, score);
}
