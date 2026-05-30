import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import Sidebar from "./Sidebar";
import Header from "./Header";
import FloatingChat from "../specialized/FloatingChat";
import EmailVerificationBanner from "../shared/EmailVerificationBanner";
import { apiRequest } from "../../lib/api/client";

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META = {
  "Platform Health":         { label: "Platform Alert",     color: "#dc2626", bg: "#fff1f2", border: "#fca5a5" },
  "Content Intelligence":    { label: "Content Gap",        color: "#7c3aed", bg: "#faf5ff", border: "#c4b5fd" },
  "Audience Intelligence":   { label: "Audience Shift",     color: "#0891b2", bg: "#ecfeff", border: "#67e8f9" },
  "Competitive Moat Map":    { label: "Competitive Alert",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  "SEO Intelligence":        { label: "SEO Opportunity",    color: "#059669", bg: "#f0fdf4", border: "#6ee7b7" },
  "Conversion Intelligence": { label: "Conversion Leak",    color: "#dc2626", bg: "#fff1f2", border: "#fca5a5" },
  "Campaign Intelligence":   { label: "Campaign Signal",    color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  "Growth Engine":           { label: "Growth Opportunity", color: "#059669", bg: "#f0fdf4", border: "#6ee7b7" },
};

const ACTION_LABELS = {
  "Platform Health":         "Fix Platform Issue",
  "Content Intelligence":    "Create Content",
  "Audience Intelligence":   "Review Audience",
  "Competitive Moat Map":    "View Competitor Report",
  "SEO Intelligence":        "Improve SEO",
  "Conversion Intelligence": "Fix Conversion Path",
  "Campaign Intelligence":   "Review Campaign",
  "Growth Engine":           "Launch Campaign",
};

const DEFAULT_META = { label: "Intelligence", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" };

function getMeta(item)        { return CATEGORY_META[item?.category] || CATEGORY_META[item?.module_id] || DEFAULT_META; }
function getActionLabel(item) { return ACTION_LABELS[item?.category] || ACTION_LABELS[item?.module_id] || "View Intelligence"; }

// ── Humanize raw DB outputs ───────────────────────────────────────────────────

const TITLE_HUMANIZE = {
  "No Publishing Activity":       "Your Publishing Pipeline Is Empty",
  "No SEO Data":                  "SEO Intelligence Awaiting Data",
  "No Content Performance Data":  "Content Performance Not Yet Tracked",
  "No Audience Data":             "Audience Intelligence Pending",
  "No Competitive Data":          "Competitive Landscape Not Yet Mapped",
  "No Conversion Data":           "Conversion Pathway Not Yet Tracked",
  "No Campaign Data":             "No Active Campaigns Detected",
  "No Platform Data":             "Platform Health Check Pending",
  "Insufficient Data":            "Building Your Intelligence Baseline",
  "No Social Media Data":         "Social Intelligence Initialising",
};

const FINDING_HUMANIZE = {
  "No publishing activity detected.":         "Publish content to your connected platforms to unlock strategic analysis.",
  "No SEO data available.":                   "Connect your website analytics to unlock SEO positioning and keyword opportunity mapping.",
  "No content performance data available.":   "Publish content and allow 24–48 hours for performance data to populate.",
  "No audience data available.":              "Audience intelligence builds as your platforms accumulate engagement data.",
  "No competitive data available.":           "Competitive signals emerge once your brand has sufficient publishing history.",
  "No conversion data available.":            "Connect your website or landing pages to begin tracking content-to-conversion.",
};

function humanize(item) {
  if (!item) return item;
  const title   = TITLE_HUMANIZE[item.title?.trim()]    || item.title;
  const finding = FINDING_HUMANIZE[item.finding?.trim()] || item.finding;
  return (title !== item.title || finding !== item.finding) ? { ...item, title, finding } : item;
}

function oneSentence(text) {
  if (!text) return "";
  const m = text.match(/[^.!?]+[.!?]+/);
  return m ? m[0].trim() : text.slice(0, 120);
}

// ── Intelligence preview card (sidebar only) ──────────────────────────────────

const PREVIEW_CSS = `
@keyframes intelGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
  50%       { box-shadow: 0 0 0 6px rgba(37,99,235,0.12); }
}
@keyframes intelSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.intel-preview-card     { transition: transform 0.18s ease; }
.intel-preview-card-new { animation: intelSlideIn 0.32s ease forwards; }
`;

const IntelPreviewCard = ({ item, onDismiss, isNew }) => {
  const meta        = getMeta(item);
  const actionLabel = getActionLabel(item);

  return (
    <motion.div
      key={item.id}
      className={`intel-preview-card${isNew ? " intel-preview-card-new" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        background: "#fff",
        border: `1px solid ${meta.border}`,
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 12,
        padding: "12px 13px",
        animation: "intelGlow 2.5s ease-in-out 3",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Category + Dismiss */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8,
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 99, padding: "2px 8px", lineHeight: 1.5, flexShrink: 0,
        }}>
          {meta.label}
        </span>
        <button
          title="Dismiss"
          onClick={() => onDismiss(item)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "1px 3px", fontSize: 12, color: "#cbd5e1", lineHeight: 1,
            transition: "color 0.15s", flexShrink: 0, marginLeft: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#cbd5e1"; }}
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.4, marginBottom: 6,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {item.title}
      </div>

      {/* Insight — one sentence */}
      <div style={{
        fontSize: 12, color: "#475569", lineHeight: 1.55, marginBottom: 13,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {oneSentence(item.finding)}
      </div>

      {/* CTA */}
      <button
        style={{
          display: "block", width: "100%",
          background: meta.color,
          border: "none", borderRadius: 8, padding: "9px 0",
          fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
          letterSpacing: 0.1,
        }}
      >
        {actionLabel} →
      </button>
    </motion.div>
  );
};

// ── Brand Intelligence sidebar preview ────────────────────────────────────────

const BrandIntelligencePreview = ({ feed = [], brandId, switchTab }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed,  setDismissed]  = useState(new Set());
  const hoveredRef = useRef(false);
  const timerRef   = useRef(null);
  const styleRef   = useRef(false);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const el = document.createElement("style");
    el.textContent = PREVIEW_CSS;
    document.head.appendChild(el);
  }, []);

  const activeItems = feed.filter(i => !dismissed.has(i.id));
  const current     = activeItems.length > 0 ? humanize(activeItems[currentIdx % activeItems.length]) : null;

  useEffect(() => {
    clearInterval(timerRef.current);
    if (activeItems.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!hoveredRef.current) setCurrentIdx(p => p + 1);
    }, 20000);
    return () => clearInterval(timerRef.current);
  }, [activeItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = async (item) => {
    setDismissed(prev => new Set([...prev, item.id]));
    try { await apiRequest(`/api/customer/intelligence/dismiss/${item.id}`, { method: "POST" }); } catch {}
  };

  if (feed.length === 0) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
        border: "1px solid #e2e8f0", borderRadius: 12,
        padding: "18px 14px", textAlign: "center",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 10px",
          boxShadow: "0 0 0 8px rgba(37,99,235,0.05)",
        }}>
          <i className="fas fa-brain" style={{ fontSize: 16, color: "#2563eb" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>
          Brand Intelligence
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, marginBottom: 12 }}>
          Connect at least 2 platforms to unlock daily intelligence.
        </div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            display: "block", width: "100%",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            border: "none", borderRadius: 8, padding: "10px 0",
            fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}
        >
          Run Intelligence →
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{
        background: "#f0fdf4", border: "1px solid #86efac",
        borderRadius: 12, padding: "14px", textAlign: "center",
      }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
          All insights reviewed
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>
          New intelligence delivers in the next daily cycle.
        </div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            display: "block", width: "100%",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            border: "none", borderRadius: 8, padding: "9px 0",
            fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}
        >
          View Intelligence →
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      <AnimatePresence mode="wait">
        <IntelPreviewCard
          key={current.id}
          item={current}
          onDismiss={handleDismiss}
          isNew={false}
        />
      </AnimatePresence>

      {/* Dot nav */}
      {activeItems.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
          {activeItems.slice(0, 8).map((item, i) => (
            <button
              key={item.id}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: i === (currentIdx % activeItems.length) ? 14 : 5,
                height: 5, borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
                background: i === (currentIdx % activeItems.length) ? "#2563eb" : "#e2e8f0",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => switchTab?.("brand-intelligence")}
        style={{
          display: "block", width: "100%", marginTop: 9,
          background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 0",
          fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
      >
        View Full Intelligence →
      </button>
    </div>
  );
};

// ── Layout Shell ──────────────────────────────────────────────────────────────

const LayoutShell = ({
  children,
  activeTab,
  switchTab,
  brands,
  activeBrand,
  onSwitchBrand,
  user,
  logout,
  onAssistantOpen,
  brandIntelligence = { feed: [] },
  notifications = [],
  growth = { points: 0, level: 1, streak_days: 0 },
  stats,
}) => {
  const feed = brandIntelligence.feed || [
    ...(brandIntelligence.executive || []),
    ...(brandIntelligence.advisory  || []),
  ];

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        switchTab={switchTab}
        brands={brands}
        activeBrand={activeBrand}
        onSwitchBrand={onSwitchBrand}
        onAssistantOpen={onAssistantOpen}
      />
      <div className="wrapper">
        <Header
          activeBrand={activeBrand}
          user={user}
          logout={logout}
          onAssistantOpen={onAssistantOpen}
          switchTab={switchTab}
          notifications={notifications}
          growth={growth}
        />
        <EmailVerificationBanner onVerified={() => {}} />
        <main>
          <div id="workspace-area">
            {children}
          </div>

          <aside className="intel-sidebar d-flex flex-column">
            <div className="flex-1">
              {/* Fleet Stats — compact row */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[
                  { val: stats?.socials ?? 0,   label: "Posts" },
                  { val: stats?.blogs ?? 0,     label: "Articles" },
                  { val: stats?.campaigns ?? 0, label: "Campaigns" },
                ].map(({ val, label }) => (
                  <div key={label} style={{
                    flex: 1, background: "#f8fafc", border: "1px solid #e5e9f0",
                    borderRadius: 8, padding: "6px 4px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Intelligence header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" }}>
                  Brand Intelligence
                </div>
                {feed.length > 0 && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: "#fff", letterSpacing: 0.6,
                    background: "#2563eb", borderRadius: 99, padding: "2px 6px",
                  }}>LIVE</span>
                )}
              </div>

              <BrandIntelligencePreview
                feed={feed}
                brandId={activeBrand?.id}
                switchTab={switchTab}
              />
            </div>

            <div className="chat-integration-area mt-auto pt-4">
              <FloatingChat />
            </div>
          </aside>
        </main>
      </div>
    </>
  );
};

export default LayoutShell;
