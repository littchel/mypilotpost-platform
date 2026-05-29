/**
 * myPilotPost — Social Profile Discovery
 * Attempts to verify and fetch public social media profiles.
 * Most platforms block bots; we rely primarily on website-extracted links
 * and supplement with profile existence checks.
 */

const PROFILE_URL_BUILDERS = {
  facebook:  (slug) => `https://www.facebook.com/${slug}`,
  instagram: (slug) => `https://www.instagram.com/${slug}/`,
  linkedin:  (slug) => `https://www.linkedin.com/company/${slug}/`,
  twitter:   (slug) => `https://twitter.com/${slug}`,
  tiktok:    (slug) => `https://www.tiktok.com/@${slug}`,
  youtube:   (slug) => `https://www.youtube.com/@${slug}`,
  pinterest: (slug) => `https://www.pinterest.com/${slug}/`,
};

// Derive candidate slugs from a domain name
function domainToSlug(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Strip TLD and ccTLD (e.g. byolife.co.zw → byolife)
    return hostname.split('.')[0];
  } catch {
    return null;
  }
}

async function tryFetchProfile(platform, url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; myPilotPostBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (resp.status === 404 || resp.status === 410) {
      return { platform, url, found: false, status: resp.status };
    }

    if (!resp.ok) {
      // 403/429 often mean "exists but blocked" for social platforms
      const likelyExists = [403, 429, 999].includes(resp.status);
      return { platform, url, found: likelyExists, status: resp.status, access: 'blocked' };
    }

    const html = await resp.text();
    const titleM = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const descM = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']{1,400})["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);

    const title = titleM?.[1]?.trim();
    const description = descM?.[1]?.trim();

    // Detect "not found" pages that return 200
    const isNotFound = /(?:page not found|profile not found|this account doesn't exist|sorry, this page)/i.test(title + ' ' + description);

    return {
      platform,
      url: resp.url || url,
      found: !isNotFound,
      status: resp.status,
      access: 'open',
      title: isNotFound ? null : title,
      description: isNotFound ? null : description,
    };
  } catch (err) {
    return { platform, url, found: false, status: null, error: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

export async function discoverSocialProfiles(websiteSocialLinks, websiteUrl) {
  const slug = domainToSlug(websiteUrl);
  const results = {};
  const checked = new Set();

  // Priority 1: Check profiles explicitly linked from the website
  const linkedChecks = Object.entries(websiteSocialLinks).map(([platform, url]) =>
    tryFetchProfile(platform, url).then(profile => {
      results[platform] = { ...profile, source: 'website_link' };
      checked.add(platform);
    })
  );
  await Promise.allSettled(linkedChecks);

  // Priority 2: Try guessing profiles for platforms not linked, using domain slug
  if (slug) {
    const missingPlatforms = Object.keys(PROFILE_URL_BUILDERS).filter(p => !checked.has(p));
    const guessChecks = missingPlatforms.map(async (platform) => {
      const builder = PROFILE_URL_BUILDERS[platform];
      const guessUrl = builder(slug);
      const profile = await tryFetchProfile(platform, guessUrl);
      results[platform] = { ...profile, source: profile.found ? 'discovered' : 'not_found' };
    });
    await Promise.allSettled(guessChecks);
  }

  return results;
}

// Summarise social presence for the Groq prompt
export function summariseSocialProfiles(profiles) {
  const lines = [];
  for (const [platform, data] of Object.entries(profiles)) {
    if (!data) continue;
    if (data.found) {
      const source = data.source === 'website_link' ? 'linked from website' : 'discovered via slug';
      const access = data.access === 'blocked' ? '(profile access blocked — exists)' : '';
      const bio = data.description ? `Bio: "${data.description.slice(0, 150)}"` : 'bio not accessible';
      lines.push(`✓ ${platform.toUpperCase()}: ${data.url} [${source}] ${access} — ${bio}`);
    } else {
      lines.push(`✗ ${platform.toUpperCase()}: not found`);
    }
  }
  return lines.join('\n') || 'No social profiles detected.';
}
