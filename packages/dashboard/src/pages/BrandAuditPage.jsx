/**
 * BrandAuditPage — Route A: Social Media Brand Audit
 * Public landing + lead acquisition + onboarding acceleration
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SESSION_KEY = 'mpp_audit_session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

const INDUSTRIES = [
  { group: "Technology", options: ["SaaS / Software", "Fintech", "AI & Machine Learning", "E-commerce"] },
  { group: "Services", options: ["Real Estate", "Consulting / B2B", "Healthcare", "Education"] },
  { group: "Lifestyle", options: ["Retail / Fashion", "Food & Beverage", "Travel & Hospitality", "Fitness & Wellness"] }
];

const GOAL_OPTIONS = [
  { id: 'brand_awareness', label: 'Brand Awareness', icon: '📣', desc: 'Increase visibility and reach' },
  { id: 'lead_gen', label: 'Lead Generation', icon: '🎯', desc: 'Attract qualified prospects' },
  { id: 'engagement', label: 'Engagement', icon: '💬', desc: 'Build community and loyalty' },
  { id: 'sales', label: 'Sales / Revenue', icon: '💰', desc: 'Drive conversions and revenue' },
  { id: 'thought_leadership', label: 'Thought Leadership', icon: '💡', desc: 'Establish expert authority' }
];

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin', color: '#0A66C2' },
  { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F' },
  { id: 'x', name: 'X / Twitter', icon: 'fab fa-x-twitter', color: '#000000' },
  { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' }
];

const ANALYSIS_STEPS = [
  { label: 'Scanning your website presence...', icon: 'fa-globe' },
  { label: 'Analyzing social profiles...', icon: 'fa-share-alt' },
  { label: 'Benchmarking against your industry...', icon: 'fa-chart-bar' },
  { label: 'Calculating Brand DNA Score™...', icon: 'fa-dna' }
];

function ScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="score-ring-wrapper" style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/ 100</span>
      </div>
    </div>
  );
}

const BrandAuditPage = () => {
  const navigate = useNavigate();
  const analysisTimerRef = useRef(null);

  const [stage, setStage] = useState(1); // 1=intro, 2=social, 3=analyzing, 4=results
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form, setForm] = useState({
    brandName: '',
    website: '',
    industry: '',
    goals: [],
    platforms: [],
    socialHandles: { instagram: '', facebook: '', linkedin: '', x: '', tiktok: '' }
  });

  // Restore session if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (Date.now() - (session.timestamp || 0) > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      if (session.auditId && session.result) {
        setForm(prev => ({
          ...prev,
          brandName: session.brandName || '',
          website: session.website || '',
          industry: session.industry || '',
          goals: session.goals || [],
          platforms: session.platforms || []
        }));
        setAuditResult(session.result);
        setStage(4);
      }
    } catch {}
  }, []);

  const saveSession = (extra) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      brandName: form.brandName,
      website: form.website,
      industry: form.industry,
      goals: form.goals,
      platforms: form.platforms,
      timestamp: Date.now(),
      ...extra
    }));
  };

  const field = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleGoal = (id) => setForm(prev => ({
    ...prev,
    goals: prev.goals.includes(id) ? prev.goals.filter(g => g !== id) : [...prev.goals, id]
  }));

  const togglePlatform = (id) => setForm(prev => ({
    ...prev,
    platforms: prev.platforms.includes(id) ? prev.platforms.filter(p => p !== id) : [...prev.platforms, id]
  }));

  const handleSocialHandle = (platform, val) => setForm(prev => ({
    ...prev,
    socialHandles: { ...prev.socialHandles, [platform]: val }
  }));

  const canProceedStage1 = form.brandName.trim() && form.industry;

  const runAudit = async () => {
    setSubmitLoading(true);
    setError('');
    setStage(3);
    setAnalysisStep(0);

    // Animate analysis steps
    let stepIdx = 0;
    analysisTimerRef.current = setInterval(() => {
      stepIdx += 1;
      setAnalysisStep(stepIdx);
      if (stepIdx >= ANALYSIS_STEPS.length - 1) clearInterval(analysisTimerRef.current);
    }, 900);

    try {
      const socialHandlesArr = Object.entries(form.socialHandles)
        .filter(([, v]) => v && v.trim())
        .map(([platform, handle]) => `${platform}: ${handle}`);

      // Wait at least 3.6s for the analysis animation to feel real
      const [res] = await Promise.all([
        fetch('/api/public/brand-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_name: form.brandName,
            website_url: form.website || null,
            social_handles: socialHandlesArr,
            industry: form.industry,
            goals: form.goals,
            platforms: form.platforms
          })
        }),
        new Promise(r => setTimeout(r, 3800))
      ]);

      clearInterval(analysisTimerRef.current);
      setAnalysisStep(ANALYSIS_STEPS.length);

      if (!res.ok) throw new Error('Audit failed');
      const data = await res.json();
      setAuditResult(data);
      saveSession({ auditId: data.audit_id, result: data });
      setStage(4);
    } catch (err) {
      clearInterval(analysisTimerRef.current);
      setError('We ran into a problem generating your audit. Please try again.');
      setStage(2);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleGetStarted = () => {
    const params = new URLSearchParams();
    if (auditResult?.audit_id) params.set('audit_id', auditResult.audit_id);
    if (form.brandName) params.set('brand_name', form.brandName);
    if (form.website) params.set('website', form.website);
    params.set('source', 'brand_audit');
    localStorage.removeItem(SESSION_KEY);
    navigate(`/register?${params.toString()}`);
  };

  const handleCaptureLead = async (e) => {
    e.preventDefault();
    if (!leadEmail.trim() || !auditResult?.audit_id) return;
    setLeadLoading(true);
    try {
      await fetch('/api/public/audit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_id: auditResult.audit_id,
          email: leadEmail,
          name: form.brandName,
          business_name: form.brandName
        })
      });
      setLeadCaptured(true);
    } catch {}
    setLeadLoading(false);
  };

  const handleDownloadReport = () => {
    if (!auditResult?.audit_id) return;
    window.open(`/api/public/brand-audit/${auditResult.audit_id}/report`, '_blank');
  };

  // ─── STAGE 1: Brand Identity ─────────────────────────────────────────────
  const renderStage1 = () => (
    <div className="audit-card">
      <div className="text-center mb-4">
        <div className="audit-badge mb-3">Free Brand Audit</div>
        <h1 className="audit-headline">How strong is your brand<br/>on social media?</h1>
        <p className="audit-sub">
          Get a data-driven Brand DNA Score™ and a personalised playbook to grow your social presence.
        </p>
      </div>

      <div className="mb-3">
        <label className="audit-label">Business Name <span className="text-danger">*</span></label>
        <input
          type="text"
          className="audit-input"
          placeholder="e.g. Acme Aviation"
          value={form.brandName}
          onChange={e => field('brandName', e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="audit-label">Website URL</label>
        <input
          type="url"
          className="audit-input"
          placeholder="https://yourwebsite.com"
          value={form.website}
          onChange={e => field('website', e.target.value)}
        />
        <p className="audit-hint">Optional, but improves accuracy.</p>
      </div>

      <div className="mb-4">
        <label className="audit-label">Industry <span className="text-danger">*</span></label>
        <select
          className="audit-input"
          value={form.industry}
          onChange={e => field('industry', e.target.value)}
        >
          <option value="">Select your industry...</option>
          {INDUSTRIES.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <button
        className="audit-btn-primary"
        onClick={() => setStage(2)}
        disabled={!canProceedStage1}
      >
        Continue <i className="fas fa-arrow-right ms-2"></i>
      </button>

      <p className="audit-trust mt-3">
        <i className="fas fa-lock me-1"></i> No credit card. No commitment. 100% free.
      </p>
    </div>
  );

  // ─── STAGE 2: Social Presence + Goals ────────────────────────────────────
  const renderStage2 = () => (
    <div className="audit-card">
      <button className="audit-back" onClick={() => setStage(1)}>
        <i className="fas fa-arrow-left me-1"></i> Back
      </button>
      <h2 className="audit-section-title mb-1">Your social presence</h2>
      <p className="audit-sub mb-4">Tell us where you're active. Skip anything that doesn't apply.</p>

      {/* Social Handles */}
      <div className="mb-4">
        <label className="audit-label">Social Profile URLs</label>
        {PLATFORMS.map(p => (
          <div key={p.id} className="input-group mb-2">
            <span className="input-group-text audit-input-prefix">
              <i className={`${p.icon}`} style={{ color: p.color, width: 16 }}></i>
            </span>
            <input
              type="text"
              className="form-control audit-input-group-field"
              placeholder={`${p.name} profile URL or @handle`}
              value={form.socialHandles[p.id]}
              onChange={e => handleSocialHandle(p.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Goals */}
      <div className="mb-4">
        <label className="audit-label">Primary Goals <span className="text-muted fw-normal">(select all that apply)</span></label>
        <div className="goal-grid">
          {GOAL_OPTIONS.map(g => (
            <button
              key={g.id}
              type="button"
              className={`goal-chip ${form.goals.includes(g.id) ? 'goal-chip--active' : ''}`}
              onClick={() => toggleGoal(g.id)}
            >
              <span className="goal-chip-icon">{g.icon}</span>
              <span className="goal-chip-label">{g.label}</span>
              {form.goals.includes(g.id) && (
                <i className="fas fa-check goal-chip-check"></i>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div className="mb-4">
        <label className="audit-label">Active Platforms</label>
        <div className="platform-chip-grid">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`platform-chip ${form.platforms.includes(p.id) ? 'platform-chip--active' : ''}`}
              onClick={() => togglePlatform(p.id)}
            >
              <i className={`${p.icon}`} style={{ color: form.platforms.includes(p.id) ? p.color : '#94a3b8' }}></i>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

      <button className="audit-btn-primary" onClick={runAudit} disabled={submitLoading}>
        <i className="fas fa-chart-line me-2"></i>
        Run My Free Audit
      </button>

      <p className="audit-trust mt-3">
        Takes about 10 seconds. We don't post anything to your profiles.
      </p>
    </div>
  );

  // ─── STAGE 3: Analysis Animation ─────────────────────────────────────────
  const renderStage3 = () => (
    <div className="audit-card text-center">
      <div className="analysis-spinner mb-4">
        <div className="analysis-spinner-ring"></div>
        <div className="analysis-spinner-brand">
          <i className="fas fa-dna text-primary" style={{ fontSize: '1.5rem' }}></i>
        </div>
      </div>

      <h2 className="fw-bold mb-2">Analyzing {form.brandName}...</h2>
      <p className="text-muted mb-4 small">This takes about 10 seconds. Hang tight.</p>

      <div className="analysis-steps">
        {ANALYSIS_STEPS.map((s, i) => (
          <div key={i} className={`analysis-step ${i < analysisStep ? 'done' : i === analysisStep ? 'active' : ''}`}>
            <div className="analysis-step-icon">
              {i < analysisStep
                ? <i className="fas fa-check text-success"></i>
                : <i className={`fas ${s.icon} ${i === analysisStep ? 'text-primary' : 'text-muted'}`}></i>
              }
            </div>
            <span className={i < analysisStep ? 'text-muted' : i === analysisStep ? 'fw-bold' : 'text-muted'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── STAGE 4: Results ─────────────────────────────────────────────────────
  const renderStage4 = () => {
    if (!auditResult) return null;
    const score = auditResult.overall_score || 0;
    const breakdown = auditResult.score_breakdown || {};
    const actions = auditResult.strategic_analysis || [];
    const quickWins = auditResult.roadmap?.quick_wins || [];
    const scoreLabel = score >= 70 ? 'Strong' : score >= 50 ? 'Developing' : 'Needs Work';
    const scoreColor = score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

    return (
      <div className="audit-results-wrapper">
        {/* Results Header */}
        <div className="audit-results-header">
          <div className="d-flex align-items-center gap-3 mb-1">
            <img src="/logo-mpp.png" alt="myPilotPost" height="28" />
          </div>
          <div className="audit-results-badge">Brand Audit Report</div>
        </div>

        <div className="audit-results-body">
          {/* Score */}
          <div className="audit-score-section">
            <ScoreRing score={score} />
            <div className="mt-3">
              <h2 className="fw-bold mb-1">{form.brandName}</h2>
              <div className="fw-bold" style={{ color: scoreColor, fontSize: '1.1rem' }}>
                {scoreLabel} Brand Presence
              </div>
              <p className="text-muted small mt-2 mb-0">
                {score >= 70
                  ? 'Your brand has solid foundations. With the right strategy, rapid growth is within reach.'
                  : score >= 50
                  ? 'You have potential but key gaps are limiting your reach. A focused plan will accelerate growth.'
                  : 'Significant opportunities to improve. The good news — you have the most room to grow.'}
              </p>
            </div>
          </div>

          {/* Score Breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div className="audit-section">
              <h5 className="audit-section-label">Score Breakdown</h5>
              <div className="d-flex flex-column gap-2">
                {Object.entries(breakdown).map(([key, val]) => (
                  <div key={key}>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small fw-bold text-capitalize" style={{ color: '#374151' }}>
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="small fw-bold" style={{ color: val >= 70 ? '#16a34a' : val >= 50 ? '#d97706' : '#dc2626' }}>
                        {val}%
                      </span>
                    </div>
                    <div className="rounded-pill overflow-hidden" style={{ height: 8, background: '#f1f5f9' }}>
                      <div className="rounded-pill" style={{
                        height: 8,
                        width: `${val}%`,
                        background: val >= 70 ? '#16a34a' : val >= 50 ? '#d97706' : '#dc2626',
                        transition: 'width 1s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategic Actions */}
          {actions.length > 0 && (
            <div className="audit-section">
              <h5 className="audit-section-label">Priority Actions</h5>
              <div className="d-flex flex-column gap-3">
                {actions.slice(0, 3).map((action, i) => (
                  <div key={i} className="audit-action-card">
                    <div className="audit-action-rank">{i + 1}</div>
                    <div>
                      <div className="fw-bold small mb-1">{action.metric}</div>
                      <p className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>{action.cause}</p>
                      <div className="audit-action-rec">{action.recommendation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {quickWins.length > 0 && (
            <div className="audit-section">
              <h5 className="audit-section-label">Quick Wins</h5>
              <div className="d-flex flex-column gap-2">
                {quickWins.map((win, i) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    <i className="fas fa-bolt text-warning"></i>
                    <span className="small">{win}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Sections Teaser */}
          <div className="audit-locked-section">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="fas fa-lock"></i>
              <span className="fw-bold small">6 additional insights locked</span>
            </div>
            <p className="small text-muted mb-3">
              Competitor analysis, content gaps, revenue projections, and your 12-week growth roadmap are ready on your dashboard.
            </p>
          </div>

          {/* Download Report */}
          <div className="audit-download-section">
            <button className="audit-btn-download" onClick={handleDownloadReport}>
              <i className="fas fa-download me-2"></i>
              Download Report
            </button>
          </div>

          {/* Lead Capture — saves audit results & notifies user */}
          {!leadCaptured ? (
            <div className="audit-lead-capture">
              <h5 className="fw-bold mb-1">Save your audit results</h5>
              <p className="small text-muted mb-3">Enter your email and we'll keep your audit on file so you can access it later.</p>
              <form onSubmit={handleCaptureLead} className="d-flex gap-2">
                <input
                  type="email"
                  className="audit-input flex-grow-1"
                  placeholder="your@email.com"
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  required
                />
                <button type="submit" className="audit-btn-secondary" disabled={leadLoading}>
                  {leadLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Save'}
                </button>
              </form>
            </div>
          ) : (
            <div className="alert alert-success py-3 small mb-4">
              <i className="fas fa-check-circle me-2"></i>
              Audit saved. Register below to access your full dashboard intelligence.
            </div>
          )}

          {/* Primary CTA */}
          <div className="audit-primary-cta">
            <button className="audit-btn-primary" onClick={handleGetStarted}>
              <i className="fas fa-rocket me-2"></i>
              Get insights and grow with myPilotPost
            </button>
            <p className="audit-trust mt-2">
              Your audit results are pre-loaded. No re-entry required.
            </p>
          </div>

          <p className="text-center text-muted mt-3" style={{ fontSize: '0.75rem' }}>
            Already have an account?{' '}
            <button type="button" className="btn btn-link p-0 small" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  };

  const stageLabel = ['', 'Brand Identity', 'Social Presence', 'Analyzing...', 'Your Results'][stage];

  return (
    <div className="brand-audit-page">
      {/* Nav */}
      <header className="brand-audit-nav">
        <a href="/" className="brand-audit-logo">
          <img src="/logo-mpp.png" alt="myPilotPost" height="28" />
        </a>
        {stage < 4 && (
          <button type="button" className="btn btn-link text-muted small text-decoration-none" onClick={() => navigate('/login')}>
            Sign in
          </button>
        )}
      </header>

      {/* Progress bar (stages 1–3) */}
      {stage < 4 && (
        <div className="brand-audit-progress">
          <div className="brand-audit-progress-bar" style={{ width: `${((stage - 1) / 3) * 100}%` }} />
        </div>
      )}

      {/* Stage label */}
      {stage < 4 && (
        <div className="text-center pt-3 pb-1">
          <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Step {stage} of 3 — {stageLabel}
          </span>
        </div>
      )}

      {/* Content */}
      <main className="brand-audit-main">
        {stage === 1 && renderStage1()}
        {stage === 2 && renderStage2()}
        {stage === 3 && renderStage3()}
        {stage === 4 && renderStage4()}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .brand-audit-page {
          min-height: 100vh;
          background: #f8fafc;
          font-family: inherit;
        }
        .brand-audit-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .brand-audit-logo { display: flex; align-items: center; text-decoration: none; }
        .brand-audit-progress {
          height: 3px;
          background: #e2e8f0;
        }
        .brand-audit-progress-bar {
          height: 3px;
          background: linear-gradient(90deg, #2563eb, #7c3aed);
          transition: width 0.4s ease;
        }
        .brand-audit-main {
          max-width: 580px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }
        .audit-card {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
        }
        .audit-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 16px;
          border-radius: 100px;
          background: linear-gradient(135deg, #eff6ff, #f5f3ff);
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .audit-headline {
          font-size: 1.75rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .audit-sub {
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 0;
        }
        .audit-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .audit-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
          background: #fff;
          color: #0f172a;
          appearance: auto;
        }
        .audit-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .audit-input-prefix {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-right: none;
          border-radius: 10px 0 0 10px;
          padding: 0 12px;
        }
        .audit-input-group-field {
          border: 1.5px solid #e2e8f0;
          border-left: none;
          border-radius: 0 10px 10px 0;
          padding: 10px 14px;
          font-size: 0.85rem;
        }
        .audit-input-group-field:focus { border-color: #2563eb; outline: none; box-shadow: none; }
        .audit-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; margin-bottom: 0; }
        .audit-btn-primary {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audit-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #1d4ed8, #1e40af); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .audit-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .audit-btn-secondary {
          padding: 12px 20px;
          background: #f1f5f9;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          color: #374151;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .audit-btn-secondary:hover { background: #e2e8f0; }
        .audit-trust {
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 0;
        }
        .audit-back {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .audit-section-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #0f172a;
        }
        .goal-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .goal-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          width: 100%;
        }
        .goal-chip:hover { border-color: #93c5fd; background: #f8fafc; }
        .goal-chip--active { border-color: #2563eb; background: #eff6ff; }
        .goal-chip-icon { font-size: 1.1rem; min-width: 24px; }
        .goal-chip-label { font-size: 0.875rem; font-weight: 600; color: #1e293b; flex-grow: 1; }
        .goal-chip-check { color: #2563eb; margin-left: auto; }
        .platform-chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .platform-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 100px;
          background: #fff;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          transition: all 0.15s;
        }
        .platform-chip:hover { border-color: #93c5fd; }
        .platform-chip--active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
        /* Analysis */
        .analysis-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }
        .analysis-spinner-ring {
          width: 80px; height: 80px;
          border: 4px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          position: absolute;
        }
        .analysis-spinner-brand {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .analysis-steps {
          text-align: left;
          max-width: 340px;
          margin: 0 auto;
        }
        .analysis-step {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.875rem;
          color: #94a3b8;
          transition: all 0.3s;
        }
        .analysis-step.done { color: #6b7280; }
        .analysis-step.active { color: #0f172a; font-weight: 600; }
        .analysis-step-icon { width: 20px; text-align: center; }
        /* Results */
        .audit-results-wrapper {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
        }
        .audit-results-header {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: #fff;
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .audit-results-badge {
          background: rgba(255,255,255,0.1);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .audit-results-body { padding: 28px; }
        .audit-score-section {
          text-align: center;
          padding: 24px 0;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 24px;
        }
        .audit-section {
          padding: 20px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .audit-section-label {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 14px;
        }
        .audit-action-card {
          display: flex;
          gap: 14px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
        }
        .audit-action-rank {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 50%;
          background: #0f172a;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audit-action-rec {
          font-size: 0.78rem;
          color: #2563eb;
          font-weight: 600;
          margin-top: 4px;
        }
        .audit-locked-section {
          margin: 20px 0;
          padding: 20px;
          background: linear-gradient(135deg, #fafafa, #f1f5f9);
          border: 1.5px dashed #cbd5e1;
          border-radius: 14px;
          color: #64748b;
        }
        .audit-lead-capture {
          padding: 20px;
          background: #f8fafc;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }
        .audit-download-section { margin-bottom: 16px; }
        .audit-btn-download {
          width: 100%;
          padding: 13px 24px;
          background: #fff;
          color: #1e293b;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audit-btn-download:hover { background: #f8fafc; border-color: #94a3b8; }
        .audit-primary-cta { margin-top: 4px; }
      `}} />
    </div>
  );
};

export default BrandAuditPage;
