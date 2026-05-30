import React, { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useApi } from "../lib/api/hooks";

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORM_LABELS = {
  instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
  x: "X",               tiktok: "TikTok",     youtube: "YouTube",
  pinterest: "Pinterest", threads: "Threads",
};

const PLATFORM_COLORS = {
  instagram: "#E4405F", facebook: "#1877F2", linkedin: "#0A66C2",
  x: "#111827",         tiktok: "#111827",   youtube: "#FF0000",
  pinterest: "#BD081C", threads: "#111827",
};

// ── Intelligence metadata ─────────────────────────────────────────────────────

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
const DEFAULT_META = { label: "Intelligence", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" };

function getMeta(item) { return CATEGORY_META[item?.category] || DEFAULT_META; }

const ACTION_LABELS = {
  "Platform Health":         "Fix Now →",
  "Content Intelligence":    "Create Content →",
  "Audience Intelligence":   "Review Audience →",
  "Competitive Moat Map":    "View Competitors →",
  "SEO Intelligence":        "Improve SEO →",
  "Conversion Intelligence": "Fix Funnel →",
  "Campaign Intelligence":   "Review Campaign →",
  "Growth Engine":           "Launch Campaign →",
};
function getActionLabel(item) { return ACTION_LABELS[item?.category] || "View Details →"; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function changeBadge(pct) {
  if (pct === null || pct === undefined) return null;
  const n = parseFloat(pct);
  if (isNaN(n)) return null;
  const positive = n >= 0;
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      background: positive ? "#f0fdf4" : "#fff1f2",
      color: positive ? "#16a34a" : "#dc2626",
      border: `1px solid ${positive ? "#bbf7d0" : "#fca5a5"}`,
    }}>
      {positive ? "+" : ""}{n.toFixed(1)}%
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, change, sub, emphasis = false }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "18px 20px", flex: 1, minWidth: 130,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{
        fontSize: 32, fontWeight: 800, color: emphasis ? "#6366f1" : "#111827",
        lineHeight: 1, marginBottom: 8,
      }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {change !== undefined && change !== null && changeBadge(change)}
        {sub && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

// ── Business Performance Chart ────────────────────────────────────────────────

const PERIOD_DAYS = { "30d": 30, "90d": 90, "12m": 365 };
const METRIC_COLORS = { reach: "#6366f1", engagement: "#059669", clicks: "#f59e0b" };
const METRIC_LABELS = { reach: "Reach", engagement: "Engagement", clicks: "Clicks" };

function PerformanceChart({ brandId }) {
  const [period, setPeriod]   = useState("30d");
  const [metric, setMetric]   = useState("reach");

  const days = PERIOD_DAYS[period];
  const { data } = useApi(
    brandId ? `/api/customer/analytics/detailed?days=${days}` : null,
    [brandId, days],
  );

  const trends  = (data?.trends || []).map(t => ({
    label: new Date(t.date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    value: t[metric] || 0,
  }));
  const hasData = trends.some(t => t.value > 0);
  const color   = METRIC_COLORS[metric];

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Business Performance</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>Analytics over time</div>
        </div>
        {/* Period toggle */}
        <div style={{ display: "flex", gap: 2, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {["30d", "90d", "12m"].map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)} style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
              background: period === p ? "#fff" : "transparent",
              color: period === p ? "#111827" : "#6b7280",
              fontWeight: period === p ? 700 : 500,
              boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Metric tabs */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
        {Object.entries(METRIC_LABELS).map(([key, lbl]) => (
          <button key={key} type="button" onClick={() => setMetric(key)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "0 0 10px",
            fontSize: 13, fontWeight: metric === key ? 700 : 500,
            color: metric === key ? METRIC_COLORS[key] : "#9ca3af",
            borderBottom: metric === key ? `2px solid ${METRIC_COLORS[key]}` : "2px solid transparent",
            marginBottom: -13,
          }}>{lbl}</button>
        ))}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>No performance data yet</div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>Publish content to see analytics here</div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trends} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone" dataKey="value" name={METRIC_LABELS[metric]}
              stroke={color} fill={`url(#grad-${metric})`}
              strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Today's Focus ─────────────────────────────────────────────────────────────

function TodaysFocus({ item, switchTab }) {
  if (!item) {
    return (
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
        padding: "24px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", textAlign: "center", minHeight: 200,
      }}>
        <div style={{ fontSize: 14, color: "#9ca3af", fontWeight: 600, marginBottom: 8 }}>No active insights</div>
        <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 20 }}>
          Run Brand Intelligence to surface your top opportunity.
        </div>
        <button type="button" onClick={() => switchTab?.("brand-intelligence")} style={{
          padding: "10px 18px", borderRadius: 8, background: "#6366f1",
          color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          Run Intelligence →
        </button>
      </div>
    );
  }

  const meta   = getMeta(item);
  const impact = item.expected_impact || item.priority_level || null;
  const effort = item.estimated_effort || null;

  return (
    <div style={{
      background: "#fff", border: `1px solid ${meta.border}`,
      borderTop: `3px solid ${meta.color}`, borderRadius: 14,
      padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        Today's Focus
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
        background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
        textTransform: "uppercase", letterSpacing: 0.4,
      }}>
        {meta.label}
      </span>
      <div style={{
        fontSize: 15, fontWeight: 800, color: "#111827", marginTop: 10, marginBottom: 8,
        lineHeight: 1.4,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {item.title}
      </div>
      <div style={{
        fontSize: 12, color: "#6b7280", lineHeight: 1.65, marginBottom: 14,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {item.finding}
      </div>
      {(impact || effort) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {impact && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>Impact: {impact}</span>}
          {effort && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>Effort: {effort}</span>}
        </div>
      )}
      <button type="button" onClick={() => switchTab?.("brand-intelligence")} style={{
        width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
        background: meta.color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
      }}>
        {getActionLabel(item)}
      </button>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

function activityText(item) {
  const { action = "", status = "", entity_type = "" } = item;
  if (entity_type === "delivery" && action === "published") return "Post published";
  if (entity_type === "delivery" && action.includes("fail")) return "Post delivery failed";
  if (entity_type === "content") {
    if (status === "published") return "Content published";
    if (status === "scheduled") return "Post scheduled";
    if (status === "draft") return "Draft saved";
    return "Content updated";
  }
  if (entity_type === "system") return "System notification";
  return action || "Activity";
}

function activityColor(item) {
  const { action = "", status = "" } = item;
  if (action.includes("fail") || status === "failed") return { bg: "#fef2f2", color: "#dc2626", symbol: "!" };
  if (action === "published" || status === "published") return { bg: "#f0fdf4", color: "#16a34a", symbol: "✓" };
  if (status === "scheduled") return { bg: "#eff6ff", color: "#2563eb", symbol: "→" };
  return { bg: "#f8fafc", color: "#6b7280", symbol: "·" };
}

function ActivityFeed({ items = [] }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
        What Happened
      </div>
      {items.length === 0 ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No activity yet</div>
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {items.slice(0, 10).map((item, i) => {
            const { bg, color, symbol } = activityColor(item);
            return (
              <div key={i} style={{
                display: "flex", gap: 12, padding: "10px 0",
                borderBottom: i < Math.min(items.length, 10) - 1 ? "1px solid #f1f5f9" : "none",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: bg, fontSize: 12, fontWeight: 700, color,
                }}>
                  {symbol}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", lineHeight: 1.4 }}>{activityText(item)}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{relativeTime(item.time)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Top Opportunities ─────────────────────────────────────────────────────────

function TopOpportunities({ items = [], switchTab }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
        Top Opportunities
      </div>
      {items.length === 0 ? (
        <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>No opportunities found</div>
          <button type="button" onClick={() => switchTab?.("brand-intelligence")} style={{
            padding: "9px 16px", borderRadius: 8, background: "#6366f1",
            color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>
            Run Brand Intelligence →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.slice(0, 3).map((item, i) => {
            const meta = getMeta(item);
            return (
              <div key={i} style={{
                background: meta.bg, border: `1px solid ${meta.border}`,
                borderLeft: `3px solid ${meta.color}`, borderRadius: 10, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                    background: "#fff", color: meta.color, border: `1px solid ${meta.border}`,
                    textTransform: "uppercase", letterSpacing: 0.4,
                  }}>
                    {meta.label}
                  </span>
                  {item.expected_impact && (
                    <span style={{ fontSize: 10, color: "#6b7280", flexShrink: 0 }}>{item.expected_impact}</span>
                  )}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.4, marginBottom: 10,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {item.title}
                </div>
                <button type="button" onClick={() => switchTab?.("brand-intelligence")} style={{
                  padding: "6px 12px", borderRadius: 6, background: "#fff",
                  border: `1px solid ${meta.border}`, color: meta.color,
                  fontWeight: 700, fontSize: 11, cursor: "pointer",
                }}>
                  {getActionLabel(item)}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Channel Performance Chart ─────────────────────────────────────────────────

function ChannelChart({ brandId, connectedPlatforms = [] }) {
  const [metric, setMetric] = useState("reach");

  const { data } = useApi(
    brandId ? `/api/customer/analytics/detailed?days=30` : null,
    [brandId],
  );

  const platforms = (data?.platforms || [])
    .filter(p => connectedPlatforms.includes(p.platform))
    .map(p => ({
      name: PLATFORM_LABELS[p.platform] || p.platform,
      value: metric === "reach" ? (p.reach || 0) : (p.engagement || 0),
      color: PLATFORM_COLORS[p.platform] || "#6366f1",
    }))
    .sort((a, b) => b.value - a.value);

  const hasData = platforms.some(d => d.value > 0);

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Channel Performance</div>
        <div style={{ display: "flex", gap: 2, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {[["reach", "Reach"], ["engagement", "Engagement"]].map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => setMetric(val)} style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
              background: metric === val ? "#fff" : "transparent",
              color: metric === val ? "#111827" : "#6b7280",
              fontWeight: metric === val ? 700 : 500,
              boxShadow: metric === val ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
            }}>{lbl}</button>
          ))}
        </div>
      </div>
      {!hasData ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>No channel data yet</div>
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>Data appears after content is published to connected platforms</div>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, platforms.length * 40)}>
          <BarChart data={platforms} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} width={74} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {platforms.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Audience Breakdown ────────────────────────────────────────────────────────

function AudienceBreakdown() {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
        Audience Breakdown
      </div>
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 10 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>No audience data yet</div>
          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
            Connect analytics to see traffic source breakdown
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardOverview({
  activeBrand,
  switchTab,
  user,
  intelligenceFeed   = [],
  connectedPlatforms = [],
}) {
  const brandId = activeBrand?.id;

  const { data: analyticsData } = useApi(
    brandId ? "/api/customer/analytics/overview" : null,
    [brandId],
  );
  const { data: activityData } = useApi(
    brandId ? "/api/customer/activity?limit=10" : null,
    [brandId],
  );

  const summary  = analyticsData?.summary  || {};
  const growth   = analyticsData?.growth   || {};
  const activity = activityData?.data      || [];

  const noReach  = !summary.reach || summary.reach === "0";
  const noEngmt  = !summary.engagement_rate || summary.engagement_rate === "0.0%";

  const focusItem     = intelligenceFeed[0]     || null;
  const opportunities = intelligenceFeed.slice(1, 4);

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const name     = user?.first_name || user?.email?.split("@")[0] || "";

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>
          {greeting}{name ? `, ${name}` : ""}
        </h3>
        <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 4 }}>
          Here's what's happening with your brand today.
        </div>
      </div>

      {/* ── ROW 1: KPI Strip ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <KPICard
          label="Reach"
          value={noReach ? "—" : summary.reach}
          change={noReach ? undefined : growth.reach}
          sub={noReach ? "No reach data yet" : "impressions"}
        />
        <KPICard
          label="Engagement"
          value={noEngmt ? "—" : summary.engagement_rate}
          change={noEngmt ? undefined : growth.engagement_rate}
          sub={noEngmt ? "No engagement data yet" : "rate"}
        />
        <KPICard
          label="Leads"
          value="—"
          sub="No leads yet"
        />
        <KPICard
          label="Revenue"
          value="—"
          sub="No revenue tracked"
        />
        <KPICard
          label="Connected"
          value={connectedPlatforms.length}
          sub={`of 8 platforms`}
          emphasis={connectedPlatforms.length > 0}
        />
      </div>

      {/* ── ROW 2: Chart (70%) + Today's Focus (30%) ─────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "70fr 30fr", gap: 14, marginBottom: 20 }}>
        <PerformanceChart brandId={brandId} />
        <TodaysFocus item={focusItem} switchTab={switchTab} />
      </div>

      {/* ── ROW 3: Activity (50%) + Opportunities (50%) ──────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <ActivityFeed items={activity} />
        <TopOpportunities items={opportunities} switchTab={switchTab} />
      </div>

      {/* ── ROW 4: Channel Chart (50%) + Audience (50%) ──────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChannelChart brandId={brandId} connectedPlatforms={connectedPlatforms} />
        <AudienceBreakdown />
      </div>

    </div>
  );
}
