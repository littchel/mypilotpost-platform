import React, { useState, useEffect } from "react";
import { apiRequest } from "../lib/api/client";
import TemplateCanvas from "./TemplateCanvas";
import { Monitor, Smartphone, LayoutGrid, CheckCircle } from "lucide-react";

// Pre-defined templates for Versions A, B, C, D depending on format
const FEED_POST_VERSIONS = [
  { id: "hero_headline_feed", label: "Version A (Hero)" },
  { id: "split_layout_feed", label: "Version B (Split)" },
  { id: "quote_card_feed", label: "Version C (Quote)" },
  { id: "minimal_text_feed", label: "Version D (Minimal)" }
];

const CAROUSEL_VERSIONS = [
  { id: "carousel_list_005", label: "Version A (Listicle)" },
  { id: "carousel_comparison_004", label: "Version B (Comparison)" },
  { id: "carousel_faq_005", label: "Version C (FAQ)" },
  { id: "carousel_data_008", label: "Version D (Data)" }
];

export default function TemplatePreviewModal({ opp, imageUrl, activeBrand, brandDna, onClose, onUseIdea }) {
  const isCarousel = (opp.media_type || opp.format || "").toLowerCase().includes("carousel");
  const versionsList = isCarousel ? CAROUSEL_VERSIONS : FEED_POST_VERSIONS;

  // Selected state settings
  const [selectedTemplateId, setSelectedTemplateId] = useState(opp.suggested_template_id || versionsList[0].id);
  const [templateSchema, setTemplateSchema] = useState(null);
  
  const draft = opp.draft_payload || {};
  const [headline, setHeadline] = useState(draft.hook || opp.hook || opp.idea || "");
  const [ctaText, setCtaText] = useState(draft.cta || opp.cta || "Learn More");
  
  // Platform aspect ratio toggle
  const [platform, setPlatform] = useState((draft.platforms && draft.platforms[0]) || "instagram");
  const [dimensions, setDimensions] = useState({ width: 1080, height: 1080 });

  // 1. Fetch template schema when selectedTemplateId changes
  useEffect(() => {
    let active = true;
    apiRequest(`/api/customer/templates/${selectedTemplateId}`)
      .then(schema => {
        if (active && schema) setTemplateSchema(schema);
      })
      .catch(err => console.error("[PREVIEW MODAL] Failed to load schema:", err));
    return () => { active = false; };
  }, [selectedTemplateId]);

  // 2. Adjust dimensions based on platform selection
  useEffect(() => {
    if (platform === "instagram") {
      setDimensions({ width: 1080, height: 1080 }); // Square 1:1
    } else if (platform === "linkedin") {
      setDimensions({ width: 1200, height: 627 });  // Landscape 1.91:1
    } else if (platform === "facebook") {
      setDimensions({ width: 1200, height: 630 });  // Landscape 1.91:1
    }
  }, [platform]);

  // Determine brand visual values
  const brandVars = {
    primary_color: brandDna?.visual?.primary_color || "#1A1A1A",
    secondary_color: brandDna?.visual?.secondary_color || "#F5F5F5",
    font_stack: brandDna?.visual?.font_pairing_body || "Inter",
    logo_url: activeBrand?.logo_url || ""
  };

  // Maps headline and cta to canvas slot data structure
  const activeSlideId = templateSchema?.slides?.[0]?.slot_id || "slide_1";
  const slotData = {
    [activeSlideId]: {
      text: headline,
      image_url: imageUrl || opp.thumbnail_url || "",
      palette: {
        dominant: brandVars.primary_color,
        accent: brandVars.secondary_color,
        background: "#F5F5F5",
        text_contrast: "#FFFFFF"
      }
    }
  };

  // Build prefill payload and route to Create Post page
  const handleProceed = () => {
    const finalManifest = {
      template_id: selectedTemplateId,
      brand_overrides: {
        primary_color: brandVars.primary_color,
        secondary_color: brandVars.secondary_color,
        font_stack: brandVars.font_stack,
        logo_url: brandVars.logo_url
      },
      slides: [
        { text_anchor: "headline" },
        { text_anchor: "body_paragraph_0" },
        { text_anchor: "cta_text" }
      ]
    };

    const finalPrefill = {
      idea_id: opp.id || opp.title,
      title: opp.idea || opp.framework || "",
      caption: opp.caption || opp._caption || "",
      hook: headline,
      cta: ctaText,
      hashtags: opp.hashtags || [],
      platforms: [platform],
      contentType: isCarousel ? "carousel" : "social",
      image: imageUrl || opp.thumbnail_url || "",
      imageSource: "pexels",
      suggested_structure: opp.framework || "",
      layout_manifest: finalManifest,
      source: "studio"
    };

    sessionStorage.setItem("studio_idea_prefill", JSON.stringify(finalPrefill));
    onClose();
    if (onUseIdea) {
      onUseIdea(opp);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.65)",
      backdropFilter: "blur(4px)",
      zIndex: 5000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: "92vw",
        height: "88vh",
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        display: "flex",
        overflow: "hidden"
      }}>
        
        {/* 60% Left Section: Preview Area */}
        <div style={{
          flex: 0.6,
          background: "var(--surface-secondary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRight: "1px solid var(--border-subtle)",
          padding: 24
        }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: "none",
              border: "none",
              fontSize: 22,
              color: "var(--text-muted)",
              cursor: "pointer"
            }}
          >
            ← Back
          </button>

          {/* Render Canvas */}
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {templateSchema ? (
              <TemplateCanvas
                templateSchema={templateSchema}
                slotData={slotData}
                brandVariables={brandVars}
                dimensions={dimensions}
              />
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Loading canvas layout preview...
              </div>
            )}
          </div>
        </div>

        {/* 40% Right Section: Configuration Sidebar */}
        <div style={{
          flex: 0.4,
          display: "flex",
          flexDirection: "column",
          padding: "32px 28px",
          background: "var(--surface-primary)",
          overflowY: "auto"
        }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", marginBottom: 4 }}>
              Customize Layout
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Fine-tune the copy, platform aspect ratio, and layout style versions.
            </p>
          </div>

          {/* 1. Version Switcher (A, B, C, D) */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>
              Layout Versions
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {versionsList.map(v => {
                const isActive = v.id === selectedTemplateId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(v.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid",
                      borderColor: isActive ? "var(--pilot-blue)" : "var(--border-subtle)",
                      background: isActive ? "rgba(26,115,232,0.06)" : "var(--surface-secondary)",
                      color: isActive ? "var(--pilot-blue)" : "var(--text-main)",
                      fontSize: "0.75rem",
                      fontWeight: isActive ? 700 : 600,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {v.label}
                    {isActive && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Platform Selector */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>
              Target Platform Ratio
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "instagram", label: "Instagram (1:1)", icon: Smartphone },
                { id: "linkedin", label: "LinkedIn (1.91:1)", icon: Monitor },
                { id: "facebook", label: "Facebook (1.91:1)", icon: LayoutGrid }
              ].map(p => {
                const isActive = p.id === platform;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 8px",
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
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Text Editor Fields */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Headline Text
              </label>
              <textarea
                value={headline}
                onChange={e => setHeadline(e.target.value)}
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
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Call-To-Action (CTA)
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--surface-secondary)",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  fontFamily: "inherit"
                }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div style={{
            display: "flex",
            gap: 12,
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: 20,
            marginTop: 20
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-secondary)",
                color: "var(--text-main)",
                borderRadius: "var(--radius-md)",
                padding: "12px 0",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceed}
              style={{
                flex: 1.4,
                border: "none",
                background: "var(--pilot-blue)",
                color: "#fff",
                borderRadius: "var(--radius-md)",
                padding: "12px 0",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Continue to Editor →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
