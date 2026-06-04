import React, { useState, useEffect } from "react";
import PlatformIcon from "../components/shared/PlatformIcon";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiFetch(endpoint, opts = {}) {
  const token = localStorage.getItem("mpp_token");
  return fetch(`${API_BASE}${endpoint}`, {
    ...opts,
    headers: { Authorization: token ? `Bearer ${token}` : "", ...(opts.headers || {}) },
  }).then(async (r) => {
    if (!r.ok) throw new Error("Request failed");
    return r.json();
  });
}

// ── Single hardcoded idea ────────────────────────────────────────────────────
const IDEA = {
  id: 1,
  title: "The decision that changed everything",
  hook: "97% of founders never share this — and their audience stays cold forever.",
  reason: "Your brand DNA shows high trust signals. Founder-perspective content generates 3× more saves on your profile vs. product posts. Tuesday 9–11am is your audience's peak scroll window.",
  platforms: ["instagram", "linkedin"],
  format: "Single Image + Caption",
  effort: "20 min",
  suggestedBecause: "Brand DNA · Audience behaviour · Calendar signal",
  objective: "Build authority + drive profile visits",
  pexelsQuery: "entrepreneur desk notebook morning focus",
  // ── Preview modal post copy ───────────────────────────────────────────────
  postCopy: `The decision that changed everything for my business?

Saying no to my first $12k client.

Here's why that was the right call 👇

When I started I said yes to everyone. Wrong clients, wrong scope, wrong energy.

Then one day I turned down a deal that looked perfect on paper — but something felt off.

That same week, three dream clients reached out.

The lesson: clarity on what you don't want is the fastest path to what you do want.

If you're early-stage and saying yes to everything — this one's for you.

Drop a 🔥 if you've had a "no that opened a door" moment.

#FounderLife #BusinessMindset #Entrepreneurship`,
  aiReasoning: {
    brandDNA: "Your brand voice is direct, authority-driven, and experience-led. This format matches your highest-performing content archetype.",
    brandIntel: "Competitor analysis shows this idea type gets 2–4× above-average engagement in your niche this quarter.",
    calendar: "Tuesday morning (9–11am SAST) is your audience's highest-attention window based on your last 90 days of post data.",
    campaign: "Aligned with your Q2 'Build Trust' campaign objective — this seeds warm audience before your mid-June launch.",
    audience: "Your audience skews 28–42, founder/operator profile. They over-index on personal story + lesson-format content.",
  },
};

// ── Post render (Instagram-style) ────────────────────────────────────────────
function InstagramPostRender({ imageUrl, copy, brandName = "Your Brand" }) {
  const initials = brandName.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{ background: "#fff", border: "1px solid #dbdbdb", borderRadius: 4, maxWidth: 380, width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{initials}</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{brandName}</div>
          <div style={{ fontSize: 11, color: "#8e8e8e" }}>Sponsored</div>
        </div>
        <div style={{ marginLeft: "auto", color: "#8e8e8e", fontSize: 18, cursor: "pointer" }}>•••</div>
      </div>
      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "1/1", background: "#f1f5f9", overflow: "hidden" }}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="spinner-border" style={{ width: 24, height: 24, borderWidth: 2, color: "#0ea5e9" }} />
            </div>
        }
      </div>
      {/* Actions */}
      <div style={{ padding: "8px 12px 4px", display: "flex", gap: 14, fontSize: 22, color: "#262626" }}>
        <i className="far fa-heart" style={{ cursor: "pointer" }} />
        <i className="far fa-comment" style={{ cursor: "pointer" }} />
        <i className="far fa-paper-plane" style={{ cursor: "pointer" }} />
        <i className="far fa-bookmark" style={{ marginLeft: "auto", cursor: "pointer" }} />
      </div>
      {/* Caption */}
      <div style={{ padding: "4px 12px 12px" }}>
        <div style={{ fontSize: 13, color: "#262626", lineHeight: 1.6, maxHeight: 160, overflowY: "auto" }}>
          <strong>{brandName}</strong>{" "}
          {copy.split("\n").map((line, i) => (
            <React.Fragment key={i}>{line}{i < copy.split("\n").length - 1 && <br />}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI reasoning panel ────────────────────────────────────────────────────────
function ReasoningPanel({ reasoning }) {
  const rows = [
    { icon: "fas fa-dna",           label: "Brand DNA",          color: "#7c3aed", body: reasoning.brandDNA },
    { icon: "fas fa-brain",         label: "Brand Intelligence", color: "#2563eb", body: reasoning.brandIntel },
    { icon: "fas fa-calendar-alt",  label: "Calendar Signal",    color: "#0891b2", body: reasoning.calendar },
    { icon: "fas fa-flag",          label: "Campaign Data",      color: "#059669", body: reasoning.campaign },
    { icon: "fas fa-users",         label: "Audience Profile",   color: "#d97706", body: reasoning.audience },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
        Why AI suggested this
      </div>
      {rows.map(r => (
        <div key={r.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: r.color + "12", border: `1px solid ${r.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={r.icon} style={{ color: r.color, fontSize: 12 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{r.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ idea, imageUrl, onClose, onApprove, onReject }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 3000, backdropFilter: "blur(2px)" }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(900px, 95vw)", maxHeight: "90vh",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        zIndex: 3001, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Content Preview</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>How this would appear in-feed</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* LEFT — post render */}
          <div style={{ width: "45%", borderRight: "1px solid #f1f5f9", padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", background: "#f8fafc" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, alignSelf: "flex-start" }}>
              Instagram Preview
            </div>
            <InstagramPostRender imageUrl={imageUrl} copy={idea.postCopy} brandName="Your Brand" />
          </div>

          {/* RIGHT — AI reasoning */}
          <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <ReasoningPanel reasoning={idea.aiReasoning} />
          </div>
        </div>

        {/* Modal footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            onClick={onReject}
            style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <i className="fas fa-times me-2" />Reject This Direction
          </button>
          <button
            onClick={onApprove}
            style={{ border: "none", background: "#0f172a", color: "#fff", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            <i className="fas fa-check me-2" />Approve This Direction
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudioLab() {
  const [imageUrl, setImageUrl]     = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [feedback, setFeedback]     = useState(null); // "approved" | "rejected"

  useEffect(() => {
    setImageLoading(true);
    apiFetch("/api/customer/media/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: IDEA.pexelsQuery }),
    })
      .then(data => {
        const items = data?.items || [];
        if (items[0]?.thumbnail_url) setImageUrl(items[0].thumbnail_url);
        else if (items[0]?.preview_url) setImageUrl(items[0].preview_url);
      })
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, []);

  const handleApprove = () => { setFeedback("approved"); setModalOpen(false); };
  const handleReject  = () => { setFeedback("rejected"); setModalOpen(false); };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── TEMPORARY BANNER ─────────────────────────────────────────────── */}
      <div style={{
        background: "#fef3c7", borderBottom: "1px solid #fde68a",
        padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}>
        <i className="fas fa-flask" style={{ color: "#d97706", fontSize: 12 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5 }}>
          TEMPORARY PREVIEW — WILL BE DELETED
        </span>
        <i className="fas fa-flask" style={{ color: "#d97706", fontSize: 12 }} />
      </div>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "36px 24px 0", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
          AI Content Studio
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
          Design Lab
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 8, marginBottom: 0 }}>
          Testing visual content discovery before implementation
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "4px 14px", marginTop: 12, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
          <i className="fas fa-eye" style={{ fontSize: 10 }} />
          1 idea card — discovery prototype only
        </div>
      </div>

      {/* ── FEEDBACK BANNER ──────────────────────────────────────────────── */}
      {feedback && (
        <div style={{
          margin: "24px auto 0", maxWidth: 480,
          padding: "14px 20px", borderRadius: 10,
          background: feedback === "approved" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${feedback === "approved" ? "#bbf7d0" : "#fecaca"}`,
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        }}>
          <i className={`fas fa-${feedback === "approved" ? "check-circle" : "times-circle"}`}
            style={{ color: feedback === "approved" ? "#10b981" : "#ef4444", fontSize: 18, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: feedback === "approved" ? "#065f46" : "#991b1b" }}>
              {feedback === "approved" ? "Direction Approved" : "Direction Rejected"}
            </div>
            <div style={{ fontSize: 12, color: feedback === "approved" ? "#047857" : "#dc2626", marginTop: 2 }}>
              {feedback === "approved"
                ? "Noted. This visual approach will inform the full AI Content Studio implementation."
                : "Noted. This direction won't be used. Share what felt wrong and we'll iterate."}
            </div>
          </div>
        </div>
      )}

      {/* ── CARD ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 24px 60px" }}>
        <div style={{
          width: 340, borderRadius: 16, overflow: "hidden",
          background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0", transition: "box-shadow 0.2s",
          cursor: "default",
        }}>

          {/* Thumbnail */}
          <div style={{ width: "100%", aspectRatio: "4/3", background: "#f1f5f9", overflow: "hidden", position: "relative" }}>
            {imageLoading ? (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span className="spinner-border" style={{ width: 24, height: 24, borderWidth: 2, color: "#0ea5e9" }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Loading image…</span>
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fas fa-image" style={{ color: "#334155", fontSize: 32 }} />
              </div>
            )}

            {/* Format badge */}
            <div style={{
              position: "absolute", top: 10, left: 10,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
              borderRadius: 6, padding: "3px 8px",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {IDEA.format}
              </span>
            </div>

            {/* Effort badge */}
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 6, padding: "3px 8px",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>
                <i className="fas fa-bolt me-1" style={{ fontSize: 9 }} />{IDEA.effort}
              </span>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: "16px 16px 0" }}>

            {/* Platform chips */}
            <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
              {IDEA.platforms.map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 4, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20, padding: "3px 9px" }}>
                  <PlatformIcon platform={p} size={11} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "capitalize" }}>{p}</span>
                </div>
              ))}
            </div>

            {/* Title */}
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.35, marginBottom: 6 }}>
              {IDEA.title}
            </div>

            {/* Hook */}
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12, fontStyle: "italic" }}>
              "{IDEA.hook}"
            </div>

            {/* Metadata rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 80, paddingTop: 1 }}>Objective</span>
                <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{IDEA.objective}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 80, paddingTop: 1 }}>Because</span>
                <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{IDEA.suggestedBecause}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 80, paddingTop: 1 }}>Reason</span>
                <span style={{ fontSize: 12, color: "#2563eb", lineHeight: 1.4, fontWeight: 500 }}>{IDEA.reason.split(".")[0]}.</span>
              </div>
            </div>
          </div>

          {/* Card actions */}
          <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                flex: 1, border: "1px solid #e2e8f0", background: "#fff",
                color: "#0f172a", borderRadius: 8, padding: "9px 0",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              <i className="fas fa-eye" style={{ fontSize: 12 }} /> Preview
            </button>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                flex: 1, border: "none", background: "#0f172a",
                color: "#fff", borderRadius: 8, padding: "9px 0",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <i className="fas fa-lightbulb" style={{ fontSize: 12 }} /> Use Idea
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL ────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <PreviewModal
          idea={IDEA}
          imageUrl={imageUrl}
          onClose={() => setModalOpen(false)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
