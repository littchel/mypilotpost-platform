import React, { useState, useEffect } from "react";
import { 
  Zap, TrendingUp, CheckCircle, Clock, Plus, 
  ArrowRight, Search, FileText, Share2, Target, 
  BarChart2, ShieldCheck, HelpCircle, ChevronRight,
  Layout, MessageSquare, AlertCircle, RefreshCw
} from "lucide-react";
import { apiSafeFetch } from "../lib/api/client";

/**
 * Dashboard Intelligence Activation
 * Adapts based on 4 activation maturity states:
 * 1. New User
 * 2. Partial Activation
 * 3. Strategically Active
 * 4. Advanced User
 */

// ── Shared UI Components ───────────────────────────────────────────────────

const DNARing = ({ pct }) => {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const fill = circ - (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="url(#dnaGradSmall)" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={fill}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="dnaGradSmall" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{pct}%</div>
      </div>
    </div>
  );
};

// ── Activation States ───────────────────────────────────────────────────────

const State1NewUser = ({ activeBrand, switchTab, auditData, brandDna }) => (
  <div className="card-workspace p-5 bg-white shadow-sm border border-primary border-opacity-25" style={{ borderRadius: '24px' }}>
    <div className="text-center mb-5">
      <div className="d-inline-flex p-3 bg-primary bg-opacity-10 rounded-circle mb-3">
        <Target className="text-primary" size={32} />
      </div>
      <h3 className="fw-bold text-main mb-2">Welcome to your Strategic Growth System</h3>
      <p className="text-muted" style={{ maxWidth: 500, margin: '0 auto' }}>
        Your dashboard adapts as your strategy matures. Complete your setup to unlock AI-powered content opportunities and executive intelligence.
      </p>
    </div>

    <div className="row g-4 justify-content-center">
      <div className="col-md-5">
        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column hover-bg-white transition-all cursor-pointer shadow-sm" onClick={() => switchTab('brand-dna')}>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="fw-bold text-main">1. Complete Brand DNA</div>
            <DNARing pct={brandDna?.completionPct || 0} />
          </div>
          <p className="extra-small text-muted mb-4 flex-1">
            Teach the intelligence engine about your audience, voice, and goals. This calibrates all AI outputs.
          </p>
          <button className="btn btn-primary w-100 fw-bold rounded-pill">Setup Brand DNA</button>
        </div>
      </div>
      <div className="col-md-5">
        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column hover-bg-white transition-all cursor-pointer shadow-sm" onClick={() => switchTab('integrations')}>
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

const State2PartialActivation = ({ switchTab, brandDna, connectedPlatforms }) => (
  <div>
    <div className="card-workspace p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: 20 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold text-main mb-1">Activation Progress</h5>
          <div className="extra-small text-muted">Complete these final steps to unlock the full intelligence feed.</div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <DNARing pct={brandDna?.completionPct || 0} />
          <div className="extra-small fw-bold text-primary">DNA Setup</div>
        </div>
      </div>
      
      <div className="row g-3">
        <div className="col-md-6">
          <div className="p-3 border rounded-3 d-flex align-items-center gap-3 cursor-pointer hover-bg-light" onClick={() => switchTab('content-opportunities')}>
            <div className="p-2 bg-success bg-opacity-10 text-success rounded-circle"><Target size={20} /></div>
            <div>
              <div className="small fw-bold text-main mb-1">Generate First Opportunities</div>
              <div className="extra-small text-muted">Run the intelligence engine to find content gaps.</div>
            </div>
            <ChevronRight className="ms-auto text-muted" size={16} />
          </div>
        </div>
        <div className="col-md-6">
          <div className="p-3 border rounded-3 d-flex align-items-center gap-3 cursor-pointer hover-bg-light" onClick={() => switchTab('reporting')}>
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
  </div>
);

const State3Active = ({ brandIntelligence, switchTab, onInsightClick, growth }) => {
  const feed = brandIntelligence?.feed || [];
  const topInsight = feed[0];

  return (
    <div>
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          {topInsight && (
            <div className="card-workspace p-4 h-100 bg-white shadow-sm border-start border-primary border-4" style={{ borderRadius: 16 }}>
              <div className="extra-small fw-bold text-primary text-uppercase tracking-widest mb-3">Priority Intelligence</div>
              <h4 className="fw-bold text-main mb-2">{topInsight.title}</h4>
              <p className="text-muted small mb-4">{topInsight.body}</p>
              {topInsight.cta && (
                <button className="btn btn-primary btn-sm px-4 fw-bold rounded-pill shadow-sm" onClick={() => { if(topInsight.tab) switchTab(topInsight.tab); onInsightClick?.(topInsight); }}>
                  {topInsight.cta} <ArrowRight size={14} className="ms-2" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="col-lg-4">
          <div className="card-workspace p-4 h-100 bg-white shadow-sm" style={{ borderRadius: 16 }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="extra-small fw-bold text-muted text-uppercase tracking-widest">Growth Engine</div>
              <TrendingUp size={16} className="text-success" />
            </div>
            <div className="d-flex justify-content-between align-items-end mb-3 pb-3 border-bottom">
              <div>
                <div className="h3 fw-bold text-main mb-0">{growth?.points || 0}</div>
                <div className="extra-small text-muted">Total Points</div>
              </div>
              <div className="text-end">
                <div className="h5 fw-bold text-main mb-0">{growth?.streak_days || 0}</div>
                <div className="extra-small text-muted">Day Streak 🔥</div>
              </div>
            </div>
            <button className="btn btn-light w-100 extra-small fw-bold" onClick={() => switchTab('growth')}>View Rewards</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const State4Advanced = ({ metrics, switchTab }) => (
  <div>
    <div className="card-workspace p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: 20 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold text-main mb-1">Executive Optimization</h5>
          <div className="extra-small text-muted">Predictive insights and strategic benchmarking active.</div>
        </div>
        <button className="btn btn-outline-primary btn-sm extra-small fw-bold" onClick={() => switchTab('insights')}>View Executive Dashboard</button>
      </div>
      <div className="row g-3">
        <div className="col-md-3">
          <div className="p-3 bg-light rounded-3 border">
            <div className="extra-small fw-bold text-muted text-uppercase mb-1">Est. ROI Trajectory</div>
            <div className="h4 fw-bold text-success mb-0">+34%</div>
            <div className="extra-small text-success mt-1">↑ Expected 90-day yield</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="p-3 bg-light rounded-3 border">
            <div className="extra-small fw-bold text-muted text-uppercase mb-1">Authority Index</div>
            <div className="h4 fw-bold text-primary mb-0">Top 12%</div>
            <div className="extra-small text-muted mt-1">vs category benchmark</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Dashboard Overview Component ────────────────────────────────────────

const DashboardOverview = ({ 
  activeBrand, 
  switchTab,
  onInsightClick,
  user,
  growth,
  brandIntelligence,
  allContent = [],
  connectedPlatforms = [],
  stats: metrics = {},
  brandDna = { completionPct: 0 },
  auditData = null
}) => {

  const greetingText = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Determine Activation State
  const publishedCount = allContent.filter(c => c.status === 'published').length;
  const scheduledCount = allContent.filter(c => c.status === 'scheduled').length;
  const isConnected = connectedPlatforms.length > 0;
  const dnaComplete = brandDna.completionPct >= 70;

  let activationState = 1; // New User
  if (isConnected || brandDna.completionPct > 0) activationState = 2; // Partial
  if (isConnected && dnaComplete && (publishedCount > 0 || scheduledCount > 0)) activationState = 3; // Active
  if (activationState === 3 && publishedCount >= 10 && metrics.reach > 1000) activationState = 4; // Advanced

  return (
    <div className="dashboard-intel animate__animated animate__fadeIn p-1">
      
      {/* 👋 WELCOME GREETING */}
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h3 className="fw-bold text-main mb-1" style={{ letterSpacing: '-0.03em' }}>
            {greetingText()}, {user?.first_name || 'Partner'}!
          </h3>
          <p className="small text-muted mb-0">
            {activationState === 1 && "Let's set up your strategic foundation today."}
            {activationState === 2 && "Continue building your platform architecture."}
            {activationState === 3 && "Here is your strategic growth overview."}
            {activationState === 4 && "Your AI strategic operating system is fully active."}
          </p>
        </div>
        {auditData?.audit_id && (
          <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-3 py-2 rounded-pill">
            <CheckCircle size={14} className="text-primary" />
            <span className="extra-small fw-bold text-primary">Audit Hydrated</span>
          </div>
        )}
      </div>

      {/* 🧭 RENDER STATE */}
      {activationState === 1 && <State1NewUser switchTab={switchTab} activeBrand={activeBrand} auditData={auditData} brandDna={brandDna} />}
      {activationState === 2 && <State2PartialActivation switchTab={switchTab} brandDna={brandDna} connectedPlatforms={connectedPlatforms} />}
      {activationState === 3 && <State3Active switchTab={switchTab} brandIntelligence={brandIntelligence} onInsightClick={onInsightClick} growth={growth} />}
      {activationState === 4 && <State4Advanced switchTab={switchTab} metrics={metrics} />}

    </div>
  );
};

export default DashboardOverview;
