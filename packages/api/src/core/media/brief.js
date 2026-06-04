/**
 * myPilotPost — Visual Brief Generator
 * Pure logic. No LLM. No API calls.
 * Input: { platform, contentType, text, brand, industry }
 * Output: { query, orientation, tags, avoid, category }
 */

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','it','its','this','that','are','was','were','be','been',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','can','i','we','you','he','she','they','my','our','your','his','her',
  'their','our','your','how','what','when','where','who','why','so','as','if',
  'than','too','very','just','get','make','use','need','want','help','new','all',
  'into','up','out','go','come','see','look','take','give','know','think','say',
]);

const PLATFORM_RULES = {
  instagram: { orientation: 'portrait',  style: ['lifestyle', 'authentic', 'warm', 'people'], avoid: ['stock', 'generic', 'text', 'office'], defaultCategory: 'human' },
  linkedin:  { orientation: 'landscape', style: ['professional', 'clean', 'corporate', 'modern'], avoid: ['casual', 'party', 'blurry'], defaultCategory: 'professional' },
  facebook:  { orientation: 'landscape', style: ['people', 'community', 'social', 'authentic'], avoid: ['text', 'generic'], defaultCategory: 'human' },
  twitter:   { orientation: 'landscape', style: ['bold', 'visual', 'impact', 'modern'], avoid: ['portrait', 'blurry'], defaultCategory: 'general' },
  tiktok:    { orientation: 'portrait',  style: ['people', 'action', 'dynamic', 'bright'], avoid: ['static', 'corporate'], defaultCategory: 'human' },
  blog:      { orientation: 'landscape', style: ['editorial', 'clean', 'professional', 'concept'], avoid: ['stock', 'generic'], defaultCategory: 'general' },
  article:   { orientation: 'landscape', style: ['editorial', 'detail', 'professional'], avoid: ['stock'], defaultCategory: 'general' },
};

const INDUSTRY_MODIFIERS = {
  'real estate':   'property home architecture interior',
  'coffee':        'coffee cafe latte lifestyle',
  'cafe':          'coffee cafe food lifestyle',
  'food':          'food restaurant culinary dish',
  'restaurant':    'restaurant food dining people',
  'fitness':       'fitness lifestyle active health workout',
  'technology':    'technology innovation modern digital',
  'tech':          'technology innovation modern',
  'software':      'technology modern digital office',
  'saas':          'technology modern office team',
  'fashion':       'fashion style lifestyle clothing',
  'finance':       'professional business success finance',
  'healthcare':    'health wellness clean medical',
  'education':     'education learning professional students',
  'marketing':     'marketing creative team collaboration',
  'retail':        'retail product lifestyle shopping',
  'travel':        'travel destination adventure landscape',
  'beauty':        'beauty lifestyle portrait woman',
  'consulting':    'professional business meeting team',
  'agency':        'creative team collaboration professional',
};

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 5);
}

function industryModifier(industry) {
  if (!industry) return '';
  const lower = industry.toLowerCase();
  for (const [key, mod] of Object.entries(INDUSTRY_MODIFIERS)) {
    if (lower.includes(key)) return mod.split(' ').slice(0, 2).join(' ');
  }
  return '';
}

export function generateBrief({ platform = 'instagram', contentType = 'social', text = '', brand = '', industry = '' }) {
  const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.instagram;
  const keywords = extractKeywords(text);
  const indMod = industryModifier(industry);

  const queryParts = [...keywords.slice(0, 3)];
  if (indMod) queryParts.push(indMod.split(' ')[0]);
  if (rules.style[0]) queryParts.push(rules.style[0]);

  const query = queryParts.filter(Boolean).join(' ').trim() || 'professional lifestyle';

  return {
    query,
    orientation: rules.orientation,
    tags: [...keywords, ...rules.style.slice(0, 2)],
    avoid: rules.avoid,
    defaultCategory: rules.defaultCategory,
  };
}
