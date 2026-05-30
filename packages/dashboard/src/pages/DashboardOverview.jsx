import React from "react";
import {
  TrendingUp, CheckCircle, Share2, Target,
  ArrowRight, Layout, ChevronRight,
} from "lucide-react";
import InsightsSnapshot from "../components/dashboard/InsightsSnapshot";

/**
 * Dashboard Overview
 * Mission control — operational pulse at a glance.
 * Four sections: Insights Snapshot | Brand Intelligence | Growth Engine | Rewards Engine
 */

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
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 20px" }}>
    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#cbd5e1" }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
  </div>
);

// ── Activation States ───────────────────────────────────────────────────────────

const State1NewUser = ({ switchTab, brandDna }) => (
  <div className="card-workspace p-5 bg-white shadow-sm border border-primary border-opacity-25" style={{ borderRadius: 24 }}>
    <div className="text-center mb-5">
      <div className="d-inline-flex p-3 bg-primary bg-opacity-10 rounded-circle mb-3">
        <Target className="text-primary" size={32} />
      </div>
      <h3 className="fw-bold text-main mb-2">Welcome to your Strategic Growth System</h3>
      <p className="text-muted" style={{ maxWidth: 500, margin: "0 auto" }}>
        Complete your setup to unlock AI-powered content opportunities and executive intelligence.
      </p>
    </div>
    <div className="row g-4 justify-content-center">
      <div className="col-md-5">
        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column hover-bg-white transition-all cursor-pointer shadow-sm" onClick={() => switchTab("brand-dna")}>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="fw-bold text-main">1. Complete Brand DNA</div>
            <DNARing pct={brandDna?.completionPct || 0} />
          </div>
          <p className="extra-small text-muted mb-4 flex-1">
            Teach the intelligence engine about your audience, voice, and goals.
          </p>
          <button className="btn btn-primary w-100 fw-bold rounded-pill">Setup Brand DNA</button>
        </div>
      </div>
      <div className="col-md-5">
        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column hover-bg-white transition-all cursor-pointer shadow-sm" onClick={() => switchTab("integrations")}>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="fw-bold text-main">2. Connect Platforms</div>
            <div className="p-2 bg-white rounded-circle border"><Share2 size={24} className="text-muted" /></div>
          </div>
          <p className="extra-small text-muted mb-4 flex-1">
            Connect LinkedIn and other platforms to activate live performance intelligence and scheduling.
          </p>
          <button className="btn btn-outline-primary w-100 fw-bold rounded-pill">Connect Platforms</button>
        </div>
      </div>
    </div>
  </div>
);

const State2PartialActivation = ({ switchTab, brandDna }) => (
  <div className="card-workspace p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: 20 }}>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h5 className="fw-bold text-main mb-1">Activation Progress</h5>
        <div className="extra-small text-muted">Complete these steps to unlock the full intelligence feed.</div>
      </div>
      <div className="d-flex align-items-center gap-3">
        <DNARing pct={brandDna?.completionPct || 0} />
        <div className="extra-small fw-bold text-primary">DNA Setup</div>
      </div>
    </div>
    <div className="row g-3">
      <div className="col-md-6">
        <div className="p-3 border rounded-3 d-flex align-items-center gap-3 cursor-pointer hover-bg-light" onClick={() => switchTab("brand-intelligence")}>
          <div className="p-2 bg-success bg-opacity-10 text-success rounded-circle"><Target size={20} /></div>
          <div>
            <div className="small fw-bold text-main mb-1">Run Brand Intelligence</div>
            <div className="extra-small text-muted">Generate your first strategic analysis.</div>
          </div>
          <ChevronRight className="ms-auto text-muted" size={16} />
        </div>
      </div>
      <div className="col-md-6">
        <div className="p-3 border rounded-3 d-flex align-items-center gap-3 cursor-pointer hover-bg-light" onClick={() => switchTab("reporting")}>
          <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-circle"><Layout size={20} /></div>
          <div>
            <div className="small fw-bold text-main mb-1">Configure Reporting</div>
            <div className="extra-small text-muted">Set up your first automated executive summary.</div>
          </div>
          <ChevronRight className="ms-auto text-muted" size={16} />
        </div>
      </div>
    </div>
  </div>
);

const State3Active = ({ switchTab, connectedPlatforms = [], publishedCount = 0 }) => (
  <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-white shadow-sm rounded-3" style={{ border: "1px solid #f1f5f9" }}>
    <div className="d-flex align-items-center gap-2">
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
      <span className="extra-small fw-bold text-muted">Platform Active</span>
    </div>
    <div className="extra-small text-muted">
      {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? "s" : ""} connected · {publishedCount} published
    </div>
    <div className="d-flex gap-2 ms-auto">
      <button className="btn btn-sm btn-light extra-small fw-bold px-3" onClick={() => switchTab("insights")}>
        Insights
      </button>
      <button className="btn btn-sm btn-primary extra-small fw-bold px-3" onClick={() => switchTab("brand-intelligence")}>
        Brand Intelligence
      </button>
    </div>
  </div>
);

const State4Advanced = ({ switchTab }) => (
  <div className="card-workspace p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: 20 }}>
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h5 className="fw-bold text-main mb-1">Executive Operations Active</h5>
        <div className="extra-small text-muted">Strategic intelligence and automation fully engaged.</div>
      </div>
      <button className="btn btn-outline-primary btn-sm extra-small fw-bold" onClick={() => switchTab("brand-intelligence")}>
        Open Brand Intelligence
      </button>
    </div>
    <div className="row g-3">
      <div className="col-md-4">
        <div className="p-3 bg-light rounded-3 border cursor-pointer hover-bg-white transition-all" onClick={() => switchTab("templates")}>
          <div className="extra-small fw-bold text-muted text-uppercase mb-1">Next Action</div>
          <div className="small fw-bold text-main mb-0">Content Templates</div>
          <div className="extra-small text-muted mt-1">Pick a template and execute →</div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="p-3 bg-light rounded-3 border cursor-pointer hover-bg-white transition-all" onClick={() => switchTab("reporting")}>
          <div className="extra-small fw-bold text-muted text-uppercase mb-1">Reports</div>
          <div className="small fw-bold text-main mb-0">Executive Reports</div>
          <div className="extra-small text-muted mt-1">View performance summaries →</div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="p-3 bg-light rounded-3 border cursor-pointer hover-bg-white transition-all" onClick={() => switchTab("analytics")}>
          <div className="extra-small fw-bold text-muted text-uppercase mb-1">Analytics</div>
          <div className="small fw-bold text-main mb-0">Platform Analytics</div>
          <div className="extra-small text-muted mt-1">Review delivery data →</div>
        </div>
      </div>
    </div>
  </div>
);

// ── Preview Widgets ─────────────────────────────────────────────────────────────

const SnapshotRow = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #f8fafc", gap: 8 }}>
    <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 11, fontWeight: 700, color: color || "#0f172a", textAlign: "right", lineHeight: 1.4, maxWidth: "60%" }}>{value || "—"}</span>
  </div>
);

const BrandIntelligencePreview = ({ brandIntelligence, switchTab }) => {
  const feed        = [...(brandIntelligence?.executive || []), ...(brandIntelligence?.advisory || [])];
  const topItem     = feed.find(i => i.urgency === "critical" || i.urgency === "high") || feed[0];
  const opportunity = feed.find(i => ["opportunity", "growth"].includes(i.category));
  const risk        = feed.find(i => i.category === "risk");
  const isEmpty     = feed.length === 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "20px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 3 }}>Strategic</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Brand Intelligence</div>
        </div>
        <span style={{ fontSize: 8, fontWeight: 800, color: "#2563eb", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 99, padding: "2px 8px", letterSpacing: 0.8 }}>LIVE</span>
      </div>

      {isEmpty ? (
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "16px 0", lineHeight: 1.7 }}>
          Connect platforms to generate<br />Brand Intelligence.
        </div>
      ) : (
        <div>
          <SnapshotRow label="Next Best Action"  value={topItem?.cta || topItem?.title}  color="#2563eb" />
          <SnapshotRow label="Growth Opportunity" value={opportunity?.title}              color="#059669" />
          <SnapshotRow label="Growth Risk"        value={risk?.title}                     color="#dc2626" />
          <SnapshotRow label="Confidence"         value={topItem?.confidence || "Live"}              />
        </div>
      )}

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

const GrowthEnginePreview = ({ switchTab }) => (
  <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "20px", height: "100%", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 3 }}>Execution</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Growth Engine</div>
      </div>
      <TrendingUp size={16} color="#059669" />
    </div>

    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "16px 0" }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
      }}>
        <TrendingUp size={22} color="#059669" />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Coming Soon</div>
      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6, maxWidth: 160 }}>
        AI-powered growth recommendations and campaign execution engine.
      </div>
    </div>

    <button
      onClick={() => switchTab?.("campaign")}
      style={{
        display: "block", width: "100%", marginTop: "auto",
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 9, padding: "9px 0",
        fontSize: 11, fontWeight: 700, color: "#374151", cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; }}
    >
      Launch Campaign →
    </button>
  </div>
);

const RewardsEnginePreview = ({ growth = {}, switchTab }) => {
  const points  = growth.points        || 0;
  const level   = growth.level         || "Starter";
  const streak  = growth.streak_days   || 0;
  const next    = growth.next_reward;
  const pct     = growth.progress_percentage || 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "20px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", marginBottom: 3 }}>Motivation</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Rewards Engine</div>
        </div>
        <span style={{ fontSize: 16 }}>🏆</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Level",   value: level          },
          { label: "Points",  value: points.toLocaleString() },
          { label: "Streak",  value: `${streak}d 🔥`       },
          { label: "Next",    value: next?.title ? next.title.slice(0, 18) + (next.title.length > 18 ? "…" : "") : "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8" }}>Progress to next reward</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb" }}>{pct}%</span>
        </div>
        <div style={{ height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
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
          display: "block", width: "100%", marginTop: "auto",
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
  brandIntelligence,
  allContent         = [],
  connectedPlatforms = [],
  stats: metrics     = {},
  brandDna           = { completionPct: 0 },
  auditData          = null,
}) => {
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : hour < 21 ? "Good Evening" : "Good Night";
  const greetingName = user?.first_name || user?.email?.split("@")[0] || "there";

  const publishedCount = allContent.filter(c => c.status === "published").length;
  const scheduledCount = allContent.filter(c => c.status === "scheduled").length;
  const isConnected    = connectedPlatforms.length > 0;
  const dnaComplete    = brandDna.completionPct >= 70;

  let state = 1;
  if (isConnected || brandDna.completionPct > 0)                                      state = 2;
  if (isConnected && dnaComplete && (publishedCount > 0 || scheduledCount > 0))       state = 3;
  if (state === 3 && publishedCount >= 10 && (metrics.reach || 0) > 1000)             state = 4;

  const subtitles = {
    1: "Let's set up your strategic foundation today.",
    2: "Continue building your platform architecture.",
    3: "Here is your operational overview.",
    4: "Your AI strategic operating system is fully active.",
  };

  return (
    <div className="dashboard-intel animate__animated animate__fadeIn p-1">

      {/* Greeting */}
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h3 className="fw-bold text-main mb-1" style={{ letterSpacing: "-0.03em" }}>
            {greeting}, {greetingName}!
          </h3>
          <p className="small text-muted mb-0">{subtitles[state]}</p>
        </div>
        {auditData?.audit_id && (
          <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-3 py-2 rounded-pill">
            <CheckCircle size={14} className="text-primary" />
            <span className="extra-small fw-bold text-primary">Audit Hydrated</span>
          </div>
        )}
      </div>

      {/* Activation state component */}
      {state === 1 && <State1NewUser      switchTab={switchTab} brandDna={brandDna} />}
      {state === 2 && <State2PartialActivation switchTab={switchTab} brandDna={brandDna} />}
      {state === 3 && <State3Active       switchTab={switchTab} connectedPlatforms={connectedPlatforms} publishedCount={publishedCount} />}
      {state === 4 && <State4Advanced     switchTab={switchTab} />}

      {/* ══ INSIGHTS SNAPSHOT ════════════════════════════════════════════════ */}
      <SectionDivider label="What's happening" />

      <InsightsSnapshot activeBrand={activeBrand} switchTab={switchTab} />

      {/* ══ PREVIEW WIDGETS ══════════════════════════════════════════════════ */}
      <SectionDivider label="Platform overview" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <BrandIntelligencePreview brandIntelligence={brandIntelligence} switchTab={switchTab} />
        <GrowthEnginePreview      switchTab={switchTab} />
        <RewardsEnginePreview     growth={growth} switchTab={switchTab} />
      </div>

    </div>
  );
};

export default DashboardOverview;
