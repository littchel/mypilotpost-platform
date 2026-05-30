import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import Sidebar from "./Sidebar";
import Header from "./Header";
import FloatingChat from "../specialized/FloatingChat";
import EmailVerificationBanner from "../shared/EmailVerificationBanner";
import { apiRequest } from "../../lib/api/client";

// ── Category → badge config ───────────────────────────────────────────────────

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

const DEFAULT_META = { label: "Intelligence",  color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" };

function getCategoryMeta(item) {
  return CATEGORY_META[item?.category] || CATEGORY_META[item?.module_id] || DEFAULT_META;
}

function getActionLabel(item) {
  return ACTION_LABELS[item?.category] || ACTION_LABELS[item?.module_id] || "Take Action";
}

function twoSentences(text) {
  if (!text) return "";
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches) return text.slice(0, 120);
  return matches.slice(0, 2).join(" ").trim();
}

// ── Intelligence Advisor (animated single-card rotation) ──────────────────────

const IntelligenceAdvisor = ({ feed = [], switchTab }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed,  setDismissed]  = useState(new Set());
  const [saved,      setSaved]      = useState(new Set());
  const hoveredRef = useRef(false);
  const timerRef   = useRef(null);

  const activeItems = feed.filter(i => !dismissed.has(i.id));
  const current     = activeItems.length > 0 ? activeItems[currentIdx % activeItems.length] : null;

  const startTimer = () => {
    clearInterval(timerRef.current);
    if (activeItems.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!hoveredRef.current) setCurrentIdx(p => p + 1);
    }, 16000);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [activeItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseEnter = () => { hoveredRef.current = true;  };
  const handleMouseLeave = () => { hoveredRef.current = false; };

  const handleDismiss = async (item) => {
    setDismissed(prev => new Set([...prev, item.id]));
    setCurrentIdx(p => p);
    try { await apiRequest(`/api/customer/intelligence/dismiss/${item.id}`, { method: "POST" }); } catch { /* dismissed locally */ }
  };

  const handleSave = (item) => {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  };

  if (feed.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0", lineHeight: 1.6 }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>🧠</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4 }}>No intelligence yet</div>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>Connect platforms to generate Brand Intelligence.</div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            display: "block", width: "100%", marginTop: 12,
            background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
            border: "none", borderRadius: 8, padding: "8px 0",
            fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}
        >
          Run Intelligence →
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>All insights reviewed.</div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            display: "block", width: "100%",
            background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
            border: "none", borderRadius: 8, padding: "8px 0",
            fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}
        >
          View Full Intelligence →
        </button>
      </div>
    );
  }

  const meta    = getCategoryMeta(current);
  const isSaved = saved.has(current.id);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(37,99,235,0.12)" }}
          style={{
            background: "#fff",
            border: `1px solid ${meta.border}`,
            borderRadius: 12,
            padding: "12px",
            animation: "biGlow 0.7s ease-in-out 3",
          }}
        >
          {/* Header row: badge + dismiss/save */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
            <span style={{
              fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8,
              color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
              borderRadius: 99, padding: "2px 7px",
            }}>
              {meta.label}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                title={isSaved ? "Unsave" : "Save"}
                onClick={() => handleSave(current)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
                  fontSize: 12, color: isSaved ? "#dc2626" : "#cbd5e1",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; }}
                onMouseLeave={e => { e.currentTarget.style.color = isSaved ? "#dc2626" : "#cbd5e1"; }}
              >
                ♡
              </button>
              <button
                title="Dismiss"
                onClick={() => handleDismiss(current)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
                  fontSize: 12, color: "#cbd5e1", transition: "color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#cbd5e1"; }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Title */}
          <div style={{
            fontSize: 12, fontWeight: 800, color: "#0f172a", lineHeight: 1.35, marginBottom: 8,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {current.title}
          </div>

          {/* Finding — 2 sentences max */}
          <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.55, marginBottom: 10 }}>
            {twoSentences(current.finding)}
          </div>

          {/* Confidence */}
          {current.confidence && (
            <div style={{ marginBottom: 10 }}>
              <span style={{
                fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6,
                color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 99, padding: "2px 7px",
              }}>
                {current.confidence}
              </span>
            </div>
          )}

          {/* Action button */}
          <motion.button
            onClick={() => switchTab?.("brand-intelligence")}
            style={{
              display: "block", width: "100%",
              background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`,
              border: "none", borderRadius: 8, padding: "8px 0",
              fontSize: 10, fontWeight: 700, color: "#fff", cursor: "pointer",
              letterSpacing: 0.3,
            }}
            animate={{ opacity: [1, 0.82, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 14 }}
          >
            {getActionLabel(current)} →
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* Rotation indicator */}
      {activeItems.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
          {activeItems.slice(0, 6).map((item, i) => (
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
          display: "block", width: "100%", marginTop: 10,
          background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 0",
          fontSize: 10, fontWeight: 700, color: "#64748b", cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
      >
        View All Intelligence →
      </button>

      <style>{`
        @keyframes biGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
          50%       { box-shadow: 0 0 0 4px rgba(37,99,235,0.18); }
        }
      `}</style>
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
              {/* Fleet Stats */}
              <div className="nav-group-title mb-1">Fleet Stats</div>
              <div className="stat-card">
                <span className="stat-val">{stats?.socials ?? 0}</span>
                <span className="stat-label">Socials</span>
              </div>
              <div className="stat-card">
                <span className="stat-val">{stats?.blogs ?? 0}</span>
                <span className="stat-label">Articles</span>
              </div>
              <div className="stat-card">
                <span className="stat-val">{stats?.campaigns ?? 0}</span>
                <span className="stat-label">Campaigns</span>
              </div>

              {/* Brand Intelligence Advisor */}
              <div className="nav-group-title mt-3 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Brand Intelligence</span>
                {feed.length > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#2563EB", letterSpacing: 0.5 }}>LIVE</span>
                )}
              </div>

              <IntelligenceAdvisor feed={feed} switchTab={switchTab} />
            </div>

            {/* Float Chat */}
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
