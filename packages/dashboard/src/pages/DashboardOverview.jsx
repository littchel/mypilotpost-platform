import React from "react";
import InsightsSnapshot from "../components/dashboard/InsightsSnapshot";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_PLATFORMS   = ["instagram","facebook","linkedin","x","tiktok","youtube","pinterest","threads"];
const PLATFORM_LABELS = {
  instagram:"Instagram", facebook:"Facebook", linkedin:"LinkedIn",
  x:"X (Twitter)", tiktok:"TikTok", youtube:"YouTube",
  pinterest:"Pinterest", threads:"Threads",
};

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
const DEFAULT_META = { label: "Intelligence", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" };
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

// ── Row 1: KPI Card ───────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color = "#0f172a", subColor = "#64748b" }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16,
      padding: "20px 22px", flex: 1, minWidth: 140,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 10, lineHeight: 1.2 }}>
        {label}
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: subColor, fontWeight: 500 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Row 2: Brand Intelligence Hero ────────────────────────────────────────────

function IntelligenceHero({ intelligenceFeed = [], connectedPlatforms = [], switchTab }) {
  const topItem = intelligenceFeed[0];

  if (!topItem && connectedPlatforms.length < 2) {
    return (
      <div style={{
        border: "1px solid #e0e7ff", borderLeft: "4px solid #4f46e5", borderRadius: 16,
        padding: "24px 28px", background: "linear-gradient(135deg, #fafaff 0%, #eff6ff 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            Brand Intelligence
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8, lineHeight: 1.3 }}>
            {connectedPlatforms.length === 0 ? "Connect your first platform to activate intelligence" : "Connect one more platform to activate intelligence"}
          </div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
            Brand Intelligence requires 2+ connected platforms for cross-channel analysis.
          </div>
        </div>
        <button
          onClick={() => switchTab?.("integrations")}
          style={{
            padding: "13px 26px", borderRadius: 10, border: "none",
            background: "#4f46e5", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          Connect Platforms →
        </button>
      </div>
    );
  }

  if (!topItem) {
    return (
      <div style={{
        border: "1px dashed #e2e8f0", borderRadius: 16, padding: "28px 32px",
        background: "#f8fafc",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            Brand Intelligence
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
            No intelligence generated yet
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Run Brand Intelligence to surface opportunities and risks across your platforms.
          </div>
        </div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            padding: "13px 26px", borderRadius: 10, border: "none",
            background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          Run Intelligence →
        </button>
      </div>
    );
  }

  const meta    = getMeta(topItem);
  const ctaText = getActionLabel(topItem);

  return (
    <div style={{
      border: `1px solid ${meta.border}`,
      borderLeft: `4px solid ${meta.color}`,
      borderRadius: 16, padding: "24px 28px",
      background: meta.bg,
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
            color: meta.color, background: "#fff", border: `1px solid ${meta.border}`,
            borderRadius: 99, padding: "4px 12px",
          }}>
            {meta.label}
          </span>
          {topItem.confidence && (
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              Confidence: {topItem.confidence}
            </span>
          )}
          {intelligenceFeed.length > 1 && (
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              +{intelligenceFeed.length - 1} more insights
            </span>
          )}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.35, marginBottom: 10 }}>
          {topItem.title}
        </div>
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, maxWidth: 580 }}>
          {topItem.finding}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0, alignItems: "stretch", minWidth: 160 }}>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            padding: "13px 20px", borderRadius: 10, border: "none",
            background: meta.color, color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", textAlign: "center",
          }}
        >
          {ctaText}
        </button>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            padding: "10px 20px", borderRadius: 10,
            border: `1px solid ${meta.border}`, background: "transparent",
            color: meta.color, fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "center",
          }}
        >
          View All Intelligence
        </button>
      </div>
    </div>
  );
}

// ── Row 4a: Platform Coverage Panel ───────────────────────────────────────────

function PlatformPanel({ connectedPlatforms = [], switchTab }) {
  const connected = ALL_PLATFORMS.filter(p => connectedPlatforms.includes(p));
  const missing   = ALL_PLATFORMS.filter(p => !connectedPlatforms.includes(p));
  const pct       = Math.round((connected.length / ALL_PLATFORMS.length) * 100);
  const status    = connected.length === ALL_PLATFORMS.length ? "full" : connected.length > 0 ? "partial" : "empty";

  const statusStyle = {
    full:    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "Fully Connected" },
    partial: { bg: "#fffbeb", text: "#d97706", border: "#fcd34d", label: "Partially Connected" },
    empty:   { bg: "#fff1f2", text: "#dc2626", border: "#fca5a5", label: "Setup Required" },
  }[status];

  return (
    <div style={{
      background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16,
      padding: "20px 22px", flex: 3, minWidth: 0,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Platform Coverage</div>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
          background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`,
        }}>
          {statusStyle.label}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, textAlign: "center", background: "#f0fdf4", borderRadius: 12, padding: "16px 12px" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>{connected.length}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 500 }}>Connected</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", background: "#fff7ed", borderRadius: 12, padding: "16px 12px" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>{missing.length}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, fontWeight: 500 }}>Remaining</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Coverage</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99, width: `${pct}%`,
            background: "linear-gradient(90deg, #22c55e, #2563eb)",
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }} />
        </div>
      </div>

      {missing.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Not Connected
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
            {missing.map(p => (
              <span key={p} style={{
                fontSize: 13, fontWeight: 500, padding: "5px 12px",
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 8, color: "#475569",
              }}>
                {PLATFORM_LABELS[p]}
              </span>
            ))}
          </div>
          <button
            onClick={() => switchTab?.("integrations")}
            style={{
              display: "block", width: "100%", padding: "12px 0",
              background: "#2563eb", border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Complete Platform Setup →
          </button>
        </>
      )}

      {status === "full" && (
        <div style={{ textAlign: "center", fontSize: 14, color: "#15803d", fontWeight: 600, padding: "6px 0" }}>
          All platforms connected ✓
        </div>
      )}
    </div>
  );
}

// ── Row 4b: Growth Panel ──────────────────────────────────────────────────────

function GrowthPanel({ growth = {}, switchTab }) {
  const { level = null, points = 0, streak_days = 0, progress_percentage = 0, next_reward } = growth;

  return (
    <div style={{
      background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16,
      padding: "20px 22px", flex: 2, minWidth: 0,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Growth</div>
        <span style={{ fontSize: 22 }}>🏆</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Level",   value: level || "—",                                  dim: !level },
          { label: "Points",  value: points > 0 ? points.toLocaleString() : "—",    dim: !points },
          { label: "Streak",  value: streak_days > 0 ? `${streak_days}d 🔥` : "—", dim: !streak_days },
          { label: "Next",    value: next_reward?.title ? next_reward.title.slice(0, 14) + "…" : "—", dim: !next_reward },
        ].map(({ label, value, dim }) => (
          <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
              {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: dim ? "#cbd5e1" : "#0f172a" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Next reward</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{progress_percentage}%</span>
        </div>
        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99, width: `${progress_percentage}%`,
            background: "linear-gradient(90deg, #7c3aed, #2563eb)",
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }} />
        </div>
      </div>

      <button
        onClick={() => switchTab?.("growth")}
        style={{
          display: "block", width: "100%", padding: "12px 0",
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          border: "none", borderRadius: 10,
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}
      >
        View Rewards →
      </button>
    </div>
  );
}

// ── Row 5: Quick Actions ──────────────────────────────────────────────────────

function QuickActions({ switchTab }) {
  const actions = [
    { label: "Create Post",      emoji: "✏️",  tab: "social"            },
    { label: "Create Campaign",  emoji: "🚀",  tab: "templates"         },
    { label: "Run Intelligence", emoji: "⚡",  tab: "brand-intelligence" },
    { label: "View Reports",     emoji: "📊",  tab: "reporting"         },
  ];

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {actions.map(({ label, emoji, tab }) => (
        <button
          key={label}
          onClick={() => switchTab?.(tab)}
          style={{
            flex: 1, minWidth: 130,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 16px", borderRadius: 12,
            border: "1px solid #e5e7eb", background: "#fff",
            color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#2563eb";
            e.currentTarget.style.color = "#2563eb";
            e.currentTarget.style.background = "#eff6ff";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.color = "#374151";
            e.currentTarget.style.background = "#fff";
          }}
        >
          <span style={{ fontSize: 16 }}>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14,
    }}>
      {label}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const DashboardOverview = ({
  activeBrand,
  switchTab,
  user,
  growth          = {},
  intelligenceFeed   = [],
  allContent         = [],
  connectedPlatforms = [],
  campaignsList      = [],
  stats: _metrics    = {},
  brandDna           = { completionPct: 0 },
}) => {
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const greetingName = user?.first_name || user?.email?.split("@")[0] || "there";

  const publishedCount = (allContent || []).filter(c => c.status === "published").length;

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
          {greeting}, {greetingName}
        </h3>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 5 }}>
          Here's what's happening with your brand today.
        </div>
      </div>

      {/* ── ROW 1: KPI Strip ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <KPICard
          label="Platforms Connected"
          value={connectedPlatforms.length}
          sub={`of ${ALL_PLATFORMS.length} available`}
          color={connectedPlatforms.length === 0 ? "#dc2626" : connectedPlatforms.length >= 4 ? "#16a34a" : "#d97706"}
        />
        <KPICard
          label="Published Content"
          value={publishedCount}
          sub={publishedCount === 0 ? "No content yet" : "posts & articles"}
        />
        <KPICard
          label="Active Campaigns"
          value={campaignsList.length}
          sub={campaignsList.length === 0 ? "No campaigns yet" : "in progress"}
        />
        <KPICard
          label="Intelligence Items"
          value={intelligenceFeed.length}
          sub={intelligenceFeed.length === 0 ? "Run intelligence" : "insights ready"}
          color={intelligenceFeed.length > 0 ? "#2563eb" : "#94a3b8"}
          subColor={intelligenceFeed.length === 0 ? "#94a3b8" : "#64748b"}
        />
        <KPICard
          label="Growth Level"
          value={growth.level || "—"}
          sub={growth.points > 0 ? `${growth.points.toLocaleString()} pts` : "Start earning"}
          color={growth.level ? "#7c3aed" : "#94a3b8"}
          subColor={growth.points > 0 ? "#64748b" : "#94a3b8"}
        />
      </div>

      {/* ── ROW 2: Brand Intelligence Hero ────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel label="Brand Intelligence" />
        <IntelligenceHero
          intelligenceFeed={intelligenceFeed}
          connectedPlatforms={connectedPlatforms}
          switchTab={switchTab}
        />
      </div>

      {/* ── ROW 3: Activity Feed ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <InsightsSnapshot activeBrand={activeBrand} switchTab={switchTab} />
      </div>

      {/* ── ROW 4: Platform + Growth ──────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel label="Platform & Growth" />
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <PlatformPanel connectedPlatforms={connectedPlatforms} switchTab={switchTab} />
          <GrowthPanel   growth={growth} switchTab={switchTab} />
        </div>
      </div>

      {/* ── ROW 5: Quick Actions ──────────────────────────────────────────── */}
      <div>
        <SectionLabel label="Quick Actions" />
        <QuickActions switchTab={switchTab} />
      </div>

    </div>
  );
};

export default DashboardOverview;
