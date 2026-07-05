import React, { useState, useEffect, useMemo } from "react";
import { apiRequest } from "../../lib/api/client";
import { renderTemplateToHTML } from "../TemplateHTML/templateFallbacks";
import { getFormatLabel } from "../../utils/labelHelpers";

// Local static cache to avoid redundant template schema fetches across cards
const templateCache = new Map();

const FALLBACK_TEMPLATES = {
  'hero_headline_feed': {
    "template_id": "hero_headline_feed",
    "name": "Hero Headline",
    "format": "feed_post",
    "dimensions": { "width": 1080, "height": 1080 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "hero_split",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 70 } },
        { "type": "headline", "position": { "x": 10, "y": 75, "width": 80, "height": 20 } }
      ]
    }]
  },
  'quote_card_feed': {
    "template_id": "quote_card_feed",
    "name": "Quote Card",
    "format": "feed_post",
    "dimensions": { "width": 1080, "height": 1080 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "quote_centered",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "headline", "position": { "x": 10, "y": 25, "width": 80, "height": 50 } },
        { "type": "body", "position": { "x": 10, "y": 80, "width": 80, "height": 10 } }
      ]
    }]
  },
  'split_layout_feed': {
    "template_id": "split_layout_feed",
    "name": "Split Layout",
    "format": "feed_post",
    "dimensions": { "width": 1080, "height": 1080 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "split_vertical",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 50, "height": 100 } },
        { "type": "headline", "position": { "x": 55, "y": 20, "width": 40, "height": 60 } }
      ]
    }]
  },
  'product_showcase_feed': {
    "template_id": "product_showcase_feed",
    "name": "Product Showcase",
    "format": "feed_post",
    "dimensions": { "width": 1080, "height": 1080 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "product_focus",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 10, "y": 10, "width": 80, "height": 60 } },
        { "type": "headline", "position": { "x": 10, "y": 75, "width": 80, "height": 15 } }
      ]
    }]
  },
  'minimal_text_feed': {
    "template_id": "minimal_text_feed",
    "name": "Minimal Text",
    "format": "feed_post",
    "dimensions": { "width": 1080, "height": 1080 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "minimal_centered",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "headline", "position": { "x": 10, "y": 40, "width": 80, "height": 30 } }
      ]
    }]
  },
  'carousel_list_005': {
    "template_id": "carousel_list_005",
    "name": "List Carousel",
    "format": "carousel",
    "dimensions": { "width": 1080, "height": 1350 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "carousel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 60 } },
        { "type": "headline", "position": { "x": 10, "y": 65, "width": 80, "height": 20 } }
      ]
    }]
  },
  'carousel_story_006': {
    "template_id": "carousel_story_006",
    "name": "Story Carousel",
    "format": "carousel",
    "dimensions": { "width": 1080, "height": 1350 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "carousel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 60 } },
        { "type": "headline", "position": { "x": 10, "y": 65, "width": 80, "height": 20 } }
      ]
    }]
  },
  'carousel_comparison_004': {
    "template_id": "carousel_comparison_004",
    "name": "Comparison Carousel",
    "format": "carousel",
    "dimensions": { "width": 1080, "height": 1350 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "carousel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 60 } },
        { "type": "headline", "position": { "x": 10, "y": 65, "width": 80, "height": 20 } }
      ]
    }]
  },
  'carousel_faq_005': {
    "template_id": "carousel_faq_005",
    "name": "FAQ Carousel",
    "format": "carousel",
    "dimensions": { "width": 1080, "height": 1350 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "carousel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 60 } },
        { "type": "headline", "position": { "x": 10, "y": 65, "width": 80, "height": 20 } }
      ]
    }]
  },
  'carousel_data_008': {
    "template_id": "carousel_data_008",
    "name": "Data Carousel",
    "format": "carousel",
    "dimensions": { "width": 1080, "height": 1350 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "carousel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 60 } },
        { "type": "headline", "position": { "x": 10, "y": 65, "width": 80, "height": 20 } }
      ]
    }]
  },
  'story_fullscreen': {
    "template_id": "story_fullscreen",
    "name": "Fullscreen Story",
    "format": "story",
    "dimensions": { "width": 1080, "height": 1920 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "story_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "headline", "position": { "x": 10, "y": 100, "width": 80, "height": 20 } }
      ]
    }]
  },
  'story_split': {
    "template_id": "story_split",
    "name": "Split Story",
    "format": "story",
    "dimensions": { "width": 1080, "height": 1920 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "story_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 50 } },
        { "type": "headline", "position": { "x": 10, "y": 55, "width": 80, "height": 35 } }
      ]
    }]
  },
  'story_quote': {
    "template_id": "story_quote",
    "name": "Quote Story",
    "format": "story",
    "dimensions": { "width": 1080, "height": 1920 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "story_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "headline", "position": { "x": 10, "y": 30, "width": 80, "height": 40 } }
      ]
    }]
  },
  'reel_fullscreen': {
    "template_id": "reel_fullscreen",
    "name": "Fullscreen Reel",
    "format": "reel",
    "dimensions": { "width": 1080, "height": 1920 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "reel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "headline", "position": { "x": 10, "y": 100, "width": 80, "height": 20 } }
      ]
    }]
  },
  'reel_split': {
    "template_id": "reel_split",
    "name": "Split Reel",
    "format": "reel",
    "dimensions": { "width": 1080, "height": 1920 },
    "slides": [{
      "slot_id": "slide_1",
      "slot_type": "hero",
      "layout": "reel_slide",
      "components": [
        { "type": "background", "position": { "x": 0, "y": 0, "width": 100, "height": 100 } },
        { "type": "image", "position": { "x": 0, "y": 0, "width": 100, "height": 50 } },
        { "type": "headline", "position": { "x": 10, "y": 55, "width": 80, "height": 35 } }
      ]
    }]
  }
};

function DynamicOpportunityCard({ card, imageUrl, activeBrand, brandDna, onPreview, onUseIdea, onSave, saved, onQuickEdit }) {
  const [templateSchema, setTemplateSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const templateId = card.template_id || card.suggested_template_id;
  const variant = card.template_variant || card.suggested_template_variant;
  const cacheKey = `${templateId}-${variant || "A"}`;

  // 1. Fetch template schema (from memory cache or API)
  useEffect(() => {
    if (!templateId) {
      setError(true);
      setLoading(false);
      return;
    }

    if (templateCache.has(cacheKey)) {
      setTemplateSchema(templateCache.get(cacheKey));
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    // Fetch template schema, supporting variant suffix
    const endpoint = variant 
      ? `/api/customer/templates/${templateId}/${variant}`
      : `/api/customer/templates/${templateId}`;

    apiRequest(endpoint)
      .then(schema => {
        if (!active) return;
        if (schema) {
          templateCache.set(cacheKey, schema);
          setTemplateSchema(schema);
        } else {
          const baseId = templateId;
          if (FALLBACK_TEMPLATES[baseId]) {
            setTemplateSchema(FALLBACK_TEMPLATES[baseId]);
            setError(false);
          } else {
            setError(true);
          }
        }
      })
      .catch(err => {
        console.warn(`[DYNAMIC CARD] Failed to load schema for ${cacheKey}:`, err);
        if (active) {
          const baseId = templateId;
          if (FALLBACK_TEMPLATES[baseId]) {
            setTemplateSchema(FALLBACK_TEMPLATES[baseId]);
            setError(false);
          } else {
            setError(true);
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [templateId, variant, cacheKey]);

  if (!card.preview_data) {
    console.warn('[DynamicOpportunityCard] Missing preview_data for card:', card.id);
  }

  // Compute card variables
  const brand = activeBrand || brandDna?.visual || {};
  const brandVars = {
    primary_color: brand.primary_color || '#1A73E8',
    secondary_color: brand.secondary_color || '#34A853',
    font_headline: brand.font_headline || brand.typography_main || 'Inter',
    font_body: brand.font_body || brand.typography_main || 'Inter',
    logo_url: brand.logo_url || ''
  };

  const getVariantLabel = (v) => {
    if (!v) return "";
    return `Design ${v}`;
  };

  // Format dimensions and dynamic aspect ratios
  const formatCode = card.template_format || card.format || '';
  const label = getFormatLabel(formatCode);

  let aspectRatio = '1/1';
  let cardHeight = 370;
  if (formatCode === 'story' || formatCode === 'reel' || label === 'Story' || label === 'Reel') {
    aspectRatio = '9/16';
    cardHeight = 590;
  } else if (formatCode === 'carousel' || label === 'Carousel') {
    aspectRatio = '4/5';
    cardHeight = 440;
  }

  const dimensions = useMemo(() => {
    return {
      width: 280,
      height: aspectRatio === '9/16' ? 500 : aspectRatio === '4/5' ? 350 : 280
    };
  }, [aspectRatio]);

  // Map slot data
  const slotData = useMemo(() => {
    if (!templateSchema) return null;
    const activeSlideId = templateSchema.slides?.[0]?.slot_id || "slide_1";
    
    // Support preview_data from backend copy generators
    const dataObj = {
      headline: card.preview_data?.headline || card.hook || 'Your Headline',
      body: card.preview_data?.body || '',
      cta: card.preview_data?.cta || 'Learn More',
      image_url: card.preview_data?.hero_image_url || ''
    };

    return {
      ...dataObj,
      [activeSlideId]: {
        ...dataObj,
        text: dataObj.headline,
        palette: {
          dominant: brandVars.primary_color,
          accent: brandVars.secondary_color,
          background: brandVars.secondary_color || "#F5F5F5",
          text_contrast: brandVars.primary_color || "#1A1A1A"
        }
      }
    };
  }, [templateSchema, card.preview_data, card.hook, brandVars]);

  const htmlContent = useMemo(() => {
    if (card.preview_url || !templateSchema) return null;
    return renderTemplateToHTML(templateSchema, {
      headline: card.preview_data?.headline || card.hook || 'Your Headline',
      body: card.preview_data?.body || '',
      cta: card.preview_data?.cta || 'Learn More',
      image_url: card.preview_data?.hero_image_url || '',
      primary_color: brandVars.primary_color || '#1A73E8',
      secondary_color: brandVars.secondary_color || '#34A853',
      logo_url: brandVars.logo_url || '',
      font_headline: brandVars.font_headline || 'Inter',
      font_body: brandVars.font_body || 'Inter'
    });
  }, [card.preview_url, templateSchema, card.preview_data, card.hook, brandVars]);

  // Skeleton Loader State
  if (loading) {
    return (
      <div style={{
        width: 280,
        height: cardHeight,
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
      }}>
        <div style={{
          flex: 1,
          background: "var(--hover-bg)",
          animation: "cs-shimmer 1.5s infinite linear",
          backgroundSize: "200% 100%"
        }} />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 14, width: "70%", background: "var(--border-subtle)", borderRadius: 4 }} />
          <div style={{ height: 10, width: "90%", background: "var(--border-subtle)", borderRadius: 4 }} />
          <div style={{ height: 32, marginTop: 8, background: "var(--border-subtle)", borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="opportunity-card"
      style={{
        width: 280,
        height: cardHeight,
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(15,23,42,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,23,42,0.04)";
      }}
    >
      <div className="card-header" style={{
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--surface-primary)"
      }}>
        <span className="format-badge" style={{
          fontSize: "0.65rem",
          fontWeight: 800,
          color: "var(--pilot-blue)",
          background: "var(--surface-secondary)",
          padding: "3px 8px",
          borderRadius: "4px",
          textTransform: "uppercase"
        }}>{label}</span>
      </div>

      <div className="card-image-wrapper" style={{ 
        width: "100%", 
        position: "relative", 
        overflow: "hidden", 
        background: "#f0f0f0",
        aspectRatio 
      }}>
        {card.preview_url ? (
          <img src={card.preview_url} alt={card.preview_data?.headline || "Post preview"} className="card-image" style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }} />
        ) : htmlContent ? (
          <div 
            style={{ width: "100%", height: "100%", containerType: "size" }}
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        ) : (
          <div className="fallback-placeholder" style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafafa",
            color: "#333",
            fontSize: "13px",
            padding: "20px",
            textAlign: "center",
            boxSizing: "border-box"
          }}>
            <span style={{ fontWeight: 600 }}>{card.preview_data?.headline || card.hook || 'Your Headline'}</span>
            <span style={{ fontSize: "11px", color: "#666", marginTop: "8px" }}>{card.preview_data?.body || ''}</span>
          </div>
        )}
      </div>

      {/* Button Controls Footer */}
      <div className="card-actions" style={{
        padding: "12px 14px",
        display: "flex",
        gap: 6,
        background: "var(--surface-primary)",
        alignItems: "center",
        borderTop: "1px solid var(--border-subtle)",
        marginTop: "auto"
      }}>
        <button
          type="button"
          onClick={() => onQuickEdit && onQuickEdit(card)}
          style={{
            flex: 1,
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-secondary)",
            color: "var(--text-main)",
            borderRadius: "var(--radius-md)",
            padding: "8px 0",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-secondary)"}
        >
          Quick Edit
        </button>
        <button
          type="button"
          onClick={() => onUseIdea && onUseIdea(card)}
          style={{
            flex: 1.2,
            border: "none",
            background: "var(--pilot-blue)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            padding: "8px 0",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.95"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          Use Post
        </button>
        <button
          type="button"
          onClick={() => onSave && onSave(card)}
          disabled={saved}
          style={{
            flex: 0.8,
            border: `1px solid ${saved ? "var(--status-success)" : "var(--border-subtle)"}`,
            background: saved ? "var(--surface-primary)" : "var(--surface-secondary)",
            color: saved ? "var(--status-success)" : "var(--text-main)",
            borderRadius: "var(--radius-md)",
            padding: "8px 0",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: saved ? "default" : "pointer"
          }}
        >
          {saved ? "✓ Saved" : "♡ Save"}
        </button>
      </div>
    </div>
  );
}

export default React.memo(DynamicOpportunityCard);
