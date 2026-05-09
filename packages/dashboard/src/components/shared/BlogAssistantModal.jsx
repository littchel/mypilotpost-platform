import React, { useState } from 'react';

/**
 * BlogAssistantModal
 * 5-step wizard for myPilotPost Assistant — Blog
 * Matches provided screenshots exactly.
 *
 * Step 1 — Article Goal
 * Step 2 — Target Audience
 * Step 3 — Focus Keywords
 * Step 4 — Localization
 * Step 5 — Review & Generate
 */

const TOTAL_STEPS = 5;

// ── Step data ─────────────────────────────────────────────────────────────────
const ARTICLE_GOALS = [
  'Educate & Inform',
  'Generate Leads',
  'Build Authority',
  'Improve SEO',
  'Drive Traffic',
  'Product Announcement',
  'Thought Leadership',
  'Tutorial / How-to',
];

const AUDIENCES = [
  'Industry Professionals',
  'Small Business Owners',
  'Marketing Executives',
  'General Consumers',
  'Tech Enthusiasts',
  'Students',
  'Entrepreneurs',
  'Senior Management',
];

// 120+ Google regional domains — global coverage
const GOOGLE_DOMAINS = [
  { label: 'Global (google.com)', value: 'google.com' },
  { label: 'South Africa (google.co.za)', value: 'google.co.za' },
  { label: 'Nigeria (google.com.ng)', value: 'google.com.ng' },
  { label: 'Kenya (google.co.ke)', value: 'google.co.ke' },
  { label: 'Egypt (google.com.eg)', value: 'google.com.eg' },
  { label: 'Ghana (google.com.gh)', value: 'google.com.gh' },
  { label: 'Tanzania (google.co.tz)', value: 'google.co.tz' },
  { label: 'Uganda (google.co.ug)', value: 'google.co.ug' },
  { label: 'Ethiopia (google.com.et)', value: 'google.com.et' },
  { label: 'Mozambique (google.co.mz)', value: 'google.co.mz' },
  { label: 'Morocco (google.co.ma)', value: 'google.co.ma' },
  { label: 'Algeria (google.dz)', value: 'google.dz' },
  { label: 'Senegal (google.sn)', value: 'google.sn' },
  { label: "Côte d'Ivoire (google.ci)", value: 'google.ci' },
  { label: 'Cameroon (google.cm)', value: 'google.cm' },
  { label: 'Zimbabwe (google.co.zw)', value: 'google.co.zw' },
  { label: 'Rwanda (google.rw)', value: 'google.rw' },
  { label: 'Libya (google.com.ly)', value: 'google.com.ly' },
  { label: 'Togo (google.tg)', value: 'google.tg' },
  { label: 'Benin (google.bj)', value: 'google.bj' },
  { label: 'Mali (google.ml)', value: 'google.ml' },
  { label: 'Malawi (google.mw)', value: 'google.mw' },
  { label: 'Botswana (google.co.bw)', value: 'google.co.bw' },
  { label: 'Namibia (google.com.na)', value: 'google.com.na' },
  { label: 'Zambia (google.co.zm)', value: 'google.co.zm' },
  { label: 'Madagascar (google.mg)', value: 'google.mg' },
  { label: 'Mauritius (google.mu)', value: 'google.mu' },
  { label: 'Seychelles (google.sc)', value: 'google.sc' },
  { label: 'Gabon (google.ga)', value: 'google.ga' },
  { label: 'Angola (google.co.ao)', value: 'google.co.ao' },
  { label: 'Congo DRC (google.cd)', value: 'google.cd' },
  { label: 'Niger (google.ne)', value: 'google.ne' },
  { label: 'Sudan (google.com.sd)', value: 'google.com.sd' },
  { label: 'Tunisia (google.com.tn)', value: 'google.com.tn' },
  { label: 'United Kingdom (google.co.uk)', value: 'google.co.uk' },
  { label: 'Germany (google.de)', value: 'google.de' },
  { label: 'France (google.fr)', value: 'google.fr' },
  { label: 'Italy (google.it)', value: 'google.it' },
  { label: 'Spain (google.es)', value: 'google.es' },
  { label: 'Netherlands (google.nl)', value: 'google.nl' },
  { label: 'Poland (google.pl)', value: 'google.pl' },
  { label: 'Portugal (google.pt)', value: 'google.pt' },
  { label: 'Sweden (google.se)', value: 'google.se' },
  { label: 'Belgium (google.be)', value: 'google.be' },
  { label: 'Switzerland (google.ch)', value: 'google.ch' },
  { label: 'Austria (google.at)', value: 'google.at' },
  { label: 'Denmark (google.dk)', value: 'google.dk' },
  { label: 'Finland (google.fi)', value: 'google.fi' },
  { label: 'Norway (google.no)', value: 'google.no' },
  { label: 'Ireland (google.ie)', value: 'google.ie' },
  { label: 'Czech Republic (google.cz)', value: 'google.cz' },
  { label: 'Slovakia (google.sk)', value: 'google.sk' },
  { label: 'Hungary (google.hu)', value: 'google.hu' },
  { label: 'Romania (google.ro)', value: 'google.ro' },
  { label: 'Bulgaria (google.bg)', value: 'google.bg' },
  { label: 'Greece (google.gr)', value: 'google.gr' },
  { label: 'Croatia (google.hr)', value: 'google.hr' },
  { label: 'Serbia (google.rs)', value: 'google.rs' },
  { label: 'Slovenia (google.si)', value: 'google.si' },
  { label: 'Lithuania (google.lt)', value: 'google.lt' },
  { label: 'Latvia (google.lv)', value: 'google.lv' },
  { label: 'Estonia (google.ee)', value: 'google.ee' },
  { label: 'Luxembourg (google.lu)', value: 'google.lu' },
  { label: 'Iceland (google.is)', value: 'google.is' },
  { label: 'Malta (google.com.mt)', value: 'google.com.mt' },
  { label: 'Cyprus (google.com.cy)', value: 'google.com.cy' },
  { label: 'Albania (google.al)', value: 'google.al' },
  { label: 'North Macedonia (google.mk)', value: 'google.mk' },
  { label: 'Montenegro (google.me)', value: 'google.me' },
  { label: 'Bosnia (google.ba)', value: 'google.ba' },
  { label: 'Moldova (google.md)', value: 'google.md' },
  { label: 'Georgia (google.ge)', value: 'google.ge' },
  { label: 'Armenia (google.am)', value: 'google.am' },
  { label: 'Azerbaijan (google.az)', value: 'google.az' },
  { label: 'Ukraine (google.com.ua)', value: 'google.com.ua' },
  { label: 'USA (google.com)', value: 'google.com' },
  { label: 'Canada (google.ca)', value: 'google.ca' },
  { label: 'Brazil (google.com.br)', value: 'google.com.br' },
  { label: 'Mexico (google.com.mx)', value: 'google.com.mx' },
  { label: 'Argentina (google.com.ar)', value: 'google.com.ar' },
  { label: 'Colombia (google.com.co)', value: 'google.com.co' },
  { label: 'Peru (google.com.pe)', value: 'google.com.pe' },
  { label: 'Venezuela (google.co.ve)', value: 'google.co.ve' },
  { label: 'Chile (google.cl)', value: 'google.cl' },
  { label: 'Ecuador (google.com.ec)', value: 'google.com.ec' },
  { label: 'Bolivia (google.com.bo)', value: 'google.com.bo' },
  { label: 'Paraguay (google.com.py)', value: 'google.com.py' },
  { label: 'Uruguay (google.com.uy)', value: 'google.com.uy' },
  { label: 'Guatemala (google.com.gt)', value: 'google.com.gt' },
  { label: 'Costa Rica (google.co.cr)', value: 'google.co.cr' },
  { label: 'Panama (google.com.pa)', value: 'google.com.pa' },
  { label: 'Honduras (google.hn)', value: 'google.hn' },
  { label: 'El Salvador (google.com.sv)', value: 'google.com.sv' },
  { label: 'Nicaragua (google.com.ni)', value: 'google.com.ni' },
  { label: 'Dominican Republic (google.com.do)', value: 'google.com.do' },
  { label: 'Cuba (google.com.cu)', value: 'google.com.cu' },
  { label: 'Jamaica (google.com.jm)', value: 'google.com.jm' },
  { label: 'Trinidad (google.tt)', value: 'google.tt' },
  { label: 'Guyana (google.gy)', value: 'google.gy' },
  { label: 'India (google.co.in)', value: 'google.co.in' },
  { label: 'Japan (google.co.jp)', value: 'google.co.jp' },
  { label: 'Australia (google.com.au)', value: 'google.com.au' },
  { label: 'New Zealand (google.co.nz)', value: 'google.co.nz' },
  { label: 'South Korea (google.co.kr)', value: 'google.co.kr' },
  { label: 'Singapore (google.com.sg)', value: 'google.com.sg' },
  { label: 'Indonesia (google.co.id)', value: 'google.co.id' },
  { label: 'Philippines (google.com.ph)', value: 'google.com.ph' },
  { label: 'Pakistan (google.com.pk)', value: 'google.com.pk' },
  { label: 'Thailand (google.co.th)', value: 'google.co.th' },
  { label: 'Vietnam (google.com.vn)', value: 'google.com.vn' },
  { label: 'Hong Kong (google.com.hk)', value: 'google.com.hk' },
  { label: 'Taiwan (google.com.tw)', value: 'google.com.tw' },
  { label: 'Malaysia (google.com.my)', value: 'google.com.my' },
  { label: 'Bangladesh (google.com.bd)', value: 'google.com.bd' },
  { label: 'Nepal (google.com.np)', value: 'google.com.np' },
  { label: 'Sri Lanka (google.lk)', value: 'google.lk' },
  { label: 'Myanmar (google.com.mm)', value: 'google.com.mm' },
  { label: 'Cambodia (google.com.kh)', value: 'google.com.kh' },
  { label: 'Mongolia (google.mn)', value: 'google.mn' },
  { label: 'Kazakhstan (google.kz)', value: 'google.kz' },
  { label: 'Uzbekistan (google.co.uz)', value: 'google.co.uz' },
  { label: 'Fiji (google.com.fj)', value: 'google.com.fj' },
  { label: 'UAE (google.ae)', value: 'google.ae' },
  { label: 'Saudi Arabia (google.com.sa)', value: 'google.com.sa' },
  { label: 'Israel (google.co.il)', value: 'google.co.il' },
  { label: 'Turkey (google.com.tr)', value: 'google.com.tr' },
  { label: 'Jordan (google.jo)', value: 'google.jo' },
  { label: 'Lebanon (google.com.lb)', value: 'google.com.lb' },
  { label: 'Bahrain (google.com.bh)', value: 'google.com.bh' },
  { label: 'Qatar (google.com.qa)', value: 'google.com.qa' },
  { label: 'Kuwait (google.com.kw)', value: 'google.com.kw' },
  { label: 'Oman (google.com.om)', value: 'google.com.om' },
  { label: 'Iraq (google.com.iq)', value: 'google.com.iq' },
  { label: 'Palestine (google.ps)', value: 'google.ps' },
];

// ── Stepper Component ─────────────────────────────────────────────────────────
function Stepper({ current }) {
  return (
    <div className="assistant-stepper">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const n = i + 1;
        const isCompleted = n < current;
        const isActive = n === current;
        return (
          <React.Fragment key={n}>
            {i > 0 && (
              <div className={`stepper-line${isCompleted ? ' stepper-line--done' : ''}`} />
            )}
            <div className="stepper-step">
              <div className={`stepper-circle ${isCompleted ? 'stepper-circle--done' : isActive ? 'stepper-circle--active' : 'stepper-circle--future'}`}>
                {n}
              </div>
              <span className={`stepper-label${isActive ? ' stepper-label--active' : ''}`}>
                Step {n}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Step 1: Article Goal ──────────────────────────────────────────────────────
function Step1({ data, setData }) {
  return (
    <div>
      <h5 className="fw-bold mb-1">Article Goal</h5>
      <p className="text-muted small mb-4">What's the goal of this article?</p>
      <div className="assistant-option-grid">
        {ARTICLE_GOALS.map(opt => (
          <button
            key={opt}
            className={`assistant-option-btn${data.goal === opt ? ' selected' : ''}`}
            onClick={() => setData(d => ({ ...d, goal: opt }))}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Target Audience ───────────────────────────────────────────────────
function Step2({ data, setData }) {
  return (
    <div>
      <h5 className="fw-bold mb-1">Target Audience</h5>
      <p className="text-muted small mb-4">Who is your target audience?</p>
      <div className="assistant-option-grid">
        {AUDIENCES.map(opt => (
          <button
            key={opt}
            className={`assistant-option-btn${data.audience === opt ? ' selected' : ''}`}
            onClick={() => setData(d => ({ ...d, audience: opt }))}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Focus Keywords ────────────────────────────────────────────────────
function Step3({ data, setData }) {
  return (
    <div>
      <h5 className="fw-bold mb-1">Focus Keywords</h5>
      <p className="text-muted small mb-4">Primary focus keywords</p>
      <div className="mb-3">
        <input
          className="form-control"
          type="text"
          placeholder="Enter primary keyword"
          value={data.primaryKeyword}
          onChange={e => setData(d => ({ ...d, primaryKeyword: e.target.value }))}
          style={{ borderRadius: 10, padding: '12px 16px' }}
        />
      </div>
      <div className="mb-2">
        <input
          className="form-control"
          type="text"
          placeholder="Enter secondary keywords (comma-separated)"
          value={data.secondaryKeywords}
          onChange={e => setData(d => ({ ...d, secondaryKeywords: e.target.value }))}
          style={{ borderRadius: 10, padding: '12px 16px' }}
        />
      </div>
      <p className="extra-small text-muted mt-1">
        <i className="fas fa-info-circle me-1"></i>
        Separate multiple keywords with commas
      </p>
    </div>
  );
}

// ── Step 4: Localization ──────────────────────────────────────────────────────
function Step4({ data, setData }) {
  return (
    <div>
      <h5 className="fw-bold mb-1">Localization</h5>
      <p className="text-muted small mb-4">Target localization</p>
      <div className="mb-3">
        <select
          className="form-select form-select-lg"
          value={data.domain}
          onChange={e => setData(d => ({ ...d, domain: e.target.value }))}
          style={{ borderRadius: 10, cursor: 'pointer', padding: '12px 16px', fontSize: '1rem' }}
        >
          {GOOGLE_DOMAINS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>
      <p className="extra-small text-muted mt-3 d-flex align-items-center gap-2">
        <i className="fas fa-info-circle"></i>
        Select regional Google domain for SEO optimization
      </p>
    </div>
  );
}

// ── Step 5: Review & Generate ─────────────────────────────────────────────────
function Step5({ data, onGenerate }) {
  const domainLabel = GOOGLE_DOMAINS.find(d => d.value === data.domain)?.label || data.domain;

  return (
    <div>
      <h5 className="fw-bold mb-1">Generate Article</h5>
      <p className="text-muted small mb-4">Review your settings and generate</p>

      <div className="assistant-summary-card mb-4">
        <div className="assistant-summary-row">
          <div className="assistant-summary-col">
            <div className="assistant-summary-label">Goal</div>
            <div className="assistant-summary-value">{data.goal || '—'}</div>
          </div>
          <div className="assistant-summary-col">
            <div className="assistant-summary-label">Audience</div>
            <div className="assistant-summary-value">{data.audience || '—'}</div>
          </div>
        </div>
        <div className="assistant-summary-row" style={{ marginTop: 16 }}>
          <div className="assistant-summary-col">
            <div className="assistant-summary-label">Primary Keyword</div>
            <div className="assistant-summary-value">{data.primaryKeyword || '—'}</div>
          </div>
          <div className="assistant-summary-col">
            <div className="assistant-summary-label">Target Domain</div>
            <div className="assistant-summary-value">{domainLabel}</div>
          </div>
        </div>
        {data.secondaryKeywords && (
          <div className="assistant-summary-row" style={{ marginTop: 16 }}>
            <div className="assistant-summary-col" style={{ flex: '1 1 100%' }}>
              <div className="assistant-summary-label">Secondary Keywords</div>
              <div className="assistant-summary-value" style={{ fontSize: '0.88rem' }}>{data.secondaryKeywords}</div>
            </div>
          </div>
        )}
      </div>

      <button
        className="btn-pilot w-100 d-flex align-items-center justify-content-center gap-2"
        style={{ padding: '14px 24px', fontSize: '0.95rem' }}
        onClick={onGenerate}
      >
        <i className="fas fa-magic"></i>
        Generate Article Content
      </button>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function BlogAssistantModal({ isOpen, onClose, onGenerate }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    goal: '',
    audience: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    domain: 'google.com',
  });

  if (!isOpen) return null;

  const canNext = () => {
    if (step === 1) return !!data.goal;
    if (step === 2) return !!data.audience;
    return true;
  };

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const handleGenerate = () => {
    if (onGenerate) onGenerate(data);
    onClose();
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content" style={{ borderRadius: 16, border: 'none', overflow: 'hidden' }}>

          {/* Header */}
          <div className="modal-header border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="#2563eb"/>
                <path d="M4 12L20 4L16 20L12 13L4 12Z" fill="white"/>
                <path d="M12 13L16 9" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              myPilotPost Assistant - Blog
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body px-4 pt-4 pb-2">
            <Stepper current={step} />
            <div style={{ minHeight: 280, marginTop: 8 }}>
              {step === 1 && <Step1 data={data} setData={setData} />}
              {step === 2 && <Step2 data={data} setData={setData} />}
              {step === 3 && <Step3 data={data} setData={setData} />}
              {step === 4 && <Step4 data={data} setData={setData} />}
              {step === 5 && <Step5 data={data} onGenerate={handleGenerate} />}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top px-4 py-3 d-flex justify-content-between">
            {step > 1 ? (
              <button className="btn-grey d-flex align-items-center gap-2" onClick={prev}>
                <i className="fas fa-arrow-left"></i> Previous
              </button>
            ) : (
              <div />
            )}
            {step < TOTAL_STEPS && (
              <button
                className="btn-pilot d-flex align-items-center gap-2"
                onClick={next}
                disabled={!canNext()}
                style={{ opacity: canNext() ? 1 : 0.5, cursor: canNext() ? 'pointer' : 'default' }}
              >
                Next <i className="fas fa-arrow-right"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
