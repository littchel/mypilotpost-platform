import { validateTemplate } from "./schema.js";

import hero_headline_feed from './definitions/hero_headline_feed.json' assert { type: 'json' };
import hero_headline_feed_A from './definitions/hero_headline_feed-A.json' assert { type: 'json' };
import hero_headline_feed_B from './definitions/hero_headline_feed-B.json' assert { type: 'json' };
import hero_headline_feed_C from './definitions/hero_headline_feed-C.json' assert { type: 'json' };

import quote_card_feed from './definitions/quote_card_feed.json' assert { type: 'json' };
import quote_card_feed_A from './definitions/quote_card_feed-A.json' assert { type: 'json' };
import quote_card_feed_B from './definitions/quote_card_feed-B.json' assert { type: 'json' };

import split_layout_feed from './definitions/split_layout_feed.json' assert { type: 'json' };
import split_layout_feed_A from './definitions/split_layout_feed-A.json' assert { type: 'json' };

import product_showcase_feed from './definitions/product_showcase_feed.json' assert { type: 'json' };
import product_showcase_feed_A from './definitions/product_showcase_feed-A.json' assert { type: 'json' };

import minimal_text_feed from './definitions/minimal_text_feed.json' assert { type: 'json' };
import minimal_text_feed_A from './definitions/minimal_text_feed-A.json' assert { type: 'json' };
import minimal_text_feed_B from './definitions/minimal_text_feed-B.json' assert { type: 'json' };

import carousel_list_005 from './definitions/carousel_list_005.json' assert { type: 'json' };
import carousel_story_006 from './definitions/carousel_story_006.json' assert { type: 'json' };
import carousel_story_006_A from './definitions/carousel_story_006-A.json' assert { type: 'json' };
import carousel_comparison_004 from './definitions/carousel_comparison_004.json' assert { type: 'json' };
import carousel_faq_005 from './definitions/carousel_faq_005.json' assert { type: 'json' };
import carousel_data_008 from './definitions/carousel_data_008.json' assert { type: 'json' };

import story_fullscreen from './definitions/story_fullscreen.json' assert { type: 'json' };
import story_fullscreen_A from './definitions/story_fullscreen-A.json' assert { type: 'json' };
import story_split from './definitions/story_split.json' assert { type: 'json' };
import story_poll from './definitions/story_poll.json' assert { type: 'json' };
import story_poll_A from './definitions/story_poll-A.json' assert { type: 'json' };
import story_poll_B from './definitions/story_poll-B.json' assert { type: 'json' };
import story_poll_C from './definitions/story_poll-C.json' assert { type: 'json' };

import reel_hook from './definitions/reel_hook.json' assert { type: 'json' };
import reel_loop from './definitions/reel_loop.json' assert { type: 'json' };

const STATIC_REGISTRY = {
  'hero_headline_feed': hero_headline_feed,
  'hero_headline_feed-A': hero_headline_feed_A,
  'hero_headline_feed-B': hero_headline_feed_B,
  'hero_headline_feed-C': hero_headline_feed_C,
  'quote_card_feed': quote_card_feed,
  'quote_card_feed-A': quote_card_feed_A,
  'quote_card_feed-B': quote_card_feed_B,
  'split_layout_feed': split_layout_feed,
  'split_layout_feed-A': split_layout_feed_A,
  'product_showcase_feed': product_showcase_feed,
  'product_showcase_feed-A': product_showcase_feed_A,
  'minimal_text_feed': minimal_text_feed,
  'minimal_text_feed-A': minimal_text_feed_A,
  'minimal_text_feed-B': minimal_text_feed_B,
  'carousel_list_005': carousel_list_005,
  'carousel_story_006': carousel_story_006,
  'carousel_story_006-A': carousel_story_006_A,
  'carousel_comparison_004': carousel_comparison_004,
  'carousel_faq_005': carousel_faq_005,
  'carousel_data_008': carousel_data_008,
  'story_fullscreen': story_fullscreen,
  'story_fullscreen-A': story_fullscreen_A,
  'story_split': story_split,
  'story_poll': story_poll,
  'story_poll-A': story_poll_A,
  'story_poll-B': story_poll_B,
  'story_poll-C': story_poll_C,
  'reel_hook': reel_hook,
  'reel_loop': reel_loop
};

export function getTemplate(templateId, variantOrEnv = null) {
  let key = templateId;
  if (typeof variantOrEnv === "string") {
    key = `${templateId}-${variantOrEnv}`;
  }
  const raw = STATIC_REGISTRY[key] || null;
  if (!raw) return null;

  // Run normalization/validation to convert raw "slots" to "slides" format for fabric rendering
  const validated = validateTemplate(raw);
  return validated.success ? validated.data : raw;
}

export function listTemplates() {
  return Object.keys(STATIC_REGISTRY).map(id => getTemplate(id));
}

export function getTemplateForContent(contentBrief) {
  // Simple mapping logic - returns first matching template by format
  const formatMap = {
    'feed_post': ['hero_headline_feed', 'quote_card_feed', 'split_layout_feed', 'product_showcase_feed', 'minimal_text_feed'],
    'carousel': ['carousel_list_005', 'carousel_story_006', 'carousel_comparison_004', 'carousel_faq_005', 'carousel_data_008'],
    'story': ['story_fullscreen', 'story_split', 'story_poll'],
    'reel': ['reel_hook', 'reel_loop']
  };
  
  const format = contentBrief.format || 'feed_post';
  const templates = formatMap[format] || formatMap['feed_post'];
  const tplId = templates[0] || 'hero_headline_feed';
  return getTemplate(tplId);
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
