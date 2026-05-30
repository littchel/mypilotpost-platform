import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../../lib/api/client";

/* ── Type colours ─────────────────────────────────────────────────────── */
const TYPE = {
  alert: { color: "#dc2626", bg: "#fff1f2", border: "#ef4444", icon: "fas fa-exclamation-circle", label: "Alert"  },
  win:   { color: "#16a34a", bg: "#f0fdf4", border: "#22c55e", icon: "fas fa-check-circle",       label: "Win"    },
  task:  { color: "#7c3aed", bg: "#faf5ff", border: "#8b5cf6", icon: "fas fa-circle",             label: "Task"   },
  info:  { color: "#2563eb", bg: "#eff6ff", border: "#3b82f6", icon: "fas fa-info-circle",        label: "Update" },
};

const CAT_LABEL = {
  publishing: "Publishing",
  campaigns:  "Campaigns",
  platforms:  "Platforms",
  seo:        "SEO",
  growth:     "Growth",
  tasks:      "Tasks",
};

/* ── Action routing ────────────────────────────────────────────────────── */
function getAction(item) {
  const { id, category, type } = item;
  if (category === "tasks") {
    if (id === "task_platform" || id === "task_platform2") return { label: "Connect Now",   tab: "integrations" };
    if (id === "task_dna")                                 return { label: "Complete DNA",   tab: "brand-dna"    };
    if (id === "task_content")                             return { label: "Create Post",    tab: "social"       };
    return { label: "Complete", tab: "integrations" };
  }
  if (category === "platforms")                          return { label: "Reconnect",      tab: "integrations" };
  if (category === "publishing" && type === "alert")     return { label: "View Schedule",  tab: "schedule"     };
  if (category === "publishing" && type === "win")       return { label: "View Content",   tab: "content"      };
  if (category === "campaigns")                          return { label: "Open Campaign",  tab: "campaign"     };
  if (category === "seo")                                return { label: "View SEO",       tab: "seo"          };
  if (category === "growth")                             return { label: "View Rewards",   tab: "growth"       };
  return { label: "View Insights", tab: "insights" };
}

/* ── Priority sort (alerts → tasks → wins → info) ─────────────────────── */
const PRIORITY = { alert: 0, task: 1, win: 2, info: 3 };
function sortByPriority(items) {
  return [...items].sort((a, b) => (PRIORITY[a.type] ?? 3) - (PRIORITY[b.type] ?? 3));
}

/* ── Time ago ──────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── FILTER PILLS ──────────────────────────────────────────────────────── */
const FILTERS = [
  { id: "all",   label: "All"     },
  { id: "alert", label: "Alerts"  },
  { id: "task",  label: "Tasks"   },
  { id: "win",   label: "Wins"    },
  { id: "info",  label: "Updates" },
];

/* ── INSIGHT CARD ──────────────────────────────────────────────────────── */
const InsightCard = ({ item, switchTab }) => {
  const t = TYPE[item.type] || TYPE.info;
  const action = getAction(item);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #f1f5f9",
        borderLeft: `3px solid ${t.border}`,
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.09)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow 0.18s ease, transform 0.18s ease",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: t.bg, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={t.icon} style={{ fontSize: 15, color: t.color }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8,
            color: t.color, background: t.bg, border: `1px solid ${t.border}`,
            padding: "2px 7px", borderRadius: 99,
          }}>
            {t.label}
          </span>
          {item.category && item.category !== "tasks" && (
            <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {CAT_LABEL[item.category] || item.category}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#cbd5e1", marginLeft: "auto" }}>
            {timeAgo(item.created_at)}
          </span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.4, marginBottom: item.body ? 4 : 0 }}>
          {item.title}
        </div>

        {item.body && (
          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, marginBottom: 10 }}>
            {item.body}
          </div>
        )}

        <button
          onClick={() => switchTab?.(action.tab)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
            background: t.color, color: "#fff",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          {action.label}
          <i className="fas fa-arrow-right" style={{ fontSize: 8 }} />
        </button>
      </div>
    </div>
  );
};

/* ── MAIN COMPONENT ────────────────────────────────────────────────────── */
export default function InsightsSnapshot({ activeBrand, switchTab }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  const load = useCallback(async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    try {
      const data = await apiRequest("/api/customer/insights/feed");
      setItems(sortByPriority(data.items || []));
    } catch { /* show empty state */ } finally {
      setLoading(false);
    }
  }, [activeBrand?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);
  const visible  = filtered.slice(0, 5);

  const alertCount = items.filter(i => i.type === "alert").length;
  const taskCount  = items.filter(i => i.type === "task").length;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#64748b", marginBottom: 2 }}>
              Live
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Insights Snapshot
            </h2>
          </div>
          {alertCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: "#dc2626",
              background: "#fff1f2", border: "1px solid #fca5a5",
              borderRadius: 99, padding: "2px 9px",
              animation: "pulse 2s ease-in-out infinite",
            }}>
              {alertCount} alert{alertCount !== 1 ? "s" : ""}
            </span>
          )}
          {taskCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: "#7c3aed",
              background: "#faf5ff", border: "1px solid #ddd6fe",
              borderRadius: 99, padding: "2px 9px",
            }}>
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <button
          onClick={() => switchTab?.("insights")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 700, color: "#2563eb",
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          View All Insights <i className="fas fa-arrow-right" style={{ fontSize: 9 }} />
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const count = f.id === "all" ? items.length : items.filter(i => i.type === f.id).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 13px", borderRadius: 99, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                background: active ? "#0f172a" : "#f1f5f9",
                color:      active ? "#fff"    : "#64748b",
              }}
            >
              {f.label}
              {count > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, minWidth: 16, textAlign: "center",
                  background: active ? "rgba(255,255,255,0.2)" : (f.id === "alert" && count > 0 ? "#dc2626" : "#e2e8f0"),
                  color: active ? "#fff" : (f.id === "alert" && count > 0 ? "#fff" : "#64748b"),
                  borderRadius: 99, padding: "1px 5px",
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: "flex", gap: 12, padding: "24px 0", color: "#94a3b8", alignItems: "center" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 14 }} />
          <span style={{ fontSize: 12 }}>Loading activity…</span>
        </div>
      ) : visible.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "32px 0", color: "#94a3b8",
          background: "#f8fafc", borderRadius: 14, border: "1px dashed #e2e8f0",
        }}>
          <i className="fas fa-check-circle" style={{ fontSize: 28, color: "#22c55e", marginBottom: 10, display: "block" }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>All clear</div>
          <div style={{ fontSize: 11 }}>No {filter !== "all" ? filter + " " : ""}activity to show right now.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map(item => (
            <InsightCard key={item.id} item={item} switchTab={switchTab} />
          ))}
          {filtered.length > 5 && (
            <button
              onClick={() => switchTab?.("insights")}
              style={{
                display: "block", width: "100%", padding: "10px 0",
                background: "none", border: "1px dashed #cbd5e1", borderRadius: 10,
                fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#2563eb"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
            >
              +{filtered.length - 5} more — View All Insights →
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
