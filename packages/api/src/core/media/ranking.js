/**
 * myPilotPost — Image Ranking
 * score = 40% relevance + 30% quality + 20% diversity + 10% platform fit
 * Assigns a category for tab grouping: human | professional | minimal | general
 */

const HUMAN_WORDS  = ['people','person','man','woman','team','group','face','hands','smile','portrait','woman','men','women','girl','boy','crowd','family','friends','employee','staff'];
const PROF_WORDS   = ['office','business','meeting','professional','corporate','work','desk','boardroom','executive','conference','colleague','startup'];
const MINIMAL_WORDS= ['minimal','clean','abstract','pattern','texture','simple','white','concept','gradient','geometric','flat'];
const REJECT_WORDS = ['screenshot','text','meme','stock photo','generic'];

function scoreRelevance(img, tags) {
  if (!tags.length) return 0.5;
  const alt = (img.alt || '').toLowerCase();
  const matches = tags.filter(t => alt.includes(t.toLowerCase())).length;
  return Math.min(matches / tags.length, 1);
}

function scoreQuality(img) {
  const w = img.width || 0;
  if (w < 1200) return 0;
  if (w >= 4000) return 1;
  if (w >= 2000) return 0.9;
  if (w >= 1600) return 0.7;
  return 0.5;
}

function scorePlatformFit(img, orientation) {
  if (!img.ratio) return 0.5;
  const isPortrait  = img.ratio < 0.85;
  const isLandscape = img.ratio > 1.2;
  const isSquare    = !isPortrait && !isLandscape;
  if (orientation === 'portrait' && isPortrait) return 1;
  if (orientation === 'landscape' && isLandscape) return 1;
  if (isSquare) return 0.6;
  return 0.3;
}

function assignCategory(img) {
  const alt = (img.alt || '').toLowerCase();
  if (HUMAN_WORDS.some(w => alt.includes(w))) return 'human';
  if (PROF_WORDS.some(w => alt.includes(w))) return 'professional';
  if (MINIMAL_WORDS.some(w => alt.includes(w))) return 'minimal';
  return 'general';
}

function shouldReject(img) {
  if ((img.width || 0) > 0 && (img.width || 0) < 1200) return true;
  const alt = (img.alt || '').toLowerCase();
  if (REJECT_WORDS.some(w => alt.includes(w))) return true;
  return false;
}

export function rankImages(images, { tags = [], orientation = 'landscape' } = {}) {
  const eligible = images.filter(img => !shouldReject(img));

  const authorsSeen = {};
  const scored = eligible.map((img, idx) => {
    const author = img.author || 'unknown';
    const authorRank = (authorsSeen[author] = (authorsSeen[author] || 0) + 1);
    const diversityPenalty = authorRank > 1 ? 0.3 * (authorRank - 1) : 0;

    const relevance     = scoreRelevance(img, tags);
    const quality       = scoreQuality(img);
    const diversity     = Math.max(0, 1 - diversityPenalty);
    const platformFit   = scorePlatformFit(img, orientation);

    const score = (
      relevance   * 0.40 +
      quality     * 0.30 +
      diversity   * 0.20 +
      platformFit * 0.10
    );

    return { ...img, category: assignCategory(img), _score: score };
  });

  return scored.sort((a, b) => b._score - a._score);
}
