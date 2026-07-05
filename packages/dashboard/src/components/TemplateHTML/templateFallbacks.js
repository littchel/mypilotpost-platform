export function renderTemplateToHTML(templateSchema, data) {
  if (!templateSchema) return '';
  const slots = templateSchema.slots || [];
  const dimensions = templateSchema.dimensions || { width: 1080, height: 1080 };

  const primary_color = data.primary_color || '#1A73E8';
  const secondary_color = data.secondary_color || '#34A853';
  const font_headline = data.font_headline || 'Inter';
  const font_body = data.font_body || 'Inter';
  const logo_url = data.logo_url || '';

  let html = `
    <div class="template-container" style="
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${primary_color};
      font-family: '${font_headline}', sans-serif;
      aspect-ratio: ${dimensions.width} / ${dimensions.height};
      border-radius: 12px;
    ">
  `;

  function resolveSlotValue(slot, data) {
    if (slot.slot_id === 'brand_logo' || slot.slot_id.includes('logo')) {
      return logo_url || slot.url || '';
    }

    if (slot.type === 'image') {
      return data.image_url || data.hero_image_url || data[slot.slot_id] || slot.url || '';
    }

    if (slot.type === 'text') {
      if (data[slot.slot_id]) return data[slot.slot_id];

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

  slots.forEach(slot => {
    const isText = slot.type === 'text';
    const isImage = slot.type === 'image';
    const isContainer = slot.type === 'container';

    // Style generation
    let styles = `
      position: absolute;
      left: ${slot.x};
      top: ${slot.y};
      width: ${slot.width};
      height: ${slot.height};
      z-index: ${slot.z_index || 0};
    `;

    if (isText) {
      const textVal = resolveSlotValue(slot, data);
      
      // Calculate responsive font size mapping
      const baseFontSize = slot.size || 24;
      const pctFontSize = (baseFontSize / dimensions.height) * 100;
      
      styles += `
        font-family: '${slot.font || font_headline}', sans-serif;
        font-size: ${pctFontSize}cqh;
        font-weight: ${slot.weight || 400};
        color: ${slot.color || '#FFFFFF'};
        text-align: ${slot.align || 'left'};
        ${(slot.style === 'italic' || slot.italic) ? 'font-style: italic;' : ''}
        ${slot.line_height ? `line-height: ${slot.line_height};` : ''}
        ${slot.text_transform ? `text-transform: ${slot.text_transform};` : ''}
        ${slot.letter_spacing ? `letter-spacing: ${slot.letter_spacing}px;` : ''}
        ${slot.border ? `border: ${slot.border.width || '1px'} solid ${slot.border.color || '#FFFFFF'}; border-radius: ${slot.border.radius || '0px'};` : ''}
        ${slot.background_color ? `background: ${slot.background_color};` : ''}
        ${slot.opacity ? `opacity: ${slot.opacity};` : ''}
        ${slot.padding ? `padding: ${slot.padding};` : ''}
        display: flex;
        align-items: center;
        justify-content: ${slot.align === 'center' ? 'center' : slot.align === 'right' ? 'flex-end' : 'flex-start'};
        ${slot.text_shadow ? `text-shadow: ${slot.text_shadow};` : ''}
        overflow: hidden;
      `;
      html += `<div style="${styles.replace(/\s+/g, ' ').trim()}">${textVal}</div>`;
    }

    if (isImage) {
      const imageUrl = resolveSlotValue(slot, data);
      styles += `
        overflow: hidden;
        ${slot.border_radius ? `border-radius: ${slot.border_radius};` : ''}
        ${slot.filter ? `filter: ${slot.filter};` : ''}
      `;
      html += `
        <div style="${styles.replace(/\s+/g, ' ').trim()}">
          <img src="${imageUrl}" alt="" style="width: 100%; height: 100%; object-fit: ${slot.object_fit || 'cover'};" onerror="this.style.display='none'" />
        </div>
      `;
    }

    if (isContainer) {
      styles += `
        background: ${slot.background_color || 'transparent'};
        ${slot.gradient ? `background: ${slot.gradient};` : ''}
        ${slot.border_radius ? `border-radius: ${slot.border_radius};` : ''}
        ${slot.overflow ? `overflow: ${slot.overflow};` : ''}
      `;
      html += `<div style="${styles.replace(/\s+/g, ' ').trim()}"></div>`;
    }
  });

  html += `</div>`;
  return html;
}
