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
function getActionLabel(item) { return ACTION_LABELS[item?.category] || ACTION_LABELS[item?.module_id] || "Take Action"; }

function twoSentences(text) {
  if (!text) return "";
  const m = text.match(/[^.!?]+[.!?]+/g);
  return m ? m.slice(0, 2).join(" ").trim() : text.slice(0, 140);
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? `Today ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Growth Plan persistence (localStorage) ────────────────────────────────────

const PLAN_KEY = (brandId) => `mpp_growth_plan_${brandId || "default"}`;

function loadPlan(brandId) {
  try { return new Set(JSON.parse(localStorage.getItem(PLAN_KEY(brandId)) || "[]")); }
  catch { return new Set(); }
}

function savePlan(brandId, set) {
  try { localStorage.setItem(PLAN_KEY(brandId), JSON.stringify([...set])); } catch { /* full */ }
}

// ── Brand Intelligence card ───────────────────────────────────────────────────

const AdvisorCard = ({ item, onDismiss, onPlan, inPlan }) => {
  const [showWhy, setShowWhy] = useState(false);
  const meta       = getMeta(item);
  const actionLabel = getActionLabel(item);

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 22px rgba(37,99,235,0.13)" }}
      style={{
        background: "#fff",
        border: `1px solid ${meta.border}`,
        borderRadius: 12,
        padding: "11px 11px 10px",
        animation: "biGlow 0.65s ease-in-out 3",
        cursor: "default",
      }}
    >
      {/* Row 1: badge + dismiss */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{
          fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.7,
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 99, padding: "2px 6px", lineHeight: 1.4,
        }}>
          {meta.label}
        </span>
        <button
          title="Dismiss"
          onClick={() => onDismiss(item)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "1px 3px", fontSize: 10, color: "#cbd5e1", lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#cbd5e1"; }}
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13, fontWeight: 800, color: "#0f172a", lineHeight: 1.35, marginBottom: 7,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {item.title}
      </div>

      {/* Finding */}
      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, marginBottom: 9 }}>
        {twoSentences(item.finding)}
      </div>

      {/* Confidence */}
      {item.confidence && (
        <div style={{ marginBottom: 9 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
            color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 99, padding: "2px 6px",
          }}>
            {item.confidence}
          </span>
        </div>
      )}

      {/* Primary action */}
      <motion.button
        onClick={() => {}}
        style={{
          display: "block", width: "100%",
          background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
          border: "none", borderRadius: 7, padding: "8px 0",
          fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
          letterSpacing: 0.2, marginBottom: 8,
        }}
        animate={{ opacity: [1, 0.78, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 8 }}
      >
        {actionLabel} →
      </motion.button>

      {/* Secondary actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => onPlan(item)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "2px 0",
            fontSize: 9, fontWeight: 700, letterSpacing: 0.2,
            color: inPlan ? "#059669" : "#94a3b8",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => { if (!inPlan) e.currentTarget.style.color = "#059669"; }}
          onMouseLeave={e => { if (!inPlan) e.currentTarget.style.color = "#94a3b8"; }}
        >
          {inPlan ? "✓ In Plan" : "+ Add to Plan"}
        </button>
        <button
          onClick={() => setShowWhy(p => !p)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "2px 0",
            fontSize: 9, fontWeight: 600, color: "#94a3b8", transition: "color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
        >
          ? Why this
        </button>
      </div>

      {/* Why Am I Seeing This? */}
      <AnimatePresence>
        {showWhy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9",
            }}>
              {[
                { label: "Source",     value: item.category || item.module_id },
                { label: "Confidence", value: item.confidence },
                { label: "Generated",  value: formatTime(item.generated_at) },
                { label: "Module",     value: item.module_id },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 8, fontWeight: 600, color: "#475569", textAlign: "right", lineHeight: 1.4 }}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Brand Intelligence (rotating container) ───────────────────────────────────

const BrandIntelligenceAdvisor = ({ feed = [], brandId, switchTab }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed,  setDismissed]  = useState(new Set());
  const [inPlan,     setInPlan]     = useState(() => loadPlan(brandId));
  const hoveredRef = useRef(false);
  const timerRef   = useRef(null);

  const activeItems = feed.filter(i => !dismissed.has(i.id));
  const current     = activeItems.length > 0 ? activeItems[currentIdx % activeItems.length] : null;

  useEffect(() => {
    clearInterval(timerRef.current);
    if (activeItems.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!hoveredRef.current) setCurrentIdx(p => p + 1);
    }, 9000);
    return () => clearInterval(timerRef.current);
  }, [activeItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = async (item) => {
    setDismissed(prev => new Set([...prev, item.id]));
    try { await apiRequest(`/api/customer/intelligence/dismiss/${item.id}`, { method: "POST" }); } catch { /* ok */ }
  };

  const handlePlan = (item) => {
    setInPlan(prev => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      savePlan(brandId, next);
      return next;
    });
  };

  if (feed.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "14px 0" }}>
        <div style={{ fontSize: 18, marginBottom: 6 }}>🧠</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 3 }}>No intelligence yet</div>
        <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 10, lineHeight: 1.5 }}>
          Connect platforms to generate AI insights.
        </div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            display: "block", width: "100%",
            background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
            border: "none", borderRadius: 7, padding: "8px 0",
            fontSize: 10, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}
        >
          Run Intelligence →
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>All insights reviewed.</div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            display: "block", width: "100%",
            background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
            border: "none", borderRadius: 7, padding: "8px 0",
            fontSize: 10, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}
        >
          View All Intelligence →
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
        <AdvisorCard
          key={current.id}
          item={current}
          onDismiss={handleDismiss}
          onPlan={handlePlan}
          inPlan={inPlan.has(current.id)}
        />
      </AnimatePresence>

      {/* Dot navigation */}
      {activeItems.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
          {activeItems.slice(0, 8).map((item, i) => (
            <button
              key={item.id}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: i === (currentIdx % activeItems.length) ? 12 : 4,
                height: 4, borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
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
          background: "none", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 0",
          fontSize: 9, fontWeight: 700, color: "#64748b", cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
      >
        View All Intelligence →
      </button>

      <style>{`
        @keyframes biGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
          50%       { box-shadow: 0 0 0 4px rgba(37,99,235,0.16); }
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

              {/* Brand Intelligence */}
              <div className="nav-group-title mt-3 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, letterSpacing: 0.3 }}>Brand Intelligence</span>
                {feed.length > 0 && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: "#fff", letterSpacing: 0.6,
                    background: "#2563EB", borderRadius: 99, padding: "1px 5px",
                  }}>LIVE</span>
                )}
              </div>

              <BrandIntelligenceAdvisor
                feed={feed}
                brandId={activeBrand?.id}
                switchTab={switchTab}
              />
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
