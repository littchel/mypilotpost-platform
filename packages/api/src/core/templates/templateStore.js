import { validateTemplate } from "./schema.js";
import tpl_feed_generic_default from "./definitions/tpl_feed_generic_default.js";
import tpl_carousel_premium_brand_story from "./definitions/tpl_carousel_premium_brand_story.js";

import carousel_comparison_004 from "./definitions/carousel_comparison_004.json";
import carousel_data_008 from "./definitions/carousel_data_008.json";
import carousel_faq_005 from "./definitions/carousel_faq_005.json";
import carousel_list_005 from "./definitions/carousel_list_005.json";
import carousel_story_006_A from "./definitions/carousel_story_006-A.json";
import carousel_story_006 from "./definitions/carousel_story_006.json";
import hero_headline_feed_A from "./definitions/hero_headline_feed-A.json";
import hero_headline_feed_B from "./definitions/hero_headline_feed-B.json";
import hero_headline_feed_C from "./definitions/hero_headline_feed-C.json";
import hero_headline_feed from "./definitions/hero_headline_feed.json";
import minimal_text_feed_A from "./definitions/minimal_text_feed-A.json";
import minimal_text_feed_B from "./definitions/minimal_text_feed-B.json";
import minimal_text_feed from "./definitions/minimal_text_feed.json";
import product_showcase_feed_A from "./definitions/product_showcase_feed-A.json";
import product_showcase_feed from "./definitions/product_showcase_feed.json";
import quote_card_feed_A from "./definitions/quote_card_feed-A.json";
import quote_card_feed_B from "./definitions/quote_card_feed-B.json";
import quote_card_feed from "./definitions/quote_card_feed.json";
import reel_hook from "./definitions/reel_hook.json";
import reel_loop from "./definitions/reel_loop.json";
import split_layout_feed_A from "./definitions/split_layout_feed-A.json";
import split_layout_feed from "./definitions/split_layout_feed.json";
import story_fullscreen_A from "./definitions/story_fullscreen-A.json";
import story_fullscreen from "./definitions/story_fullscreen.json";
import story_poll_A from "./definitions/story_poll-A.json";
import story_poll_B from "./definitions/story_poll-B.json";
import story_poll_C from "./definitions/story_poll-C.json";
import story_poll from "./definitions/story_poll.json";
import story_split from "./definitions/story_split.json";

// Safe Static Default Template (Generic Feed Post)
const SAFE_DEFAULT_TEMPLATE = tpl_feed_generic_default;

// Static registry of pre-imported templates to act as reliable filesystem fallback
const STATIC_REGISTRY = {
  "tpl_feed_generic_default": tpl_feed_generic_default,
  "tpl_carousel_premium_brand_story": tpl_carousel_premium_brand_story,
  "carousel_comparison_004": carousel_comparison_004,
  "carousel_data_008": carousel_data_008,
  "carousel_faq_005": carousel_faq_005,
  "carousel_list_005": carousel_list_005,
  "carousel_story_006-A": carousel_story_006_A,
  "carousel_story_006": carousel_story_006,
  "hero_headline_feed-A": hero_headline_feed_A,
  "hero_headline_feed-B": hero_headline_feed_B,
  "hero_headline_feed-C": hero_headline_feed_C,
  "hero_headline_feed": hero_headline_feed,
  "minimal_text_feed-A": minimal_text_feed_A,
  "minimal_text_feed-B": minimal_text_feed_B,
  "minimal_text_feed": minimal_text_feed,
  "product_showcase_feed-A": product_showcase_feed_A,
  "product_showcase_feed": product_showcase_feed,
  "quote_card_feed-A": quote_card_feed_A,
  "quote_card_feed-B": quote_card_feed_B,
  "quote_card_feed": quote_card_feed,
  "reel_hook": reel_hook,
  "reel_loop": reel_loop,
  "split_layout_feed-A": split_layout_feed_A,
  "split_layout_feed": split_layout_feed,
  "story_fullscreen-A": story_fullscreen_A,
  "story_fullscreen": story_fullscreen,
  "story_poll-A": story_poll_A,
  "story_poll-B": story_poll_B,
  "story_poll-C": story_poll_C,
  "story_poll": story_poll,
  "story_split": story_split
};

// Simple In-Memory Cache
const inMemoryCache = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Helper to get current cache state (memory or Redis)
 */
async function getCachedTemplate(templateId, env) {
  // 1. Try In-Memory Cache first
  const memEntry = inMemoryCache.get(templateId);
  if (memEntry && (Date.now() - memEntry.timestamp < TTL_MS)) {
    return memEntry.data;
  }

  // 2. Try Redis Cache if available in env
  if (env?.REDIS_CLIENT) {
    try {
      const cached = await env.REDIS_CLIENT.get(`template:${templateId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Sync to memory
        inMemoryCache.set(templateId, { data: parsed, timestamp: Date.now() });
        return parsed;
      }
    } catch (e) {
      console.warn("[TEMPLATE STORE] Redis get failed, falling back", e);
    }
  }

  return null;
}

/**
 * Helper to save cache state (memory and Redis)
 */
async function setCachedTemplate(templateId, data, env) {
  // Save to In-Memory Cache
  inMemoryCache.set(templateId, { data, timestamp: Date.now() });

  // Save to Redis if available
  if (env?.REDIS_CLIENT) {
    try {
      await env.REDIS_CLIENT.setEx(
        `template:${templateId}`,
        3600, // 1 hour TTL in seconds
        JSON.stringify(data)
      );
    } catch (e) {
      console.warn("[TEMPLATE STORE] Redis set failed", e);
    }
  }
}

/**
 * Retrieve a specific template by ID
 * Flow: Redis Cache/In-memory → Cloudflare R2 (CDN) → Local Definitions → Safe Default
 */
export async function getTemplate(templateId, env) {
  if (!templateId) return SAFE_DEFAULT_TEMPLATE;

  try {
    // 1. Check Cache
    const cached = await getCachedTemplate(templateId, env);
    if (cached) return cached;

    // 2. Fallback: Cloudflare R2 Bucket (CDN)
    const bucket = env?.MEDIA_BUCKET || env?.TEMPLATES_BUCKET;
    if (bucket) {
      try {
        const r2Object = await bucket.get(`templates/${templateId}.json`);
        if (r2Object) {
          const text = await r2Object.text();
          const parsed = JSON.parse(text);
          const validated = validateTemplate(parsed);
          if (validated.success) {
            await setCachedTemplate(templateId, validated.data, env);
            return validated.data;
          }
        }
      } catch (e) {
        console.warn(`[TEMPLATE STORE] R2 read failed for ${templateId}`, e);
      }
    }

    // 3. Fallback: Local JS or JSON Definitions
    try {
      let localData = STATIC_REGISTRY[templateId];

      if (!localData) {
        // Try dynamic filesystem read in Node environments
        try {
          const fs = await import("node:fs").catch(() => null);
          const path = await import("node:path").catch(() => null);
          if (fs?.default && path?.default) {
            // Check both .json and .js on disk
            const cwd = process.cwd();
            const basePath = cwd.endsWith("packages/api")
              ? path.default.join(cwd, "src/core/templates/definitions")
              : path.default.join(cwd, "packages/api/src/core/templates/definitions");
            const jsonPath = path.default.join(basePath, `${templateId}.json`);
            if (fs.default.existsSync(jsonPath)) {
              localData = JSON.parse(fs.default.readFileSync(jsonPath, "utf8"));
            } else {
              const jsPath = path.default.join(basePath, `${templateId}.js`);
              if (fs.default.existsSync(jsPath)) {
                const module = await import(jsPath);
                localData = module.default;
              }
            }
          }
        } catch {}
      }

      // Try dynamic module imports if fs check was skipped/failed
      if (!localData) {
        const localModuleJs = await import(`./definitions/${templateId}.js`).catch(() => null);
        localData = localModuleJs?.default;
      }
      if (!localData) {
        const localModuleJson = await import(`./definitions/${templateId}.json`, {
          with: { type: "json" }
        }).catch(() => import(`./definitions/${templateId}.json`, {
          assert: { type: "json" }
        })).catch(() => null);
        localData = localModuleJson?.default;
      }

      if (localData) {
        const validated = validateTemplate(localData);
        if (validated.success) {
          await setCachedTemplate(templateId, validated.data, env);
          return validated.data;
        }
      }
    } catch (e) {
      console.warn(`[TEMPLATE STORE] Local definition import failed for ${templateId}`, e);
    }

    // 4. Ultimate Fallback: Safe Default
    return SAFE_DEFAULT_TEMPLATE;
  } catch (err) {
    console.error(`[TEMPLATE STORE ERROR] getTemplate failed for ${templateId}`, err);
    return SAFE_DEFAULT_TEMPLATE;
  }
}

/**
 * Returns a list of templates filtered by format, intent, pillars, and platforms.
 */
export async function listTemplates(filters = {}, env) {
  const { format, intent, pillars, platforms } = filters;

  // Gather templates from local registry and memory cache keys
  const allTemplatesMap = new Map();

  // Add static local ones
  Object.values(STATIC_REGISTRY).forEach(t => allTemplatesMap.set(t.template_id, t));

  // Add cached templates
  for (const [id, entry] of inMemoryCache.entries()) {
    if (Date.now() - entry.timestamp < TTL_MS) {
      allTemplatesMap.set(id, entry.data);
    }
  }

  // Include example brand story carousel if not present
  try {
    const exampleMod = await import("./schema.js");
    if (exampleMod?.exampleCarouselTemplate) {
      allTemplatesMap.set(exampleMod.exampleCarouselTemplate.template_id, exampleMod.exampleCarouselTemplate);
    }
  } catch {}

  const templatesList = Array.from(allTemplatesMap.values());

  // Apply filters
  return templatesList.filter(tpl => {
    if (format && tpl.format !== format) return false;
    
    if (intent) {
      const intents = Array.isArray(intent) ? intent : [intent];
      const hasIntent = intents.some(i => tpl.intent.includes(i));
      if (!hasIntent) return false;
    }

    if (pillars) {
      const pillarList = Array.isArray(pillars) ? pillars : [pillars];
      const hasPillar = pillarList.some(p => tpl.pillars.includes(p));
      if (!hasPillar) return false;
    }

    if (platforms) {
      const platformList = Array.isArray(platforms) ? platforms : [platforms];
      const hasPlatform = platformList.some(p => tpl.platforms.includes(p));
      if (!hasPlatform) return false;
    }

    return true;
  });
}

/**
 * Recommend best template based on content brief parameters (intent, pillar, platform, format).
 * Calculates a match score and returns the highest scoring template.
 */
export async function getTemplateForContent(contentBrief = {}, env) {
  const { intent = [], pillars = [], platform, format } = contentBrief;

  const templates = await listTemplates({}, env);
  if (!templates.length) return SAFE_DEFAULT_TEMPLATE;

  let bestTemplate = SAFE_DEFAULT_TEMPLATE;
  let highestScore = -1;

  for (const tpl of templates) {
    let score = 0;

    // 1. Format match (critical weight)
    if (format && tpl.format === format) {
      score += 50;
    }

    // 2. Platform match (high weight)
    if (platform) {
      const platformsList = Array.isArray(tpl.platforms) ? tpl.platforms : [];
      if (platformsList.includes(platform)) {
        score += 20;
      }
    }

    // 3. Intent match (medium weight)
    if (intent && intent.length > 0) {
      const intents = Array.isArray(intent) ? intent : [intent];
      const matches = intents.filter(i => tpl.intent.includes(i)).length;
      score += matches * 15;
    }

    // 4. Pillar match (medium weight)
    if (pillars && pillars.length > 0) {
      const pillarList = Array.isArray(pillars) ? pillars : [pillars];
      const matches = pillarList.filter(p => tpl.pillars.includes(p)).length;
      score += matches * 15;
    }

    if (contentBrief.preferredTemplateId && tpl.template_id === contentBrief.preferredTemplateId) {
      score += 100;
    }

    if (score > highestScore) {
      highestScore = score;
      bestTemplate = tpl;
    }
  }

  // Return best match if it has positive alignment, else safe default
  return highestScore >= 0 ? bestTemplate : SAFE_DEFAULT_TEMPLATE;
}

const STATIC_VARIANTS = [
  "hero_headline_feed-A", "hero_headline_feed-B", "hero_headline_feed-C",
  "quote_card_feed-A", "quote_card_feed-B",
  "split_layout_feed-A",
  "product_showcase_feed-A",
  "minimal_text_feed-A", "minimal_text_feed-B",
  "carousel_story_006-A",
  "story_fullscreen-A",
  "story_poll-A", "story_poll-B", "story_poll-C"
];

/**
 * Returns a list of available variant template IDs.
 * Scans filesystem in Node or returns STATIC_VARIANTS as fallback.
 */
export async function listVariants(env) {
  try {
    const fs = await import("node:fs").catch(() => null);
    const path = await import("node:path").catch(() => null);
    if (fs?.default && path?.default) {
      const defsDir = path.default.join(process.cwd(), "packages/api/src/core/templates/definitions");
      if (fs.default.existsSync(defsDir)) {
        const files = fs.default.readdirSync(defsDir);
        const variants = files
          .filter(f => f.match(/^[a-z0-9_]+-[A-Z]\.json$/))
          .map(f => f.replace(/\.json$/, ''));
        if (variants.length > 0) return variants;
      }
    }
  } catch {}
  return STATIC_VARIANTS;
}
