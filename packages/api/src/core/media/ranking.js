/**
 * myPilotPost — Image Ranking v3
 * score = 35% relevance + 25% quality + 20% diversity + 20% platform fit
 * Hard rejects: < 1600px, reject-words, same author > 2, match score < 80
 * Consumes visual_context for industry guardrails + title↔image match.
 */

import { computeMatchScore, MATCH_THRESHOLD } from './visual_context.js';

const HUMAN_WORDS   = ['people','person','man','woman','team','group','face','hands','smile','portrait','men','women','girl','boy','crowd','family','friends','employee','staff'];
const PROF_WORDS    = ['office','business','meeting','professional','corporate','work','desk','boardroom','executive','conference','colleague','startup','workspace'];
const MINIMAL_WORDS = ['minimal','clean','abstract','pattern','texture','simple','white','concept','gradient','geometric','flat','neutral'];
const REJECT_WORDS  = ['screenshot','meme','stock photo','generic','clipart','watermark'];

function scoreRelevance(img, tags) {
  if (!tags.length) return 0.5;
  const alt = (img.alt || '').toLowerCase();
  const matches = tags.filter(t => alt.includes(t.toLowerCase())).length;
  return Math.min(matches / Math.max(tags.length * 0.6, 1), 1);
}

function scoreQuality(img) {
  const w = img.width || 0;
  if (w < 1600) return 0;
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
  if (isSquare) return 0.6;
  return 0.3;
}

export function assignCategory(img) {
  const alt = (img.alt || '').toLowerCase();
  if (HUMAN_WORDS.some(w   => alt.includes(w))) return 'human';
  if (PROF_WORDS.some(w    => alt.includes(w))) return 'professional';
  if (MINIMAL_WORDS.some(w => alt.includes(w))) return 'minimal';
  return 'general';
}

function shouldReject(img, visualContext) {
  // Hard reject: below quality floor
  if ((img.width || 0) > 0 && (img.width || 0) < 1600) return true;
  // Hard reject: known bad content types
  const alt = (img.alt || '').toLowerCase();
  if (REJECT_WORDS.some(w => alt.includes(w))) return true;
  // Industry guardrail + title↔image match
  if (visualContext) {
    const matchScore = computeMatchScore(img, visualContext);
    if (matchScore < MATCH_THRESHOLD) return true;
  }
  return false;
}

function generateReasons(img, tags, orientation, visualContext) {
  const reasons = [];
  const alt = (img.alt || '').toLowerCase();

  const matchedTags = tags.filter(t => alt.includes(t.toLowerCase()));
  if (matchedTags.length >= 2) reasons.push(`Matches ${matchedTags.slice(0, 2).join(' & ')}`);
  else if (matchedTags.length === 1) reasons.push('Matches topic');

  // Subject match from visual context
  const subjects = visualContext?.subjects || [];
  const matchedSubjects = subjects.filter(s => alt.includes(s.toLowerCase()));
  if (!matchedTags.length && matchedSubjects.length) {
    reasons.push(`Fits ${visualContext.industryKey || 'industry'} context`);
  }

  if (img.width >= 2000)      reasons.push('High visual quality');
  else if (img.width >= 1600) reasons.push('Good resolution');

  if (scorePlatformFit(img, orientation) >= 0.8) reasons.push('Fits platform format');

  const category = img.category || assignCategory(img);
  if (category === 'minimal')           reasons.push('Clean editorial style');
  else if (category === 'human')        reasons.push('People-focused');
  else if (category === 'professional') reasons.push('Professional tone');

  return reasons.length ? reasons.slice(0, 3) : ['Curated pick'];
}

export function filterBySlotRequirements(image, slotRequirements) {
  if (!slotRequirements) return true;
  const { required_aspect_ratio, min_width, min_height } = slotRequirements;

  // 1. Hard filter on min dimensions
  if (min_width && (image.width || 0) < min_width) return false;
  if (min_height && (image.height || 0) < min_height) return false;

  // 2. Aspect ratio tolerance check (+/- 0.1)
  if (required_aspect_ratio) {
    const parts = required_aspect_ratio.split(':');
    if (parts.length === 2) {
      const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
      const imageRatio = (image.width || 0) / ((image.height || 1) || 1);
      if (Math.abs(imageRatio - targetRatio) > 0.1) {
        return false;
      }
    }
  }

  return true;
}

export function calculateNegativeSpaceScore(imageUrl, altText = '') {
  // Pure function fallback for synchronous ranking loop.
  // Performs a fast keyword mapping on alt text if image analysis library is missing/unavailable.
  const alt = (altText || '').toLowerCase();
  const uniformKeywords = ['sky', 'wall', 'blurred', 'background', 'minimal', 'gradient', 'abstract', 'negative space', 'clean'];
  const complexKeywords = ['crowd', 'dense', 'pattern', 'complex', 'group of people', 'city street'];

  if (uniformKeywords.some(w => alt.includes(w))) {
    return 15;
  }
  if (complexKeywords.some(w => alt.includes(w))) {
    return -20;
  }
  return 0;
}

/**
 * @param {object[]} images
 * @param {{
 *   tags?:         string[],
 *   orientation?:  string,
 *   subjects?:     string[],
 *   visualContext?: object,   -- from buildVisualContext()
 *   slotRequirements?: object, -- { required_aspect_ratio, min_width, min_height }
 * }} options
 */
export function rankImages(images, { tags = [], orientation = 'landscape', subjects = [], visualContext = null, slotRequirements = null } = {}) {
  // Assign category before shouldReject so computeMatchScore can use it
  const categorised = images.map(img => ({ ...img, category: assignCategory(img) }));

  // Hard filter aspect ratio and slot requirements BEFORE the main ranking loop
  const eligible = categorised
    .filter(img => !shouldReject(img, visualContext))
    .filter(img => filterBySlotRequirements(img, slotRequirements));

  const authorsSeen = {};
  const scored = eligible.map(img => {
    const author = img.author || 'unknown';
    const authorRank = (authorsSeen[author] = (authorsSeen[author] || 0) + 1);
    if (authorRank > 2) return null; // hard-reject same author > 2

    const diversityPenalty = authorRank > 1 ? 0.35 : 0;

    const relevance   = scoreRelevance(img, tags);
    const quality     = scoreQuality(img);
    const diversity   = Math.max(0, 1 - diversityPenalty);
    const platformFit = scorePlatformFit(img, orientation);

    // Negative space entropy score (-20 to +15 mapped to 0.0 to 1.0)
    const rawNegSpace = calculateNegativeSpaceScore(img.url, img.alt);
    let negativeSpace = 0.5; // neutral fallback
    if (rawNegSpace === 15) negativeSpace = 1.0;
    else if (rawNegSpace === -20) negativeSpace = 0.0;

    // New Score = (0.30 * Relevance) + (0.20 * Resolution) + (0.15 * Author Diversity) + (0.15 * Platform Fit) + (0.20 * Negative Space)
    const score = (
      relevance     * 0.30 +
      quality       * 0.20 +
      diversity     * 0.15 +
      platformFit   * 0.15 +
      negativeSpace * 0.20
    );

    const reasons = generateReasons(img, tags, orientation, visualContext);
    return { ...img, reasons, _score: score };
  }).filter(Boolean);

  return scored.sort((a, b) => b._score - a._score);
}
