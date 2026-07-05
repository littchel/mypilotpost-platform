import React, { useState, useEffect, useMemo } from "react";
import { apiRequest } from "../../lib/api/client";
import TemplateCanvas from "../TemplateCanvas";

// Local static cache to avoid redundant template schema fetches across cards
const templateCache = new Map();

function DynamicOpportunityCard({ card, imageUrl, activeBrand, brandDna, onPreview, onUseIdea, onSave, saved }) {
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
      ? `/api/customer/templates/${templateId}-${variant}`
      : `/api/customer/templates/${templateId}`;

    apiRequest(endpoint)
      .then(schema => {
        if (!active) return;
        if (schema) {
          templateCache.set(cacheKey, schema);
          setTemplateSchema(schema);
        } else {
          setError(true);
        }
      })
      .catch(err => {
        console.warn(`[DYNAMIC CARD] Failed to load schema for ${cacheKey}:`, err);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [templateId, variant, cacheKey]);

  // Compute card variables
  const brandVars = useMemo(() => ({
    primary_color: brandDna?.visual?.primary_color || "#1A1A1A",
    secondary_color: brandDna?.visual?.secondary_color || "#F5F5F5",
    font_stack: brandDna?.visual?.font_pairing_body || "Inter",
    logo_url: activeBrand?.logo_url || ""
  }), [brandDna, activeBrand]);

  // Format dimensions (mini canvas sizes: 300x300 for feed, 300x400 for carousels/stories)
  const isFeed = !card.template_format || card.template_format === "feed_post" || card.template_format === "quote_card";
  const dimensions = useMemo(() => {
    return isFeed ? { width: 300, height: 300 } : { width: 300, height: 400 };
  }, [isFeed]);

  // Map slot data
  const slotData = useMemo(() => {
    if (!templateSchema) return null;
    const activeSlideId = templateSchema.slides?.[0]?.slot_id || "slide_1";
    return {
      [activeSlideId]: {
        text: card.hook || card.idea || "",
        image_url: imageUrl || card.thumbnail_url || "",
        palette: {
          dominant: brandVars.primary_color,
          accent: brandVars.secondary_color,
          background: "#F5F5F5",
          text_contrast: "#FFFFFF"
        }
      }
    };
  }, [templateSchema, card.hook, card.idea, imageUrl, card.thumbnail_url, brandVars]);

  // Skeleton Loader State
  if (loading) {
    return (
      <div style={{
        width: 280,
        height: isFeed ? 380 : 480,
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

  // Fallback State: Show a simple text-only card if template schema fails to load
  if (error || !templateSchema) {
    return (
      <div style={{
        width: 280,
        height: isFeed ? 380 : 480,
        background: "var(--surface-primary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.2s ease"
      }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              {card.template_format || "FEED POST"}
            </span>
            {variant && (
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--pilot-blue)", background: "rgba(26,115,232,0.06)", padding: "2px 6px", borderRadius: 4 }}>
                Var {variant}
              </span>
            )}
          </div>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)", marginBottom: 8, lineHeight: 1.3 }}>
            {card.idea || "Idea Draft"}
          </h4>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            {card.hook || card.caption}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => onUseIdea(card)}
            style={{
              flex: 1,
              border: "none",
              background: "var(--pilot-blue)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              padding: "8px 0",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Use Idea
          </button>
        </div>
      </div>
    );
  }

  // Interactive Live Canvas Card State
  return (
    <div 
      className="dynamic-opportunity-card"
      style={{
        width: 280,
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
        e.currentTarget.style.transform = "scale(1.03)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(15,23,42,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,23,42,0.04)";
      }}
    >
      {/* Live Canvas Render Box */}
      <div style={{
        height: isFeed ? 280 : 360,
        width: "100%",
        background: "var(--surface-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderBottom: "1px solid var(--border-subtle)",
        position: "relative"
      }}>
        {/* Overlay Badge */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          display: "flex",
          gap: 6
        }}>
          <span style={{
            fontSize: "0.6rem",
            fontWeight: 800,
            color: "#fff",
            background: "rgba(15,23,42,0.75)",
            backdropFilter: "blur(4px)",
            padding: "3px 8px",
            borderRadius: "4px",
            textTransform: "uppercase"
          }}>
            {card.template_format || "FEED"}
          </span>
          {variant && (
            <span style={{
              fontSize: "0.6rem",
              fontWeight: 800,
              color: "#fff",
              background: "var(--pilot-blue)",
              padding: "3px 8px",
              borderRadius: "4px"
            }}>
              VAR {variant}
            </span>
          )}
        </div>

        <TemplateCanvas
          templateSchema={templateSchema}
          slotData={slotData}
          brandVariables={brandVars}
          dimensions={dimensions}
        />

        {/* Gradient Text Overlay at the bottom */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background: "linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 60%, transparent 100%)",
          display: "flex",
          alignItems: "flex-end",
          padding: "16px 12px",
          pointerEvents: "none"
        }}>
          <p style={{
            fontSize: "0.75rem",
            color: "#FFFFFF",
            fontWeight: 600,
            lineHeight: 1.3,
            margin: 0,
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {card.hook || card.idea || ""}
          </p>
        </div>
      </div>

      {/* Button Controls Footer */}
      <div style={{
        padding: "12px 14px",
        display: "flex",
        gap: 8,
        background: "var(--surface-primary)",
        alignItems: "center"
      }}>
        <button
          type="button"
          onClick={() => onPreview && onPreview(card, imageUrl)}
          style={{
            flex: 1,
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-secondary)",
            color: "var(--text-main)",
            borderRadius: "var(--radius-md)",
            padding: "8px 0",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface-secondary)"}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => onUseIdea(card)}
          style={{
            flex: 1.3,
            border: "none",
            background: "var(--pilot-blue)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            padding: "8px 0",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.95"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          Use Idea
        </button>
        {onSave && (
          <button
            type="button"
            onClick={() => onSave(card, imageUrl)}
            disabled={saved}
            style={{
              flex: 0.9,
              border: `1px solid ${saved ? "var(--status-success)" : "var(--border-subtle)"}`,
              background: saved ? "var(--surface-primary)" : "var(--surface-secondary)",
              color: saved ? "var(--status-success)" : "var(--text-main)",
              borderRadius: "var(--radius-md)",
              padding: "8px 0",
              fontSize: "0.75rem",
              fontWeight: saved ? 700 : 600,
              cursor: saved ? "default" : "pointer"
            }}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(DynamicOpportunityCard);
