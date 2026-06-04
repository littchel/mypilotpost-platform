import React, { useState, useEffect } from "react";
import PlatformIcon from "../components/shared/PlatformIcon";

// Hardcoded Pexels CDN URL — no auth needed, guaranteed real photo
const PEXELS_URL =
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1";

// Secondary fallbacks if first fails
const FALLBACKS = [
  "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
  "https://images.pexels.com/photos/3760809/pexels-photo-3760809.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
];

const IDEA = {
  title: "How founders accidentally kill trust",
  platforms: ["instagram", "linkedin"],
  format: "Carousel",
  effort: "20 min",
  postCopy: `The thing nobody tells you about building trust online:

It's not what you post. It's what you accidentally reveal.

Here are the 3 things founders do that quietly erode credibility — and most have no idea they're doing it.

1. Over-polishing every post
Your audience can smell perfection. It reads as performance, not authenticity.

2. Only showing wins
People trust people who've lost something. Share the loss.

3. Disappearing after a bad quarter
Radio silence = red flag. Consistency in hard times is the signal.

Which one are you guilty of?

#FounderLife #ContentStrategy #BuildInPublic`,
};

// ── Preload an image URL, returns promise resolving to that URL ───────────────
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Accordion item ────────────────────────────────────────────────────────────
function AccordionRow({ label, body, open, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "11px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{label}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ paddingBottom: 12, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {body}
        </div>
      )}
    </div>
  );
}

// ── Post render (Instagram-style) ────────────────────────────────────────────
function PostRender({ imageUrl }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dbdbdb", borderRadius: 4, maxWidth: 340, width: "100%" }}>
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
      <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: "8px 12px 4px", display: "flex", gap: 14, fontSize: 20, color: "#262626" }}>
        <i className="far fa-heart" />
        <i className="far fa-comment" />
        <i className="far fa-paper-plane" />
        <i className="far fa-bookmark" style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ padding: "4px 12px 14px", fontSize: 13, color: "#262626", lineHeight: 1.6, maxHeight: 200, overflowY: "auto" }}>
        <strong>yourbrand</strong>{" "}
        {IDEA.postCopy.split("\n").map((line, i, arr) => (
          <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ imageUrl, onClose, onApprove, onReject }) {
  const [openRow, setOpenRow] = useState(0);

  const rows = [
    {
      label: "Why suggested",
      body: "Your brand tone is direct and authority-led. Carousel formats are your top-performing content type. You haven't posted in 6 days — Tuesday 9am is your peak reach window.",
    },
    {
      label: "Brand signals",
      body: "This topic is trending +38% in your niche. Competitors posting similar content are seeing 2× above-average saves this week.",
    },
    {
      label: "Campaign alignment",
      body: "Aligned with your Q2 trust-building campaign. Seeds warm audience before your mid-June offer window.",
    },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 3000, backdropFilter: "blur(3px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(820px, 94vw)", maxHeight: "88vh",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
        zIndex: 3001, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Content Preview</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* LEFT — post render */}
          <div style={{ width: "46%", borderRight: "1px solid #f1f5f9", padding: "20px 18px", overflowY: "auto", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, alignSelf: "flex-start" }}>
              Instagram
            </div>
            <PostRender imageUrl={imageUrl} />
          </div>

          {/* RIGHT — accordion */}
          <div style={{ flex: 1, padding: "20px 18px", overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Intelligence
            </div>
            {rows.map((row, i) => (
              <AccordionRow
                key={i}
                label={row.label}
                body={row.body}
                open={openRow === i}
                onToggle={() => setOpenRow(openRow === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onReject} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Reject
          </button>
          <button onClick={onApprove} style={{ border: "none", background: "#0f172a", color: "#fff", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Approve This Direction
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudioLab() {
  const [imageUrl, setImageUrl]   = useState(null);
  const [imgReady, setImgReady]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback]   = useState(null);

  // Preload image chain — card only renders once we have a confirmed loaded image
  useEffect(() => {
    async function load() {
      for (const url of [PEXELS_URL, ...FALLBACKS]) {
        try {
          await preloadImage(url);
          setImageUrl(url);
          setImgReady(true);
          return;
        } catch {
          // try next
        }
      }
      // All failed — show card anyway with broken img (last resort)
      setImageUrl(PEXELS_URL);
      setImgReady(true);
    }
    load();
  }, []);

  const approve = () => { setFeedback("approved"); setModalOpen(false); };
  const reject  = () => { setFeedback("rejected"); setModalOpen(false); };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Temp banner */}
      <div style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a", padding: "7px 20px", textAlign: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.6 }}>
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
        <div style={{ margin: "0 auto 24px", maxWidth: 340, padding: "12px 16px", borderRadius: 10, background: feedback === "approved" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${feedback === "approved" ? "#bbf7d0" : "#fecaca"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <i className={`fas fa-${feedback === "approved" ? "check-circle" : "times-circle"}`} style={{ color: feedback === "approved" ? "#10b981" : "#ef4444", fontSize: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: feedback === "approved" ? "#065f46" : "#991b1b" }}>
            {feedback === "approved" ? "Direction approved." : "Direction rejected."}
          </span>
        </div>
      )}

      {/* Card — only renders when image is preloaded */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 20px 60px" }}>
        {!imgReady ? (
          <div style={{ paddingTop: 60, color: "#94a3b8", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{
            width: 300,
            maxHeight: 520,
            borderRadius: 14,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
          }}>

            {/* ── IMAGE — 80% ──────────────────────────────────────────────── */}
            <div style={{ position: "relative", width: "100%", height: 406, flexShrink: 0, overflow: "hidden" }}>
              <img
                src={imageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />

              {/* Format + effort top row */}
              <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between" }}>
                <div style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(6px)", borderRadius: 6, padding: "4px 9px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {IDEA.format}
                  </span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(6px)", borderRadius: 6, padding: "4px 9px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{IDEA.effort}</span>
                </div>
              </div>

              {/* Platform chips bottom row */}
              <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 5 }}>
                {IDEA.platforms.map(p => (
                  <div key={p} style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "3px 8px 3px 5px", display: "flex", alignItems: "center", gap: 4 }}>
                    <PlatformIcon platform={p} size={11} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BOTTOM — 20% ─────────────────────────────────────────────── */}
            <div style={{ padding: "12px 14px 14px", flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {IDEA.title}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 11 }}>
                Suggested for your audience
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
        )}
      </div>

      {modalOpen && (
        <PreviewModal
          imageUrl={imageUrl}
          onClose={() => setModalOpen(false)}
          onApprove={approve}
          onReject={reject}
        />
      )}
    </div>
  );
}
