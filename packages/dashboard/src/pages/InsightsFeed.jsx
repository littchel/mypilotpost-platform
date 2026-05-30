import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api/client";

/* ── Category config ──────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",        label: "All",        icon: "fas fa-stream" },
  { id: "publishing", label: "Publishing", icon: "fas fa-paper-plane" },
  { id: "campaigns",  label: "Campaigns",  icon: "fas fa-bullhorn" },
  { id: "platforms",  label: "Platforms",  icon: "fas fa-plug" },
  { id: "seo",        label: "SEO",        icon: "fas fa-search" },
  { id: "growth",     label: "Growth",     icon: "fas fa-rocket" },
  { id: "tasks",      label: "Tasks",      icon: "fas fa-tasks" },
];

const CAT_META = {
  publishing: { color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  campaigns:  { color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  platforms:  { color: "#0891b2", bg: "#ecfeff", border: "#67e8f9" },
  seo:        { color: "#059669", bg: "#f0fdf4", border: "#6ee7b7" },
  growth:     { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  tasks:      { color: "#6d28d9", bg: "#faf5ff", border: "#ddd6fe" },
};

const TYPE_META = {
  win:   { color: "#16a34a", icon: "fas fa-check-circle",        label: "Win"   },
  alert: { color: "#dc2626", icon: "fas fa-exclamation-circle",  label: "Alert" },
  info:  { color: "#2563eb", icon: "fas fa-info-circle",         label: "Info"  },
  task:  { color: "#7c3aed", icon: "fas fa-circle",              label: "Task"  },
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ── FeedItem ─────────────────────────────────────────────────────────── */
const FeedItem = ({ item, switchTab }) => {
  const cat  = CAT_META[item.category]  || CAT_META.publishing;
  const type = TYPE_META[item.type]     || TYPE_META.info;
  const catConf = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];

  const handleClick = () => {
    if (item.category === "tasks") {
      if (item.id === "task_platform" || item.id === "task_platform2") switchTab?.("integrations");
      else if (item.id === "task_dna")     switchTab?.("brand-dna");
      else if (item.id === "task_content") switchTab?.("social");
    }
  };

  return (
    <div
      onClick={item.category === "tasks" ? handleClick : undefined}
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        background: "#fff",
        border: "1px solid #f1f5f9",
        borderRadius: 12,
        marginBottom: 10,
        cursor: item.category === "tasks" ? "pointer" : "default",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#f1f5f9";
      }}
    >
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: item.type === "win"   ? "#f0fdf4"
                  : item.type === "alert" ? "#fff1f2"
                  : item.type === "task"  ? "#faf5ff"
                  : "#eff6ff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <i className={type.icon} style={{ fontSize: 14, color: type.color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          {/* Category pill */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 99,
            background: cat.bg, border: `1px solid ${cat.border}`,
            fontSize: 10, fontWeight: 700, color: cat.color, letterSpacing: 0.4,
          }}>
            <i className={catConf.icon} style={{ fontSize: 9 }} />
            {catConf.label}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(item.created_at)}</span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3, lineHeight: 1.4 }}>
          {item.title}
        </div>

        {item.body && (
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            {item.body}
          </div>
        )}

        {item.category === "tasks" && (
          <div style={{ marginTop: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 700, color: "#7c3aed",
              background: "#faf5ff", padding: "4px 10px", borderRadius: 6,
            }}>
              Fix now <i className="fas fa-arrow-right" style={{ fontSize: 9 }} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Empty state ──────────────────────────────────────────────────────── */
const EmptyState = ({ activeCategory }) => {
  const cat = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
  return (
    <div style={{ textAlign: "center", padding: "64px 0", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>
        <i className={cat.icon} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
        No {cat.label === "All" ? "" : cat.label + " "}activity yet
      </div>
      <div style={{ fontSize: 13, maxWidth: 320, margin: "0 auto" }}>
        {activeCategory === "tasks"
          ? "No pending tasks. You're all caught up."
          : "Events will appear here as your account becomes active."}
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────────────────── */
export default function InsightsFeed({ activeBrand, switchTab }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/customer/insights/feed");
      setItems(data.items || []);
    } catch {
      setError("Could not load insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = category === "all"
    ? items
    : items.filter(i => i.category === category);

  const taskCount  = items.filter(i => i.type === "task").length;
  const alertCount = items.filter(i => i.type === "alert").length;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#2563EB", marginBottom: 6 }}>
          Operational Feed
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>Insights</h1>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 6, marginBottom: 0 }}>
              What happened — publishing activity, platform events, campaigns, and tasks.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {alertCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 99, padding: "3px 10px" }}>
                {alertCount} alert{alertCount !== 1 ? "s" : ""}
              </span>
            )}
            {taskCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 99, padding: "3px 10px" }}>
                {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 9, fontWeight: 600, fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
                color: "#374151", opacity: loading ? 0.6 : 1,
              }}
            >
              <i className={`fas fa-sync-alt${loading ? " fa-spin" : ""}`} style={{ fontSize: 11 }} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20, overflowX: "auto",
        borderBottom: "1px solid #f1f5f9", paddingBottom: 12,
      }}>
        {CATEGORIES.map(cat => {
          const catItems = cat.id === "all" ? items : items.filter(i => i.category === cat.id);
          const hasAlerts = catItems.some(i => i.type === "alert");
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", transition: "all 0.15s",
                background: category === cat.id ? "#2563EB" : "#f8fafc",
                color:      category === cat.id ? "#fff"     : "#64748b",
                position: "relative",
              }}
            >
              <i className={cat.icon} style={{ fontSize: 11 }} />
              {cat.label}
              {cat.id !== "all" && catItems.length > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800,
                  background: category === cat.id ? "rgba(255,255,255,0.25)" : hasAlerts ? "#dc2626" : "#e2e8f0",
                  color: category === cat.id ? "#fff" : hasAlerts ? "#fff" : "#64748b",
                  borderRadius: 99, padding: "1px 5px", minWidth: 16, textAlign: "center",
                }}>
                  {catItems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#991b1b" }}>{error}</span>
          <button onClick={load} style={{ marginLeft: 12, fontSize: 11, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
            Retry →
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ fontSize: 12, marginTop: 10 }}>Loading activity…</div>
        </div>
      )}

      {/* Feed */}
      {!loading && !error && (
        filtered.length === 0
          ? <EmptyState activeCategory={category} />
          : filtered.map(item => (
              <FeedItem key={item.id} item={item} switchTab={switchTab} />
            ))
      )}
    </div>
  );
}
