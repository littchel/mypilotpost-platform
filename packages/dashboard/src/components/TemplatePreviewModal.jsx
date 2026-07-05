import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiRequest } from "../lib/api/client";
import TemplateCanvas from "./TemplateCanvas";
import { fetchMediaSuggestions } from "../services/mediaSuggestions";
import { Monitor, Smartphone, LayoutGrid, CheckCircle, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";

// Local static cache to avoid redundant schema fetches in-session
const previewSchemaCache = new Map();

// Template pools categorized by format format
const TEMPLATE_POOLS = {
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

export default function TemplatePreviewModal({ 
  opp, 
  imageUrl: initialImageUrl, 
  activeBrand, 
  brandDna, 
  allOpps = [], 
  currentIndex = -1, 
  onNavigate, 
  onClose, 
  onUseIdea 
}) {
  // ── 1. CORE OPP & IMAGE STATES ─────────────────────────────────────────────
  const [currentOpp, setCurrentOpp] = useState(opp);
  const [selectedImage, setSelectedImage] = useState(initialImageUrl || opp.thumbnail_url || "");
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [templateSchema, setTemplateSchema] = useState(null);

  // Sync state if card navigator switches the active card
  useEffect(() => {
    setCurrentOpp(opp);
    setSelectedImage(initialImageUrl || opp.thumbnail_url || "");
  }, [opp, initialImageUrl]);

  const templateId = currentOpp.template_id || currentOpp.suggested_template_id || "hero_headline_feed";
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId);
  const [selectedVariant, setSelectedVariant] = useState(currentOpp.template_variant || currentOpp.suggested_template_variant || "A");

  useEffect(() => {
    setSelectedTemplateId(templateId);
    setSelectedVariant(currentOpp.template_variant || currentOpp.suggested_template_variant || "A");
  }, [currentOpp, templateId]);

  // ── 2. EDITABLE CONTENT STATES (DEBOUNCED FOR LIVE CANVAS DRAWING) ─────────
  const [headlineInput, setHeadlineInput] = useState(currentOpp.hook || currentOpp.idea || "");
  const [ctaInput, setCtaInput] = useState(currentOpp.cta || "Learn More");
  
  const [debouncedHeadline, setDebouncedHeadline] = useState(headlineInput);
  const [debouncedCta, setDebouncedCta] = useState(ctaInput);

  useEffect(() => {
    setHeadlineInput(currentOpp.hook || currentOpp.idea || "");
    setCtaInput(currentOpp.cta || "Learn More");
  }, [currentOpp]);

  // Debounce text inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHeadline(headlineInput);
    }, 200);
    return () => clearTimeout(handler);
  }, [headlineInput]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCta(ctaInput);
    }, 200);
    return () => clearTimeout(handler);
  }, [ctaInput]);

  // ── 3. PLATFORM & DIMENSIONS STATES ─────────────────────────────────────────
  const [platform, setPlatform] = useState("instagram");
  const isCarousel = currentOpp.template_format === "carousel";
  
  const dimensions = useMemo(() => {
    if (platform === "linkedin") {
      return { width: 1000, height: 524 }; // 1.91:1 Landscape
    }
    // Default to vertical format or square
    return isCarousel ? { width: 800, height: 1000 } : { width: 800, height: 800 };
  }, [platform, isCarousel]);

  // ── 4. FETCH SCHEMA MERGED WITH VARIANT ────────────────────────────────────
  const cacheKey = `${selectedTemplateId}-${selectedVariant}`;

  useEffect(() => {
    let active = true;
    setLoadingSchema(true);

    if (previewSchemaCache.has(cacheKey)) {
      setTemplateSchema(previewSchemaCache.get(cacheKey));
      setLoadingSchema(false);
      return;
    }

    // Call merged variant endpoint
    const endpoint = selectedVariant
      ? `/api/customer/templates/${selectedTemplateId}/${selectedVariant}`
      : `/api/customer/templates/${selectedTemplateId}`;

    apiRequest(endpoint)
      .then(schema => {
        if (!active) return;
        if (schema) {
          previewSchemaCache.set(cacheKey, schema);
          setTemplateSchema(schema);
        }
      })
      .catch(err => {
        console.error(`[PREVIEW MODAL] Schema load failed for ${cacheKey}:`, err);
      })
      .finally(() => {
        if (active) setLoadingSchema(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTemplateId, selectedVariant, cacheKey]);

  // ── 5. BRAND OVERRIDES ─────────────────────────────────────────────────────
  const brandVars = useMemo(() => ({
    primary_color: brandDna?.visual?.primary_color || "#1A1A1A",
    secondary_color: brandDna?.visual?.secondary_color || "#F5F5F5",
    font_stack: brandDna?.visual?.font_pairing_body || "Inter",
    logo_url: activeBrand?.logo_url || ""
  }), [brandDna, activeBrand]);

  // Slot rendering payload mapping
  const slotData = useMemo(() => {
    if (!templateSchema) return null;
    const activeSlideId = templateSchema.slides?.[0]?.slot_id || "slide_1";
    return {
      [activeSlideId]: {
        text: debouncedHeadline,
        image_url: selectedImage,
        palette: {
          dominant: brandVars.primary_color,
          accent: brandVars.secondary_color,
          background: "#F5F5F5",
          text_contrast: "#FFFFFF"
        }
      }
    };
  }, [templateSchema, debouncedHeadline, selectedImage, brandVars]);

  // ── 6. INTERACTIVE CONTROLS ────────────────────────────────────────────────

  // Reroll layout variant and images deterministically on demand
  const handleSurpriseMe = async () => {
    const currentFormat = currentOpp.template_format || "feed_post";
    const pool = TEMPLATE_POOLS[currentFormat] || TEMPLATE_POOLS.feed_post;
    
    // Pick different template ID
    const available = pool.filter(id => id !== selectedTemplateId);
    const newTplId = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)] 
      : pool[Math.floor(Math.random() * pool.length)];

    // Pick random variant (A, B, or C)
    const variants = ["A", "B", "C"];
    const newVariant = variants[Math.floor(Math.random() * variants.length)];

    setSelectedTemplateId(newTplId);
    setSelectedVariant(newVariant);

    // Fetch a new context-related hero image using search query from inputs
    try {
      const suggestions = await fetchMediaSuggestions({
        platform,
        contentType: isCarousel ? 'carousel' : 'social',
        brand: activeBrand?.name || "",
        industry: activeBrand?.industry || "",
        batch: [{ id: currentOpp.id, title: currentOpp.idea || "", caption: headlineInput }]
      });
      const newImg = suggestions?.[0]?.url;
      if (newImg) {
        setSelectedImage(newImg);
      }
    } catch (e) {
      console.warn("[SURPRISE ME] Failed to fetch new image suggestion:", e);
    }
  };

  // Stepper controls
  const handlePrevCard = () => {
    if (currentIndex > 0 && onNavigate) {
      const prevOpp = allOpps[currentIndex - 1];
      onNavigate(prevOpp, prevOpp.thumbnail_url || "");
    }
  };

  const handleNextCard = () => {
    if (currentIndex < allOpps.length - 1 && onNavigate) {
      const nextOpp = allOpps[currentIndex + 1];
      onNavigate(nextOpp, nextOpp.thumbnail_url || "");
    }
  };

  // Prefill & Routing Submission
  const handleProceed = () => {
    const finalManifest = {
      template_id: selectedTemplateId,
      template_variant: selectedVariant,
      brand_overrides: {
        primary_color: brandVars.primary_color,
        secondary_color: brandVars.secondary_color,
        font_stack: brandVars.font_stack,
        logo_url: brandVars.logo_url
      },
      slides: [
        { slot_id: templateSchema?.slides?.[0]?.slot_id || "cover", text: headlineInput, image_url: selectedImage }
      ]
    };

    const finalPrefill = {
      idea_id: currentOpp.id || currentOpp.title,
      title: currentOpp.idea || currentOpp.framework || "",
      caption: currentOpp.caption || currentOpp._caption || "",
      hook: headlineInput,
      cta: ctaInput,
      hashtags: currentOpp.hashtags || [],
      platforms: [platform],
      contentType: isCarousel ? "carousel" : "social",
      image: selectedImage,
      imageSource: "pexels",
      suggested_structure: currentOpp.framework || "",
      layout_manifest: finalManifest,
      source: "studio"
    };

    sessionStorage.setItem("studio_idea_prefill", JSON.stringify(finalPrefill));
    onClose();
    if (onUseIdea) {
      onUseIdea(currentOpp);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.8)",
      backdropFilter: "blur(8px)",
      zIndex: 5000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "cs-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
    }}>
      {/* Main Modal Wrapper */}
      <div style={{
        width: "94vw",
        maxWidth: 1400,
        height: "90vh",
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 25px 50px -12px rgba(15,23,42,0.3)",
        display: "flex",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Absolute Exit button */}
        <button 
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 100,
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-main)",
            cursor: "pointer",
            transition: "all 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-secondary)"}
        >
          <X size={16} />
        </button>

        {/* ── LEFT SECTION: LIVE CANVAS PREVIEW ───────────────────────────────── */}
        <div style={{
          flex: 0.6,
          background: "var(--surface-secondary)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          borderRight: "1px solid var(--border-subtle)"
        }}>
          {/* Card Carousel Stepper Controls */}
          {currentIndex !== -1 && (
            <div style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 12,
              alignItems: "center",
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "30px",
              padding: "6px 16px",
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              zIndex: 10
            }}>
              <button 
                onClick={handlePrevCard}
                disabled={currentIndex === 0}
                style={{
                  background: "none",
                  border: "none",
                  color: currentIndex === 0 ? "var(--text-muted)" : "var(--text-main)",
                  cursor: currentIndex === 0 ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)", minWidth: 60, textAlign: "center" }}>
                {currentIndex + 1} / {allOpps.length}
              </span>
              <button 
                onClick={handleNextCard}
                disabled={currentIndex === allOpps.length - 1}
                style={{
                  background: "none",
                  border: "none",
                  color: currentIndex === allOpps.length - 1 ? "var(--text-muted)" : "var(--text-main)",
                  cursor: currentIndex === allOpps.length - 1 ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Canvas Box */}
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            overflow: "hidden"
          }}>
            {!loadingSchema && templateSchema ? (
              <div style={{
                transform: "scale(0.85)",
                transformOrigin: "center center",
                animation: "cs-in 0.25s ease-out forwards",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <TemplateCanvas
                  brandId={activeBrand?.id}
                  templateSchema={templateSchema}
                  slotData={slotData}
                  brandVariables={brandVars}
                  dimensions={dimensions}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  border: "3px solid var(--border-subtle)",
                  borderTopColor: "var(--pilot-blue)",
                  borderRadius: "50%",
                  animation: "cs-spin 0.8s infinite linear"
                }} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  Generating live Canvas layout...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SECTION: SIDEBAR CONFIGURATOR ─────────────────────────────── */}
        <div style={{
          flex: 0.4,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-primary)",
          overflowY: "auto",
          padding: "36px 32px"
        }}>
          {/* Header Title */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 850, color: "var(--text-main)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              Layout Configurator
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Customize and preview template changes instantly before starting social posts drafts.
            </p>
          </div>

          {/* 1. Version Switcher */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
              Layout Overrides (Variants)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["A", "B", "C", "D"].map(v => {
                const isActive = selectedVariant === v;
                return (
                  <button
                    key={v}
                    onClick={() => setSelectedVariant(v)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid",
                      borderColor: isActive ? "var(--pilot-blue)" : "var(--border-subtle)",
                      background: isActive ? "rgba(26,115,232,0.06)" : "var(--surface-secondary)",
                      color: isActive ? "var(--pilot-blue)" : "var(--text-main)",
                      fontSize: "0.75rem",
                      fontWeight: 750,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    Variant {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Platform Selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
              Dimensions & Platform
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "instagram", label: "Instagram", icon: Smartphone },
                { id: "linkedin", label: "LinkedIn", icon: Monitor },
                { id: "facebook", label: "Facebook", icon: LayoutGrid }
              ].map(p => {
                const isActive = platform === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 0",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid",
                      borderColor: isActive ? "var(--pilot-blue)" : "var(--border-subtle)",
                      background: isActive ? "rgba(26,115,232,0.06)" : "var(--surface-primary)",
                      color: isActive ? "var(--pilot-blue)" : "var(--text-main)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <Icon size={14} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Text Editors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 180 }}>
            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Headline Editor
              </label>
              <textarea
                value={headlineInput}
                onChange={e => setHeadlineInput(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--surface-secondary)",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  lineHeight: 1.4,
                  resize: "none",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                CTA Text
              </label>
              <input
                type="text"
                value={ctaInput}
                onChange={e => setCtaInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--surface-secondary)",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* 4. Action Sidebar Row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            {/* Surprise Me Reroll */}
            <button
              onClick={handleSurpriseMe}
              style={{
                width: "100%",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "11px 0",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.15s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-secondary)"}
            >
              <Sparkles size={14} className="text-amber-500" />
              Surprise Me (Reroll)
            </button>

            {/* Split CTA footer */}
            <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  background: "var(--surface-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 0",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
              <button
                onClick={handleProceed}
                style={{
                  flex: 1.5,
                  background: "var(--pilot-blue)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 0",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Continue to Editor →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
