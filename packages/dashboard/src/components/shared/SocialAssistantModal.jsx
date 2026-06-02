import React, { useState, useEffect, useCallback } from "react";
import PlatformIcon from "./PlatformIcon";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiFetch(endpoint, opts = {}) {
  const token = localStorage.getItem("mpp_token");
  return fetch(`${API_BASE}${endpoint}`, {
    ...opts,
    headers: { Authorization: token ? `Bearer ${token}` : "", ...(opts.headers || {}) },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error(data.error || "Request failed"), data);
    return data;
  });
}

// ── Brand palette ──────────────────────────────────────────────────────────────
const BLUE      = "#2563eb";
const BLUE_BG   = "#eff6ff";
const DARK      = "#0f172a";
const MUTED     = "#64748b";
const LIGHT     = "#f8fafc";
const SIDEBAR   = "#0f172a";
const SIDEBAR_B = "#1e293b";

// ── Platform config ────────────────────────────────────────────────────────────
const PLATFORM_META = {
  facebook:  { label: "Facebook",  color: "#1877f2", bg: "#e7f0fd", supports: ["Image","Video","Carousel"] },
  instagram: { label: "Instagram", color: "#e1306c", bg: "#fdf0f4", supports: ["Image","Video","Carousel","Story"] },
  linkedin:  { label: "LinkedIn",  color: "#0a66c2", bg: "#e8f0fb", supports: ["Image","Video","Carousel","Document"] },
  x:         { label: "X",         color: "#000",    bg: "#f0f0f0", supports: ["Image","Video"] },
  tiktok:    { label: "TikTok",    color: "#010101", bg: "#f0f0f0", supports: ["Video"] },
  pinterest: { label: "Pinterest", color: "#e60023", bg: "#fde8ea", supports: ["Image","Video"] },
  threads:   { label: "Threads",   color: "#000",    bg: "#f0f0f0", supports: ["Image","Video"] },
  youtube:   { label: "YouTube",   color: "#ff0000", bg: "#fff0f0", supports: ["Video"] },
};

// ── Intentions ─────────────────────────────────────────────────────────────────
const INTENTIONS = [
  { id: "awareness",  label: "Build Awareness",     icon: "fas fa-bullhorn",       desc: "Reach new audiences"        },
  { id: "engagement", label: "Drive Engagement",    icon: "fas fa-comments",       desc: "Spark conversations"        },
  { id: "authority",  label: "Establish Authority", icon: "fas fa-crown",          desc: "Position as the expert"     },
  { id: "leadgen",    label: "Generate Leads",      icon: "fas fa-magnet",         desc: "Attract qualified prospects" },
  { id: "sales",      label: "Drive Sales",         icon: "fas fa-shopping-cart",  desc: "Convert to customers"       },
  { id: "community",  label: "Build Community",     icon: "fas fa-users",          desc: "Deepen relationships"       },
];

// ── Tones ──────────────────────────────────────────────────────────────────────
const TONES = [
  { id: "professional", label: "Professional",  icon: "fas fa-briefcase",      desc: "Authoritative, clear, no fluff"      },
  { id: "founder",      label: "Founder",       icon: "fas fa-rocket",         desc: "First-person, honest, behind-scenes" },
  { id: "educational",  label: "Educational",   icon: "fas fa-graduation-cap", desc: "Step-by-step, teach one clear thing" },
  { id: "premium",      label: "Premium",       icon: "fas fa-gem",            desc: "Elevated, calm, quality implied"     },
  { id: "community",    label: "Community",     icon: "fas fa-users",          desc: "Inclusive, warm, invites response"   },
  { id: "performance",  label: "Performance",   icon: "fas fa-chart-line",     desc: "Numbers-driven, urgent, proof-first" },
];

// ── CTAs ───────────────────────────────────────────────────────────────────────
const CTAS = [
  { id: "learn_more",    label: "Learn More",     icon: "fas fa-book-open",       example: "Tap to learn more →" },
  { id: "shop_now",      label: "Shop Now",       icon: "fas fa-shopping-bag",    example: "Shop the collection now" },
  { id: "sign_up",       label: "Sign Up",        icon: "fas fa-user-plus",       example: "Sign up — it's free" },
  { id: "download",      label: "Download",       icon: "fas fa-download",        example: "Download the free guide" },
  { id: "contact_us",    label: "Contact Us",     icon: "fas fa-phone",           example: "Reach out today" },
  { id: "book_now",      label: "Book Now",       icon: "fas fa-calendar-check",  example: "Book your spot now" },
  { id: "get_quote",     label: "Get Quote",      icon: "fas fa-file-invoice",    example: "Get your free quote" },
  { id: "visit_website", label: "Visit Website",  icon: "fas fa-globe",           example: "Visit our website" },
  { id: "send_message",  label: "Send Message",   icon: "fas fa-paper-plane",     example: "Message us directly" },
  { id: "comment_below", label: "Comment Below",  icon: "fas fa-comment-dots",    example: "Drop your answer below 👇" },
  { id: "save_this",     label: "Save This",      icon: "fas fa-bookmark",        example: "Save this for later" },
  { id: "share",         label: "Share",          icon: "fas fa-share-alt",       example: "Share this with someone who needs it" },
  { id: "watch",         label: "Watch",          icon: "fas fa-play-circle",     example: "Watch the full video" },
  { id: "subscribe",     label: "Subscribe",      icon: "fas fa-bell",            example: "Subscribe for more" },
  { id: "dm_us",         label: "DM Us",          icon: "fas fa-envelope",        example: "DM us the word GROW" },
  { id: "start_trial",   label: "Start Trial",    icon: "fas fa-flask",           example: "Start your free trial" },
  { id: "get_started",   label: "Get Started",    icon: "fas fa-play",            example: "Get started today" },
  { id: "register",      label: "Register",       icon: "fas fa-id-card",         example: "Register for free" },
  { id: "apply",         label: "Apply",          icon: "fas fa-check-square",    example: "Apply now — limited spots" },
  { id: "custom",        label: "Custom",         icon: "fas fa-pen",             example: "Write your own CTA" },
];

const STEP_LABELS = ["Primary Intention", "Target Platforms", "Voice & Tone", "Call to Action", "Generate"];
const TOTAL = 5;

// ── Left sidebar step nav ──────────────────────────────────────────────────────
function StepNav({ step, intention, platforms, tone, cta }) {
  const summaries = [
    INTENTIONS.find(i => i.id === intention)?.label,
    platforms.length ? `${platforms.length} platform${platforms.length > 1 ? "s" : ""}` : null,
    TONES.find(t => t.id === tone)?.label,
    CTAS.find(c => c.id === cta)?.label,
    null,
  ];

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < TOTAL - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: done ? BLUE : active ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.08)",
              border: `2px solid ${done ? BLUE : active ? BLUE : "rgba(255,255,255,0.15)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              {done
                ? <i className="fas fa-check" style={{ fontSize: 10, color: "#fff" }}></i>
                : <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.4)" }}>{num}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#fff" : done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", lineHeight: 1.3 }}>{label}</div>
              {summaries[i] && (
                <div style={{ fontSize: 10, color: done ? BLUE : "rgba(255,255,255,0.5)", marginTop: 2, fontWeight: done ? 600 : 400, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 140 }}>{summaries[i]}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Selection card ─────────────────────────────────────────────────────────────
function SelectCard({ selected, onClick, icon, label, desc }) {
  return (
    <button onClick={onClick} style={{
      border: `2px solid ${selected ? BLUE : "#e5e7eb"}`,
      background: selected ? BLUE_BG : "#fff",
      borderRadius: 10, cursor: "pointer",
      padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12,
      transition: "border-color 0.15s, background 0.15s", width: "100%", textAlign: "left",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: selected ? BLUE + "18" : "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={icon} style={{ fontSize: 15, color: selected ? BLUE : MUTED }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? BLUE : DARK, lineHeight: 1.25 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{desc}</div>}
      </div>
      {selected && <i className="fas fa-check-circle" style={{ color: BLUE, fontSize: 15, flexShrink: 0 }}></i>}
    </button>
  );
}

// ── Tone tile ──────────────────────────────────────────────────────────────────
function ToneTile({ selected, onClick, icon, label, desc }) {
  return (
    <button onClick={onClick} style={{
      border: `2px solid ${selected ? BLUE : "#e5e7eb"}`,
      background: selected ? BLUE_BG : "#fff",
      borderRadius: 10, cursor: "pointer",
      padding: "16px 10px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      transition: "border-color 0.15s, background 0.15s",
    }}>
      <i className={icon} style={{ fontSize: 22, color: selected ? BLUE : MUTED }}></i>
      <span style={{ fontSize: 12, fontWeight: 700, color: selected ? BLUE : DARK }}>{label}</span>
      {desc && <span style={{ fontSize: 10, color: MUTED, textAlign: "center", lineHeight: 1.3 }}>{desc}</span>}
    </button>
  );
}

// ── Generation animation ───────────────────────────────────────────────────────
const GEN_STEPS = [
  "Reading Brand DNA…",
  "Crafting hook & opening…",
  "Writing body copy…",
  "Generating hashtags…",
  "Building platform variants…",
  "Sourcing media suggestions…",
];

function GeneratingScreen({ platforms }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t < GEN_STEPS.length - 1 ? t + 1 : t)), 700);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, maxWidth: 360, padding: "40px 24px" }}>
        <div style={{ position: "relative", width: 72, height: 72 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #e5e7eb" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${BLUE}`, borderTopColor: "transparent", animation: "mppSpin 0.8s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-robot" style={{ fontSize: 26, color: BLUE }}></i>
          </div>
        </div>

        <div style={{ width: "100%" }}>
          {GEN_STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", opacity: i <= tick ? 1 : 0.2, transition: "opacity 0.3s" }}>
              <i
                className={i < tick ? "fas fa-check-circle" : "fas fa-circle-notch"}
                style={{ fontSize: 14, color: i < tick ? "#10b981" : BLUE, width: 18, animation: i === tick ? "mppSpin 1s linear infinite" : "none" }}
              ></i>
              <span style={{ fontSize: 13, fontWeight: i === tick ? 700 : 400, color: i === tick ? DARK : MUTED }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {platforms.map(p => {
            const m = PLATFORM_META[p];
            return m ? (
              <div key={p} style={{ background: m.bg, border: `1px solid ${m.color}30`, borderRadius: 20, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <PlatformIcon platform={p} size={13} />
                <span style={{ fontSize: 11, fontWeight: 600, color: m.color }}>{m.label}</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function SocialAssistantModal({ isOpen, onClose, onComplete, connections = [] }) {
  const [step,       setStep]       = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(null);
  const [intention,  setIntention]  = useState(null);
  const [platforms,  setPlatforms]  = useState([]);
  const [tone,       setTone]       = useState(null);
  const [cta,        setCta]        = useState(null);
  const [ctaSearch,  setCtaSearch]  = useState("");

  if (!isOpen) return null;

  const active  = connections.filter(c => c.status === "active");
  const expired = connections.filter(c => c.status === "error" || c.status === "expired");

  const togglePlatform = (key) =>
    setPlatforms(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);

  const canNext = () => {
    if (step === 1) return !!intention;
    if (step === 2) return platforms.length > 0;
    if (step === 3) return !!tone;
    if (step === 4) return !!cta;
    return true;
  };

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    const ctaObj = CTAS.find(c => c.id === cta);
    try {
      const data = await apiFetch("/api/customer/ai/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intention, platforms, tone, cta: ctaObj?.label || cta || "Learn More", count: 1 }),
      });
      const post = data?.posts?.[0];
      if (!post) throw new Error("No content generated — try again.");
      const result = {
        baseCaption: post.baseCaption || [post.hook, post.value, post.social_proof, post.cta, (post.hashtags || []).join(" ")].filter(Boolean).join("\n\n"),
        platformVariants: post.platformVariants || {},
        platforms,
        mediaRecommendations: [
          { type: "image",    label: "Brand visual",  query: `${intention} professional brand visual` },
          { type: "carousel", label: "Carousel post", query: `${intention} steps infographic` },
          { type: "video",    label: "Short clip",    query: `${intention} motion background` },
        ],
        mediaQuery: `${intention} ${tone} brand`,
      };
      setStep(1); setIntention(null); setPlatforms([]); setTone(null); setCta(null); setCtaSearch(""); setGenError(null);
      setGenerating(false);
      onComplete(result);
    } catch (err) {
      setGenError(err.message || "Generation failed — please try again.");
      setGenerating(false);
    }
  }, [intention, platforms, tone, cta, onComplete]);

  const filteredCtas = ctaSearch
    ? CTAS.filter(c => c.label.toLowerCase().includes(ctaSearch.toLowerCase()))
    : CTAS;

  return (
    <>
      <style>{`
        @keyframes mppSpin { to { transform: rotate(360deg); } }
        .mpp-modal-right::-webkit-scrollbar { width: 4px; }
        .mpp-modal-right::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1060, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ background: "#fff", borderRadius: 16, width: "90vw", maxWidth: 1080, height: "88vh", display: "flex", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.35)", flexDirection: "row" }}>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{ width: 240, background: SIDEBAR, flexShrink: 0, display: "flex", flexDirection: "column", borderRadius: "16px 0 0 16px" }}>
            {/* Logo header */}
            <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${SIDEBAR_B}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fas fa-robot" style={{ color: "#fff", fontSize: 16 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>AI Assistant</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>myPilotPost</div>
                </div>
              </div>
            </div>

            {/* Step nav */}
            {!generating && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <StepNav step={step} intention={intention} platforms={platforms} tone={tone} cta={cta} />
              </div>
            )}

            {generating && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  <i className="fas fa-magic" style={{ fontSize: 28, color: BLUE, display: "block", marginBottom: 10 }}></i>
                  Generating your post…
                </div>
              </div>
            )}

            {/* Footer close button */}
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${SIDEBAR_B}` }}>
              <button onClick={onClose} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

            {/* Right panel header */}
            {!generating && (
              <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
                {/* Horizontal step pills */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {STEP_LABELS.map((label, i) => {
                    const num = i + 1;
                    const done = step > num;
                    const active = step === num;
                    return (
                      <div key={num} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "4px 10px", borderRadius: 20,
                          background: done ? "#ecfdf5" : active ? BLUE_BG : "#f8fafc",
                          border: `1px solid ${done ? "#6ee7b7" : active ? "#bfdbfe" : "#e5e7eb"}`,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: done ? "#10b981" : active ? BLUE : "#94a3b8" }}>{num}</span>
                          <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: done ? "#10b981" : active ? BLUE : "#94a3b8" }}>{label}</span>
                          {done && <i className="fas fa-check" style={{ fontSize: 9, color: "#10b981" }}></i>}
                        </div>
                        {i < TOTAL - 1 && <span style={{ color: "#e5e7eb", fontSize: 12 }}>›</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: DARK, lineHeight: 1.2 }}>
                  {step === 1 && "What's the primary intention?"}
                  {step === 2 && "Where are you publishing?"}
                  {step === 3 && "What's the voice?"}
                  {step === 4 && "What should they do next?"}
                  {step === 5 && "Ready to generate"}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                  {step === 1 && "Pick one — everything will be optimised around this goal."}
                  {step === 2 && "Only your connected platforms are shown."}
                  {step === 3 && "The tone shapes every word in your post."}
                  {step === 4 && "The assistant will write a CTA optimised for this action."}
                  {step === 5 && "Review your brief then hit Generate — takes about 10 seconds."}
                </div>
              </div>
            )}

            {/* Right panel body */}
            <div className="mpp-modal-right" style={{ flex: 1, overflowY: "auto", padding: generating ? 0 : "22px 28px" }}>

              {generating && <GeneratingScreen platforms={platforms} />}

              {/* ── STEP 1: Intention ── */}
              {!generating && step === 1 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {INTENTIONS.map(opt => (
                    <SelectCard key={opt.id} selected={intention === opt.id} onClick={() => setIntention(opt.id)} icon={opt.icon} label={opt.label} desc={opt.desc} />
                  ))}
                </div>
              )}

              {/* ── STEP 2: Platforms ── */}
              {!generating && step === 2 && (
                <div>
                  {active.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8", border: "1px dashed #e5e7eb", borderRadius: 12, marginBottom: 16 }}>
                      <i className="fas fa-plug" style={{ fontSize: 32, marginBottom: 12 }}></i>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No platforms connected</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>Connect platforms in Integrations first.</div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: expired.length > 0 ? 20 : 0 }}>
                    {active.map(conn => {
                      const m = PLATFORM_META[conn.platform];
                      if (!m) return null;
                      const sel = platforms.includes(conn.platform);
                      return (
                        <button key={conn.platform} onClick={() => togglePlatform(conn.platform)} style={{
                          border: `2px solid ${sel ? m.color : "#e5e7eb"}`,
                          background: sel ? m.bg : "#fff",
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 12,
                          transition: "border-color 0.15s, background 0.15s", textAlign: "left",
                        }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: sel ? m.color + "15" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <PlatformIcon platform={conn.platform} size={22} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: sel ? m.color : DARK }}>{m.label}</div>
                            <div style={{ fontSize: 10, color: MUTED, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{conn.platform_username || "Connected"}</div>
                            <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                              {(m.supports || []).slice(0, 3).map(s => (
                                <span key={s} style={{ fontSize: 8, fontWeight: 700, background: sel ? m.color + "20" : "#f1f5f9", color: sel ? m.color : MUTED, borderRadius: 3, padding: "1px 5px", textTransform: "uppercase" }}>{s}</span>
                              ))}
                            </div>
                          </div>
                          {sel && <i className="fas fa-check-circle" style={{ color: m.color, fontSize: 18, flexShrink: 0 }}></i>}
                        </button>
                      );
                    })}
                  </div>

                  {expired.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Reconnection required</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {expired.map(conn => {
                          const m = PLATFORM_META[conn.platform];
                          if (!m) return null;
                          return (
                            <div key={conn.platform} style={{ border: "1px solid #fecaca", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, background: "#fef2f2" }}>
                              <PlatformIcon platform={conn.platform} size={16} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>{m.label}</span>
                              <span style={{ fontSize: 9, color: "#f87171", background: "#fee2e2", borderRadius: 3, padding: "1px 6px" }}>Reconnect</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Tone ── */}
              {!generating && step === 3 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {TONES.map(t => <ToneTile key={t.id} selected={tone === t.id} onClick={() => setTone(t.id)} icon={t.icon} label={t.label} desc={t.desc} />)}
                </div>
              )}

              {/* ── STEP 4: CTA ── */}
              {!generating && step === 4 && (
                <div>
                  <input
                    type="text"
                    placeholder="Search CTAs…"
                    value={ctaSearch}
                    onChange={e => setCtaSearch(e.target.value)}
                    style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 14px", fontSize: 13, marginBottom: 12, outline: "none", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {filteredCtas.map(c => (
                      <button key={c.id} onClick={() => setCta(c.id)} style={{
                        border: `2px solid ${cta === c.id ? BLUE : "#e5e7eb"}`,
                        background: cta === c.id ? BLUE_BG : "#fff",
                        borderRadius: 9, padding: "11px 14px",
                        display: "flex", alignItems: "center", gap: 10,
                        cursor: "pointer", transition: "border-color 0.12s, background 0.12s", textAlign: "left",
                      }}>
                        <div style={{ width: 32, height: 32, borderRadius: 7, background: cta === c.id ? BLUE + "18" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className={c.icon} style={{ fontSize: 13, color: cta === c.id ? BLUE : MUTED }}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: cta === c.id ? BLUE : DARK }}>{c.label}</div>
                          <div style={{ fontSize: 10, color: MUTED, marginTop: 2, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>e.g. "{c.example}"</div>
                        </div>
                        {cta === c.id && <i className="fas fa-check-circle" style={{ color: BLUE, fontSize: 14, flexShrink: 0 }}></i>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 5: Summary ── */}
              {!generating && step === 5 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Left: Brief summary */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Your brief</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Intention", value: INTENTIONS.find(i => i.id === intention)?.label, icon: INTENTIONS.find(i => i.id === intention)?.icon || "fas fa-bullseye" },
                        { label: "Tone",      value: TONES.find(t => t.id === tone)?.label,           icon: TONES.find(t => t.id === tone)?.icon || "fas fa-microphone" },
                        { label: "CTA",       value: CTAS.find(c => c.id === cta)?.label,             icon: CTAS.find(c => c.id === cta)?.icon  || "fas fa-arrow-right" },
                      ].map(r => (
                        <div key={r.label} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                          <i className={r.icon} style={{ color: BLUE, fontSize: 16, width: 20, textAlign: "center" }}></i>
                          <div>
                            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{r.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{r.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Platforms</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {platforms.map(p => {
                          const m = PLATFORM_META[p];
                          return m ? (
                            <div key={p} style={{ background: m.bg, border: `1px solid ${m.color}40`, borderRadius: 20, padding: "5px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                              <PlatformIcon platform={p} size={14} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: What will be generated */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Will generate</div>
                    <div style={{ background: LIGHT, border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px" }}>
                      {[
                        { icon: "fas fa-bolt",       label: "Hook",              sub: "Scroll-stopping opener"            },
                        { icon: "fas fa-align-left",  label: "Body copy",         sub: "On-brand, tone-matched"            },
                        { icon: "fas fa-star",        label: "Social proof",      sub: "Result, stat, or credential"       },
                        { icon: "fas fa-arrow-right", label: "CTA",               sub: "Action-driving close"              },
                        { icon: "fas fa-hashtag",     label: "Hashtags",          sub: "Platform-optimised mix"            },
                        { icon: "fas fa-clone",       label: "Platform variants", sub: `Adapted for ${platforms.length} platform${platforms.length > 1 ? "s" : ""}` },
                      ].map(g => (
                        <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: BLUE_BG, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={g.icon} style={{ color: BLUE, fontSize: 13 }}></i>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{g.label}</div>
                            <div style={{ fontSize: 10, color: MUTED }}>{g.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer nav ── */}
            {!generating && (
              <div style={{ borderTop: "1px solid #f1f5f9", background: LIGHT, flexShrink: 0 }}>
                {genError && (
                  <div style={{ padding: "8px 28px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="fas fa-exclamation-circle"></i> {genError}
                  </div>
                )}
                <div style={{ padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                    style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#475569", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {step === 1 ? "Cancel" : "← Back"}
                  </button>
                  {step < TOTAL ? (
                    <button
                      onClick={() => setStep(s => s + 1)}
                      disabled={!canNext()}
                      style={{ border: "none", background: canNext() ? BLUE : "#e5e7eb", color: canNext() ? "#fff" : "#94a3b8", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed", transition: "background 0.15s" }}
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      onClick={generate}
                      style={{ border: "none", background: BLUE, color: "#fff", borderRadius: 8, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
                    >
                      <i className="fas fa-magic"></i> Generate with AI
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
