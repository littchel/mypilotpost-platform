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

const IDEA = {
  title: "How founders accidentally kill trust",
  platforms: ["instagram", "linkedin"],
  format: "Carousel",
  effort: "20 min",
  pexelsQuery: "entrepreneur office candid authentic moment",
  postCopy: `The thing nobody tells you about building trust online:

It's not what you post.

It's what you accidentally reveal.

Here are the 3 things founders do that quietly erode credibility — and most have no idea they're doing it.

1. Over-polishing every post
Your audience can smell perfection. It reads as performance, not authenticity.

2. Only showing wins
People trust people who've lost something. Share the loss.

3. Disappearing after a bad quarter
Radio silence = red flag. Consistency in hard times is the signal.

The founders people trust most are the ones who stay visible even when it's uncomfortable.

Which one are you guilty of?

#FounderLife #ContentStrategy #BuildInPublic`,
  aiReasoning: {
    brandDNA: "Your tone profile is direct and authority-led. Carousel formats match your top-performing content type by 2.4×.",
    brandIntel: "This topic is trending +38% in your niche this week. Competitors posting similar content are seeing above-average saves.",
    calendar: "You haven't posted in 6 days. Tuesday 9am is your highest-reach window — this idea is ready to go.",
    campaign: "Aligns with your Q2 trust-building campaign. Seeds warm audience before your mid-June offer window.",
    audience: "Your followers over-index on founder/operator content. This format generates 3× more saves than product posts.",
  },
};

// ── Instagram post render ─────────────────────────────────────────────────────
function PostRender({ imageUrl, copy }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dbdbdb", borderRadius: 4, maxWidth: 360, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>YB</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>Your Brand</div>
          <div style={{ fontSize: 11, color: "#8e8e8e" }}>Sponsored</div>
        </div>
        <div style={{ marginLeft: "auto", color: "#8e8e8e", fontSize: 16 }}>•••</div>
      </div>
      <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", background: "#f1f5f9" }}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="spinner-border" style={{ width: 22, height: 22, borderWidth: 2, color: "#0ea5e9" }} />
            </div>
        }
      </div>
      <div style={{ padding: "8px 12px 4px", display: "flex", gap: 14, fontSize: 20, color: "#262626" }}>
        <i className="far fa-heart" />
        <i className="far fa-comment" />
        <i className="far fa-paper-plane" />
        <i className="far fa-bookmark" style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ padding: "4px 12px 14px" }}>
        <div style={{ fontSize: 13, color: "#262626", lineHeight: 1.6, maxHeight: 180, overflowY: "auto" }}>
          <strong>yourbrand</strong>{" "}
          {copy.split("\n").map((line, i) => (
            <React.Fragment key={i}>{line}{i < copy.split("\n").length - 1 && <br />}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Reasoning panel ───────────────────────────────────────────────────────────
function WhySuggested({ r }) {
  const rows = [
    { icon: "fas fa-dna",          label: "Brand DNA",          color: "#7c3aed", body: r.brandDNA },
    { icon: "fas fa-brain",        label: "Brand Intelligence", color: "#2563eb", body: r.brandIntel },
    { icon: "fas fa-calendar-alt", label: "Calendar Signal",    color: "#0891b2", body: r.calendar },
    { icon: "fas fa-flag",         label: "Campaign",           color: "#059669", body: r.campaign },
    { icon: "fas fa-users",        label: "Audience",           color: "#d97706", body: r.audience },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
        Why this was suggested
      </div>
      {rows.map(row => (
        <div key={row.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: row.color + "12", border: `1px solid ${row.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={row.icon} style={{ color: row.color, fontSize: 11 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{row.label}</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{row.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ imageUrl, onClose, onApprove, onReject }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 3000, backdropFilter: "blur(3px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(860px, 94vw)", maxHeight: "88vh",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
        zIndex: 3001, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Content Preview</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          <div style={{ width: "44%", borderRight: "1px solid #f1f5f9", padding: "22px 20px", overflowY: "auto", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, alignSelf: "flex-start" }}>Instagram</div>
            <PostRender imageUrl={imageUrl} copy={IDEA.postCopy} />
          </div>
          <div style={{ flex: 1, padding: "22px 20px", overflowY: "auto" }}>
            <WhySuggested r={IDEA.aiReasoning} />
          </div>
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onReject} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <i className="fas fa-times me-2" />Reject
          </button>
          <button onClick={onApprove} style={{ border: "none", background: "#0f172a", color: "#fff", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <i className="fas fa-check me-2" />Approve This Direction
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudioLab() {
  const [imageUrl, setImageUrl]   = useState(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback]   = useState(null);

  useEffect(() => {
    apiFetch("/api/customer/media/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: IDEA.pexelsQuery }),
    })
      .then(d => {
        const item = (d?.items || [])[0];
        if (item?.thumbnail_url) setImageUrl(item.thumbnail_url);
        else if (item?.preview_url) setImageUrl(item.preview_url);
      })
      .catch(() => {})
      .finally(() => setImgLoading(false));
  }, []);

  const approve = () => { setFeedback("approved"); setModalOpen(false); };
  const reject  = () => { setFeedback("rejected"); setModalOpen(false); };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Temp banner */}
      <div style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a", padding: "7px 20px", textAlign: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.6 }}>
          <i className="fas fa-flask me-2" style={{ fontSize: 10 }} />
          Temporary Preview — Will Be Deleted
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: "32px 20px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
          AI Content Studio — Design Lab
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Testing visual content discovery before implementation</div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ margin: "0 auto 24px", maxWidth: 360, padding: "12px 16px", borderRadius: 10, background: feedback === "approved" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${feedback === "approved" ? "#bbf7d0" : "#fecaca"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <i className={`fas fa-${feedback === "approved" ? "check-circle" : "times-circle"}`} style={{ color: feedback === "approved" ? "#10b981" : "#ef4444", fontSize: 16, flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: feedback === "approved" ? "#065f46" : "#991b1b" }}>
            {feedback === "approved" ? "Direction approved." : "Direction rejected."}
          </div>
        </div>
      )}

      {/* Card — centered */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 20px 60px" }}>
        <div style={{ width: 300, borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.13)", border: "1px solid rgba(0,0,0,0.06)" }}>

          {/* ── Image area — 80% of card ────────────────────────────────── */}
          <div style={{ position: "relative", width: "100%", height: 360, background: "#e2e8f0", overflow: "hidden" }}>

            {/* Image */}
            {imgLoading ? (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="spinner-border" style={{ width: 24, height: 24, borderWidth: 2.5, color: "#64748b" }} />
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#94a3b8" }} />
            )}

            {/* Format + effort — top row */}
            <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: 6, padding: "4px 9px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {IDEA.format}
                </span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: 6, padding: "4px 9px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  {IDEA.effort}
                </span>
              </div>
            </div>

            {/* Platform icons — bottom row */}
            <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 5, alignItems: "center" }}>
              {IDEA.platforms.map(p => (
                <div key={p} style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "3px 8px 3px 5px", display: "flex", alignItems: "center", gap: 4 }}>
                  <PlatformIcon platform={p} size={12} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom strip — 20% of card ─────────────────────────────── */}
          <div style={{ padding: "12px 14px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {IDEA.title}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
              Suggested because of recent engagement
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => setModalOpen(true)}
                style={{ flex: 1, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Preview
              </button>
              <button
                onClick={() => setModalOpen(true)}
                style={{ flex: 1, border: "none", background: "#0f172a", color: "#fff", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Use Idea
              </button>
            </div>
          </div>

        </div>
      </div>

      {modalOpen && (
        <PreviewModal imageUrl={imageUrl} onClose={() => setModalOpen(false)} onApprove={approve} onReject={reject} />
      )}
    </div>
  );
}
