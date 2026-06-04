import React, { useState, useEffect } from "react";
import PlatformIcon from "../components/shared/PlatformIcon";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiFetch(endpoint, opts = {}) {
  const token = localStorage.getItem("mpp_token");
  return fetch(`${API_BASE}${endpoint}`, {
    ...opts,
    headers: { Authorization: token ? `Bearer ${token}` : "", ...(opts.headers || {}) },
  }).then(r => r.json());
}

// ── Shared Pexels pool (same as StudioLab v4) ─────────────────────────────────
const PEXELS_POOL = [
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
];

// ── Production card (exact replica of current OpportunityCard style) ──────────
function ProductionCard({ title, format, effort, hook, platforms = [], reason }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Simulated visual preview (dark statement — current production style) */}
      <div style={{ height: 175, background: "#0f172a", display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 22px", position: "relative", borderRadius: "14px 14px 0 0", overflow: "hidden" }}>
        <div style={{ width: 32, height: 3, background: "#7c3aed", borderRadius: 2, marginBottom: 14 }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc", lineHeight: 1.45, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>@yourbrand</div>
        {platforms.length > 0 && (
          <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 5 }}>
            {platforms.slice(0, 3).map(p => (
              <span key={p} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(4px)", letterSpacing: 0.3 }}>{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "14px 16px 10px", display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>{title}</div>
        {format && (
          <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, background: "#f1f5f9", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, alignSelf: "flex-start" }}>
            {format}
          </span>
        )}
        {hook && (
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.55, fontStyle: "italic", borderLeft: "3px solid #e5e7eb", paddingLeft: 10 }}>
            "{hook}"
          </div>
        )}
        {reason && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "#eff6ff" }}>
            <span style={{ fontSize: 11 }}>⚡</span>
            <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, lineHeight: 1.3 }}>Suggested because: {reason}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 16px 14px", display: "flex", gap: 6, borderTop: "1px solid #f1f5f9" }}>
        <button type="button" style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 13 }}>
          Use Idea
        </button>
        <button type="button" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Save
        </button>
        <button type="button" style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#9ca3af", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Hide
        </button>
      </div>
    </div>
  );
}

// ── Prototype card (StudioLab v4 pattern) ─────────────────────────────────────
function PrototypeCard({ title, format, effort, platforms = [], imageUrl, imgReady }) {
  return (
    <div style={{
      border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", background: "var(--surface-primary)",
      boxShadow: "0 2px 8px rgba(15,23,42,0.06)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: 520,
    }}>
      {/* Image 80% */}
      <div style={{ position: "relative", width: "100%", height: 408, flexShrink: 0, overflow: "hidden", background: "var(--hover-bg)" }}>
        {imgReady && imageUrl && (
          <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}

        {/* Format badge top-left */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "4px 8px" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>{format || "Post"}</span>
        </div>

        {/* Effort badge top-right */}
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "4px 8px" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>{effort || "15 min"}</span>
        </div>

        {/* Platform chips bottom-left */}
        {platforms.length > 0 && (
          <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 4 }}>
            {platforms.slice(0, 3).map(p => (
              <div key={p} style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "3px 8px 3px 5px", display: "flex", alignItems: "center", gap: 4 }}>
                <PlatformIcon platform={p} size={11} />
                <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom 20% */}
      <div style={{ padding: "12px 14px 14px", flex: 1 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.3, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
          Suggested for your audience
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={{ flex: 1, border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)", color: "var(--text-main)", borderRadius: "var(--radius-md)", padding: "8px 0", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            Preview
          </button>
          <button type="button" style={{ flex: 1, border: "none", background: "var(--pilot-blue)", color: "#fff", borderRadius: "var(--radius-md)", padding: "8px 0", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
            Use Idea
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudioCompare() {
  const [opp, setOpp]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [imageUrl, setImageUrl] = useState(null);
  const [imgReady, setImgReady] = useState(false);
  const [verdict, setVerdict]   = useState(null); // "approved" | "rejected"

  // Load one opportunity from the API (uses auth token if available)
  useEffect(() => {
    apiFetch("/api/customer/studio/opportunities", { method: "GET" })
      .then(data => {
        const first = (data.opportunities || [])[0];
        setOpp(first || null);
      })
      .catch(() => setOpp(null))
      .finally(() => setLoading(false));
  }, []);

  // Preload image after opp is known
  useEffect(() => {
    if (!opp) return;
    const url = PEXELS_POOL[(opp._index || 0) % PEXELS_POOL.length];
    const img = new window.Image();
    img.onload  = () => { setImageUrl(url); setImgReady(true); };
    img.onerror = () => {
      const fallback = new window.Image();
      fallback.onload  = () => { setImageUrl(PEXELS_POOL[0]); setImgReady(true); };
      fallback.onerror = () => { setImageUrl(PEXELS_POOL[0]); setImgReady(true); };
      fallback.src = PEXELS_POOL[0];
    };
    img.src = url;
  }, [opp]);

  // Fallback demo card if API unavailable
  const card = opp || {
    idea: "How founders accidentally kill trust",
    framework: "Thought Leadership",
    media_type: "Carousel",
    effort: "20 min",
    platforms: ["instagram", "linkedin"],
    hook: "97% of founders never share this — and their audience stays cold forever.",
    objective: "Brand DNA · Tuesday engagement peak · Authority building",
  };

  const title    = card.idea || card.title || card.framework || "Content Opportunity";
  const format   = (card.media_type || card.format || card.type || "Post").replace(/_/g, " ");
  const effort   = card.effort || "15 min";
  const platforms = Array.isArray(card.platforms) ? card.platforms : [];
  const hook     = card.hook || "";
  const reason   = card.objective || card.suggested_because || card.reason || "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-secondary)", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Warning banner */}
      <div style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--border-subtle)", padding: "8px 20px", textAlign: "center" }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--status-warning)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Internal Comparison — Not For Users
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-primary)" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--pilot-blue)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
          AI Content Studio — Design Comparison
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main)", marginBottom: 4 }}>Posts Tab: Current vs Prototype</div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Same card data. Same viewport. No production mutations. Approve or reject the prototype direction below.
        </div>
      </div>

      {/* Verdict banner */}
      {verdict && (
        <div style={{
          padding: "14px 32px",
          background: verdict === "approved" ? "var(--surface-primary)" : "var(--surface-primary)",
          borderBottom: `2px solid var(--${verdict === "approved" ? "status-success" : "status-danger"})`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <i className={`fas fa-${verdict === "approved" ? "check-circle" : "times-circle"}`} style={{ color: `var(--${verdict === "approved" ? "status-success" : "status-danger"})`, fontSize: 18 }} />
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: `var(--${verdict === "approved" ? "status-success" : "status-danger"})` }}>
              {verdict === "approved" ? "Prototype Approved" : "Prototype Rejected"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              {verdict === "approved"
                ? "Recorded. Next step: implement in production and verify parity before deleting prototype."
                : "Recorded. Return to Design Lab to iterate."}
            </div>
          </div>
        </div>
      )}

      {/* Main columns */}
      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 200px)" }}>

        {/* LEFT — Current Production */}
        <div style={{ flex: 1, borderRight: "1px solid var(--border-subtle)", padding: "24px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Current Production</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, background: "var(--hover-bg)", border: "1px solid var(--border-subtle)", borderRadius: 99, padding: "2px 10px", color: "var(--text-muted)", fontWeight: 600 }}>175px preview</span>
              <span style={{ fontSize: 11, background: "var(--hover-bg)", border: "1px solid var(--border-subtle)", borderRadius: 99, padding: "2px 10px", color: "var(--text-muted)", fontWeight: 600 }}>Generated thumbnail</span>
              <span style={{ fontSize: 11, background: "var(--hover-bg)", border: "1px solid var(--border-subtle)", borderRadius: 99, padding: "2px 10px", color: "var(--text-muted)", fontWeight: 600 }}>Metadata rows</span>
              <span style={{ fontSize: 11, background: "var(--hover-bg)", border: "1px solid var(--border-subtle)", borderRadius: 99, padding: "2px 10px", color: "var(--text-muted)", fontWeight: 600 }}>Save · Hide</span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
          ) : (
            <div style={{ maxWidth: 360 }}>
              <ProductionCard title={title} format={format} effort={effort} hook={hook} platforms={platforms} reason={reason} />
            </div>
          )}
        </div>

        {/* RIGHT — Prototype */}
        <div style={{ flex: 1, padding: "24px 32px", background: "var(--surface-background)" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--pilot-blue)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Prototype (StudioLab v4)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, background: "var(--pilot-blue-light)", border: "1px solid var(--pilot-blue)", borderRadius: 99, padding: "2px 10px", color: "var(--pilot-blue)", fontWeight: 600 }}>408px real image</span>
              <span style={{ fontSize: 11, background: "var(--pilot-blue-light)", border: "1px solid var(--pilot-blue)", borderRadius: 99, padding: "2px 10px", color: "var(--pilot-blue)", fontWeight: 600 }}>Pexels CDN</span>
              <span style={{ fontSize: 11, background: "var(--pilot-blue-light)", border: "1px solid var(--pilot-blue)", borderRadius: 99, padding: "2px 10px", color: "var(--pilot-blue)", fontWeight: 600 }}>Title only</span>
              <span style={{ fontSize: 11, background: "var(--pilot-blue-light)", border: "1px solid var(--pilot-blue)", borderRadius: 99, padding: "2px 10px", color: "var(--pilot-blue)", fontWeight: 600 }}>Preview · Use Idea</span>
            </div>
          </div>

          <div style={{ maxWidth: 300 }}>
            <PrototypeCard title={title} format={format} effort={effort} platforms={platforms} imageUrl={imageUrl} imgReady={imgReady} />
          </div>
        </div>
      </div>

      {/* Footer — verdict buttons, compare-only */}
      {!verdict && (
        <div style={{
          position: "sticky", bottom: 0,
          padding: "16px 32px",
          background: "var(--surface-primary)", borderTop: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 -4px 16px rgba(15,23,42,0.08)",
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 420 }}>
            Verdict is for direction only. No production changes happen here. Approving triggers the implementation plan — not deployment.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setVerdict("rejected")}
              style={{ border: "1px solid var(--status-danger)", background: "var(--surface-primary)", color: "var(--status-danger)", borderRadius: "var(--radius-md)", padding: "10px 24px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", transition: "0.2s ease" }}
            >
              Reject Prototype
            </button>
            <button
              type="button"
              onClick={() => setVerdict("approved")}
              style={{ border: "none", background: "var(--pilot-blue)", color: "#fff", borderRadius: "var(--radius-md)", padding: "10px 24px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", transition: "0.2s ease" }}
            >
              Approve Prototype
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
