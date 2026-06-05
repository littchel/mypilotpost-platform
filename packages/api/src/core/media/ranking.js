/**
 * myPilotPost — Image Ranking v2
 * score = 35% relevance + 25% quality + 20% diversity + 20% platform fit
 * Hard rejects: < 1600px, reject-words, same author > 2
 * Adds: reasons[] field — why this image was selected
 */

const HUMAN_WORDS   = ['people','person','man','woman','team','group','face','hands','smile','portrait','men','women','girl','boy','crowd','family','friends','employee','staff'];
const PROF_WORDS    = ['office','business','meeting','professional','corporate','work','desk','boardroom','executive','conference','colleague','startup','workspace'];
const MINIMAL_WORDS = ['minimal','clean','abstract','pattern','texture','simple','white','concept','gradient','geometric','flat','neutral'];
const REJECT_WORDS  = ['screenshot','meme','stock photo','generic','clipart','watermark'];

// Visual mismatch: subjects that should not appear together (rough heuristic)
const MISMATCH_PAIRS = [
  ['food', 'technology'],
  ['beach', 'office'],
  ['party', 'professional'],
];

function scoreRelevance(img, tags) {
  if (!tags.length) return 0.5;
  const alt = (img.alt || '').toLowerCase();
  const matches = tags.filter(t => alt.includes(t.toLowerCase())).length;
  return Math.min(matches / Math.max(tags.length * 0.6, 1), 1);
}

function scoreQuality(img) {
  const w = img.width || 0;
  if (w < 1600) return 0;     // hard floor raised to 1600px
  if (w >= 4000) return 1.0;
  if (w >= 2000) return 0.85;
  if (w >= 1600) return 0.60;
  return 0;
}

function scorePlatformFit(img, orientation) {
  if (!img.ratio) return 0.5;
  const isPortrait  = img.ratio < 0.85;
  const isLandscape = img.ratio > 1.2;
  const isSquare    = !isPortrait && !isLandscape;
  if (orientation === 'portrait'  && isPortrait)  return 1;
  if (orientation === 'landscape' && isLandscape) return 1;
  if (isSquare)     return 0.6;
  return 0.3;
}

function assignCategory(img) {
  const alt = (img.alt || '').toLowerCase();
  if (HUMAN_WORDS.some(w  => alt.includes(w))) return 'human';
  if (PROF_WORDS.some(w   => alt.includes(w))) return 'professional';
  if (MINIMAL_WORDS.some(w => alt.includes(w))) return 'minimal';
  return 'general';
}

function hasVisualMismatch(img, subjects) {
  if (!subjects?.length) return false;
  const alt = (img.alt || '').toLowerCase();
  for (const [a, b] of MISMATCH_PAIRS) {
    const imgHasA = alt.includes(a);
    const imgHasB = alt.includes(b);
    const wantA   = subjects.some(s => s.toLowerCase().includes(a));
    const wantB   = subjects.some(s => s.toLowerCase().includes(b));
    if ((imgHasA && wantB && !wantA) || (imgHasB && wantA && !wantB)) return true;
  }
  return false;
}

function shouldReject(img, subjects) {
  // Hard reject: below quality floor
  if ((img.width || 0) > 0 && (img.width || 0) < 1600) return true;
  // Hard reject: known bad content
  const alt = (img.alt || '').toLowerCase();
  if (REJECT_WORDS.some(w => alt.includes(w))) return true;
  // Hard reject: visual mismatch
  if (hasVisualMismatch(img, subjects)) return true;
  return false;
}

function generateReasons(img, tags, orientation) {
  const reasons = [];
  const alt = (img.alt || '').toLowerCase();

  const matchedTags = tags.filter(t => alt.includes(t.toLowerCase()));
  if (matchedTags.length >= 2) reasons.push(`Matches ${matchedTags.slice(0, 2).join(' & ')}`);
  else if (matchedTags.length === 1) reasons.push(`Matches topic`);

  if (img.width >= 2000)      reasons.push('High visual quality');
  else if (img.width >= 1600) reasons.push('Good resolution');

  const fitScore = scorePlatformFit(img, orientation);
  if (fitScore >= 0.8) reasons.push('Fits platform format');

  const category = assignCategory(img);
  if (category === 'minimal')      reasons.push('Clean editorial style');
  else if (category === 'human')   reasons.push('People-focused');
  else if (category === 'professional') reasons.push('Professional tone');

  return reasons.length ? reasons.slice(0, 3) : ['Curated pick'];
}

export function rankImages(images, { tags = [], orientation = 'landscape', subjects = [] } = {}) {
  const eligible = images.filter(img => !shouldReject(img, subjects));

  const authorsSeen = {};
  const scored = eligible.map(img => {
    const author = img.author || 'unknown';
    const authorRank = (authorsSeen[author] = (authorsSeen[author] || 0) + 1);
    // Hard-reject same author > 2
    if (authorRank > 2) return null;

    const diversityPenalty = authorRank > 1 ? 0.35 : 0;

    const relevance   = scoreRelevance(img, tags);
    const quality     = scoreQuality(img);
    const diversity   = Math.max(0, 1 - diversityPenalty);
    const platformFit = scorePlatformFit(img, orientation);

    const score = (
      relevance   * 0.35 +
      quality     * 0.25 +
      diversity   * 0.20 +
      platformFit * 0.20
    );

    const reasons = generateReasons(img, tags, orientation);

    return { ...img, category: assignCategory(img), reasons, _score: score };
  }).filter(Boolean);

  return scored.sort((a, b) => b._score - a._score);
}
