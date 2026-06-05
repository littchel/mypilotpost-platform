/**
 * myPilotPost — Visual Brief Generator v2
 * Pure logic. No LLM. No API calls.
 * Input: { platform, contentType, format, text, title, brand, industry, goal }
 * Output: { query, subjects, style, composition, orientation, avoid, format }
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

// Per-format visual intent
const FORMAT_RULES = {
  carousel:  { subjects: ['process','steps','sequence','detail'],     composition: 'multi-panel',      style: 'editorial clean' },
  article:   { subjects: ['hero','concept','scene','environment'],    composition: 'hero',             style: 'editorial' },
  blog:      { subjects: ['hero','concept','environment'],            composition: 'hero',             style: 'clean editorial' },
  campaign:  { subjects: ['people','product','outcome','action'],     composition: 'focal-point',      style: 'conversion' },
  playbook:  { subjects: ['outcome','success','achievement','growth'], composition: 'aspirational',    style: 'aspirational' },
  text_only: { subjects: ['minimal','abstract','texture','clean'],   composition: 'negative-space',   style: 'minimal editorial' },
  social:    { subjects: ['lifestyle','people','authentic','candid'], composition: 'portrait-friendly',style: 'authentic' },
};

// Per-platform rules
const PLATFORM_RULES = {
  instagram: { orientation: 'portrait',  style: 'authentic lifestyle warm',  avoid: ['stock','generic','empty desk','text overlay'],  defaultCategory: 'human' },
  linkedin:  { orientation: 'landscape', style: 'professional clean modern', avoid: ['casual','party','blurry','random objects'],     defaultCategory: 'professional' },
  facebook:  { orientation: 'landscape', style: 'people community authentic',avoid: ['text overlay','generic stock'],                 defaultCategory: 'human' },
  twitter:   { orientation: 'landscape', style: 'bold visual impact modern', avoid: ['portrait only','blurry'],                       defaultCategory: 'general' },
  tiktok:    { orientation: 'portrait',  style: 'dynamic action bright',     avoid: ['static','corporate','empty'],                   defaultCategory: 'human' },
  blog:      { orientation: 'landscape', style: 'editorial clean concept',   avoid: ['stock feeling','random food','office generic'], defaultCategory: 'general' },
  article:   { orientation: 'landscape', style: 'editorial professional',    avoid: ['stock','generic office'],                       defaultCategory: 'general' },
};

// Industry visual anchors — map to concrete visual subjects
const INDUSTRY_MODIFIERS = {
  'real estate':   { words: 'property home architecture interior', subject: 'architecture' },
  'coffee':        { words: 'coffee cafe latte lifestyle',         subject: 'coffee lifestyle' },
  'cafe':          { words: 'coffee cafe atmosphere lifestyle',    subject: 'cafe lifestyle' },
  'food':          { words: 'food culinary dish plating',          subject: 'food' },
  'restaurant':    { words: 'restaurant dining people food',       subject: 'restaurant' },
  'fitness':       { words: 'fitness active health workout',       subject: 'fitness lifestyle' },
  'technology':    { words: 'technology innovation digital modern',subject: 'technology' },
  'tech':          { words: 'technology modern digital',           subject: 'technology' },
  'software':      { words: 'technology digital workspace',        subject: 'software technology' },
  'saas':          { words: 'technology team product workspace',   subject: 'product team' },
  'fashion':       { words: 'fashion style lifestyle clothing',    subject: 'fashion' },
  'finance':       { words: 'professional business success',       subject: 'finance professional' },
  'healthcare':    { words: 'health wellness clean care',          subject: 'healthcare' },
  'education':     { words: 'learning education professional',     subject: 'learning' },
  'marketing':     { words: 'creative team collaboration',         subject: 'marketing creative' },
  'retail':        { words: 'product lifestyle shopping',          subject: 'retail product' },
  'travel':        { words: 'travel destination landscape',        subject: 'travel' },
  'beauty':        { words: 'beauty lifestyle portrait woman',     subject: 'beauty lifestyle' },
  'consulting':    { words: 'professional business meeting',       subject: 'business consulting' },
  'agency':        { words: 'creative team professional',          subject: 'creative team' },
};

// Goal → concrete visual modifier
const GOAL_MODIFIERS = {
  'thought leadership': 'executive professional insight whitepaper',
  'brand awareness':    'lifestyle authentic community presence',
  'lead generation':    'professional achievement results outcome',
  'engagement':         'people authentic emotion candid moment',
  'education':          'learning concept clear minimal diagram',
  'sales':              'product outcome success professional',
};

// Avoid these universally — they scream stock
const UNIVERSAL_AVOID = ['generic stock','random objects','empty desk','staged','clip art'];

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 6);
}

function industryModifier(industry) {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  for (const [key, mod] of Object.entries(INDUSTRY_MODIFIERS)) {
    if (lower.includes(key)) return mod;
  }
  return null;
}

function goalModifier(goal) {
  if (!goal) return '';
  const lower = goal.toLowerCase();
  for (const [key, words] of Object.entries(GOAL_MODIFIERS)) {
    if (lower.includes(key)) return words.split(' ').slice(0, 2).join(' ');
  }
  return '';
}

export function generateBrief({
  platform = 'instagram',
  contentType = 'social',
  format,
  text = '',
  title = '',
  brand = '',
  industry = '',
  goal = '',
} = {}) {
  const platformRules = PLATFORM_RULES[platform] || PLATFORM_RULES.instagram;
  const effectiveFormat = format || contentType;
  const formatRules = FORMAT_RULES[effectiveFormat] || FORMAT_RULES.social;

  // Title keywords are the strongest signal
  const titleWords = extractKeywords(title).slice(0, 3);
  // Content text keywords (noisy — use fewer)
  const contentWords = extractKeywords(text).slice(0, 2);
  // Industry anchor
  const indMod = industryModifier(industry);
  // Goal modifier
  const goalMod = goalModifier(goal);

  // Build query: title → industry subject → goal → format subject → platform style
  const queryParts = [
    ...titleWords,
    indMod ? indMod.subject.split(' ')[0] : null,
    goalMod ? goalMod.split(' ')[0] : null,
    formatRules.subjects[0],
    !titleWords.length ? platformRules.style.split(' ')[0] : null,
    // content keywords only if no title
    ...(!titleWords.length ? contentWords.slice(0, 2) : []),
  ].filter(Boolean);

  // Deduplicate and cap
  const seen = new Set();
  const uniqueParts = queryParts.filter(p => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const query = uniqueParts.slice(0, 4).join(' ').trim() || `${platformRules.style.split(' ')[0]} lifestyle`;

  // Tags used by ranking for relevance scoring
  const tags = [
    ...titleWords,
    ...contentWords,
    ...(indMod ? indMod.words.split(' ').slice(0, 2) : []),
    ...formatRules.subjects.slice(0, 2),
    platformRules.style.split(' ')[0],
  ].filter(Boolean).slice(0, 10);

  const avoid = [
    ...platformRules.avoid,
    ...UNIVERSAL_AVOID,
  ];

  // Merge format + platform style words, deduplicated
  const styleWords = [...new Set([
    ...formatRules.style.split(' '),
    platformRules.style.split(' ')[0],
  ])];

  return {
    query,
    subjects:    formatRules.subjects,
    style:       styleWords.join(' '),
    composition: formatRules.composition,
    orientation: platformRules.orientation,
    avoid,
    format:      effectiveFormat,
    tags,
    defaultCategory: platformRules.defaultCategory,
  };
}
