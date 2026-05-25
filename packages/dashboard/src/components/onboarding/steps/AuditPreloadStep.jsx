import React from 'react';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const GOAL_LABELS = {
  brand_awareness: 'Brand Awareness',
  lead_gen: 'Lead Generation',
  engagement: 'Engagement',
  sales: 'Sales / Revenue',
  thought_leadership: 'Thought Leadership'
};

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X / Twitter',
  tiktok: 'TikTok'
};

const PLATFORM_ICONS = {
  linkedin: 'fab fa-linkedin',
  facebook: 'fab fa-facebook',
  instagram: 'fab fa-instagram',
  x: 'fab fa-x-twitter',
  tiktok: 'fab fa-tiktok'
};

const AuditPreloadStep = () => {
  const { data, nextStep } = useOnboarding();

  const auditScore = data.auditScore || 0;
  const brandName = data.brandName || 'Your Brand';
  const platforms = data.platforms || [];
  const goals = data.goals || [];
  const industry = data.industry || '';
  const breakdown = data.auditBreakdown || {};

  const scoreColor = auditScore >= 70 ? '#16a34a' : auditScore >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="onboarding-card">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill mb-3"
          style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
          <i className="fas fa-star text-warning"></i>
          <span className="fw-bold small text-warning-emphasis">Workspace Pre-loaded from Audit</span>
        </div>
        <h2 className="fw-bold mb-2">Your brand intelligence is ready</h2>
        <p className="text-muted small mb-0">
          We've analyzed your brand. Review the details and confirm — no re-entry needed.
        </p>
      </div>

      {/* Score Card */}
      <div className="d-flex align-items-center gap-4 p-4 rounded-4 mb-3"
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="text-center" style={{ minWidth: 80 }}>
          <div className="fw-black" style={{ fontSize: '2.5rem', lineHeight: 1, color: scoreColor }}>
            {auditScore}
          </div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            /100 Score
          </div>
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold mb-1">{brandName}</div>
          {industry && <div className="text-muted small mb-2">{industry}</div>}
          {Object.keys(breakdown).length > 0 && (
            <div className="d-flex flex-column gap-1">
              {Object.entries(breakdown).slice(0, 3).map(([key, val]) => (
                <div key={key} className="d-flex align-items-center gap-2">
                  <span className="text-muted" style={{ fontSize: '0.7rem', width: 80, textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-grow-1 rounded-pill overflow-hidden" style={{ height: 5, background: '#e2e8f0' }}>
                    <div className="rounded-pill" style={{ height: 5, width: `${val}%`, background: scoreColor, transition: 'width 0.8s ease' }} />
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.7rem', width: 28, textAlign: 'right' }}>{val}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detected Platforms */}
      {platforms.length > 0 && (
        <div className="mb-3">
          <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <i className="fas fa-check-circle text-success me-1"></i> Detected Platforms
          </div>
          <div className="d-flex flex-wrap gap-2">
            {platforms.map(p => (
              <span key={p} className="badge rounded-pill px-3 py-2"
                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.75rem' }}>
                <i className={`${PLATFORM_ICONS[p] || 'fas fa-globe'} me-1`}></i>
                {PLATFORM_LABELS[p] || p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Goals */}
      {goals.length > 0 && (
        <div className="mb-4">
          <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <i className="fas fa-bullseye text-primary me-1"></i> Suggested Goals
          </div>
          <div className="d-flex flex-wrap gap-2">
            {goals.map(g => (
              <span key={g} className="badge rounded-pill px-3 py-2"
                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.75rem' }}>
                {GOAL_LABELS[g] || g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Banner */}
      <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-4"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <i className="fas fa-info-circle text-primary"></i>
        <p className="mb-0 small text-primary-emphasis">
          You can edit any of these details in the next steps. Nothing is locked in.
        </p>
      </div>

      <button className="btn btn-pilot-ob w-100" onClick={() => nextStep()}>
        Review & Confirm Details <i className="fas fa-arrow-right ms-1"></i>
      </button>
    </div>
  );
};

export default AuditPreloadStep;
