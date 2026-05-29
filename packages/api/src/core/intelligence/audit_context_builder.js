/**
 * myPilotPost — Audit Context Builder
 *
 * Converts raw crawl outputs into structured intelligence inputs for Groq.
 *
 * TOKEN BUDGET (input + output ≤ 11,000):
 *   System prompt  ~225 tok (fixed)
 *   JSON schema   ~2,400 tok (fixed — defines 13-section output)
 *   Context block  target ≤ 800 tok
 *   Hard limit     3,500 input tok → triggers auto-compression
 */

const STOP_WORDS = new Set([
  'that','this','with','from','they','have','will','your','more','been','also',
  'which','their','when','what','than','were','each','into','about','just',
  'some','such','most','over','only','both','very','then','here','even',
  'where','well','much','make','like','time','back','good','many','come',
  'need','year','work','help','take','high','same','does','page','next',
  'know','last','long','used','right','look','based','using','these','other',
  'after','being','there','would','could','should','those','them','our',
  'can','its','all','are','has','not','but','for','and','the',
]);

// ~4 chars per token for English text
export function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

function extractTopKeywords(text, count = 10) {
  const words = (text || '').toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  for (const w of words) {
    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
}

function detectContentSignals(bodyText) {
  const t = (bodyText || '').toLowerCase();
  return {
    educational:        /how to|guide|tutorial|learn|tips|steps|best practice|what is/.test(t),
    promotional:        /sale|discount|offer|limited|exclusive|free trial|promo|deal|save/.test(t),
    social_proof:       /testimonial|review|client|customer|trusted|rated|award|certified|case study/.test(t),
    thought_leadership: /insight|strategy|industry|research|report|expert|whitepaper|analysis/.test(t),
    community:          /community|forum|group|member|join us|event|workshop|webinar/.test(t),
    estimated_words:    bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0,
    top_keywords:       extractTopKeywords(bodyText),
  };
}

function scoreSeoBriefly(website) {
  const tl = website.title?.length || 0;
  const ml = website.description?.length || 0;
  return {
    title:       !website.title       ? 'missing' : tl < 20 ? 'too_short' : tl > 70  ? 'too_long' : 'good',
    title_chars: tl,
    meta:        !website.description ? 'missing' : ml < 50 ? 'thin'      : ml > 160 ? 'too_long' : 'good',
    headings:    website.headings?.length || 0,
  };
}

function compressBodyText(bodyText, targetChars) {
  if (!bodyText || targetChars <= 0) return '';
  if (bodyText.length <= targetChars) return bodyText;
  const firstPart = bodyText.slice(0, Math.round(targetChars * 0.75));
  const midStart  = Math.round(bodyText.length * 0.35);
  const midPart   = bodyText.slice(midStart, midStart + Math.round(targetChars * 0.25));
  return `${firstPart} [...] ${midPart}`.trim();
}

function compressSocialSummary(rawSummary, maxBioChars) {
  return (rawSummary || 'No social profiles detected.').split('\n').map(line => {
    if (!line.startsWith('✓')) return line;
    const bioStart = line.indexOf('Bio: "');
    if (bioStart === -1) return line;
    const bioEnd = line.indexOf('"', bioStart + 6);
    const bio = bioEnd > -1 ? line.slice(bioStart + 6, bioEnd) : '';
    return line.slice(0, bioStart) + `Bio: "${bio.slice(0, maxBioChars)}"`;
  }).join('\n');
}

export function buildAuditContext(website, rawSocialSummary, options = {}) {
  const { bodyTextChars = 1200, maxBioChars = 60 } = options;

  const domain  = (() => { try { return new URL(website.url).hostname; } catch { return website.url; } })();
  const pt      = website.page_types || {};
  const seo     = scoreSeoBriefly(website);
  const content = detectContentSignals(website.body_text || '');
  const body    = compressBodyText(website.body_text || '', bodyTextChars);
  const social  = compressSocialSummary(rawSocialSummary, maxBioChars);

  return [
    `=== WEBSITE INTELLIGENCE ===`,
    `Domain: ${domain} | Accessible: ${website.accessible}${website.error ? ` (error: ${website.error})` : ''}`,
    `Title: ${(website.title || 'none').slice(0, 100)} | Meta: ${(website.description || 'none').slice(0, 120)}`,
    `OG Title: ${(website.og_title || 'none').slice(0, 80)} | OG Desc: ${(website.og_description || 'none').slice(0, 100)}`,
    `Headings: ${website.headings?.slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join(' | ') || 'none found'}`,
    `CTAs: ${website.ctas?.slice(0, 4).join(' / ') || 'none detected'}`,
    `Contact: ${website.emails?.slice(0, 2).join(', ') || 'no email'} | Phone: ${website.phone || 'no phone'}`,
    `Site: contact=${pt.has_contact} blog=${pt.has_blog} shop=${pt.has_shop} pricing=${pt.has_pricing} about=${pt.has_about} services=${pt.has_services} portfolio=${pt.has_portfolio}`,
    `SEO: title=${seo.title}(${seo.title_chars}ch) | meta=${seo.meta} | headings=${seo.headings}`,
    `Content: educational=${content.educational} | promotional=${content.promotional} | social_proof=${content.social_proof} | thought_leadership=${content.thought_leadership} | community=${content.community}`,
    `Keywords: ${content.top_keywords.join(', ')} | ~${content.estimated_words} words`,
    body ? `\nContent Sample:\n${body}` : '',
    `\n=== SOCIAL SIGNALS ===`,
    social,
  ].filter(l => l !== '').join('\n');
}

// Returns { context, tokens, compressed }
export function buildAuditContextSafe(website, rawSocialSummary, hardLimitTokens = 3500) {
  let context = buildAuditContext(website, rawSocialSummary);
  const initial = estimateTokens(context);

  console.log(`[AUDIT_CONTEXT_SIZE] ~${initial}tok (hard_limit=${hardLimitTokens}tok)`);

  if (initial <= hardLimitTokens) {
    return { context, tokens: initial, compressed: false };
  }

  // Tier 1: reduce body to 700 chars, bios to 40 chars
  console.log(`[AUDIT_CONTEXT_COMPRESSED] tier=1 initial=${initial}tok — body=700ch bios=40ch`);
  context = buildAuditContext(website, rawSocialSummary, { bodyTextChars: 700, maxBioChars: 40 });
  const tier1 = estimateTokens(context);
  if (tier1 <= hardLimitTokens) return { context, tokens: tier1, compressed: true };

  // Tier 2: drop body text entirely
  console.log(`[AUDIT_CONTEXT_COMPRESSED] tier=2 tier1=${tier1}tok — dropping body text`);
  context = buildAuditContext(website, rawSocialSummary, { bodyTextChars: 0, maxBioChars: 40 });
  const tier2 = estimateTokens(context);
  return { context, tokens: tier2, compressed: true };
}

// Dynamic output budget — keeps total request ≤ 11,000 tokens
export function dynamicOutputBudget(contextTokens) {
  if (contextTokens < 3000) return 5000;
  if (contextTokens <= 5000) return 4500;
  return 3500;
}
