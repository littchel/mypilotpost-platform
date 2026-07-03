import { validateTemplate } from "./schema.js";
import tpl_feed_generic_default from "./definitions/tpl_feed_generic_default.js";
import tpl_carousel_premium_brand_story from "./definitions/tpl_carousel_premium_brand_story.js";

// Safe Static Default Template (Generic Feed Post)
const SAFE_DEFAULT_TEMPLATE = tpl_feed_generic_default;

// Static registry of pre-imported templates to act as reliable filesystem fallback
const STATIC_REGISTRY = {
  "tpl_feed_generic_default": tpl_feed_generic_default,
  "tpl_carousel_premium_brand_story": tpl_carousel_premium_brand_story
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
            const jsonPath = path.default.join(process.cwd(), "packages/api/src/core/templates/definitions", `${templateId}.json`);
            if (fs.default.existsSync(jsonPath)) {
              localData = JSON.parse(fs.default.readFileSync(jsonPath, "utf8"));
            } else {
              const jsPath = path.default.join(process.cwd(), "packages/api/src/core/templates/definitions", `${templateId}.js`);
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
