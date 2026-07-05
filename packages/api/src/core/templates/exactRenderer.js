import { existsSync } from 'fs';
import { getTemplate } from './templateStore.js';

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

export async function renderTemplateExact(templateId, variant, data) {
  const template = getTemplate(templateId, variant);
  if (!template) throw new Error(`Template ${templateId} variant ${variant} not found`);

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
  const width = template.dimensions?.width || 1080;
  const height = template.dimensions?.height || 1080;
  
  await page.setViewport({ width, height });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 5000 });
  await page.waitForSelector('.template-container', { timeout: 5000 });

  // Take screenshot
  const screenshot = await page.screenshot({
    type: 'png',
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
  let targetTemplate = template;
  
  // If carousel with multiple slides is detected, extract first slide for preview
  if (template.slides && Array.isArray(template.slides)) {
    const firstSlide = template.slides[0] || {};
    
    // Check if the slide uses slots or styled definition
    if (firstSlide.slots) {
      targetTemplate = {
        ...template,
        slots: firstSlide.slots,
        background_color: firstSlide.background_color || template.background_color
      };
    } else {
      const headerZone = template.global_persistent_elements?.header_zone || {};
      const footerZone = template.global_persistent_elements?.footer_zone || {};
      
      targetTemplate = {
        ...template,
        global_styles: {
          background_image_url: firstSlide.left_column?.media_url || firstSlide.media_background_url || '',
          font_family: firstSlide.styling?.headline_font || headerZone.font_family || 'Georgia, serif'
        },
        card_layer: {
          background_color: firstSlide.background_color || '#F5EFEB',
          padding: '48px 40px'
        },
        content: {
          meta_tag_text: firstSlide.content?.subtitle || footerZone.text || '',
          headline_text: firstSlide.content?.headline || firstSlide.content?.cta_title || '',
          headline_color: firstSlide.styling?.color || headerZone.color || '#000000'
        },
        footer_action: firstSlide.content?.button_text ? {
          label: firstSlide.content.button_text,
          label_color: '#000000'
        } : null
      };
    }
  }

  if (targetTemplate.slots) {
    return renderSlotsTemplate(targetTemplate, data);
  }
  return renderStyledTemplate(targetTemplate, data);
}

function renderSlotsTemplate(template, data) {
  const { width, height } = template.dimensions || { width: 1080, height: 1080 };
  const slots = template.slots || [];
  let styles = '', html = '';

  slots.forEach(slot => {
    if (slot.type === 'container') {
      styles += `
        .s-${slot.slot_id} {
          position: absolute;
          left: ${slot.x};
          top: ${slot.y};
          width: ${slot.width};
          height: ${slot.height};
          background: ${slot.background_color || 'transparent'};
          ${slot.gradient ? `background: ${slot.gradient};` : ''}
          ${slot.border_radius ? `border-radius: ${slot.border_radius};` : ''}
          z-index: ${slot.z_index || 0};
        }
      `;
      html += `<div class="s-${slot.slot_id}"></div>`;
    } else if (slot.type === 'text') {
      const text = resolveSlotValue(slot, data);
      styles += `
        .s-${slot.slot_id} {
          position: absolute;
          left: ${slot.x};
          top: ${slot.y};
          width: ${slot.width};
          height: ${slot.height};
          font-family: '${slot.font || data.font_headline || 'Inter'}', sans-serif;
          font-weight: ${slot.weight || 400};
          font-size: ${slot.size}px;
          color: ${slot.color || '#000000'};
          text-align: ${slot.align || 'left'};
          ${(slot.style === 'italic' || slot.italic) ? 'font-style: italic;' : ''}
          ${slot.line_height ? `line-height: ${slot.line_height};` : ''}
          ${slot.border ? `border: ${slot.border.width || '1px'} solid ${slot.border.color || '#FFFFFF'}; border-radius: ${slot.border.radius || '0px'};` : ''}
          ${slot.background_color ? `background: ${slot.background_color};` : ''}
          ${slot.opacity ? `opacity: ${slot.opacity};` : ''}
          ${slot.padding ? `padding: ${slot.padding};` : ''}
          display: flex;
          align-items: center;
          justify-content: ${slot.align === 'center' ? 'center' : slot.align === 'right' ? 'flex-end' : 'flex-start'};
          z-index: ${slot.z_index || 1};
        }
      `;
      html += `<div class="s-${slot.slot_id}">${text}</div>`;
    } else if (slot.type === 'image') {
      const url = resolveSlotValue(slot, data);
      styles += `
        .s-${slot.slot_id} {
          position: absolute;
          left: ${slot.x};
          top: ${slot.y};
          width: ${slot.width};
          height: ${slot.height};
          background-size: cover;
          background-position: center;
          background-image: url('${url}');
          z-index: ${slot.z_index || 0};
        }
      `;
      html += `<div class="s-${slot.slot_id}"></div>`;
    }
  });

  let bgStyle = template.background_color ? `background:${template.background_color};` : 'background:#FFFFFF;';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;600;700;800&family=Oswald:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${width}px;
          height: ${height}px;
          position: relative;
          overflow: hidden;
          ${bgStyle}
        }
        .template-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        ${styles}
      </style>
    </head>
    <body>
      <div class="template-container">
        ${html}
      </div>
    </body>
    </html>
  `;
}

function renderStyledTemplate(template, data) {
  const styles = template.global_styles || template.styles || {};
  const content = template.content || {};
  const cardLayer = template.card_layer || {};
  
  const headline = data.headline || content.headline_text || '';
  const meta = data.meta || content.meta_tag_text || '';
  const bgUrl = data.image_url || styles.background_image_url || '';
  const primaryColor = data.primary_color || styles.background_color || '#000000';
  const accentColor = data.secondary_color || '#1A73E8';

  const bgStyle = bgUrl 
    ? `background-image: url('${bgUrl}'); background-size: cover; background-position: center;` 
    : `background-color: ${primaryColor};`;

  const layerBg = cardLayer.background_color || 'transparent';
  const layerBlur = cardLayer.backdrop_filter || 'none';
  const layerRadius = cardLayer.border_radius || '0px';
  const layerPadding = cardLayer.padding || '0px';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;600;700;800&family=Oswald:wght@400;600;700&family=Antonio:wght@400;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 1080px;
          height: 1080px;
          overflow: hidden;
          ${bgStyle}
          font-family: '${styles.font_family || data.font_headline || 'Inter'}', sans-serif;
          position: relative;
        }
        .template-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: ${layerPadding};
          background: ${layerBg};
          backdrop-filter: ${layerBlur};
          border-radius: ${layerRadius};
        }
        .headline {
          font-size: 48px;
          font-weight: 700;
          color: ${content.headline_color || '#FFFFFF'};
          text-align: center;
          white-space: pre-line;
          line-height: 1.3;
        }
        .meta {
          font-size: 18px;
          color: ${content.meta_tag_color || '#888888'};
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer {
          font-size: 16px;
          color: ${template.footer_action?.label_color || '#888888'};
          margin-top: 30px;
          padding: 8px 24px;
          border: 1px solid ${template.footer_action?.label_color || '#888888'};
          border-radius: 20px;
        }
      </style>
    </head>
    <body>
      <div class="template-container">
        ${meta ? `<div class="meta">${meta}</div>` : ''}
        <div class="headline">${headline}</div>
        ${template.footer_action ? `<div class="footer">${template.footer_action.label}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}

export function renderTemplate(templateId, variant, data) {
  const template = getTemplate(templateId, variant);
  if (!template) throw new Error(`Template ${templateId} variant ${variant} not found`);
  return generateExactHTML(template, data);
}
