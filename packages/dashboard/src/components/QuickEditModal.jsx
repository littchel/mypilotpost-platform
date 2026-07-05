import React, { useState, useEffect, useMemo } from "react";
import { apiRequest } from "../lib/api/client";
import { fetchMediaSuggestions } from "../services/mediaSuggestions";

export default function QuickEditModal({ card, activeBrand, brandDna, onClose, onSave }) {
  const [templateId, setTemplateId] = useState(card.template_id || card.suggested_template_id);
  const [variant, setVariant] = useState(card.template_variant || card.suggested_template_variant || "A");
  const [templateSchema, setTemplateSchema] = useState(null);
  
  // Editable text & media states
  const [headline, setHeadline] = useState(card.preview_data?.headline || card.hook || card.idea || "");
  const [bodyText, setBodyText] = useState(card.preview_data?.body || card.caption || "");
  const [ctaText, setCtaText] = useState(card.preview_data?.cta || "Learn More");
  const [heroImageUrl, setHeroImageUrl] = useState(card.preview_data?.hero_image_url || card.thumbnail_url || "");
  const [logoUrl, setLogoUrl] = useState(activeBrand?.logo_url || brandDna?.visual?.logo_url || "");
  
  // Custom presets
  const [animationPreset, setAnimationPreset] = useState("fade_in");
  const [formatType, setFormatType] = useState(card.template_format || "feed_post");
  
  // Media suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(true);

  // 1. Fetch template schema when templateId or variant changes
  useEffect(() => {
    if (!templateId) return;
    setLoadingSchema(true);
    const endpoint = variant 
      ? `/api/customer/templates/${templateId}/${variant}`
      : `/api/customer/templates/${templateId}`;

    apiRequest(endpoint)
      .then(schema => {
        if (schema) {
          setTemplateSchema(schema);
        }
      })
      .catch(err => console.warn("[QUICK EDIT] Failed to load schema:", err))
      .finally(() => setLoadingSchema(false));
  }, [templateId, variant]);

  // 2. Fetch media suggestions automatically on mount
  useEffect(() => {
    setLoadingSuggestions(true);
    fetchMediaSuggestions({
      platform: "instagram",
      contentType: formatType === "carousel" ? "carousel" : "social",
      brand: activeBrand?.name || "",
      industry: activeBrand?.industry || "",
      batch: [{ id: card.id, title: card.idea || "", caption: headline }]
    })
      .then(res => {
        if (Array.isArray(res)) {
          setSuggestions(res.map(s => s.url).filter(Boolean));
        }
      })
      .catch(err => console.warn("[QUICK EDIT] Suggestions fetch failed:", err))
      .finally(() => setLoadingSuggestions(false));
  }, [card.id, card.idea, formatType, activeBrand]);

  // Format type mapping re-router
  const handleFormatChange = (newType) => {
    setFormatType(newType);
    let newTemplateId = "hero_headline_feed";
    if (newType === "carousel") {
      newTemplateId = "carousel_list_005";
    } else if (newType === "story") {
      newTemplateId = "story_fullscreen";
    }
    setTemplateId(newTemplateId);
  };

  // Handle local logo upload via base64 data URL
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Brand Variables override compiler
  const brandVars = useMemo(() => ({
    primary_color: brandDna?.visual?.primary_color || "#1A1A1A",
    secondary_color: brandDna?.visual?.secondary_color || "#F5F5F5",
    font_stack: brandDna?.visual?.typography_main || "Inter, sans-serif",
    logo_url: logoUrl
  }), [brandDna, logoUrl]);

  // Mini preview canvas dimensions
  const isFeed = formatType === "feed_post" || formatType === "quote_card";
  const dimensions = useMemo(() => {
    return isFeed ? { width: 300, height: 300 } : { width: 300, height: 400 };
  }, [isFeed]);

  // Compile active slot data
  const slotData = useMemo(() => {
    if (!templateSchema) return null;
    const activeSlideId = templateSchema.slides?.[0]?.slot_id || "slide_1";
    return {
      [activeSlideId]: {
        text: headline,
        headline: headline,
        body: bodyText,
        cta: ctaText,
        image_url: heroImageUrl,
        palette: {
          dominant: brandVars.primary_color,
          accent: brandVars.secondary_color,
          background: brandVars.secondary_color || "#F5F5F5",
          text_contrast: brandVars.primary_color || "#1A1A1A"
        }
      }
    };
  }, [templateSchema, headline, bodyText, ctaText, heroImageUrl, brandVars]);

  // Debounced fields for real-time preview to avoid high-frequency rendering requests
  const [debouncedHeadline, setDebouncedHeadline] = useState(headline);
  const [debouncedBodyText, setDebouncedBodyText] = useState(bodyText);
  const [debouncedCtaText, setDebouncedCtaText] = useState(ctaText);
  const [debouncedHeroImageUrl, setDebouncedHeroImageUrl] = useState(heroImageUrl);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHeadline(headline);
      setDebouncedBodyText(bodyText);
      setDebouncedCtaText(ctaText);
      setDebouncedHeroImageUrl(heroImageUrl);
    }, 500);
    return () => clearTimeout(handler);
  }, [headline, bodyText, ctaText, heroImageUrl]);

  const realPreviewUrl = useMemo(() => {
    if (!templateSchema) return null;

    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const token = localStorage.getItem("mpp_token") || "";

    return `${apiBase}/api/customer/templates/render-preview?` + new URLSearchParams({
      template_id: templateSchema.template_id,
      variant: templateSchema.variant_id || "A",
      headline: debouncedHeadline || 'Your Headline',
      body: debouncedBodyText || '',
      cta: debouncedCtaText || 'Learn More',
      image_url: debouncedHeroImageUrl || '',
      token: token
    }).toString();
  }, [templateSchema, debouncedHeadline, debouncedBodyText, debouncedCtaText, debouncedHeroImageUrl]);

  // Handle confirmation: serialize manifest and navigate
  const handleSaveAndUse = () => {
    const activeSlideId = templateSchema?.slides?.[0]?.slot_id || "slide_1";
    const layoutManifest = {
      template_id: templateId,
      template_variant: variant,
      brand_overrides: {
        primary_color: brandVars.primary_color,
        secondary_color: brandVars.secondary_color,
        font_stack: brandVars.font_stack,
        logo_url: logoUrl
      },
      slides: [
        { 
          slot_id: activeSlideId, 
          text: headline, 
          headline: headline,
          body: bodyText,
          cta: ctaText,
          image_url: heroImageUrl 
        }
      ],
      animation_preset: animationPreset
    };

    onSave({
      ...card,
      template_id: templateId,
      template_variant: variant,
      template_format: formatType,
      preview_data: {
        headline,
        body: bodyText,
        cta: ctaText,
        hero_image_url: heroImageUrl
      },
      draft_payload: {
        ...card.draft_payload,
        caption: bodyText,
        title: headline,
        hook: headline,
        cta: ctaText,
        image: heroImageUrl,
        layout_manifest: layoutManifest
      }
    });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: 24,
      animation: "cs-fade-in 0.25s ease-out"
    }}>
      <div style={{
        background: "var(--surface-primary, #ffffff)",
        width: "900px",
        maxWidth: "95%",
        height: "640px",
        borderRadius: "var(--radius-xl, 16px)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        display: "flex",
        overflow: "hidden",
        border: "1px solid var(--border-subtle)"
      }}>
        {/* Left half: Live mockup frame preview */}
        <div style={{
          flex: 1.1,
          background: "var(--surface-secondary, #f8fafc)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 24,
          borderRight: "1px solid var(--border-subtle)",
          position: "relative"
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            maxHeight: "380px",
            position: "relative",
            overflow: "hidden",
            background: "#f0f0f0",
            aspectRatio: formatType === "story" ? "9/16" : formatType === "carousel" ? "4/5" : "1/1",
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {realPreviewUrl ? (
              <img 
                src={realPreviewUrl} 
                alt="Post preview" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : card.preview_url ? (
              <img 
                src={card.preview_url} 
                alt="Post preview" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>
                {headline || "Loading preview..."}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Visual preview updates dynamically in real-time
          </div>
        </div>

        {/* Right half: Form inputs */}
        <div style={{
          flex: 1,
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          overflowY: "auto"
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Quick Edit Draft</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>lightweight visual asset tuner</span>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              ×
            </button>
          </div>

          {/* Form */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", paddingRight: 4 }}>
            {/* Format Type Dropdown */}
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Post Format</label>
              <select 
                value={formatType} 
                onChange={(e) => handleFormatChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem",
                  background: "var(--surface-primary)"
                }}
              >
                <option value="feed_post">Feed Post (Square)</option>
                <option value="carousel">Carousel (Vertical)</option>
                <option value="story">Story (Vertical Fullscreen)</option>
              </select>
            </div>

            {/* Headline input */}
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Headline Text (max 60)</label>
              <input 
                type="text" 
                maxLength={60}
                value={headline} 
                onChange={(e) => setHeadline(e.target.value)} 
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem"
                }}
              />
            </div>

            {/* Body paragraph */}
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Body text (max 120)</label>
              <textarea 
                maxLength={120}
                value={bodyText} 
                rows={3}
                onChange={(e) => setBodyText(e.target.value)} 
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem",
                  resize: "none"
                }}
              />
            </div>

            {/* CTA action text */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>CTA Label</label>
                <input 
                  type="text" 
                  maxLength={30}
                  value={ctaText} 
                  onChange={(e) => setCtaText(e.target.value)} 
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md, 8px)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.8rem"
                  }}
                />
              </div>

              {/* Animation Preset Dropdown */}
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Animation</label>
                <select 
                  value={animationPreset} 
                  onChange={(e) => setAnimationPreset(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md, 8px)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.8rem",
                    background: "var(--surface-primary)"
                  }}
                >
                  <option value="none">None (Static)</option>
                  <option value="fade_in">Fade In</option>
                  <option value="slide_up">Slide Up</option>
                  <option value="pulse">Pulse</option>
                </select>
              </div>
            </div>

            {/* Image Swap Section */}
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Swap Background Image</label>
              <input 
                type="text" 
                placeholder="Paste stock image URL..."
                value={heroImageUrl} 
                onChange={(e) => setHeroImageUrl(e.target.value)} 
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem",
                  marginBottom: 8
                }}
              />

              {/* Media suggestions selector */}
              {suggestions.length > 0 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {suggestions.map((url, index) => (
                    <img 
                      key={index} 
                      src={url} 
                      alt="Suggestion" 
                      onClick={() => setHeroImageUrl(url)}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 6,
                        objectFit: "cover",
                        cursor: "pointer",
                        border: heroImageUrl === url ? "2px solid var(--pilot-blue)" : "1px solid var(--border-subtle)",
                        opacity: heroImageUrl === url ? 1 : 0.75,
                        transition: "all 0.15s"
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Logo Swap File Selector */}
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Change Logo Footer</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                style={{
                  fontSize: "0.75rem"
                }}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                borderRadius: "var(--radius-md)",
                padding: "10px 0",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndUse}
              style={{
                flex: 1.5,
                background: "var(--pilot-blue)",
                border: "none",
                color: "#fff",
                borderRadius: "var(--radius-md)",
                padding: "10px 0",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Apply & Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
