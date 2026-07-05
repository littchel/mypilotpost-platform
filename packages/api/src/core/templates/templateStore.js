import template01A from './definitions/Template #1-A.json' with { type: 'json' };
import template01B from './definitions/Template #1-B.json' with { type: 'json' };
import template01C from './definitions/Template #1-C.json' with { type: 'json' };
import template02A from './definitions/Template #2-A.json' with { type: 'json' };
import template02B from './definitions/Template #2-B.json' with { type: 'json' };
import template03A from './definitions/Template #3-A.json' with { type: 'json' };
import template04A from './definitions/Template #4-A.json' with { type: 'json' };
import template05A from './definitions/Template #5-A.json' with { type: 'json' };
import template05B from './definitions/Template #5-B.json' with { type: 'json' };
import template07A from './definitions/Template #7-A.json' with { type: 'json' };
import template11A from './definitions/Template #11-A.json' with { type: 'json' };
import template1 from './definitions/Template #1.json' with { type: 'json' };
import template2 from './definitions/Template #2.json' with { type: 'json' };
import template3 from './definitions/Template #3.json' with { type: 'json' };
import template4 from './definitions/Template #4.json' with { type: 'json' };
import template5 from './definitions/Template #5.json' with { type: 'json' };
import template6 from './definitions/Template #6.json' with { type: 'json' };
import template7 from './definitions/Template #7.json' with { type: 'json' };
import template8 from './definitions/Template #8.json' with { type: 'json' };
import template9 from './definitions/Template #9.json' with { type: 'json' };
import template10 from './definitions/Template #10.json' with { type: 'json' };
import template11 from './definitions/Template #11.json' with { type: 'json' };
import template12 from './definitions/Template #12.json' with { type: 'json' };
import template13A from './definitions/Template #13-A.json' with { type: 'json' };
import template13B from './definitions/Template #13-B.json' with { type: 'json' };
import template13C from './definitions/Template #13-C.json' with { type: 'json' };
import template14 from './definitions/Template #14.json' with { type: 'json' };
import template15 from './definitions/Template #15.json' with { type: 'json' };

export const templateMap = {
  'TEMPLATE_01': { A: template01A, B: template01B, C: template01C },
  'TEMPLATE_02': { A: template02A, B: template02B },
  'TEMPLATE_03': { A: template03A },
  'TEMPLATE_03_VARIANT': { A: template04A },
  'TEMPLATE_04_CAROUSEL': { A: template05A },
  'TEMPLATE_05_TIMELINE': { A: template05B },
  'TEMPLATE_06_ATHLETIC': { A: template07A },
  'TEMPLATE_07_STORY_EDITORIAL': { A: template11A },
  'editorial_dual_font_cover': { A: template1 },
  'minimal_quote_card_feed': { A: template2 },
  'split_layout_50_50_image_only': { A: template3 },
  'product_showcase_template_4': { A: template4 },
  'minimal_text_template_5': { A: template5 },
  'the_list_carousel_template_6': { A: template6 },
  'story_carousel_1x1_template_7': { A: template7 },
  'comparison_carousel_template_8_v2': { A: template8 },
  'faq_carousel_template_9_v3': { A: template9 },
  'TEMPLATE_10': { A: template10 },
  'TEMPLATE_11': { A: template11 },
  'TEMPLATE_12': { A: template12 },
  'TEMPLATE_13': { A: template13A, B: template13B, C: template13C },
  'TEMPLATE_14': { A: template14 },
  'TEMPLATE_14_variant2': { A: template15 },

  // System historical keys fallbacks
  'hero_headline_feed': { A: template1 },
  'hero_headline_feed-A': { A: template01A },
  'hero_headline_feed-B': { B: template01B },
  'hero_headline_feed-C': { C: template01C },
  'quote_card_feed': { A: template2 },
  'quote_card_feed-A': { A: template02A },
  'quote_card_feed-B': { B: template02B },
  'split_layout_feed': { A: template3 },
  'split_layout_feed-A': { A: template03A },
  'product_showcase_feed': { A: template4 },
  'product_showcase_feed-A': { A: template04A },
  'minimal_text_feed': { A: template5 },
  'minimal_text_feed-A': { A: template05A },
  'minimal_text_feed-B': { B: template05B },
  'carousel_list_005': { A: template6 },
  'carousel_story_006': { A: template7 },
  'carousel_story_006-A': { A: template07A },
  'carousel_comparison_004': { A: template8 },
  'carousel_faq_005': { A: template9 },
  'carousel_data_008': { A: template10 },
  'story_fullscreen': { A: template11 },
  'story_fullscreen-A': { A: template11A },
  'story_split': { A: template12 },
  'story_poll-A': { A: template13A },
  'story_poll-B': { B: template13B },
  'story_poll-C': { C: template13C },
  'reel_hook': { A: template14 },
  'reel_loop': { A: template15 }
};

export function getTemplate(templateId, variant = 'A') {
  let actualId = templateId;
  let actualVariant = variant;
  
  if (templateId && templateId.includes('-')) {
    const parts = templateId.split('-');
    actualId = parts[0];
    actualVariant = parts[1];
  }

  let entry = templateMap[actualId];
  if (!entry) {
    entry = templateMap['editorial_dual_font_cover'];
  }
  return entry[actualVariant] || entry['A'] || null;
}

export function listTemplates() {
  return Object.keys(templateMap).map(id => getTemplate(id));
}

export function listVariants() {
  return [
    "hero_headline_feed-A", "hero_headline_feed-B", "hero_headline_feed-C",
    "quote_card_feed-A", "quote_card_feed-B",
    "split_layout_feed-A",
    "product_showcase_feed-A",
    "minimal_text_feed-A", "minimal_text_feed-B",
    "carousel_story_006-A",
    "story_fullscreen-A",
    "story_poll-A", "story_poll-B", "story_poll-C"
  ];
}

export function getTemplateForContent(contentBrief) {
  const formatMap = {
    'feed_post': ['editorial_dual_font_cover', 'minimal_quote_card_feed', 'split_layout_50_50_image_only', 'product_showcase_template_4', 'minimal_text_template_5'],
    'carousel': ['the_list_carousel_template_6', 'story_carousel_1x1_template_7', 'comparison_carousel_template_8_v2', 'faq_carousel_template_9_v3', 'TEMPLATE_10'],
    'story': ['TEMPLATE_11', 'TEMPLATE_12', 'TEMPLATE_13'],
    'reel': ['TEMPLATE_14', 'TEMPLATE_14_variant2']
  };
  
  const format = contentBrief.format || 'feed_post';
  const templates = formatMap[format] || formatMap['feed_post'];
  const tplId = templates[0] || 'editorial_dual_font_cover';
  return getTemplate(tplId);
}
