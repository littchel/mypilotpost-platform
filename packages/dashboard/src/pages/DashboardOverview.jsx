import React from "react";
import {
  TrendingUp, CheckCircle, Share2, Target,
  Layout, ChevronRight,
} from "lucide-react";
import InsightsSnapshot from "../components/dashboard/InsightsSnapshot";

// ── Shared ─────────────────────────────────────────────────────────────────────

const DNARing = ({ pct }) => {
  const r    = 24;
  const circ = 2 * Math.PI * r;
  const fill = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="url(#dnaGradSmall)" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={fill}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="dnaGradSmall" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{pct}%</div>
      </div>
    </div>
  );
};

const SectionDivider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 18px" }}>
    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#cbd5e1" }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
  </div>
);

// ── Platform list ───────────────────────────────────────────────────────────────

const ALL_PLATFORMS   = ["instagram", "facebook", "linkedin", "x", "tiktok", "youtube", "pinterest", "threads"];
const PLATFORM_LABELS = {
  instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
  x: "X (Twitter)", tiktok: "TikTok", youtube: "YouTube",
  pinterest: "Pinterest", threads: "Threads",
};

// ── Growth System Status ────────────────────────────────────────────────────────

const State1NewUser = ({ switchTab, brandDna }) => (
  <div className="card-workspace p-5 bg-white shadow-sm border border-primary border-opacity-25" style={{ borderRadius: 24 }}>
    <div className="text-center mb-4">
      <div className="d-inline-flex p-3 bg-primary bg-opacity-10 rounded-circle mb-3">
        <Target className="text-primary" size={28} />
      </div>
      <h4 className="fw-bold text-main mb-1">Welcome to your Strategic Growth System</h4>
    </div>
    <div className="row g-3 justify-content-center">
      <div className="col-md-5">
        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column cursor-pointer hover-bg-white" onClick={() => switchTab("brand-dna")}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="fw-bold text-main small">1. Complete Brand DNA</div>
            <DNARing pct={brandDna?.completionPct || 0} />
          </div>
          <button className="btn btn-primary w-100 fw-bold rounded-pill mt-auto">Setup Brand DNA</button>
        </div>
      </div>
      <div className="col-md-5">
        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column cursor-pointer hover-bg-white" onClick={() => switchTab("integrations")}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="fw-bold text-main small">2. Connect Platforms</div>
            <div className="p-2 bg-white rounded-circle border"><Share2 size={20} className="text-muted" /></div>
          </div>
          <button className="btn btn-outline-primary w-100 fw-bold rounded-pill mt-auto">Connect Platforms</button>
        </div>
      </div>
    </div>
  </div>
);

const State2PartialActivation = ({ switchTab, brandDna }) => (
  <div className="card-workspace p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: 20 }}>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h6 className="fw-bold text-main mb-0">Growth System Status</h6>
      <div className="d-flex align-items-center gap-2">
        <DNARing pct={brandDna?.completionPct || 0} />
      </div>
    </div>
    <div className="row g-2">
      <div className="col-md-6">
        <div className="p-3 border rounded-3 d-flex align-items-center gap-3 cursor-pointer hover-bg-light" onClick={() => switchTab("brand-intelligence")}>
          <div className="p-2 bg-success bg-opacity-10 text-success rounded-circle"><Target size={18} /></div>
          <div className="small fw-bold text-main">Run Brand Intelligence</div>
          <ChevronRight className="ms-auto text-muted" size={14} />
        </div>
      </div>
      <div className="col-md-6">
        <div className="p-3 border rounded-3 d-flex align-items-center gap-3 cursor-pointer hover-bg-light" onClick={() => switchTab("reporting")}>
          <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle"><Layout size={18} /></div>
          <div className="small fw-bold text-main">Executive Reports</div>
          <ChevronRight className="ms-auto text-muted" size={14} />
        </div>
      </div>
    </div>
  </div>
);

const State3Active = ({ switchTab, connectedPlatforms = [], publishedCount = 0 }) => (
  <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-white shadow-sm rounded-3" style={{ border: "1px solid #f1f5f9" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
    <span className="extra-small fw-bold text-muted">
      {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? "s" : ""} · {publishedCount} published
    </span>
    <div className="d-flex gap-2 ms-auto">
      <button className="btn btn-sm btn-light extra-small fw-bold px-3" onClick={() => switchTab("insights")}>Insights</button>
      <button className="btn btn-sm btn-primary extra-small fw-bold px-3" onClick={() => switchTab("brand-intelligence")}>Intelligence</button>
    </div>
  </div>
);

const State4Advanced = ({ switchTab }) => (
  <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-white shadow-sm rounded-3" style={{ border: "1px solid #f1f5f9" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", display: "inline-block", boxShadow: "0 0 0 3px rgba(37,99,235,0.2)" }} />
    <span className="extra-small fw-bold text-muted">Executive Operations Active</span>
    <div className="d-flex gap-2 ms-auto">
      <button className="btn btn-sm btn-light extra-small fw-bold px-3" onClick={() => switchTab("templates")}>Templates</button>
      <button className="btn btn-sm btn-primary extra-small fw-bold px-3" onClick={() => switchTab("brand-intelligence")}>Intelligence</button>
    </div>
  </div>
);

// ── Today's Priority ────────────────────────────────────────────────────────────

const TodaysPriority = ({ intelligenceFeed = [], connectedPlatforms = [], switchTab }) => {
  let priority = null;

  if (intelligenceFeed.length > 0) {
    const top = intelligenceFeed[0];
    priority = {
      badge:      top.category || "Brand Intelligence",
      badgeColor: "#2563eb",
      title:      top.title,
      impact:     top.expected_impact,
      time:       top.priority === "high" ? "5–10 min" : "15–20 min",
      cta:        "View Intelligence →",
      tab:        "brand-intelligence",
    };
  } else if (connectedPlatforms.length === 0) {
    priority = {
      badge:      "Setup Required",
      badgeColor: "#dc2626",
      title:      "Connect your first platform",
      impact:     "Enables content scheduling, delivery tracking, and Brand Intelligence.",
      time:       "2–5 min",
      cta:        "Connect Now →",
      tab:        "integrations",
    };
  } else if (connectedPlatforms.length < 2) {
    priority = {
      badge:      "Quick Win",
      badgeColor: "#d97706",
      title:      "Connect a second platform to activate intelligence",
      impact:     "Brand Intelligence requires ≥2 platforms for cross-channel analysis.",
      time:       "2–5 min",
      cta:        "Connect Now →",
      tab:        "integrations",
    };
  }

  if (!priority) {
    return (
      <div style={{
        background: "#f8fafc", border: "1px dashed #e2e8f0",
        borderRadius: 14, padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 6 }}>Today's Priority</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>No intelligence generated today</div>
        </div>
        <button
          onClick={() => switchTab?.("brand-intelligence")}
          style={{
            padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, background: "#2563eb", color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          Run Brand Intelligence →
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)",
      border: "1px solid #dbeafe",
      borderLeft: `4px solid ${priority.badgeColor}`,
      borderRadius: 14,
      padding: "18px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
          color: priority.badgeColor, background: "rgba(255,255,255,0.9)",
          border: `1px solid ${priority.badgeColor}33`, borderRadius: 99, padding: "2px 8px",
        }}>
          {priority.badge}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#94a3b8" }}>
          Today's Priority
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.3, marginBottom: priority.impact ? 8 : 0 }}>
            {priority.title}
          </div>
          {priority.impact && (
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{priority.impact}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          {priority.time && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{priority.time}</span>
          )}
          <button
            onClick={() => switchTab?.(priority.tab)}
            style={{
              padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, background: priority.badgeColor, color: "#fff",
              whiteSpace: "nowrap", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {priority.cta}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Platform Status ─────────────────────────────────────────────────────────────

const PlatformStatus = ({ connectedPlatforms = [], switchTab }) => {
  const connected = ALL_PLATFORMS.filter(p => connectedPlatforms.includes(p));
  const missing   = ALL_PLATFORMS.filter(p => !connectedPlatforms.includes(p));
  const readyPct  = Math.round((connected.length / ALL_PLATFORMS.length) * 100);
  const isHealthy = connected.length === ALL_PLATFORMS.length;

  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Platform Status</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", display: "inline-block",
            background: isHealthy ? "#22c55e" : connected.length > 0 ? "#f59e0b" : "#ef4444",
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: isHealthy ? "#16a34a" : connected.length > 0 ? "#d97706" : "#dc2626" }}>
            {isHealthy ? "Fully Connected" : connected.length > 0 ? "Partially Connected" : "Setup Required"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ textAlign: "center", background: "#f0fdf4", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>{connected.length}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginTop: 3 }}>Connected</div>
          </div>
          <div style={{ textAlign: "center", background: "#fff7ed", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#d97706", lineHeight: 1 }}>{missing.length}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#64748b", marginTop: 3 }}>Remaining</div>
          </div>
        </div>

        <div>
          {isHealthy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>All platforms connected</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 8 }}>Not Connected</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {missing.map(p => (
                  <span key={p} style={{
                    fontSize: 10, fontWeight: 600, color: "#475569",
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: 7, padding: "3px 9px",
                  }}>
                    {PLATFORM_LABELS[p] || p}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#94a3b8" }}>Coverage</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb" }}>{readyPct}%</span>
              </div>
              <div style={{ height: 4, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, width: `${readyPct}%`,
                  background: "linear-gradient(90deg, #22c55e, #2563eb)",
                  transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </div>
            </>
          )}
        </div>
      </div>

      {!isHealthy && (
        <button
          onClick={() => switchTab?.("integrations")}
          style={{
            display: "block", width: "100%", marginTop: 16,
            background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
            border: "none", borderRadius: 10, padding: "9px 0",
            fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          Complete Platform Setup →
        </button>
      )}
    </div>
  );
};

// ── Brand Intelligence Preview ──────────────────────────────────────────────────

const BrandIntelligencePreview = ({ intelligenceFeed = [], switchTab }) => {
  const topItem = intelligenceFeed[0];
  const isEmpty = intelligenceFeed.length === 0;

  const lastGenDate = topItem?.generated_at
    ? new Date(topItem.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "18px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 2 }}>Strategic</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Brand Intelligence</div>
        </div>
        <span style={{ fontSize: 8, fontWeight: 800, color: "#2563eb", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 99, padding: "2px 7px" }}>AI</span>
      </div>

      <div style={{ flex: 1 }}>
        {isEmpty ? (
          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
            No intelligence generated yet.
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 12, fontWeight: 800, color: "#0f172a", lineHeight: 1.35, marginBottom: 8,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {topItem.title}
            </div>
            <div style={{
              fontSize: 11, color: "#475569", lineHeight: 1.5, marginBottom: 10,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {topItem.finding}
            </div>
            {lastGenDate && (
              <div style={{ fontSize: 9, color: "#94a3b8" }}>Generated {lastGenDate} · {intelligenceFeed.length} insights</div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => switchTab?.("brand-intelligence")}
        style={{
          display: "block", width: "100%", marginTop: 14,
          background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
          border: "none", borderRadius: 9, padding: "9px 0",
          fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        View Full Brand Intelligence →
      </button>
    </div>
  );
};

// ── Growth Engine Preview ───────────────────────────────────────────────────────

const GrowthEnginePreview = ({ intelligenceFeed = [], switchTab }) => {
  const growthItem    = intelligenceFeed.find(i => i.module_id === "growth_engine"        || i.category === "Growth Engine");
  const campaignItem  = intelligenceFeed.find(i => i.module_id === "campaign_intelligence" || i.category === "Campaign Intelligence");
  const hasData       = !!(growthItem || campaignItem);

  const rows = [
    { label: "Recommended Goal",     value: growthItem?.title },
    { label: "Recommended Campaign", value: campaignItem?.title },
    { label: "Expected Impact",      value: growthItem?.expected_impact },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "18px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 2 }}>Execution</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Growth Engine</div>
        </div>
        <TrendingUp size={15} color="#059669" />
      </div>

      <div style={{ flex: 1 }}>
        {hasData ? (
          rows.map(({ label, value }) => (
            <div key={label} style={{ padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
              {value ? (
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#0f172a", lineHeight: 1.35,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {value}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#cbd5e1" }}>—</div>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "18px 0", color: "#94a3b8" }}>
            <TrendingUp size={24} color="#e2e8f0" style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1" }}>Run Brand Intelligence to generate growth recommendations.</div>
          </div>
        )}
      </div>

      <button
        onClick={() => switchTab?.(hasData ? "campaign" : "brand-intelligence")}
        style={{
          display: "block", width: "100%", marginTop: 14,
          background: hasData ? "linear-gradient(135deg, #059669, #047857)" : "#f8fafc",
          border: hasData ? "none" : "1px solid #e2e8f0",
          borderRadius: 9, padding: "9px 0",
          fontSize: 11, fontWeight: 700,
          color: hasData ? "#fff" : "#374151",
          cursor: "pointer", transition: "opacity 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        {hasData ? "Launch Campaign →" : "Run Brand Intelligence →"}
      </button>
    </div>
  );
};

// ── Rewards Engine Preview ──────────────────────────────────────────────────────

const RewardsEnginePreview = ({ growth = {}, switchTab }) => {
  const points = growth.points              || 0;
  const level  = growth.level              || null;
  const streak = growth.streak_days        || 0;
  const next   = growth.next_reward;
  const pct    = growth.progress_percentage || 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "18px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 2 }}>Motivation</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Rewards Engine</div>
        </div>
        <span style={{ fontSize: 15 }}>🏆</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, flex: 1 }}>
        {[
          { label: "Level",   value: level   || "—" },
          { label: "Points",  value: points > 0 ? points.toLocaleString() : "—" },
          { label: "Streak",  value: streak  > 0 ? `${streak}d 🔥`        : "—" },
          { label: "Next",    value: next?.title ? next.title.slice(0, 16) + (next.title.length > 16 ? "…" : "") : "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#f8fafc", borderRadius: 9, padding: "9px 10px" }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: value === "—" ? "#cbd5e1" : "#0f172a" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>Next reward</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb" }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99, width: `${pct}%`,
            background: "linear-gradient(90deg, #2563eb, #7c3aed)",
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }} />
        </div>
      </div>

      <button
        onClick={() => switchTab?.("growth")}
        style={{
          display: "block", width: "100%",
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          border: "none", borderRadius: 9, padding: "9px 0",
          fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        View Rewards →
      </button>
    </div>
  );
};

// ── Main ────────────────────────────────────────────────────────────────────────

const DashboardOverview = ({
  activeBrand,
  switchTab,
  user,
  growth,
  intelligenceFeed    = [],
  allContent          = [],
  connectedPlatforms  = [],
  stats: metrics      = {},
  brandDna            = { completionPct: 0 },
  auditData           = null,
}) => {
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : hour < 21 ? "Good Evening" : "Good Night";
  const greetingName = user?.first_name || user?.email?.split("@")[0] || "there";

  const publishedCount = allContent.filter(c => c.status === "published").length;
  const scheduledCount = allContent.filter(c => c.status === "scheduled").length;
  const isConnected    = connectedPlatforms.length > 0;
  const dnaComplete    = brandDna.completionPct >= 70;

  let state = 1;
  if (isConnected || brandDna.completionPct > 0)                                state = 2;
  if (isConnected && dnaComplete && (publishedCount > 0 || scheduledCount > 0)) state = 3;
  if (state === 3 && publishedCount >= 10 && (metrics.reach || 0) > 1000)       state = 4;

  return (
    <div className="dashboard-intel animate__animated animate__fadeIn p-1">

      {/* Greeting */}
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h3 className="fw-bold text-main mb-1" style={{ letterSpacing: "-0.03em" }}>
            {greeting}, {greetingName}!
          </h3>
        </div>
        {auditData?.audit_id && (
          <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-3 py-2 rounded-pill">
            <CheckCircle size={13} className="text-primary" />
            <span className="extra-small fw-bold text-primary">Audit Hydrated</span>
          </div>
        )}
      </div>

      {/* Growth System Status */}
      {state === 1 && <State1NewUser           switchTab={switchTab} brandDna={brandDna} />}
      {state === 2 && <State2PartialActivation  switchTab={switchTab} brandDna={brandDna} />}
      {state === 3 && <State3Active            switchTab={switchTab} connectedPlatforms={connectedPlatforms} publishedCount={publishedCount} />}
      {state === 4 && <State4Advanced          switchTab={switchTab} />}

      {/* ══ TODAY'S PRIORITY ═════════════════════════════════════════════════ */}
      <SectionDivider label="Today's focus" />
      <TodaysPriority
        intelligenceFeed={intelligenceFeed}
        connectedPlatforms={connectedPlatforms}
        switchTab={switchTab}
      />

      {/* ══ INSIGHTS SNAPSHOT ════════════════════════════════════════════════ */}
      <SectionDivider label="What's happening" />
      <InsightsSnapshot activeBrand={activeBrand} switchTab={switchTab} />

      {/* ══ PLATFORM STATUS ══════════════════════════════════════════════════ */}
      <SectionDivider label="Platform health" />
      <PlatformStatus connectedPlatforms={connectedPlatforms} switchTab={switchTab} />

      {/* ══ GROWTH OVERVIEW ══════════════════════════════════════════════════ */}
      <SectionDivider label="Growth overview" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <BrandIntelligencePreview intelligenceFeed={intelligenceFeed} switchTab={switchTab} />
        <GrowthEnginePreview      intelligenceFeed={intelligenceFeed} switchTab={switchTab} />
        <RewardsEnginePreview     growth={growth} switchTab={switchTab} />
      </div>

    </div>
  );
};

export default DashboardOverview;
