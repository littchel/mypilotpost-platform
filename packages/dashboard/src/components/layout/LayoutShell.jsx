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
  return m ? m.slice(0, 2).join(" ").trim() : text.slice(0, 160);
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

// ── Growth Plan + Saved persistence ──────────────────────────────────────────

const PLAN_KEY  = (brandId) => `mpp_growth_plan_${brandId || "default"}`;
const SAVED_KEY = (brandId) => `mpp_saved_insights_${brandId || "default"}`;

function loadPlan(brandId)  { try { return new Set(JSON.parse(localStorage.getItem(PLAN_KEY(brandId))  || "[]")); } catch { return new Set(); } }
function savePlan(brandId, set) { try { localStorage.setItem(PLAN_KEY(brandId),  JSON.stringify([...set])); } catch {} }
function loadSaved(brandId) { try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY(brandId)) || "[]")); } catch { return new Set(); } }
function saveSaved(brandId, set) { try { localStorage.setItem(SAVED_KEY(brandId), JSON.stringify([...set])); } catch {} }

// ── Advisor Card ─────────────────────────────────────────────────────────────

const ADVISOR_CSS = `
@keyframes advisorGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
  50%       { box-shadow: 0 0 0 6px rgba(37,99,235,0.14); }
}
@keyframes advisorPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.72; }
}
@keyframes advisorSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.advisor-card-new { animation: advisorSlideIn 0.32s ease forwards; }
.advisor-card     { transition: transform 0.18s ease, box-shadow 0.18s ease; }
.advisor-card:hover { transform: translateY(-2px); }
.advisor-cta-pulse { animation: advisorPulse 1.8s ease-in-out infinite; }
`;

const AdvisorCard = ({ item, brandId, onDismiss, onPlan, onSave, inPlan, isSaved, isNew }) => {
  const meta        = getMeta(item);
  const actionLabel = getActionLabel(item);

  return (
    <motion.div
      key={item.id}
      className={`advisor-card${isNew ? " advisor-card-new" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        background: "#fff",
        border: `1px solid ${meta.border}`,
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 14,
        padding: "14px",
        animation: "advisorGlow 2.5s ease-in-out 4",
        cursor: "default",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* Row 1: Category + Dismiss */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8,
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 99, padding: "3px 9px", lineHeight: 1.4, flexShrink: 0,
        }}>
          {meta.label}
        </span>
        <button
          title="Dismiss"
          onClick={() => onDismiss(item)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "1px 4px", fontSize: 13, color: "#cbd5e1", lineHeight: 1,
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
        fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: 9,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {item.title}
      </div>

      {/* Finding */}
      <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.6, marginBottom: 12 }}>
        {twoSentences(item.finding)}
      </div>

      {/* Why This Matters */}
      {item.why_it_matters && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 5 }}>
            Why This Matters
          </div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
            {item.why_it_matters}
          </div>
        </div>
      )}

      {/* Recommended Action */}
      {item.recommended_action && (
        <div style={{ background: `${meta.bg}`, border: `1px solid ${meta.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: meta.color, marginBottom: 4 }}>
            Recommended Action
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.5 }}>
            {item.recommended_action}
          </div>
          {item.expected_impact && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5, lineHeight: 1.5 }}>
              <i className="fas fa-arrow-trend-up" style={{ marginRight: 5, color: "#16a34a", fontSize: 10 }} />
              {item.expected_impact}
            </div>
          )}
        </div>
      )}

      {/* Confidence */}
      {item.confidence && (
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
            color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 99, padding: "3px 9px",
          }}>
            Confidence: {item.confidence}
          </span>
        </div>
      )}

      {/* Primary Action */}
      <motion.button
        className="advisor-cta-pulse"
        onClick={() => {}}
        style={{
          display: "block", width: "100%",
          background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
          border: "none", borderRadius: 10, padding: "12px 0",
          fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer",
          letterSpacing: 0.2, marginBottom: 10,
        }}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
      >
        {actionLabel} →
      </motion.button>

      {/* Save / Add to Plan */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onSave(item)}
          style={{
            flex: 1, background: isSaved ? "#f0fdf4" : "#f8fafc",
            border: `1px solid ${isSaved ? "#86efac" : "#e2e8f0"}`,
            borderRadius: 8, padding: "7px 0",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            color: isSaved ? "#15803d" : "#64748b", transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!isSaved) { e.currentTarget.style.borderColor = "#86efac"; e.currentTarget.style.color = "#15803d"; } }}
          onMouseLeave={e => { if (!isSaved) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; } }}
        >
          {isSaved ? "✓ Saved" : "Save"}
        </button>
        <button
          onClick={() => onPlan(item)}
          style={{
            flex: 1, background: inPlan ? "#eff6ff" : "#f8fafc",
            border: `1px solid ${inPlan ? "#93c5fd" : "#e2e8f0"}`,
            borderRadius: 8, padding: "7px 0",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            color: inPlan ? "#2563eb" : "#64748b", transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!inPlan) { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.color = "#2563eb"; } }}
          onMouseLeave={e => { if (!inPlan) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; } }}
        >
          {inPlan ? "✓ In Plan" : "+ Plan"}
        </button>
      </div>

      {/* Debug: generated time */}
      {item.generated_at && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#c4cdd6", textAlign: "center" }}>
          {formatTime(item.generated_at)}
        </div>
      )}
    </motion.div>
  );
};

// ── Brand Intelligence Advisor ────────────────────────────────────────────────

const BrandIntelligenceAdvisor = ({ feed = [], brandId, switchTab }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed,  setDismissed]  = useState(new Set());
  const [inPlan,     setInPlan]     = useState(() => loadPlan(brandId));
  const [saved,      setSaved]      = useState(() => loadSaved(brandId));
  const hoveredRef = useRef(false);
  const timerRef   = useRef(null);
  const styleRef   = useRef(false);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const el = document.createElement("style");
    el.textContent = ADVISOR_CSS;
    document.head.appendChild(el);
  }, []);

  const activeItems = feed.filter(i => !dismissed.has(i.id));
  const current     = activeItems.length > 0 ? activeItems[currentIdx % activeItems.length] : null;

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

  const handlePlan = (item) => {
    setInPlan(prev => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      savePlan(brandId, next);
      return next;
    });
  };

  const handleSave = (item) => {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      saveSaved(brandId, next);
      return next;
    });
  };

  if (feed.length === 0) {
    return (
      <div style={{ padding: "12px 0" }}>
        <div style={{
          background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
          border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "20px 14px", textAlign: "center",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "0 0 0 8px rgba(37,99,235,0.06)",
          }}>
            <i className="fas fa-brain" style={{ fontSize: 18, color: "#2563eb" }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
            Your Advisor is standing by
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 14 }}>
            Connect at least 2 platforms to unlock strategic analysis tailored to your brand.
          </div>
          <button
            onClick={() => switchTab?.("brand-intelligence")}
            style={{
              display: "block", width: "100%",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none", borderRadius: 9, padding: "11px 0",
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.28)",
            }}
          >
            Run Intelligence →
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{ padding: "12px 0" }}>
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: 12, padding: "16px 14px", textAlign: "center",
        }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>
            You're fully up to date
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 12 }}>
            Your advisor will deliver new strategic insights in the next daily cycle.
          </div>
          <button
            onClick={() => switchTab?.("brand-intelligence")}
            style={{
              display: "block", width: "100%",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none", borderRadius: 9, padding: "10px 0",
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
            }}
          >
            View Full Intelligence →
          </button>
        </div>
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
          brandId={brandId}
          onDismiss={handleDismiss}
          onPlan={handlePlan}
          onSave={handleSave}
          inPlan={inPlan.has(current.id)}
          isSaved={saved.has(current.id)}
          isNew={false}
        />
      </AnimatePresence>

      {/* Dot nav */}
      {activeItems.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
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
          display: "block", width: "100%", marginTop: 10,
          background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 0",
          fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
      >
        View All Intelligence →
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

              {/* Advisor Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" }}>
                  Brand Advisor
                </div>
                {feed.length > 0 && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: "#fff", letterSpacing: 0.6,
                    background: "#2563eb", borderRadius: 99, padding: "2px 6px",
                  }}>LIVE</span>
                )}
              </div>

              <BrandIntelligenceAdvisor
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
