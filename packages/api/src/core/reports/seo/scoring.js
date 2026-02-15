export function calculateOverallScore(sections) {
  const weights = {
    technical: 0.35,
    content: 0.35,
    ux: 0.15,
    keywords: 0.15
  };

  return Math.round(
    sections.technical * weights.technical +
    sections.content * weights.content +
    sections.ux * weights.ux +
    sections.keywords * weights.keywords
  );
}
