/**
 * BrandAuditPage — Social Media Brand Audit
 * URL input → AI crawl + Groq → Premium consulting-grade results
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SESSION_KEY = 'mpp_audit_session_v2';
const SESSION_TTL = 24 * 60 * 60 * 1000;

const ANALYSIS_STEPS = [
  { label: 'Crawling your website...', icon: 'fa-globe' },
  { label: 'Discovering social profiles...', icon: 'fa-share-alt' },
  { label: 'Running AI brand analysis...', icon: 'fa-brain' },
  { label: 'Building your audit report...', icon: 'fa-chart-bar' },
];

const CONTENT_COLORS = {
  educational: '#3b82f6',
  promotional: '#ec4899',
  social_proof: '#10b981',
  community: '#f59e0b',
  thought_leadership: '#8b5cf6',
};

const sc = (v) => v >= 70 ? '#16a34a' : v >= 50 ? '#d97706' : '#dc2626';
const sl = (v) => v >= 70 ? 'Strong' : v >= 50 ? 'Developing' : 'Needs Work';
const riskLevel = (v) => v >= 60 ? 'High Risk' : v >= 40 ? 'Moderate Risk' : 'Low Risk';
const riskColor = (v) => v >= 60 ? '#dc2626' : v >= 40 ? '#d97706' : '#16a34a';

// ─── Helper components ────────────────────────────────────────────────────────

function ScoreRing({ score, size = 160 }) {
  const r = size * 0.37;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = sc(score);
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={size * 0.075} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.075}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 8px ${color}60)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.09, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/100</span>
      </div>
    </div>
  );
}

function DimBar({ label, value, delay = 0 }) {
  const color = sc(value);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: `width 1.2s cubic-bezier(.4,0,.2,1) ${delay}ms`, boxShadow: `0 0 6px ${color}80` }} />
      </div>
    </div>
  );
}

function SectionHeader({ num, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 0 }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', background: '#eef2ff', padding: '3px 8px', borderRadius: 4 }}>§{num}</span>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {subtitle && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, paddingLeft: 42 }}>{subtitle}</p>}
    </div>
  );
}

function ConfidenceBadge({ type }) {
  const styles = {
    observed: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', icon: '✓' },
    inferred: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', icon: '◎' },
    estimated: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: '~' },
  };
  const s = styles[type] || styles.estimated;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {s.icon} {type}
    </span>
  );
}

function EvidenceTypeBadge({ text }) {
  const keywords = [
    ['website', 'Website Structure', '#0ea5e9', '#e0f2fe'],
    ['social', 'Social Profiles', '#8b5cf6', '#f5f3ff'],
    ['content', 'Content Signals', '#10b981', '#f0fdf4'],
    ['email|contact|phone|trust', 'Trust Signals', '#f59e0b', '#fffbeb'],
    ['competitor|market|industry', 'Market Signals', '#ec4899', '#fdf2f8'],
    ['seo|search|keyword', 'SEO Signals', '#6366f1', '#eef2ff'],
  ];
  const lower = text.toLowerCase();
  for (const [pattern, label, color, bg] of keywords) {
    if (new RegExp(pattern).test(lower)) {
      return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 100, background: bg, color, fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>;
    }
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 100, background: '#f1f5f9', color: '#64748b', fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>AI Analysis</span>;
}

function RiskBar({ label, value, subtitle }) {
  const color = riskColor(value);
  const level = riskLevel(value);
  return (
    <div style={{ padding: '18px', background: '#fff', borderRadius: 12, border: `1px solid ${color}30`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: `${value}%`, height: 3, background: color, borderRadius: '12px 12px 0 0', transition: 'width 1.2s ease' }} />
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>{value}%</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color, padding: '2px 8px', background: `${color}14`, borderRadius: 100 }}>{level}</span>
      </div>
      {subtitle && <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineHeight: 1.55 }}>{subtitle}</p>}
    </div>
  );
}

function RoadmapItem({ item, phase, rank }) {
  const phases = {
    qw: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Quick Win', icon: '⚡' },
    gp: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Growth Play', icon: '📈' },
    si: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Strategic', icon: '🎯' },
  };
  const p = phases[phase] || phases.qw;
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#fafbfc', borderRadius: 12, border: '1px solid #f1f5f9', borderLeft: `4px solid ${p.color}`, marginBottom: 10 }}>
      <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: 8, background: p.bg, border: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: p.color, flexShrink: 0 }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4, flex: 1 }}>{item.action}</span>
          <span style={{ padding: '2px 8px', background: p.bg, color: p.color, border: `1px solid ${p.border}`, borderRadius: 100, fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{p.icon} {p.label}</span>
        </div>
        {item.references_issue && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>Addresses: {item.references_issue}</div>}
        {item.business_impact && <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.5, marginBottom: 4 }}>{item.business_impact}</div>}
        {item.expected_outcome && <div style={{ fontSize: '0.7rem', color: p.color, fontWeight: 600 }}>Expected: {item.expected_outcome}</div>}
      </div>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.timeframe}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const BrandAuditPage = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const [stage, setStage] = useState(1);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandNameHint, setBrandNameHint] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (Date.now() - (session.timestamp || 0) > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return; }
      if (session.auditId && session.result) {
        setWebsiteUrl(session.websiteUrl || '');
        setBrandNameHint(session.brandName || '');
        setAuditResult(session.result);
        setStage(3);
      }
    } catch { /* empty */ }
  }, []);

  const runAudit = async () => {
    const url = websiteUrl.trim();
    if (!url) return;
    setError(''); setLoading(true); setStage(2); setAnalysisStep(0);
    let stepIdx = 0;
    timerRef.current = setInterval(() => {
      stepIdx += 1; setAnalysisStep(stepIdx);
      if (stepIdx >= ANALYSIS_STEPS.length - 1) clearInterval(timerRef.current);
    }, 1800);
    try {
      const [res] = await Promise.all([
        fetch('/api/public/brand-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_url: url, brand_name: brandNameHint.trim() || undefined }),
        }),
        new Promise(r => setTimeout(r, 5000)),
      ]);
      clearInterval(timerRef.current); setAnalysisStep(ANALYSIS_STEPS.length);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setAuditResult(data);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ websiteUrl: url, brandName: brandNameHint.trim(), auditId: data.audit_id, result: data, timestamp: Date.now() }));
      setStage(3);
    } catch {
      clearInterval(timerRef.current);
      setError('We ran into a problem generating your audit. Please check the URL and try again.');
      setStage(1);
    } finally { setLoading(false); }
  };

  const handleCaptureLead = async (e) => {
    e.preventDefault();
    if (!leadEmail.trim() || !auditResult?.audit_id) return;
    setLeadLoading(true);
    try {
      await fetch('/api/public/audit-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audit_id: auditResult.audit_id, email: leadEmail, name: auditResult.brand_name, business_name: auditResult.brand_name }) });
      setLeadCaptured(true);
    } catch { /* empty */ }
    setLeadLoading(false);
  };

  const handleGetStarted = () => {
    const p = new URLSearchParams();
    if (auditResult?.audit_id) p.set('audit_id', auditResult.audit_id);
    if (auditResult?.brand_name) p.set('brand_name', auditResult.brand_name);
    if (websiteUrl) p.set('website', websiteUrl);
    p.set('source', 'brand_audit');
    localStorage.removeItem(SESSION_KEY);
    navigate(`/register?${p.toString()}`);
  };

  const handleDownload = () => { if (auditResult?.audit_id) window.open(`/api/public/brand-audit/${auditResult.audit_id}/report`, '_blank'); };

  const handleRestart = () => { localStorage.removeItem(SESSION_KEY); setAuditResult(null); setStage(1); setError(''); };

  // ─── Stage 1: URL Input ───────────────────────────────────────────────────

  const renderStage1 = () => (
    <div className="audit-card">
      <div className="text-center mb-4">
        <div className="audit-badge mb-3">Free AI Brand Audit</div>
        <h1 className="audit-headline">How strong is your brand<br />on social media?</h1>
        <p className="audit-sub">Enter your website URL. We'll crawl it, discover your social profiles, and generate a comprehensive AI-driven brand audit — free, in under 30 seconds.</p>
      </div>
      <div className="mb-3">
        <label className="audit-label">Website URL <span className="text-danger">*</span></label>
        <input type="url" className="audit-input" placeholder="https://yourwebsite.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && websiteUrl.trim() && runAudit()} autoFocus />
        <p className="audit-hint">We'll automatically discover your brand, social profiles, and industry.</p>
      </div>
      <div className="mb-4">
        <label className="audit-label">Brand Name <span style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
        <input type="text" className="audit-input" placeholder="e.g. Acme Aviation" value={brandNameHint} onChange={e => setBrandNameHint(e.target.value)} onKeyDown={e => e.key === 'Enter' && websiteUrl.trim() && runAudit()} />
      </div>
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
      <button className="audit-btn-primary" onClick={runAudit} disabled={!websiteUrl.trim() || loading}>
        <i className="fas fa-chart-line me-2"></i> Run Free AI Audit
      </button>
      <p className="audit-trust mt-3"><i className="fas fa-lock me-1"></i> Free · No credit card · We never post to your profiles</p>
    </div>
  );

  // ─── Stage 2: Analyzing ───────────────────────────────────────────────────

  const renderStage2 = () => (
    <div className="audit-card text-center">
      <div className="analysis-spinner mb-4">
        <div className="analysis-spinner-ring"></div>
        <div className="analysis-spinner-inner"><i className="fas fa-globe text-primary" style={{ fontSize: '1.4rem' }}></i></div>
      </div>
      <h2 className="fw-bold mb-1">Analyzing your brand…</h2>
      <p className="text-muted mb-4 small">Crawling {websiteUrl.trim()}<br />This takes 15–30 seconds.</p>
      <div className="analysis-steps">
        {ANALYSIS_STEPS.map((s, i) => (
          <div key={i} className={`analysis-step ${i < analysisStep ? 'done' : i === analysisStep ? 'active' : ''}`}>
            <div className="analysis-step-icon">
              {i < analysisStep ? <i className="fas fa-check text-success"></i> : <i className={`fas ${s.icon} ${i === analysisStep ? 'text-primary' : 'text-muted'}`}></i>}
            </div>
            <span className={i < analysisStep ? 'text-muted' : i === analysisStep ? 'fw-semibold' : 'text-muted'}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Stage 3: Results (premium rebuild) ──────────────────────────────────

  const renderStage3 = () => {
    if (!auditResult) return null;

    const report = auditResult.full_report || {};
    const brandScore = report.brand_score || {};
    const bp = report.business_profile || {};
    const ds = report.diagnostic_snapshot || {};
    const spr = report.social_presence_review || {};
    const cga = report.content_genome_analysis || {};
    const cmm = report.competitive_moat_map || {};
    const car = report.conversion_architecture_review || {};
    const swot = report.swot || {};
    const rm = report.strategic_roadmap || {};
    const gf = report.growth_forecast || {};
    const ac = report.audit_confidence || {};
    const uvi = report.unlock_verified_intelligence || {};

    const score = auditResult.overall_score || brandScore.overall || 0;
    const dims = brandScore.dimensions || auditResult.score_breakdown || {};
    const brandName = auditResult.brand_name || websiteUrl;
    const industry = auditResult.industry || bp.industry || '';
    const scoreColor = sc(score);
    const scoreLabel = sl(score);

    // Derived risk values
    const webSocAvg = Math.round(((dims.web_presence || 50) + (dims.social_presence || 50)) / 2);
    const contBrandAvg = Math.round(((dims.content_strategy || 50) + (dims.brand_consistency || 50)) / 2);
    const convReady = dims.conversion_readiness || 50;
    const visibilityRisk = 100 - webSocAvg;
    const authorityRisk = 100 - contBrandAvg;
    const conversionRisk = 100 - convReady;

    // Strongest / weakest dimension
    const dimEntries = Object.entries(dims);
    const strongest = dimEntries.length ? dimEntries.reduce((a, b) => b[1] > a[1] ? b : a) : null;
    const weakest = dimEntries.length ? dimEntries.reduce((a, b) => b[1] < a[1] ? b : a) : null;
    const dimLabel = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Content genome pie data
    const mixData = Object.entries(cga.estimated_content_mix || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: v, color: CONTENT_COLORS[k] || '#94a3b8' }));

    // All roadmap items
    const allRoadmapItems = [
      ...(rm.quick_wins || []).map(i => ({ ...i, phase: 'qw' })),
      ...(rm.growth_plays || []).map(i => ({ ...i, phase: 'gp' })),
      ...(rm.strategic_investments || []).map(i => ({ ...i, phase: 'si' })),
    ];

    return (
      <div className="ar-wrapper">

        {/* ── HERO: Executive Dashboard ────────────────────────────────── */}
        <div className="ar-hero">
          <div className="ar-hero-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo-mpp.png" alt="myPilotPost" height="24" style={{ filter: 'brightness(10)' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>Social Media Brand Audit</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                AI-Powered · Evidence-Based
              </span>
              <button className="ar-download-btn" onClick={handleDownload}>
                <i className="fas fa-file-alt me-1"></i> Full Report
              </button>
            </div>
          </div>

          <div className="ar-hero-body">
            <div className="ar-hero-left">
              <ScoreRing score={score} size={170} />
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: 2 }}>{brandName}</div>
                {industry && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{industry}{bp.niche ? ` · ${bp.niche}` : ''}</div>}
                <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: 100, background: `${scoreColor}22`, border: `1px solid ${scoreColor}55`, color: scoreColor, fontSize: '0.72rem', fontWeight: 800 }}>
                  {scoreLabel} Brand Presence
                </div>
              </div>
            </div>

            <div className="ar-hero-right">
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                Score Breakdown — Brand DNA™
              </div>
              {Object.entries(dims).map(([k, v], i) => <DimBar key={k} label={dimLabel(k)} value={v} delay={i * 120} />)}
              {brandScore.rationale && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, borderLeft: '3px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
                  {brandScore.rationale}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="ar-stat-strip">
            {strongest && <div className="ar-stat"><div className="ar-stat-label">Strongest Area</div><div className="ar-stat-val" style={{ color: '#4ade80' }}>↑ {dimLabel(strongest[0])} ({strongest[1]})</div></div>}
            {weakest && <div className="ar-stat"><div className="ar-stat-label">Priority Gap</div><div className="ar-stat-val" style={{ color: '#f87171' }}>↓ {dimLabel(weakest[0])} ({weakest[1]})</div></div>}
            {(spr.platforms_found || []).filter(p => p.status === 'active').length > 0 && <div className="ar-stat"><div className="ar-stat-label">Active Platforms</div><div className="ar-stat-val">{(spr.platforms_found || []).filter(p => p.status === 'active').length} found</div></div>}
            {bp.geographic_market && <div className="ar-stat"><div className="ar-stat-label">Market</div><div className="ar-stat-val">{bp.geographic_market}</div></div>}
            {bp.business_model && <div className="ar-stat"><div className="ar-stat-label">Model</div><div className="ar-stat-val">{bp.business_model}</div></div>}
            {ac.data_quality && <div className="ar-stat" style={{ flex: 2 }}><div className="ar-stat-label">Data Quality</div><div className="ar-stat-val" style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 400, lineHeight: 1.4 }}>{ac.data_quality.slice(0, 120)}</div></div>}
          </div>
        </div>

        <div className="ar-body">

          {/* ── SECTION 1: Executive Diagnosis ───────────────────────── */}
          {(ds.executive_summary || ds.brand_positioning_assessment) && (
            <div className="ar-section">
              <SectionHeader num="01" title="Executive Diagnosis" subtitle="AI-synthesised strategic assessment from crawled evidence" />

              {ds.executive_summary && (
                <div style={{ padding: '18px 20px', background: '#f8fafc', borderRadius: 12, borderLeft: '4px solid #6366f1', marginBottom: 16, fontSize: '0.88rem', color: '#334155', lineHeight: 1.8 }}>
                  {ds.executive_summary}
                </div>
              )}

              {/* Strategic Readiness Meter */}
              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e8edf5', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Strategic Readiness Meter</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: scoreColor }}>{score}/100</span>
                </div>
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${score}%`, borderRadius: 99, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)`, transition: 'width 1.5s ease', boxShadow: `0 0 10px ${scoreColor}50` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>
                  <span>Needs Immediate Attention</span><span>Developing</span><span>Market Ready</span>
                </div>
              </div>

              {ds.brand_positioning_assessment && (
                <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: 10, borderLeft: '3px solid #3b82f6', marginBottom: 16, fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.65 }}>
                  <strong style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, color: '#3b82f6' }}>Brand Positioning</strong>
                  {ds.brand_positioning_assessment}
                </div>
              )}

              <div className="ar-2col">
                {ds.strategic_strengths?.length > 0 && (
                  <div>
                    <div className="ar-col-label" style={{ color: '#16a34a' }}>↑ Strategic Strengths</div>
                    {ds.strategic_strengths.slice(0, 4).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>
                        <span style={{ color: '#16a34a', fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span> {s}
                      </div>
                    ))}
                  </div>
                )}
                {ds.strategic_weaknesses?.length > 0 && (
                  <div>
                    <div className="ar-col-label" style={{ color: '#d97706' }}>↓ Strategic Weaknesses</div>
                    {ds.strategic_weaknesses.slice(0, 4).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>
                        <span style={{ color: '#d97706', fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span> {s}
                      </div>
                    ))}
                  </div>
                )}
                {ds.strategic_risks?.length > 0 && (
                  <div>
                    <div className="ar-col-label" style={{ color: '#dc2626' }}>⚠ Strategic Risks</div>
                    {ds.strategic_risks.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>
                        <span style={{ color: '#dc2626', flexShrink: 0 }}>▲</span> {s}
                      </div>
                    ))}
                  </div>
                )}
                {ds.growth_opportunities?.length > 0 && (
                  <div>
                    <div className="ar-col-label" style={{ color: '#7c3aed' }}>◆ Growth Opportunities</div>
                    {ds.growth_opportunities.slice(0, 4).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>
                        <span style={{ color: '#7c3aed', fontWeight: 800, flexShrink: 0 }}>→</span> {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 2: Priority Actions ──────────────────────────── */}
          {allRoadmapItems.length > 0 && (
            <div className="ar-section">
              <SectionHeader num="02" title="Priority Action Matrix" subtitle="Ranked by phase, timeframe and expected business impact" />
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', padding: '4px 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 100, fontWeight: 700 }}>⚡ Quick Wins — 0–7 days</span>
                <span style={{ fontSize: '0.65rem', padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 100, fontWeight: 700 }}>📈 Growth Plays — 30 days</span>
                <span style={{ fontSize: '0.65rem', padding: '4px 10px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 100, fontWeight: 700 }}>🎯 Strategic — 60–90 days</span>
              </div>
              {allRoadmapItems.map((item, i) => <RoadmapItem key={i} item={item} phase={item.phase} rank={i + 1} />)}
            </div>
          )}

          {/* ── SECTION 3: Risk Dashboard ─────────────────────────────── */}
          <div className="ar-section">
            <SectionHeader num="03" title="Risk Dashboard" subtitle="Derived from brand score dimensions — inverted to surface exposure" />
            <div className="ar-3col" style={{ marginBottom: 16 }}>
              <RiskBar label="Visibility Risk" value={visibilityRisk} subtitle={car.website_assessment || ds.strategic_risks?.[0]} />
              <RiskBar label="Authority Risk" value={authorityRisk} subtitle={car.lead_capture_assessment || ds.strategic_weaknesses?.[0]} />
              <RiskBar label="Conversion Risk" value={conversionRisk} subtitle={car.landing_page_assessment || ds.strategic_risks?.[1]} />
            </div>
            {(car.conversion_friction_points?.length || car.trust_gaps?.length || car.cta_weaknesses?.length) && (
              <div className="ar-3col">
                {car.conversion_friction_points?.length > 0 && (
                  <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Friction Points</div>
                    {car.conversion_friction_points.map((f, i) => <div key={i} style={{ fontSize: '0.72rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(220,38,38,0.1)', lineHeight: 1.5 }}>{f}</div>)}
                  </div>
                )}
                {car.trust_gaps?.length > 0 && (
                  <div style={{ padding: 14, background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Trust Gaps</div>
                    {car.trust_gaps.map((f, i) => <div key={i} style={{ fontSize: '0.72rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(217,119,6,0.1)', lineHeight: 1.5 }}>{f}</div>)}
                  </div>
                )}
                {car.cta_weaknesses?.length > 0 && (
                  <div style={{ padding: 14, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>CTA Weaknesses</div>
                    {car.cta_weaknesses.map((f, i) => <div key={i} style={{ fontSize: '0.72rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(180,83,9,0.1)', lineHeight: 1.5 }}>{f}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 4: Evidence Panel (MOST IMPORTANT) ───────────── */}
          <div className="ar-section ar-evidence">
            <SectionHeader num="04" title="Evidence & Audit Transparency" subtitle="Every finding is labelled by how the AI reached it" />

            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.7rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                <strong style={{ color: '#16a34a' }}>Observed</strong> <span style={{ color: '#64748b' }}>— directly confirmed from crawled data</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.7rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                <strong style={{ color: '#2563eb' }}>Inferred</strong> <span style={{ color: '#64748b' }}>— derived from available signals</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.7rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block' }}></span>
                <strong style={{ color: '#d97706' }}>Estimated</strong> <span style={{ color: '#64748b' }}>— extrapolated from industry patterns</span>
              </div>
            </div>

            {ac.observed_findings?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="ar-col-label" style={{ color: '#16a34a', marginBottom: 8 }}>✓ Observed Findings — Directly Confirmed</div>
                {ac.observed_findings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}>
                      <ConfidenceBadge type="observed" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                      <EvidenceTypeBadge text={f} />
                      <span style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.6, flex: 1, minWidth: 200 }}>{f}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ac.inferred_findings?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="ar-col-label" style={{ color: '#2563eb', marginBottom: 8 }}>◎ Inferred Findings — Derived from Signals</div>
                {ac.inferred_findings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}>
                      <ConfidenceBadge type="inferred" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                      <EvidenceTypeBadge text={f} />
                      <span style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.6, flex: 1, minWidth: 200 }}>{f}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ac.estimated_findings?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="ar-col-label" style={{ color: '#d97706', marginBottom: 8 }}>~ Estimated Findings — Industry Benchmarks</div>
                {ac.estimated_findings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginTop: 1 }}>
                      <ConfidenceBadge type="estimated" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                      <EvidenceTypeBadge text={f} />
                      <span style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.6, flex: 1, minWidth: 200 }}>{f}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bp.evidence && (
              <div style={{ padding: '12px 14px', background: '#fafbfc', border: '1px solid #e8edf5', borderRadius: 10, borderLeft: '3px solid #94a3b8', fontSize: '0.75rem', color: '#475569', lineHeight: 1.65 }}>
                <strong style={{ color: '#374151' }}>Business Profile Evidence:</strong> {bp.evidence}
              </div>
            )}

            {ac.limitations && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.6, borderLeft: '3px solid #e2e8f0' }}>
                <strong>Audit Limitations:</strong> {ac.limitations}
              </div>
            )}
          </div>

          {/* ── SECTION 5: Competitive Moat Map ──────────────────────── */}
          {(cmm.positioning_overlaps?.length || cmm.authority_gaps?.length || cmm.content_gaps?.length || cmm.whitespace_opportunities?.length) && (
            <div className="ar-section">
              <SectionHeader num="05" title="Competitive Moat Map" subtitle="Strategic positioning relative to likely competitors in your space" />
              {cmm.competitor_overview && (
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8edf5', marginBottom: 16, fontSize: '0.8rem', color: '#475569', lineHeight: 1.65 }}>
                  <strong style={{ color: '#374151', display: 'block', marginBottom: 4 }}>Competitive Landscape</strong>
                  {cmm.competitor_overview}
                </div>
              )}
              <div className="ar-moat-grid">
                {cmm.positioning_overlaps?.length > 0 && (
                  <div style={{ padding: 16, background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Positioning Overlaps</div>
                    {cmm.positioning_overlaps.map((s, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#1e40af', padding: '5px 0', borderBottom: '1px solid rgba(37,99,235,0.1)', lineHeight: 1.55 }}>{s}</div>)}
                  </div>
                )}
                {cmm.authority_gaps?.length > 0 && (
                  <div style={{ padding: 16, background: '#fff7ed', borderRadius: 12, border: '1px solid #fed7aa' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Authority Gaps</div>
                    {cmm.authority_gaps.map((s, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#92400e', padding: '5px 0', borderBottom: '1px solid rgba(217,119,6,0.1)', lineHeight: 1.55 }}>{s}</div>)}
                  </div>
                )}
                {cmm.content_gaps?.length > 0 && (
                  <div style={{ padding: 16, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Content Gaps</div>
                    {cmm.content_gaps.map((s, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#991b1b', padding: '5px 0', borderBottom: '1px solid rgba(220,38,38,0.1)', lineHeight: 1.55 }}>{s}</div>)}
                  </div>
                )}
                {cmm.whitespace_opportunities?.length > 0 && (
                  <div style={{ padding: 16, background: '#f5f3ff', borderRadius: 12, border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Whitespace Opportunities</div>
                    {cmm.whitespace_opportunities.map((s, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#5b21b6', padding: '5px 0', borderBottom: '1px solid rgba(124,58,237,0.1)', lineHeight: 1.55 }}>{s}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 6: Content Genome ─────────────────────────────── */}
          {mixData.length > 0 && (
            <div className="ar-section">
              <SectionHeader num="06" title="Content Genome Analysis" subtitle="Estimated content distribution based on observable website and social signals" />
              {cga.mix_basis && <p style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.6 }}>{cga.mix_basis}</p>}

              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 200, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={mixData} cx="50%" cy="50%" outerRadius={75} innerRadius={35} dataKey="value" paddingAngle={2}>
                        {mixData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  {mixData.map((d, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }}></span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: d.color }}>{d.value}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.value}%`, background: d.color, borderRadius: 99, transition: 'width 1.2s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {cga.content_observations && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8edf5', fontSize: '0.8rem', color: '#475569', lineHeight: 1.65 }}>
                  {cga.content_observations}
                </div>
              )}

              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {cga.strongest_themes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Strong Themes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {cga.strongest_themes.map((t, i) => <span key={i} style={{ padding: '3px 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 100, fontSize: '0.7rem', fontWeight: 600 }}>{t}</span>)}
                    </div>
                  </div>
                )}
                {cga.missing_themes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Missing Themes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {cga.missing_themes.map((t, i) => <span key={i} style={{ padding: '3px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 100, fontSize: '0.7rem', fontWeight: 600 }}>{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 7: SWOT ───────────────────────────────────────── */}
          {(swot.strengths?.length || swot.weaknesses?.length || swot.opportunities?.length || swot.threats?.length) && (
            <div className="ar-section">
              <SectionHeader num="07" title={`SWOT Analysis — ${brandName}`} subtitle="Evidence-traced strategic matrix" />
              <div className="ar-swot">
                <div className="ar-swot-cell ar-swot-s">
                  <div className="ar-swot-label">S — Strengths</div>
                  {(swot.strengths || []).map((s, i) => <div key={i} className="ar-swot-item"><span className="ar-swot-num">{i + 1}</span>{s}</div>)}
                </div>
                <div className="ar-swot-cell ar-swot-w">
                  <div className="ar-swot-label">W — Weaknesses</div>
                  {(swot.weaknesses || []).map((s, i) => <div key={i} className="ar-swot-item"><span className="ar-swot-num">{i + 1}</span>{s}</div>)}
                </div>
                <div className="ar-swot-cell ar-swot-o">
                  <div className="ar-swot-label">O — Opportunities</div>
                  {(swot.opportunities || []).map((s, i) => <div key={i} className="ar-swot-item"><span className="ar-swot-num">{i + 1}</span>{s}</div>)}
                </div>
                <div className="ar-swot-cell ar-swot-t">
                  <div className="ar-swot-label">T — Threats</div>
                  {(swot.threats || []).map((s, i) => <div key={i} className="ar-swot-item"><span className="ar-swot-num">{i + 1}</span>{s}</div>)}
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 8: Strategic Roadmap (detailed) ──────────────── */}
          {(rm.quick_wins?.length || rm.growth_plays?.length || rm.strategic_investments?.length) && (
            <div className="ar-section">
              <SectionHeader num="08" title="Strategic Roadmap" subtitle="Three-phase consulting roadmap — from quick wins to strategic transformation" />
              <div className="ar-roadmap-phases">
                {rm.quick_wins?.length > 0 && (
                  <div className="ar-phase ar-phase-qw">
                    <div className="ar-phase-header">
                      <div className="ar-phase-icon">⚡</div>
                      <div><div className="ar-phase-title">Quick Wins</div><div className="ar-phase-time">0–7 days</div></div>
                      <div className="ar-phase-count">{rm.quick_wins.length} actions</div>
                    </div>
                    {rm.quick_wins.map((item, i) => (
                      <div key={i} className="ar-rm-item">
                        <div className="ar-rm-rank">{i + 1}</div>
                        <div className="ar-rm-body">
                          <div className="ar-rm-action">{item.action}</div>
                          {item.business_impact && <div className="ar-rm-impact">{item.business_impact}</div>}
                          {item.expected_outcome && <div className="ar-rm-outcome">Expected: {item.expected_outcome}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {rm.growth_plays?.length > 0 && (
                  <div className="ar-phase ar-phase-gp">
                    <div className="ar-phase-header">
                      <div className="ar-phase-icon">📈</div>
                      <div><div className="ar-phase-title">Growth Plays</div><div className="ar-phase-time">30 days</div></div>
                      <div className="ar-phase-count">{rm.growth_plays.length} actions</div>
                    </div>
                    {rm.growth_plays.map((item, i) => (
                      <div key={i} className="ar-rm-item">
                        <div className="ar-rm-rank ar-rm-rank-gp">{i + 1}</div>
                        <div className="ar-rm-body">
                          <div className="ar-rm-action">{item.action}</div>
                          {item.business_impact && <div className="ar-rm-impact">{item.business_impact}</div>}
                          {item.expected_outcome && <div className="ar-rm-outcome" style={{ color: '#2563eb' }}>Expected: {item.expected_outcome}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {rm.strategic_investments?.length > 0 && (
                  <div className="ar-phase ar-phase-si">
                    <div className="ar-phase-header">
                      <div className="ar-phase-icon">🎯</div>
                      <div><div className="ar-phase-title">Strategic Investments</div><div className="ar-phase-time">60–90 days</div></div>
                      <div className="ar-phase-count">{rm.strategic_investments.length} actions</div>
                    </div>
                    {rm.strategic_investments.map((item, i) => (
                      <div key={i} className="ar-rm-item">
                        <div className="ar-rm-rank ar-rm-rank-si">{i + 1}</div>
                        <div className="ar-rm-body">
                          <div className="ar-rm-action">{item.action}</div>
                          {item.business_impact && <div className="ar-rm-impact">{item.business_impact}</div>}
                          {item.expected_outcome && <div className="ar-rm-outcome" style={{ color: '#7c3aed' }}>Expected: {item.expected_outcome}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 9: Expected Business Impact ──────────────────── */}
          {(gf.visibility_opportunities?.length || gf.authority_opportunities?.length || gf.conversion_opportunities?.length || gf.audience_growth_opportunities?.length) && (
            <div className="ar-section">
              <SectionHeader num="09" title="Expected Business Impact" subtitle="Growth forecast — labeled by confidence level. Not measured; based on AI analysis and industry benchmarks." />
              <div className="ar-4col" style={{ marginBottom: 16 }}>
                {[
                  { key: 'visibility', label: 'Visibility', icon: '🌐', val: dims.web_presence || 0, opps: gf.visibility_opportunities, color: '#3b82f6' },
                  { key: 'authority', label: 'Authority', icon: '🏛', val: dims.content_strategy || 0, opps: gf.authority_opportunities, color: '#8b5cf6' },
                  { key: 'engagement', label: 'Engagement', icon: '💬', val: dims.social_presence || 0, opps: gf.audience_growth_opportunities, color: '#10b981' },
                  { key: 'conversion', label: 'Conversion', icon: '🎯', val: dims.conversion_readiness || 0, opps: gf.conversion_opportunities, color: '#f59e0b' },
                ].map(({ key, label, icon, val, opps, color }) => (
                  <div key={key} style={{ padding: 16, background: '#fff', border: '1px solid #e8edf5', borderRadius: 12, borderTop: `3px solid ${color}` }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: sc(val), lineHeight: 1, marginBottom: 4 }}>{val}</div>
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginBottom: 10 }}>current baseline</div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 99, transition: 'width 1.4s ease' }} />
                    </div>
                    {opps?.slice(0, 2).map((o, i) => (
                      <div key={i} style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.5, padding: '4px 0', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 6 }}>
                        <span style={{ color, flexShrink: 0 }}>→</span> {o}
                      </div>
                    ))}
                    <div style={{ marginTop: 8 }}>
                      <ConfidenceBadge type="estimated" />
                    </div>
                  </div>
                ))}
              </div>
              {gf.assumptions && (
                <div style={{ padding: '10px 14px', background: '#fafbfc', borderRadius: 8, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.65, border: '1px solid #e8edf5' }}>
                  <strong>Assumptions:</strong> {gf.assumptions}
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 10: Audit Confidence ─────────────────────────── */}
          <div className="ar-section ar-confidence-sec">
            <SectionHeader num="10" title="Audit Confidence & Data Sources" subtitle="Transparency about how findings were reached and what requires platform access" />
            {ac.data_quality && (
              <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e8edf5', borderRadius: 10, marginBottom: 16, fontSize: '0.8rem', color: '#334155', lineHeight: 1.7 }}>
                {ac.data_quality}
              </div>
            )}
            <div className="ar-3col" style={{ marginBottom: 16 }}>
              <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>✓ Observed</div>
                {(ac.observed_findings || []).map((f, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(22,163,74,0.08)', lineHeight: 1.5 }}>{f}</div>)}
              </div>
              <div style={{ padding: 16, background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>◎ Inferred</div>
                {(ac.inferred_findings || []).map((f, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(37,99,235,0.08)', lineHeight: 1.5 }}>{f}</div>)}
              </div>
              <div style={{ padding: 16, background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>~ Estimated</div>
                {(ac.estimated_findings || []).map((f, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(217,119,6,0.08)', lineHeight: 1.5 }}>{f}</div>)}
              </div>
            </div>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e8edf5', marginBottom: 12 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>○ Requires Platform Access</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {['Real engagement rates', 'Audience demographics', 'Content performance', 'Follower growth trends', 'Conversion tracking', 'Search Console data'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#94a3b8' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #cbd5e1', display: 'inline-block', flexShrink: 0 }}></span> {item}
                  </div>
                ))}
              </div>
            </div>
            {ac.limitations && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff', border: '1px solid #e8edf5', borderLeft: '3px solid #94a3b8', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.65 }}>
                <strong>Limitations:</strong> {ac.limitations}
              </div>
            )}
          </div>

          {/* ── SECTION 11: Unlock Verified Intelligence ──────────────── */}
          <div className="ar-unlock">
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>§11 · Unlock Verified Brand Intelligence</div>
            {uvi.value_proposition && (
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#93c5fd', lineHeight: 1.5, marginBottom: 16, fontStyle: 'italic', maxWidth: 520 }}>
                "{uvi.value_proposition}"
              </div>
            )}
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 20, maxWidth: 520 }}>
              {uvi.current_limitations || `This audit used public website data, public social signals, and market analysis. Connecting your accounts unlocks real-time intelligence across every dimension of ${brandName}'s social performance.`}
            </p>
            <div className="ar-unlock-grid">
              {Object.entries(uvi.what_becomes_available || {
                audience_analytics: `Real demographics and behaviour for ${brandName}'s actual audience`,
                engagement_analytics: 'Measured engagement rates, comment depth, share velocity',
                content_analytics: `Top and bottom performing content for ${brandName}`,
                search_console: `SEO visibility and search intent data for ${brandName}`,
                growth_tracking: 'Follower growth velocity and platform-by-platform momentum',
              }).map(([k, v], i) => (
                <div key={i} className="ar-unlock-item">
                  <strong>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Download CTA ────────────────────────────────────────────── */}
          <div className="ar-section">
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Download Your Full 13-Section Report</h4>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 16 }}>Opens in browser — use File → Print → Save as PDF for a permanent copy.</p>
              <button className="audit-btn-download" onClick={handleDownload} style={{ maxWidth: 340, margin: '0 auto' }}>
                <i className="fas fa-file-alt me-2"></i> Download Full Report (PDF-ready)
              </button>
            </div>
          </div>

          {/* ── Lead capture ─────────────────────────────────────────────── */}
          {!leadCaptured ? (
            <div className="ar-section" style={{ background: '#fafbfc' }}>
              <h5 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>Save your audit results</h5>
              <p className="text-muted small mb-3">Enter your email to keep this audit on file.</p>
              <form onSubmit={handleCaptureLead} style={{ display: 'flex', gap: 8 }}>
                <input type="email" className="audit-input" style={{ flex: 1 }} placeholder="your@email.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} required />
                <button type="submit" className="audit-btn-secondary" disabled={leadLoading}>
                  {leadLoading ? <span className="spinner-border spinner-border-sm" /> : 'Save'}
                </button>
              </form>
            </div>
          ) : (
            <div className="alert alert-success small mb-0 mx-0" style={{ borderRadius: 0 }}>
              <i className="fas fa-check-circle me-2"></i> Audit saved. Register below to unlock verified intelligence.
            </div>
          )}

          {/* ── Primary CTA ───────────────────────────────────────────────── */}
          <div className="ar-cta">
            <button className="audit-btn-primary" style={{ maxWidth: 400, margin: '0 auto', display: 'flex' }} onClick={handleGetStarted}>
              <i className="fas fa-rocket me-2"></i>
              Get verified insights for {brandName}
            </button>
            <p className="audit-trust mt-2">Your audit results are pre-loaded. No re-entry required.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
              <button type="button" className="btn btn-link p-0 small" onClick={handleRestart} style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Run another audit</button>
              <button type="button" className="btn btn-link p-0 small" onClick={() => navigate('/login')} style={{ fontSize: '0.75rem' }}>Sign in</button>
            </div>
          </div>

        </div>{/* /ar-body */}
      </div>
    );
  };

  // ─── Shell ────────────────────────────────────────────────────────────────

  return (
    <div className="brand-audit-page">
      <header className="brand-audit-nav">
        <a href="/" className="brand-audit-logo"><img src="/logo-mpp.png" alt="myPilotPost" height="28" /></a>
        {stage !== 3 && <button type="button" className="btn btn-link text-muted small text-decoration-none" onClick={() => navigate('/login')}>Sign in</button>}
      </header>

      {stage < 3 && (
        <>
          <div className="brand-audit-progress">
            <div className="brand-audit-progress-bar" style={{ width: stage === 2 ? '60%' : '0%' }} />
          </div>
          <div className="text-center pt-3 pb-1">
            <span className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {stage === 1 ? 'Enter your website URL' : 'Analyzing…'}
            </span>
          </div>
        </>
      )}

      <main className={stage === 3 ? 'brand-audit-main-wide' : 'brand-audit-main'}>
        {stage === 1 && renderStage1()}
        {stage === 2 && renderStage2()}
        {stage === 3 && renderStage3()}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Page shell ─────────────────────────────────────────── */
        .brand-audit-page { min-height:100vh; background:#f0f4f8; font-family:inherit; }
        .brand-audit-nav { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:#fff; border-bottom:1px solid #e2e8f0; position:sticky; top:0; z-index:10; }
        .brand-audit-logo { display:flex; align-items:center; text-decoration:none; }
        .brand-audit-progress { height:3px; background:#e2e8f0; }
        .brand-audit-progress-bar { height:3px; background:linear-gradient(90deg,#2563eb,#7c3aed); transition:width 0.4s ease; }
        .brand-audit-main { max-width:600px; margin:0 auto; padding:24px 16px 60px; }
        .brand-audit-main-wide { max-width:780px; margin:0 auto; padding:24px 16px 60px; }

        /* ── Input card ──────────────────────────────────────────── */
        .audit-card { background:#fff; border-radius:20px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.07); border:1px solid #f1f5f9; }
        .audit-badge { display:inline-flex; align-items:center; padding:6px 16px; border-radius:100px; background:linear-gradient(135deg,#eff6ff,#f5f3ff); border:1px solid #bfdbfe; color:#1d4ed8; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
        .audit-headline { font-size:1.7rem; font-weight:900; color:#0f172a; line-height:1.2; margin-bottom:12px; }
        .audit-sub { color:#64748b; font-size:.88rem; line-height:1.65; margin-bottom:0; }
        .audit-label { display:block; font-size:.75rem; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .audit-input { width:100%; padding:12px 16px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:.9rem; outline:none; transition:border-color .2s; background:#fff; color:#0f172a; }
        .audit-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
        .audit-hint { font-size:.72rem; color:#94a3b8; margin-top:4px; margin-bottom:0; }
        .audit-btn-primary { width:100%; padding:14px 24px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; border:none; border-radius:12px; font-weight:700; font-size:.95rem; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
        .audit-btn-primary:hover:not(:disabled) { background:linear-gradient(135deg,#1d4ed8,#1e40af); transform:translateY(-1px); box-shadow:0 4px 14px rgba(37,99,235,.35); }
        .audit-btn-primary:disabled { opacity:.6; cursor:not-allowed; }
        .audit-btn-secondary { padding:12px 20px; background:#f1f5f9; border:1.5px solid #e2e8f0; border-radius:10px; font-weight:700; font-size:.85rem; cursor:pointer; color:#374151; white-space:nowrap; transition:background .2s; }
        .audit-btn-secondary:hover { background:#e2e8f0; }
        .audit-trust { text-align:center; font-size:.72rem; color:#94a3b8; margin-bottom:0; }
        .audit-btn-download { width:100%; padding:13px 24px; background:#fff; color:#1e293b; border:1.5px solid #e2e8f0; border-radius:12px; font-weight:700; font-size:.9rem; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
        .audit-btn-download:hover { background:#f8fafc; border-color:#94a3b8; }

        /* ── Spinner ─────────────────────────────────────────────── */
        .analysis-spinner { position:relative; width:80px; height:80px; margin:0 auto; }
        .analysis-spinner-ring { width:80px; height:80px; border:4px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation:spin .8s linear infinite; position:absolute; }
        .analysis-spinner-inner { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .analysis-steps { text-align:left; max-width:360px; margin:0 auto; }
        .analysis-step { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:.875rem; color:#94a3b8; transition:all .3s; }
        .analysis-step.done { color:#6b7280; }
        .analysis-step.active { color:#0f172a; font-weight:600; }
        .analysis-step-icon { width:20px; text-align:center; }

        /* ── Results wrapper ─────────────────────────────────────── */
        .ar-wrapper { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.06),0 8px 32px rgba(0,0,0,.08); border:1px solid #e2e8f0; }

        /* ── Hero ────────────────────────────────────────────────── */
        .ar-hero { background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0d1f3c 100%); padding:24px 28px 0; }
        .ar-hero-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:8px; }
        .ar-download-btn { padding:6px 14px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); border-radius:8px; color:rgba(255,255,255,.85); font-size:.72rem; font-weight:700; cursor:pointer; transition:all .2s; white-space:nowrap; }
        .ar-download-btn:hover { background:rgba(255,255,255,.18); }
        .ar-hero-body { display:flex; gap:32px; align-items:flex-start; flex-wrap:wrap; padding-bottom:24px; }
        .ar-hero-left { display:flex; flex-direction:column; align-items:center; min-width:180px; }
        .ar-hero-right { flex:1; min-width:240px; }
        .ar-stat-strip { display:flex; gap:0; border-top:1px solid rgba(255,255,255,.08); margin:0 -28px; padding:0 28px; overflow-x:auto; }
        .ar-stat { padding:12px 16px; border-right:1px solid rgba(255,255,255,.06); flex-shrink:0; }
        .ar-stat:last-child { border-right:none; }
        .ar-stat-label { font-size:.58rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:rgba(255,255,255,.3); margin-bottom:3px; }
        .ar-stat-val { font-size:.75rem; font-weight:700; color:rgba(255,255,255,.8); }

        /* ── Body sections ───────────────────────────────────────── */
        .ar-body { padding:0; }
        .ar-section { padding:24px 28px; border-bottom:1px solid #f1f5f9; }
        .ar-evidence { background:#fafbfc; }
        .ar-confidence-sec { background:#fafbfc; }

        /* ── Layout helpers ──────────────────────────────────────── */
        .ar-2col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .ar-3col { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        .ar-4col { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; }
        .ar-moat-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .ar-col-label { font-size:.62rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#94a3b8; margin-bottom:10px; }

        /* ── SWOT ────────────────────────────────────────────────── */
        .ar-swot { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; }
        .ar-swot-cell { padding:18px; }
        .ar-swot-s { background:#f0fdf4; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; }
        .ar-swot-w { background:#fff7ed; border-bottom:1px solid #e2e8f0; }
        .ar-swot-o { background:#eff6ff; border-right:1px solid #e2e8f0; }
        .ar-swot-t { background:#fef2f2; }
        .ar-swot-label { font-size:.65rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; margin-bottom:12px; }
        .ar-swot-s .ar-swot-label { color:#16a34a; }
        .ar-swot-w .ar-swot-label { color:#d97706; }
        .ar-swot-o .ar-swot-label { color:#2563eb; }
        .ar-swot-t .ar-swot-label { color:#dc2626; }
        .ar-swot-item { display:flex; gap:8px; font-size:.75rem; color:#374151; line-height:1.55; padding:5px 0; border-bottom:1px solid rgba(0,0,0,.04); }
        .ar-swot-item:last-child { border-bottom:none; }
        .ar-swot-num { font-weight:800; flex-shrink:0; width:16px; }
        .ar-swot-s .ar-swot-num { color:#16a34a; }
        .ar-swot-w .ar-swot-num { color:#d97706; }
        .ar-swot-o .ar-swot-num { color:#2563eb; }
        .ar-swot-t .ar-swot-num { color:#dc2626; }

        /* ── Roadmap phases ──────────────────────────────────────── */
        .ar-roadmap-phases { display:flex; flex-direction:column; gap:14px; }
        .ar-phase { border-radius:14px; border:1px solid; overflow:hidden; }
        .ar-phase-qw { background:#f8fffe; border-color:#bbf7d0; }
        .ar-phase-gp { background:#f8faff; border-color:#bfdbfe; }
        .ar-phase-si { background:#faf8ff; border-color:#ddd6fe; }
        .ar-phase-header { display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid rgba(0,0,0,.06); }
        .ar-phase-qw .ar-phase-header { background:rgba(22,163,74,.06); }
        .ar-phase-gp .ar-phase-header { background:rgba(37,99,235,.06); }
        .ar-phase-si .ar-phase-header { background:rgba(124,58,237,.06); }
        .ar-phase-icon { font-size:1.2rem; }
        .ar-phase-title { font-size:.82rem; font-weight:800; color:#0f172a; }
        .ar-phase-time { font-size:.65rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; }
        .ar-phase-count { margin-left:auto; font-size:.65rem; font-weight:700; color:#94a3b8; background:#fff; padding:3px 8px; border-radius:100px; border:1px solid #e2e8f0; }
        .ar-rm-item { display:flex; gap:12px; padding:12px 18px; border-bottom:1px solid rgba(0,0,0,.04); }
        .ar-rm-item:last-child { border-bottom:none; }
        .ar-rm-rank { width:24px; height:24px; min-width:24px; border-radius:6px; background:#16a34a22; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:800; flexShrink:0; }
        .ar-rm-rank-gp { background:#2563eb22; color:#2563eb; }
        .ar-rm-rank-si { background:#7c3aed22; color:#7c3aed; }
        .ar-rm-body { flex:1; }
        .ar-rm-action { font-size:.8rem; font-weight:700; color:#0f172a; line-height:1.45; margin-bottom:4px; }
        .ar-rm-impact { font-size:.72rem; color:#475569; line-height:1.5; margin-bottom:3px; }
        .ar-rm-outcome { font-size:.7rem; color:#16a34a; font-weight:600; }

        /* ── Unlock ──────────────────────────────────────────────── */
        .ar-unlock { background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%); color:#fff; padding:28px; }
        .ar-unlock-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; }
        .ar-unlock-item { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:4px; font-size:.72rem; color:rgba(255,255,255,.7); line-height:1.55; }
        .ar-unlock-item strong { color:#fff; font-size:.78rem; display:block; text-transform:capitalize; }

        /* ── CTAs ────────────────────────────────────────────────── */
        .ar-cta { padding:24px 28px; text-align:center; }

        /* ── Mobile ──────────────────────────────────────────────── */
        @media (max-width:640px) {
          .ar-hero-body { flex-direction:column; align-items:center; gap:20px; }
          .ar-hero-right { width:100%; }
          .ar-2col,.ar-moat-grid,.ar-swot { grid-template-columns:1fr; }
          .ar-swot { border-radius:12px; }
          .ar-swot-s,.ar-swot-w,.ar-swot-o { border-right:none; }
          .ar-3col,.ar-4col { grid-template-columns:1fr 1fr; }
          .ar-unlock-grid { grid-template-columns:1fr 1fr; }
          .ar-section { padding:20px; }
          .ar-hero { padding:20px 20px 0; }
          .ar-unlock { padding:20px; }
          .ar-stat-strip { flex-wrap:nowrap; }
          .brand-audit-main-wide { padding:16px 10px 40px; }
        }
        @media (max-width:400px) {
          .ar-3col,.ar-4col { grid-template-columns:1fr; }
          .ar-unlock-grid { grid-template-columns:1fr; }
        }
      `}} />
    </div>
  );
};

export default BrandAuditPage;
