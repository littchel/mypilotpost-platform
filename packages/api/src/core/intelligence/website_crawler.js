/**
 * myPilotPost — Website Crawler
 * Fetches and extracts brand signals from a public URL.
 * Runs entirely in Cloudflare Workers (no DOM, no puppeteer).
 */

const SOCIAL_PATTERNS = [
  { platform: 'facebook',  re: /https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|dialog|login|signup|watch|groups|events|pages\/create)([A-Za-z0-9._%-]+)/gi },
  { platform: 'instagram', re: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._%-]+)/gi },
  { platform: 'linkedin',  re: /https?:\/\/(?:www\.)?linkedin\.com\/company\/([A-Za-z0-9._%-]+)/gi },
  { platform: 'twitter',   re: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)/gi },
  { platform: 'tiktok',   re: /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._%-]+)/gi },
  { platform: 'youtube',  re: /https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|@)\/([A-Za-z0-9._%-]+)/gi },
  { platform: 'pinterest', re: /https?:\/\/(?:www\.)?pinterest\.com\/([A-Za-z0-9._%-]+)/gi },
];

const NOISE_HANDLES = new Set([
  'share', 'sharer', 'intent', 'login', 'signup', 'like', 'follow',
  'watch', 'plugins', 'ads', 'policies', 'help', 'about', 'terms',
]);

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractMeta(html, ...names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']{1,500})["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+(?:name|property)=["']${escaped}["']`, 'i'),
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1].trim();
    }
  }
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return m?.[1]?.trim() || null;
}

function extractHeadings(html) {
  const out = [];
  for (const tag of ['h1', 'h2', 'h3']) {
    const re = new RegExp(`<${tag}[^>]*>([^<]{3,200})<\/${tag}>`, 'gi');
    let m;
    while ((m = re.exec(html)) !== null && out.length < 8) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text) out.push(text);
    }
    if (out.length >= 8) break;
  }
  return out;
}

function extractSocialLinks(html) {
  const found = {};
  for (const { platform, re } of SOCIAL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html)) !== null) {
      const handle = m[1].toLowerCase().replace(/\/$/, '');
      if (!NOISE_HANDLES.has(handle) && handle.length > 1) {
        found[platform] = m[0].startsWith('http') ? m[0].replace(/\/$/, '') : `https://${m[0]}`;
        break;
      }
    }
  }
  return found;
}

function extractCTAs(html) {
  const btnRe = /<(?:a|button)[^>]*>([^<]{3,60})<\/(?:a|button)>/gi;
  const ctaKeywords = /(?:get started|sign up|contact|book|schedule|request|free trial|buy now|shop now|learn more|try free|download|get quote|apply now|join|subscribe|order|enquir)/i;
  const found = new Set();
  let m;
  while ((m = btnRe.exec(html)) !== null && found.size < 6) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (ctaKeywords.test(text)) found.add(text);
  }
  return [...found];
}

function extractEmails(text) {
  const all = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(all)].filter(e =>
    !e.includes('example') && !e.includes('domain') && !e.includes('youremail')
  ).slice(0, 3);
}

function extractPhone(text) {
  const m = text.match(/\+?[\d\s\-().]{7,20}/);
  return m?.[0]?.trim() || null;
}

function detectPageTypes(html) {
  const lower = html.toLowerCase();
  return {
    has_contact: /href=["'][^"']*contact[^"']*["']/.test(html),
    has_blog: /href=["'][^"']*(?:blog|news|articles?)[^"']*["']/.test(html),
    has_shop: /href=["'][^"']*(?:shop|store|products?|cart)[^"']*["']/.test(html),
    has_pricing: /href=["'][^"']*pric[^"']*["']/.test(html) || lower.includes('pricing'),
    has_about: /href=["'][^"']*about[^"']*["']/.test(html),
    has_services: /href=["'][^"']*service[^"']*["']/.test(html),
    has_portfolio: /href=["'][^"']*(?:portfolio|work|projects?)[^"']*["']/.test(html),
  };
}

function normalisedUrl(raw) {
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return u.href;
  } catch {
    return null;
  }
}

export async function crawlWebsite(rawUrl) {
  const url = normalisedUrl(rawUrl);
  const result = {
    url: url || rawUrl,
    accessible: false,
    final_url: null,
    title: null,
    description: null,
    og_title: null,
    og_description: null,
    og_image: null,
    headings: [],
    body_text: '',
    social_links: {},
    ctas: [],
    emails: [],
    phone: null,
    page_types: {},
    raw_html_length: 0,
    error: null,
  };

  if (!url) {
    result.error = 'Invalid URL';
    return result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; myPilotPostBot/1.0; +https://mypilotpost.com)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    result.final_url = response.url;
    result.accessible = response.ok;

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      return result;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('html')) {
      result.error = `Unexpected content type: ${contentType}`;
      return result;
    }

    const html = await response.text();
    result.raw_html_length = html.length;

    result.title = extractTitle(html);
    result.description = extractMeta(html, 'description');
    result.og_title = extractMeta(html, 'og:title');
    result.og_description = extractMeta(html, 'og:description');
    result.og_image = extractMeta(html, 'og:image');
    result.headings = extractHeadings(html);
    result.social_links = extractSocialLinks(html);
    result.ctas = extractCTAs(html);
    result.page_types = detectPageTypes(html);

    const bodyText = stripHtml(html);
    result.body_text = bodyText.slice(0, 4000);
    result.emails = extractEmails(bodyText);
    result.phone = extractPhone(bodyText);

  } catch (err) {
    result.error = err.name === 'AbortError' ? 'Timeout (12s)' : err.message;
  }

  return result;
}
