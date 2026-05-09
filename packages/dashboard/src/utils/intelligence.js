/**
 * Intelligence Utilities for myPilotPost
 * Handles simulated scoring for SEO, GEO, and Readability.
 */

/**
 * Calculates a basic Flesch-Kincaid-style readability score.
 * Returns: { score: number, level: 'Easy' | 'Medium' | 'Hard' }
 */
export const calculateReadability = (text) => {
  if (!text || text.length < 20) return { score: 0, level: 'Easy' };

  const words = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const syllables = text.toLowerCase().split(/[aeiouy]+/).length; // Very rough syllables

  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  
  let level = 'Easy';
  if (score < 60) level = 'Medium';
  if (score < 30) level = 'Hard';

  return { 
    score: Math.max(0, Math.min(100, Math.round(score))), 
    level 
  };
};

/**
 * Calculates keyword density score.
 */
export const calculateKeywordScore = (text, keyword) => {
  if (!text || !keyword || keyword.length < 2) return 0;
  
  const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
  const matches = (text.toLowerCase().match(regex) || []).length;
  const words = text.trim().split(/\s+/).length;
  
  const density = (matches / words) * 100;
  
  // Ideal density is usually 1-3%
  if (density === 0) return 0;
  if (density >= 1 && density <= 3) return 100;
  if (density > 3) return Math.max(0, 100 - (density - 3) * 20);
  return Math.min(100, density * 50);
};

/**
 * Simulates SEO Score based on keyword presence in title and structure.
 */
export const calculateSEOScore = (title, content, keyword) => {
  let score = 0;
  if (!keyword) return 0;

  const lowTitle = title.toLowerCase();
  const lowContent = content.toLowerCase();
  const lowKey = keyword.toLowerCase();

  if (lowTitle.includes(lowKey)) score += 40;
  if (lowContent.includes(lowKey)) score += 20;
  
  // Check for some common SEO structure (h1, h2 simulated marks like # or ##)
  if (lowContent.includes('#') || lowContent.includes('**')) score += 20;
  
  // Meta length simulation
  if (content.length > 500) score += 20;

  return score;
};

/**
 * Simulates GEO Score based on keyword and regional context.
 */
export const calculateGEOScore = (content, region, keyword) => {
  if (!content || !region) return 0;
  
  const regionKeywords = {
    'Africa': ['nigeria', 'kenya', 'lagos', 'nairobi', 'africa', 'local', 'market', 'region'],
    'Asia': ['singapore', 'india', 'china', 'asia', 'growth', 'pacific'],
    'Europe': ['london', 'berlin', 'paris', 'europe', 'compliance', 'gdpr'],
    'USA': ['america', 'us', 'nyc', 'california', 'standard', 'global']
  };

  const targets = regionKeywords[region] || [];
  const lowContent = content.toLowerCase();
  
  let matches = 0;
  targets.forEach(t => {
    if (lowContent.includes(t)) matches++;
  });

  const score = (matches / 2) * 50; // Simple logic: 2 regional words = 100
  return Math.min(100, Math.round(score));
};
