import React, { useState, useEffect } from "react";
import PlatformIcon from "../components/shared/PlatformIcon";

// Hardcoded Pexels CDN URLs — no auth needed
const PEXELS_URLS = [
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&dpr=1",
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

Here are the 3 things founders do that quietly erode credibility.

1. Over-polishing every post
Your audience can smell perfection. It reads as performance.

2. Only showing wins
People trust people who've lost something. Share the loss.

3. Disappearing after a bad quarter
Radio silence = red flag. Consistency in hard times is the signal.

Which one are you guilty of?

#FounderLife #ContentStrategy #BuildInPublic`,
};

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Accordion row ─────────────────────────────────────────────────────────────
function AccordionRow({ label, body, open, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{label}</span>
        <i
          className={`fas fa-chevron-${open ? "up" : "down"}`}
          style={{ fontSize: 10, color: "var(--slate-400)", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div style={{ paddingBottom: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          {body}
        </div>
      )}
    </div>
  );
}

// ── Instagram post render ─────────────────────────────────────────────────────
function PostRender({ imageUrl }) {
  return (
    <div style={{
      background: "var(--surface-primary)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      maxWidth: 340, width: "100%",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: "var(--pilot-blue)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>YB</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Your Brand</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sponsored</div>
        </div>
        <div style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>•••</div>
      </div>
      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      {/* Actions */}
      <div style={{ padding: "8px 12px 4px", display: "flex", gap: 14, fontSize: 20, color: "var(--text-main)" }}>
        <i className="far fa-heart" />
        <i className="far fa-comment" />
        <i className="far fa-paper-plane" />
        <i className="far fa-bookmark" style={{ marginLeft: "auto" }} />
      </div>
      {/* Caption */}
      <div style={{ padding: "4px 12px 14px", fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.6, maxHeight: 200, overflowY: "auto" }}>
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
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 3000, backdropFilter: "blur(3px)" }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(820px, 94vw)", maxHeight: "88vh",
        background: "var(--surface-primary)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
        zIndex: 3001, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          background: "var(--surface-primary)",
        }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Content Preview</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "var(--slate-400)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          {/* LEFT — post render */}
          <div style={{
            width: "46%", borderRight: "1px solid var(--border-subtle)",
            padding: "20px 16px", overflowY: "auto",
            background: "var(--surface-secondary)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", alignSelf: "flex-start" }}>
              Instagram
            </div>
            <PostRender imageUrl={imageUrl} />
          </div>

          {/* RIGHT — accordion */}
          <div style={{ flex: 1, padding: "20px 20px", overflowY: "auto", background: "var(--surface-primary)" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
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
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-secondary)",
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button
            onClick={onReject}
            style={{
              border: "1px solid var(--status-danger)", background: "var(--surface-primary)",
              color: "var(--status-danger)",
              borderRadius: "var(--radius-md)", padding: "8px 16px",
              fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              transition: "0.2s ease",
            }}
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            style={{
              border: "none", background: "var(--pilot-blue)", color: "#fff",
              borderRadius: "var(--radius-md)", padding: "8px 20px",
              fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
              transition: "0.2s ease",
            }}
          >
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

  useEffect(() => {
    async function load() {
      for (const url of PEXELS_URLS) {
        try {
          await preloadImage(url);
          setImageUrl(url);
          setImgReady(true);
          return;
        } catch {
          // try next
        }
      }
      setImageUrl(PEXELS_URLS[0]);
      setImgReady(true);
    }
    load();
  }, []);

  const approve = () => { setFeedback("approved"); setModalOpen(false); };
  const reject  = () => { setFeedback("rejected"); setModalOpen(false); };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--hover-bg)",
      fontFamily: "Inter, system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>

      {/* Temp banner */}
      <div style={{
        background: "var(--surface-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "8px 20px", textAlign: "center",
      }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--status-warning)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <i className="fas fa-flask me-2" style={{ fontSize: 10 }} />
          Temporary Preview — Will Be Deleted
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: "32px 20px 28px", textAlign: "center" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--pilot-blue)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          AI Content Studio — Design Lab
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Testing visual content discovery before implementation
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          margin: "0 auto 24px", maxWidth: 340,
          padding: "12px 16px", borderRadius: "var(--radius-lg)",
          background: "var(--surface-primary)",
          border: `1px solid var(--${feedback === "approved" ? "status-success" : "status-danger"})`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <i
            className={`fas fa-${feedback === "approved" ? "check-circle" : "times-circle"}`}
            style={{ color: `var(--${feedback === "approved" ? "status-success" : "status-danger"})`, fontSize: 16, flexShrink: 0 }}
          />
          <span style={{
            fontSize: "0.85rem", fontWeight: 600,
            color: `var(--${feedback === "approved" ? "status-success" : "status-danger"})`,
          }}>
            {feedback === "approved" ? "Direction approved." : "Direction rejected."}
          </span>
        </div>
      )}

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 20px 60px" }}>
        {!imgReady ? (
          <div style={{ paddingTop: 60, color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
        ) : (
          <div style={{
            width: 300,
            maxHeight: 520,
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            background: "var(--surface-primary)",
            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
            border: "1px solid var(--border-subtle)",
            display: "flex", flexDirection: "column",
          }}>

            {/* ── IMAGE 80% ──────────────────────────────────────────────── */}
            <div style={{ position: "relative", width: "100%", height: 408, flexShrink: 0, overflow: "hidden" }}>
              <img
                src={imageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />

              {/* Format + effort — top */}
              <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between" }}>
                <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "4px 8px" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {IDEA.format}
                  </span>
                </div>
                <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)", borderRadius: "var(--radius-md)", padding: "4px 8px" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff" }}>{IDEA.effort}</span>
                </div>
              </div>

              {/* Platform chips — bottom */}
              <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 4 }}>
                {IDEA.platforms.map(p => (
                  <div key={p} style={{
                    background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)",
                    borderRadius: "var(--radius-md)", padding: "3px 8px 3px 5px",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <PlatformIcon platform={p} size={11} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BOTTOM 20% ─────────────────────────────────────────────── */}
            <div style={{ padding: "12px 16px 16px", flex: 1 }}>
              <div style={{
                fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)",
                lineHeight: 1.3, marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {IDEA.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                Suggested for your audience
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{
                    flex: 1,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--surface-secondary)",
                    color: "var(--text-main)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 0",
                    fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                    transition: "0.2s ease",
                  }}
                >
                  Preview
                </button>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "var(--pilot-blue)",
                    color: "#fff",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 0",
                    fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                    transition: "0.2s ease",
                  }}
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
