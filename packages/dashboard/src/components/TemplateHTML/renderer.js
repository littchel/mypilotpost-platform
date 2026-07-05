import heroHeadlineFeedHTML from './hero_headline_feed.html?raw';
import quoteCardFeedHTML from './quote_card_feed.html?raw';
import splitLayoutFeedHTML from './split_layout_feed.html?raw';
import productShowcaseFeedHTML from './product_showcase_feed.html?raw';
import minimalTextFeedHTML from './minimal_text_feed.html?raw';
import carouselList005HTML from './carousel_list_005.html?raw';
import storyFullscreenHTML from './story_fullscreen.html?raw';
import storySplitHTML from './story_split.html?raw';
import reelHookHTML from './reel_hook.html?raw';

export function renderHTMLTemplate(templateId, data) {
  const templateMap = {
    'hero_headline_feed': heroHeadlineFeedHTML,
    'quote_card_feed': quoteCardFeedHTML,
    'split_layout_feed': splitLayoutFeedHTML,
    'product_showcase_feed': productShowcaseFeedHTML,
    'minimal_text_feed': minimalTextFeedHTML,
    'carousel_list_005': carouselList005HTML,
    'story_fullscreen': storyFullscreenHTML,
    'story_split': storySplitHTML,
    'reel_hook': reelHookHTML
  };
  
  let html = templateMap[templateId] || templateMap['hero_headline_feed'];
  
  const replacements = {
    '{{headline}}': data.headline || '',
    '{{body}}': data.body || '',
    '{{cta}}': data.cta || '',
    '{{image_url}}': data.image_url || '',
    '{{primary_color}}': data.primary_color || '#1A73E8',
    '{{secondary_color}}': data.secondary_color || '#34A853',
    '{{logo_url}}': data.logo_url || '',
    '{{font_headline}}': data.font_headline || 'Inter',
    '{{font_body}}': data.font_body || 'Inter'
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value);
  }
  
  return html;
}
