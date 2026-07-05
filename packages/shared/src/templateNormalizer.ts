function normalizeTemplate3(template: any) {
  const slots: any[] = [];
  const styles = template.global_overlay_styling || {};
  const font = styles.font_family || 'Inter';

  slots.push({
    slot_id: "left_pane_image",
    type: "image",
    content_key: "image_url",
    x: "0%", y: "0%", width: "50%", height: "100%",
    z_index: 1
  });

  slots.push({
    slot_id: "left_pane_text",
    type: "text",
    text: template.layout_structure?.left_pane?.overlay?.text || 'BEFORE',
    font: font,
    color: styles.color || '#FFFFFF',
    size: parseInt(styles.font_size) || 48,
    weight: styles.font_weight || '700',
    align: "center",
    x: "10%", y: "15%", width: "30%", height: "10%",
    z_index: 2
  });

  slots.push({
    slot_id: "right_pane_image",
    type: "image",
    content_key: "image_url_2",
    x: "50%", y: "0%", width: "50%", height: "100%",
    z_index: 1
  });

  slots.push({
    slot_id: "right_pane_text",
    type: "text",
    text: template.layout_structure?.right_pane?.overlay?.text || 'AFTER',
    font: font,
    color: styles.color || '#FFFFFF',
    size: parseInt(styles.font_size) || 48,
    weight: styles.font_weight || '700',
    align: "center",
    x: "60%", y: "75%", width: "30%", height: "10%",
    z_index: 2
  });

  return slots;
}

function normalizeTemplate4(template: any) {
  const slots: any[] = [];
  const topZone = template.layout_structure?.top_zone || {};
  const bottomZone = template.layout_structure?.bottom_zone || {};

  slots.push({
    slot_id: "top_bg",
    type: "shape",
    fill: topZone.background || '#FFFFFF',
    x: "0%", y: "0%", width: "100%", height: "55%",
    z_index: 0
  });

  slots.push({
    slot_id: "image_frame",
    type: "image",
    content_key: "image_url",
    x: "20%", y: "8%", width: "60%", height: "40%",
    z_index: 1
  });

  const badge = topZone.components?.badge_header || {};
  if (badge.text) {
    slots.push({
      slot_id: "badge_header",
      type: "text",
      text: badge.text,
      font: badge.font_family || 'Inter',
      color: "brand.primary_color",
      size: parseInt(badge.font_size) || 24,
      align: "center",
      x: "10%", y: "3%", width: "80%", height: "5%",
      z_index: 2
    });
  }

  slots.push({
    slot_id: "bottom_bg",
    type: "shape",
    fill: bottomZone.background || '#FFFFFF',
    x: "0%", y: "55%", width: "100%", height: "45%",
    z_index: 0
  });

  const prod = bottomZone.components?.product_name || {};
  slots.push({
    slot_id: "product_name",
    type: "text",
    content_key: "headline",
    text: prod.text || '',
    font: prod.font_family || 'brand.heading_font',
    color: prod.color || 'brand.primary_color',
    size: parseInt(prod.font_size) || 36,
    align: "center",
    x: "10%", y: "58%", width: "80%", height: "8%",
    z_index: 2
  });

  const bullets = bottomZone.components?.feature_bullets || {};
  const bulletItems = bullets.items || [];
  slots.push({
    slot_id: "feature_bullets",
    type: "text",
    content_key: "body",
    text: bulletItems.join('\n') || '',
    font: bullets.font_family || 'brand.body_font',
    color: bullets.color || '#333333',
    size: parseInt(bullets.font_size) || 16,
    align: "center",
    x: "10%", y: "68%", width: "80%", height: "16%",
    z_index: 2
  });

  const btn = bottomZone.components?.cta_button || {};
  slots.push({
    slot_id: "cta_button",
    type: "cta_button",
    content_key: "cta",
    text: btn.text || 'Learn More',
    font: btn.font_family || 'brand.body_font',
    fill: btn.background_color || 'brand.primary_color',
    text_color: btn.text_color || '#FFFFFF',
    radius: parseInt(btn.border_radius) || 50,
    x: "35%", y: "86%", width: "30%", height: "8%",
    z_index: 2
  });

  return slots;
}

function normalizeTemplate5(template: any) {
  const slots: any[] = [];
  const struct = template.layout_structure || {};

  slots.push({
    slot_id: "canvas_bg",
    type: "shape",
    fill: struct.background_color || '#1A1A1A',
    x: "0%", y: "0%", width: "100%", height: "100%",
    z_index: 0
  });

  const line = struct.decorative_components?.top_line || {};
  if (line.height) {
    slots.push({
      slot_id: "top_line",
      type: "shape",
      fill: line.background_color || '#FFFFFF',
      x: "10%", y: "8%", width: "10%", height: "1%",
      z_index: 1
    });
  }

  const meta = struct.top_meta_row || {};
  if (meta.left_link) {
    slots.push({
      slot_id: "top_meta_left",
      type: "text",
      text: meta.left_link.text || '',
      font: "brand.body_font",
      color: meta.color || '#FFFFFF',
      size: parseInt(meta.left_link.font_size) || 18,
      align: "left",
      x: "10%", y: "11%", width: "40%", height: "4%",
      z_index: 1
    });
  }
  if (meta.right_label) {
    slots.push({
      slot_id: "top_meta_right",
      type: "text",
      text: meta.right_label.text || '',
      font: "brand.body_font",
      color: meta.color || '#FFFFFF',
      size: parseInt(meta.right_label.font_size) || 18,
      align: "right",
      x: "50%", y: "11%", width: "40%", height: "4%",
      z_index: 1
    });
  }

  const num = struct.content_area?.headline_numeral || {};
  if (num.text) {
    slots.push({
      slot_id: "numeral",
      type: "text",
      text: num.text,
      font: num.font_family || 'brand.heading_font',
      color: num.color || '#FFFFFF',
      size: parseInt(num.font_size) || 120,
      align: num.alignment || "right",
      x: "10%", y: "18%", width: "80%", height: "15%",
      z_index: 2
    });
  }

  const body = struct.content_area?.subtext_body || {};
  slots.push({
    slot_id: "subtext_body",
    type: "text",
    content_key: "body",
    text: body.text || '',
    font: body.font_family || 'brand.body_font',
    color: body.color || '#E4E4E7',
    size: parseInt(body.font_size) || 28,
    align: body.alignment || "justify",
    x: "10%", y: "38%", width: "80%", height: "45%",
    z_index: 2
  });

  const cta = struct.bottom_action_row?.cta_center || {};
  slots.push({
    slot_id: "cta_center",
    type: "text",
    content_key: "cta",
    text: cta.text || '',
    font: cta.font_family || 'brand.body_font',
    color: cta.color || '#FFFFFF',
    size: parseInt(cta.font_size) || 24,
    align: "center",
    x: "10%", y: "86%", width: "80%", height: "6%",
    z_index: 2
  });

  return slots;
}

function normalizeTemplate12(template: any) {
  const slots: any[] = [];
  const styles = template.global_styles || {};
  const bgFill = styles.canvas_background_color || '#D6C4AD';

  slots.push({
    slot_id: "canvas_bg",
    type: "shape",
    fill: bgFill,
    x: "0%", y: "0%", width: "100%", height: "100%",
    z_index: 0
  });

  const pBg = styles.polaroid_background_color || '#F9F8F4';
  const topZone = template.interactive_zones?.top_zone || {};
  const topMedia = topZone.media || {};

  slots.push({
    slot_id: "top_polaroid_base",
    type: "shape",
    fill: pBg,
    radius: 4,
    x: "12%", y: "6%", width: "76%", height: "38%",
    z_index: 1
  });

  slots.push({
    slot_id: "top_polaroid_img",
    type: "image",
    content_key: "image_url",
    text: topMedia.url || '',
    x: "16%", y: "9%", width: "68%", height: "26%",
    z_index: 2
  });

  slots.push({
    slot_id: "top_polaroid_caption",
    type: "text",
    content_key: "headline",
    text: topZone.caption || '',
    font: styles.font_family_caption || 'Courier Prime',
    color: "#111111",
    size: 20,
    align: "center",
    x: "16%", y: "36%", width: "68%", height: "6%",
    z_index: 2
  });

  const bottomZone = template.interactive_zones?.bottom_zone || {};
  const bottomMedia = bottomZone.media || {};

  slots.push({
    slot_id: "bottom_polaroid_base",
    type: "shape",
    fill: pBg,
    radius: 4,
    x: "12%", y: "52%", width: "76%", height: "38%",
    z_index: 1
  });

  slots.push({
    slot_id: "bottom_polaroid_img",
    type: "image",
    content_key: "image_url_2",
    text: bottomMedia.url || '',
    x: "16%", y: "55%", width: "68%", height: "26%",
    z_index: 2
  });

  slots.push({
    slot_id: "bottom_polaroid_caption",
    type: "text",
    content_key: "body",
    text: bottomZone.caption || '',
    font: styles.font_family_caption || 'Courier Prime',
    color: "#111111",
    size: 20,
    align: "center",
    x: "16%", y: "82%", width: "68%", height: "6%",
    z_index: 2
  });

  const tape = template.layout_elements?.middle_divider_tape || {};
  slots.push({
    slot_id: "tape_divider",
    type: "shape",
    fill: tape.background_color || 'rgba(245, 242, 232, 0.85)',
    x: "40%", y: "46%", width: "20%", height: "6%",
    z_index: 3
  });

  slots.push({
    slot_id: "tape_label",
    type: "text",
    text: tape.label_text || 'or',
    font: styles.font_family_handwriting || 'Caveat',
    color: "#111111",
    size: 24,
    align: "center",
    x: "40%", y: "46%", width: "20%", height: "6%",
    z_index: 4
  });

  return slots;
}

function normalizeTemplate13(template: any) {
  const slots: any[] = [];
  const bgImage = template.global_styles?.canvas_background_image || '';

  if (bgImage) {
    slots.push({
      slot_id: "media_background",
      type: "image",
      content_key: "image_url",
      text: bgImage,
      x: "0%", y: "0%", width: "100%", height: "100%",
      z_index: 0
    });
  } else {
    slots.push({
      slot_id: "media_background",
      type: "shape",
      fill: "brand.secondary_color",
      x: "0%", y: "0%", width: "100%", height: "100%",
      z_index: 0
    });
  }

  if (template.question_zone) {
    const qz = template.question_zone;
    const fontHeadline = template.global_styles?.font_headline || 'Playfair Display';
    const fontSans = template.global_styles?.font_sans || 'Inter';
    const textColor = qz.text_color || '#111111';

    if (qz.pre_title) {
      slots.push({
        slot_id: "qz_pre_title",
        type: "text",
        text: qz.pre_title,
        font: fontSans,
        color: textColor,
        size: 24,
        align: "center",
        x: "10%", y: "15%", width: "80%", height: "5%",
        z_index: 1
      });
    }

    slots.push({
      slot_id: "qz_headline",
      type: "text",
      content_key: "headline",
      text: qz.headline || '',
      font: fontHeadline,
      color: textColor,
      size: 48,
      weight: 700,
      align: "center",
      x: "10%", y: "20%", width: "80%", height: "12%",
      z_index: 1
    });

    if (qz.post_title) {
      slots.push({
        slot_id: "qz_post_title",
        type: "text",
        text: qz.post_title,
        font: fontSans,
        color: textColor,
        size: 20,
        align: "center",
        x: "10%", y: "33%", width: "80%", height: "5%",
        z_index: 1
      });
    }
  }

  if (template.poll_sticker) {
    const ps = template.poll_sticker;
    const fontSans = template.global_styles?.font_sans || 'Inter';

    slots.push({
      slot_id: "sticker_card",
      type: "shape",
      fill: ps.background_color || '#FFFFFF',
      radius: parseInt(ps.border_radius) || 28,
      x: "15%", y: "45%", width: "70%", height: "30%",
      z_index: 2
    });

    if (ps.context_title) {
      slots.push({
        slot_id: "sticker_title",
        type: "text",
        text: ps.context_title,
        font: fontSans,
        color: "#111111",
        size: 20,
        align: "center",
        x: "20%", y: "48%", width: "60%", height: "6%",
        z_index: 3
      });
    }

    const options = ps.options || [];
    if (options[0]) {
      slots.push({
        slot_id: "sticker_opt_a",
        type: "cta_button",
        text: options[0].text || 'Option A',
        font: fontSans,
        fill: options[0].background_color || '#2D2D2E',
        text_color: options[0].text_color || '#FFFFFF',
        radius: 12,
        x: "20%", y: "58%", width: "28%", height: "12%",
        z_index: 3
      });
    }
    if (options[1]) {
      slots.push({
        slot_id: "sticker_opt_b",
        type: "cta_button",
        text: options[1].text || 'Option B',
        font: fontSans,
        fill: options[1].background_color || '#2D2D2E',
        text_color: options[1].text_color || '#FFFFFF',
        radius: 12,
        x: "52%", y: "58%", width: "28%", height: "12%",
        z_index: 3
      });
    }
  }

  if (template.widget_group) {
    const wg = template.widget_group;
    const font = template.global_styles?.font_family || 'Inter';

    if (wg.search_bar_question) {
      const sb = wg.search_bar_question;
      slots.push({
        slot_id: "search_bar_bg",
        type: "shape",
        fill: sb.background_color || '#FFFFFF',
        radius: 12,
        x: "15%", y: "20%", width: "70%", height: "10%",
        z_index: 1
      });
      slots.push({
        slot_id: "search_bar_text",
        type: "text",
        content_key: "headline",
        text: sb.text || '',
        font: font,
        color: sb.text_color || '#1F2937',
        size: 20,
        align: "left",
        x: "20%", y: "22%", width: "60%", height: "6%",
        z_index: 2
      });
    }

    if (wg.binary_selection_deck) {
      const bsd = wg.binary_selection_deck;
      slots.push({
        slot_id: "selection_deck_bg",
        type: "shape",
        fill: bsd.background_color || '#374151',
        radius: bsd.border_radius ? parseInt(bsd.border_radius) : 12,
        x: "15%", y: "45%", width: "70%", height: "30%",
        z_index: 1
      });

      const options = bsd.options || [];
      if (options[0]) {
        slots.push({
          slot_id: "selection_opt_1",
          type: "cta_button",
          text: options[0].text || 'Yes',
          font: font,
          fill: "brand.primary_color",
          text_color: options[0].text_color || '#FFFFFF',
          radius: 8,
          x: "20%", y: "55%", width: "28%", height: "12%",
          z_index: 2
        });
      }
      if (options[1]) {
        slots.push({
          slot_id: "selection_opt_2",
          type: "cta_button",
          text: options[1].text || 'No',
          font: font,
          fill: "brand.primary_color",
          text_color: options[1].text_color || '#FFFFFF',
          radius: 8,
          x: "52%", y: "55%", width: "28%", height: "12%",
          z_index: 2
        });
      }
    }
  }

  return slots;
}

function normalizeMultiSlideComponents(slide: any, template: any) {
  const slots: any[] = [];
  const bgColor = slide.background_color || template.global_styles?.canvas_background || '#FFFFFF';
  const bgImg = slide.background_image_url || slide.media?.image_url || '';

  if (bgImg) {
    slots.push({
      slot_id: "slide_bg_image",
      type: "image",
      content_key: "image_url",
      text: bgImg,
      x: "0%", y: "0%", width: "100%", height: "100%",
      z_index: 0
    });
  } else {
    slots.push({
      slot_id: "slide_bg_color",
      type: "shape",
      fill: bgColor,
      x: "0%", y: "0%", width: "100%", height: "100%",
      z_index: 0
    });
  }

  if (slide.left_column && slide.right_column) {
    if (slide.left_column.media_url) {
      slots.push({
        slot_id: "slide_left_media",
        type: "image",
        content_key: "image_url",
        text: slide.left_column.media_url,
        x: "10%", y: "25%", width: "38%", height: "55%",
        z_index: 1
      });
    }
    if (slide.right_column.step_index || slide.right_column.headline) {
      slots.push({
        slot_id: "slide_right_headline",
        type: "text",
        content_key: "headline",
        text: `${slide.right_column.step_index || ''} ${slide.right_column.headline || ''}`.trim(),
        font: "brand.heading_font",
        color: "brand.primary_color",
        size: 28,
        x: "52%", y: "25%", width: "38%", height: "20%",
        z_index: 2
      });
      slots.push({
        slot_id: "slide_right_body",
        type: "text",
        content_key: "body",
        text: slide.right_column.body || '',
        font: "brand.body_font",
        color: "#333333",
        size: 16,
        x: "52%", y: "48%", width: "38%", height: "32%",
        z_index: 2
      });
    }
  } else {
    const comps = slide.components || [];
    if (Array.isArray(comps)) {
      comps.forEach((c: any, index: number) => {
        const type = c.type;
        const x = c.position?.x !== undefined ? `${c.position.x}%` : '10%';
        const y = c.position?.y !== undefined ? `${c.position.y}%` : '10%';
        const w = c.position?.width !== undefined ? `${c.position.width}%` : '80%';
        const h = c.position?.height !== undefined ? `${c.position.height}%` : '15%';

        if (type === 'background') {
          slots.push({
            slot_id: `comp_bg_${index}`,
            type: "shape",
            fill: c.color || 'brand.secondary_color',
            x, y, width: w, height: h,
            z_index: 0
          });
        } else if (type === 'image') {
          slots.push({
            slot_id: `comp_image_${index}`,
            type: "image",
            content_key: c.content_key || "image_url",
            text: c.url || '',
            x, y, width: w, height: h,
            z_index: 1
          });
        } else if (type === 'headline') {
          slots.push({
            slot_id: `comp_headline_${index}`,
            type: "text",
            content_key: "headline",
            text: c.text || '',
            font: c.font_family || "brand.heading_font",
            color: c.color || "brand.primary_color",
            size: parseInt(c.font_size) || 32,
            weight: c.font_weight || '700',
            x, y, width: w, height: h,
            z_index: 2
          });
        } else if (type === 'body') {
          slots.push({
            slot_id: `comp_body_${index}`,
            type: "text",
            content_key: "body",
            text: c.text || '',
            font: c.font_family || "brand.body_font",
            color: c.color || "#333333",
            size: parseInt(c.font_size) || 16,
            weight: c.font_weight || '400',
            x, y, width: w, height: h,
            z_index: 2
          });
        } else if (type === 'cta_button' || type === 'cta') {
          slots.push({
            slot_id: `comp_cta_${index}`,
            type: "cta_button",
            content_key: "cta",
            text: c.text || 'Learn More',
            font: c.font_family || "brand.body_font",
            fill: c.background_color || "brand.primary_color",
            text_color: c.text_color || "#FFFFFF",
            radius: parseInt(c.border_radius) || 8,
            x, y, width: w, height: h,
            z_index: 2
          });
        }
      });
    } else if (comps && typeof comps === 'object') {
      const cb = comps.content_block || comps.comparison_headers || comps.brand_seal || {};
      const headlineVal = cb.headline || cb.text || cb.title || `${cb.top_text || ''} ${cb.divider_text || ''} ${cb.bottom_text || ''}`.trim();
      if (headlineVal) {
        slots.push({
          slot_id: "comp_title",
          type: "text",
          content_key: "headline",
          text: headlineVal,
          font: "brand.heading_font",
          color: "brand.primary_color",
          size: 40,
          align: "center",
          x: "10%", y: "20%", width: "80%", height: "20%",
          z_index: 2
        });
      }
      const sub = comps.content_block?.sub_headline || comps.action_cta?.text || "";
      if (sub) {
        slots.push({
          slot_id: "comp_sub",
          type: "text",
          content_key: "body",
          text: sub,
          font: "brand.body_font",
          color: "brand.primary_color",
          size: 24,
          align: "center",
          x: "10%", y: "45%", width: "80%", height: "20%",
          z_index: 2
        });
      }
    }

    if (slide.content) {
      const sc = slide.content;
      const titleVal = sc.title || sc.section_header || '';
      if (titleVal) {
        slots.push({
          slot_id: "content_title",
          type: "text",
          content_key: "headline",
          text: titleVal,
          font: "brand.heading_font",
          color: "brand.primary_color",
          size: 32,
          align: "center",
          x: "10%", y: "15%", width: "80%", height: "15%",
          z_index: 2
        });
      }
      
      const bodyVal = sc.sub_header || sc.footer_notes || sc.left_description || sc.right_description || '';
      if (bodyVal) {
        slots.push({
          slot_id: "content_body",
          type: "text",
          content_key: "body",
          text: bodyVal,
          font: "brand.body_font",
          color: "brand.primary_color",
          size: 20,
          align: "center",
          x: "10%", y: "55%", width: "80%", height: "30%",
          z_index: 2
        });
      }

      const imgVal = sc.circle_image_url || sc.capsule_image_url || sc.image_url || '';
      if (imgVal) {
        slots.push({
          slot_id: "content_image",
          type: "image",
          content_key: "image_url",
          text: imgVal,
          x: "30%", y: "30%", width: "40%", height: "25%",
          z_index: 1
        });
      }
    }

    const embed = slide.content?.embedded_frame || slide.media;
    if (embed && embed.image_url) {
      slots.push({
        slot_id: "slide_embedded_media",
        type: "image",
        content_key: "image_url",
        text: embed.image_url,
        x: "15%", y: "50%", width: "70%", height: "35%",
        z_index: 1
      });
    }

    let headlineText = '';
    let headlineFont = 'brand.heading_font';
    let headlineSize = 48;
    let headlineColor = 'brand.primary_color';

    const rawHeadline = slide.content?.headline || slide.content?.headline_text || slide.content?.title || '';
    if (typeof rawHeadline === 'string') {
      headlineText = rawHeadline;
    } else if (rawHeadline && typeof rawHeadline === 'object') {
      headlineText = rawHeadline.text || '';
      if (rawHeadline.font_family) headlineFont = rawHeadline.font_family;
      if (rawHeadline.font_size) headlineSize = parseInt(rawHeadline.font_size) || headlineSize;
      if (rawHeadline.color) headlineColor = rawHeadline.color;
    }

    if (headlineText) {
      slots.push({
        slot_id: "slide_headline",
        type: "text",
        content_key: "headline",
        text: headlineText,
        font: headlineFont,
        color: headlineColor,
        size: headlineSize,
        align: "center",
        x: "10%", y: "15%", width: "80%", height: "20%",
        z_index: 2
      });
    }

    let bodyText = '';
    let bodyFont = 'brand.body_font';
    let bodySize = 24;
    let bodyColor = 'brand.primary_color';

    const rawBody = slide.content?.sub_header || slide.content?.sub_headline || slide.content?.body_description || slide.content?.subtitle || '';
    if (typeof rawBody === 'string') {
      bodyText = rawBody;
    } else if (rawBody && typeof rawBody === 'object') {
      bodyText = rawBody.text || '';
      if (rawBody.font_family) bodyFont = rawBody.font_family;
      if (rawBody.font_size) bodySize = parseInt(rawBody.font_size) || bodySize;
      if (rawBody.color) bodyColor = rawBody.color;
    }

    if (bodyText) {
      slots.push({
        slot_id: "slide_body",
        type: "text",
        content_key: "body",
        text: bodyText,
        font: bodyFont,
        color: bodyColor,
        size: bodySize,
        align: "center",
        x: "10%", y: "38%", width: "80%", height: "15%",
        z_index: 2
      });
    }
  }

  return slots;
}

export function normalizeTemplate(template: any): any[][] {
  if (!template) return [];

  if (template.slots && !template.slides) {
    return [template.slots];
  }

  if (template.template_id === 'story_split' || template.layout_elements) {
    return [normalizeTemplate12(template)];
  }

  if (template.template_id?.startsWith('story_poll') || template.question_zone || template.widget_group) {
    return [normalizeTemplate13(template)];
  }

  if (template.template_id === 'split_layout_feed') {
    return [normalizeTemplate3(template)];
  }

  if (template.template_id === 'product_showcase_feed') {
    return [normalizeTemplate4(template)];
  }

  if (template.template_id === 'minimal_text_feed') {
    return [normalizeTemplate5(template)];
  }

  const templateSlidesList = template.slides || template.stories || template.static_slides || template.carousel_slides || [];

  if (templateSlidesList.length === 0) {
    const slots = template.slots || [];
    return [slots];
  }

  return templateSlidesList.map((slide: any) => normalizeMultiSlideComponents(slide, template));
}
