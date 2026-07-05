import { listVariants } from "./templateStore.js";

// Hardcoded core template IDs categorized by format
const CATEGORIES = {
  feed_post: [
    "hero_headline_feed",
    "quote_card_feed",
    "split_layout_feed",
    "product_showcase_feed",
    "minimal_text_feed"
  ],
  carousel: [
    "carousel_list_005",
    "carousel_story_006",
    "carousel_comparison_004",
    "carousel_faq_005",
    "carousel_data_008"
  ],
  story: [
    "story_fullscreen",
    "story_split",
    "story_poll"
  ],
  reel: [
    "reel_hook",
    "reel_loop"
  ]
};

// Seeded Mulberry32 pseudo-random number generator
function getSeededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return function() {
    h += 0xe120fc15;
    let z = h;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aa7b);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  };
}

// Seeded Fisher-Yates shuffle
function seededShuffle(arr, random) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Routes and assigns template layouts and variants to opportunity cards dynamically.
 * Deterministic seeded shuffle based on brandId and YYYY-MM-DD.
 */
export async function assignTemplatesToCards(cards, brandId, env, preferredTemplateId = null) {
  const today = new Date().toISOString().split('T')[0];
  const seedString = `${brandId || 'default'}-${today}`;
  const random = getSeededRandom(seedString);

  // 1. Load variant IDs from store and map them to their parent template ID
  const variantIds = await listVariants(env);
  const templateVariantsMap = {}; // parentTemplateId -> list of variant strings (e.g. "A", "B", "C")
  
  for (const vId of variantIds) {
    const lastDashIdx = vId.lastIndexOf('-');
    if (lastDashIdx === -1) continue;
    const parentId = vId.slice(0, lastDashIdx);
    const variantSuffix = vId.slice(lastDashIdx + 1);
    if (!templateVariantsMap[parentId]) {
      templateVariantsMap[parentId] = [];
    }
    templateVariantsMap[parentId].push(variantSuffix);
  }

  // 2. Deterministically shuffle template categories and variants lists
  const shuffledCategories = {};
  for (const [format, tplIds] of Object.entries(CATEGORIES)) {
    shuffledCategories[format] = seededShuffle(tplIds, random);
  }

  // Shuffle variant arrays inside the map
  const shuffledVariantsMap = {};
  for (const [tplId, variants] of Object.entries(templateVariantsMap)) {
    shuffledVariantsMap[tplId] = seededShuffle(variants, random);
  }

  // Keep track of round-robin indexes for each format category
  const categoryCounters = {
    feed_post: 0,
    carousel: 0,
    story: 0,
    reel: 0
  };

  const routedCards = [];

  for (const card of cards) {
    // If low effort and we have a preferred template from brand memory, assign it to bias the feed
    if (preferredTemplateId && card.effort === "low") {
      let format = "feed_post";
      if (preferredTemplateId.includes("carousel")) {
        format = "carousel";
      } else if (preferredTemplateId.includes("story")) {
        format = "story";
      } else if (preferredTemplateId.includes("reel")) {
        format = "reel";
      }
      
      const templateVariants = shuffledVariantsMap[preferredTemplateId] || ["A"];
      const selectedVariant = templateVariants[Math.floor(random() * templateVariants.length)] || "A";

      routedCards.push({
        ...card,
        template_id: preferredTemplateId,
        template_variant: selectedVariant,
        template_format: format
      });
      continue;
    }

    // 3. Map framework names to required template formats
    let format = "feed_post";
    const framework = (card.framework || "").toLowerCase();

    if (framework.includes("listicle") || framework.includes("myth_vs_reality") || framework.includes("comparison") || framework.includes("matrix")) {
      format = "carousel";
    } else if (framework.includes("quote") || framework.includes("opinion") || framework.includes("minimal")) {
      format = "feed_post";
    } else if (framework.includes("seasonal") || framework.includes("announcement") || framework.includes("hero")) {
      format = "feed_post";
    } else if (framework.includes("storytelling") || framework.includes("behind_the_scenes") || framework.includes("behind")) {
      format = "story";
    } else if (framework.includes("trend") || framework.includes("reel") || framework.includes("loop")) {
      format = "reel";
    } else {
      format = "feed_post";
    }

    // 4. Select template round-robin from category
    const templatesList = shuffledCategories[format];
    const index = categoryCounters[format] % templatesList.length;
    categoryCounters[format]++;
    const selectedTemplateId = templatesList[index];

    // 5. Select variant deterministically
    const templateVariants = shuffledVariantsMap[selectedTemplateId] || ["A"];
    const selectedVariant = templateVariants[Math.floor(random() * templateVariants.length)] || "A";

    routedCards.push({
      ...card,
      template_id: selectedTemplateId,
      template_variant: selectedVariant,
      template_format: format
    });
  }

  return routedCards;
}
