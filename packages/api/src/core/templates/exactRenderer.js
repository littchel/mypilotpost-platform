import { existsSync } from 'fs';

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

const TEMPLATE_MAP = {
  // Custom user mapped keys
  'editorial_dual_font_cover': hero_headline_feed,
  'minimal_quote_card_feed': quote_card_feed,
  'split_layout_50_50_image_only': split_layout_feed,
  'product_showcase_template_4': product_showcase_feed,
  'minimal_text_template_5': minimal_text_feed,
  'the_list_carousel_template_6': carousel_list_005,
  'story_carousel_1x1_template_7': carousel_story_006,
  'comparison_carousel_template_8_v2': carousel_comparison_004,
  'faq_carousel_template_9_v3': carousel_faq_005,
  'TEMPLATE_10': carousel_data_008,
  'TEMPLATE_11': story_fullscreen,
  'TEMPLATE_12': story_split,
  'TEMPLATE_13-A': story_poll_A,
  'TEMPLATE_13-B': story_poll_B,
  'TEMPLATE_13-C': story_poll_C,
  'TEMPLATE_14': reel_hook,
  'TEMPLATE_15': reel_loop,

  // Standard template IDs
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

function findChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const macPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];
  for (const p of macPaths) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function renderTemplateExact(templateId, data) {
  const template = TEMPLATE_MAP[templateId];
  if (!template) throw new Error(`Template ${templateId} not found`);

  // Generate HTML that reproduces the template EXACTLY
  const html = generateExactHTML(template, data);

  // Launch headless browser
  let puppeteer;
  let executablePath;
  try {
    const p = await import('puppeteer-core');
    puppeteer = p.default || p;
    executablePath = findChromePath();
  } catch (e) {
    const p = await import('puppeteer');
    puppeteer = p.default || p;
    executablePath = p.executablePath();
  }

  if (!executablePath) {
    throw new Error("[EXACT RENDERER] No Chrome or Chromium executable found.");
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: template.dimensions?.width || 1080,
    height: template.dimensions?.height || 1080
  });

  await page.setContent(html);
  await page.waitForSelector('.template-container', { timeout: 5000 });

  // Take screenshot
  const screenshot = await page.screenshot({
    type: 'webp',
    quality: 92,
    fullPage: true
  });

  await browser.close();
  return screenshot;
}

function resolveSlotValue(slot, data) {
  if (slot.slot_id === 'brand_logo' || slot.slot_id.includes('logo')) {
    return data.logo_url || data.brand_logo || slot.url || '';
  }

  if (slot.type === 'image') {
    return data.image_url || data.hero_image_url || data[slot.slot_id] || slot.url || '';
  }

  if (slot.type === 'text') {
    if (data[slot.slot_id]) {
      return data[slot.slot_id];
    }

    const lowerId = slot.slot_id.toLowerCase();
    
    if (lowerId.includes('title') || lowerId.includes('headline') || lowerId.includes('hook') || lowerId.includes('quote') || lowerId.includes('main')) {
      if (lowerId.includes('pre_headline') || lowerId.includes('preheadline')) {
        return slot.text || 'TIPS';
      }
      return data.headline || slot.text || '';
    }

    if (lowerId.includes('body') || lowerId.includes('desc') || lowerId.includes('copy') || lowerId.includes('text') || lowerId.includes('content') || lowerId.includes('para')) {
      return data.body || slot.text || '';
    }

    if (lowerId.includes('cta') || lowerId.includes('button') || lowerId.includes('action') || lowerId.includes('link')) {
      return data.cta || slot.text || 'Learn More';
    }

    if (lowerId.includes('handle') || lowerId.includes('footer') || lowerId.includes('username') || lowerId.includes('site')) {
      return data.handle || slot.text || '@mypilotpost';
    }

    return slot.text || '';
  }

  return '';
}

function generateExactHTML(template, data) {
  const slots = template.slots || [];
  const dimensions = template.dimensions || { width: 1080, height: 1080 };
  
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=${dimensions.width}, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        background: ${data.background_color || '#000000'};
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${dimensions.width}px;
        height: ${dimensions.height}px;
        overflow: hidden;
        font-family: 'Inter', sans-serif;
      }
      .template-container {
        position: relative;
        width: ${dimensions.width}px;
        height: ${dimensions.height}px;
        overflow: hidden;
        background: ${data.primary_color || '#000000'};
      }
  `;
  
  slots.forEach(slot => {
    if (slot.type === 'text') {
      html += `
        .slot-${slot.slot_id} {
          position: absolute;
          left: ${slot.x};
          top: ${slot.y};
          width: ${slot.width};
          height: ${slot.height};
          font-family: '${slot.font || data.font_headline || 'Inter'}', sans-serif;
          font-size: ${slot.size}px;
          font-weight: ${slot.weight || 400};
          color: ${slot.color || '#FFFFFF'};
          text-align: ${slot.align || 'left'};
          ${(slot.style === 'italic' || slot.italic) ? 'font-style: italic;' : ''}
          ${slot.line_height ? `line-height: ${slot.line_height};` : ''}
          ${slot.text_transform ? `text-transform: ${slot.text_transform};` : ''}
          ${slot.letter_spacing ? `letter-spacing: ${slot.letter_spacing}px;` : ''}
          ${slot.border ? `border: ${slot.border.width || '1px'} solid ${slot.border.color || '#FFFFFF'}; border-radius: ${typeof slot.border.radius === 'number' ? slot.border.radius + 'px' : slot.border.radius || '0px'};` : ''}
          ${slot.background_color ? `background: ${slot.background_color};` : ''}
          ${slot.opacity ? `opacity: ${slot.opacity};` : ''}
          ${slot.padding ? `padding: ${slot.padding};` : ''}
          display: flex;
          align-items: center;
          justify-content: ${slot.align === 'center' ? 'center' : slot.align === 'right' ? 'flex-end' : 'flex-start'};
          ${slot.text_shadow ? `text-shadow: ${slot.text_shadow};` : ''}
          overflow: hidden;
          z-index: ${slot.z_index || 1};
        }
      `;
    }
    if (slot.type === 'image') {
      html += `
        .slot-${slot.slot_id} {
          position: absolute;
          left: ${slot.x};
          top: ${slot.y};
          width: ${slot.width};
          height: ${slot.height};
          overflow: hidden;
          z-index: ${slot.z_index || 0};
          ${slot.border_radius ? `border-radius: ${slot.border_radius};` : ''}
          ${slot.filter ? `filter: ${slot.filter};` : ''}
        }
        .slot-${slot.slot_id} img {
          width: 100%;
          height: 100%;
          object-fit: ${slot.object_fit || 'cover'};
        }
      `;
    }
    if (slot.type === 'container') {
      html += `
        .slot-${slot.slot_id} {
          position: absolute;
          left: ${slot.x};
          top: ${slot.y};
          width: ${slot.width};
          height: ${slot.height};
          background: ${slot.background_color || 'transparent'};
          ${slot.gradient ? `background: ${slot.gradient};` : ''}
          ${slot.border_radius ? `border-radius: ${slot.border_radius};` : ''}
          ${slot.overflow ? `overflow: ${slot.overflow};` : ''}
          z-index: ${slot.z_index || 0};
        }
      `;
    }
  });
  
  html += `
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;600;700;800&family=Oswald:wght@400;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div class="template-container">
  `;
  
  slots.forEach(slot => {
    if (slot.type === 'text') {
      const textValue = resolveSlotValue(slot, data);
      html += `<div class="slot-${slot.slot_id}">${textValue}</div>`;
    }
    if (slot.type === 'image') {
      const imageUrl = resolveSlotValue(slot, data);
      html += `
        <div class="slot-${slot.slot_id}">
          <img src="${imageUrl}" alt="${slot.alt || ''}" onerror="this.style.display='none'" />
        </div>
      `;
    }
    if (slot.type === 'container') {
      html += `<div class="slot-${slot.slot_id}"></div>`;
    }
  });
  
  html += `
    </div>
  </body>
  </html>
  `;
  
  return html;
}
