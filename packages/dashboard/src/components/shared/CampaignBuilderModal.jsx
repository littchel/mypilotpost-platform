import React, { useState } from 'react';

/**
 * CampaignBuilderModal — High-Fidelity UX/UI Edition
 * Matches the "Good UX/UI" screenshot 1:1 with ACTUAL social icons.
 */

const TOTAL_STEPS = 5;

// ── Icons ────────────────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
  facebook: (color = "#1877F2") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: (color = "#E4405F") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324 4.162 4.162 0 010 8.324zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  twitter: (color = "#1DA1F2") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
  ),
  linkedin: (color = "#0A66C2") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  ),
  youtube: (color = "#FF0000") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  tiktok: (color = "#000000") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.58-1.01V12a8.66 8.66 0 0 1-8.66 8.66A8.66 8.66 0 0 1 1 12a8.66 8.66 0 0 1 8.66-8.66c.55 0 1.09.05 1.62.14V7.52a4.67 4.67 0 0 0-1.62-.28A4.66 4.66 0 0 0 5 12a4.66 4.66 0 0 0 4.66 4.66 4.66 4.66 0 0 0 4.66-4.66V0s-1.8.02-1.8.02z"/>
    </svg>
  ),
  pinterest: (color = "#BD081C") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.017 0C5.396 0 0 5.397 0 12.017c0 5.078 3.158 9.412 7.618 11.169-.103-.947-.19-2.401.04-3.434.207-.88 1.337-5.66 1.337-5.66s-.341-.682-.341-1.691c0-1.583.918-2.766 2.061-2.766 0.972 0 1.441.73 1.441 1.604 0 .978-.622 2.441-.944 3.796-.269 1.137.571 2.064 1.692 2.064 2.03 0 3.593-2.141 3.593-5.232 0-2.736-1.966-4.649-4.774-4.649-3.252 0-5.161 2.439-5.161 4.958 0 .983.379 2.037.852 2.61.093.114.107.214.079.324-.087.363-.28 1.144-.317 1.298-.049.204-.163.248-.376.148-1.405-.654-2.28-2.709-2.28-4.363 0-3.554 2.581-6.819 7.456-6.819 3.913 0 6.954 2.788 6.954 6.517 0 3.888-2.451 7.017-5.852 7.017-1.143 0-2.218-.593-2.586-1.293 0 0-.568 2.164-.707 2.701-.257.986-.951 2.223-1.415 2.977 1.127.348 2.32.536 3.559.536 6.621 0 12.017-5.396 12.017-12.017C24.034 5.397 18.638 0 12.017 0z"/>
    </svg>
  ),
  threads: (color = "#000000") => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12-5.373 12-12 12zm0-2c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10zm0-18c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 2c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6z"/>
    </svg>
  )
};

// ── Data Options ──────────────────────────────────────────────────────────────

const OBJECTIVES = [
  'Brand Awareness',
  'Engagement',
  'Traffic',
  'Lead Generation',
  'Sales',
  'Loyalty',
  'Event Promotion',
  'Thought Leadership',
  'Customer Support',
  'Recruitment'
];

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'linkedin', label: 'Linkedin' },
  { id: 'youtube', label: 'Youtube' },
  { id: 'tiktok', label: 'Tiktok' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'threads', label: 'Threads' },
];

const CONTENT_TYPES = [
  { 
    id: 'social', 
    label: 'Social Posts', 
    desc: 'Platform-specific content', 
    icon: 'fa-share-nodes' 
  },
  { 
    id: 'blog', 
    label: 'Blog Articles', 
    desc: 'SEO-optimized long-form', 
    icon: 'fa-file-lines' 
  },
];

const KPI_METRICS = [
  { id: 'reach', label: 'Reach', desc: 'Total audience reached' },
  { id: 'engagement', label: 'Engagement', desc: 'Likes, comments, shares' },
  { id: 'clicks', label: 'Clicks', desc: 'Link clicks and CTR' },
  { id: 'conversions', label: 'Conversions', desc: 'Lead/sales conversions' },
  { id: 'delivery', label: 'Delivery Success', desc: 'Post delivery rate' },
  { id: 'sentiment', label: 'Brand Sentiment', desc: 'Audience perception' },
];

// ── Stepper Component ─────────────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div className="assistant-stepper mb-5 px-3">
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
              <span className={`stepper-label${isActive ? ' stepper-label--active text-primary' : ' text-muted'}`}>
                Step {n}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Step 1: Campaign Basics ───────────────────────────────────────────────────
function Step1({ data, setData }) {
  return (
    <div className="animate__animated animate__fadeIn">
      <h3 className="fw-bold mb-1" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Campaign Basics</h3>
      <p className="text-muted small mb-4" style={{ fontWeight: 500 }}>Campaign Basics (Required)</p>
      
      <div className="mb-4">
        <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block" style={{ letterSpacing: '0.05em' }}>Campaign Name *</label>
        <input 
          type="text" 
          className="form-control form-control-lg px-4 py-3"
          placeholder="Enter campaign name"
          value={data.name}
          onChange={(e) => setData({...data, name: e.target.value})}
          style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '1rem' }}
        />
      </div>

      <div className="mb-4">
        <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block" style={{ letterSpacing: '0.05em' }}>Objective *</label>
        <select 
          className="form-select form-select-lg px-4 py-3"
          value={data.objective}
          onChange={(e) => setData({...data, objective: e.target.value})}
          style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: '1rem' }}
        >
          <option value="">Select objective</option>
          {OBJECTIVES.map(obj => <option key={obj} value={obj}>{obj}</option>)}
        </select>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block" style={{ letterSpacing: '0.05em' }}>Start Date *</label>
          <input 
            type="date" 
            className="form-control px-4 py-3"
            value={data.startDate}
            onChange={(e) => setData({...data, startDate: e.target.value})}
            style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0' }}
          />
        </div>
        <div className="col-md-6">
          <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block" style={{ letterSpacing: '0.05em' }}>End Date *</label>
          <input 
            type="date" 
            className="form-control px-4 py-3"
            value={data.endDate}
            onChange={(e) => setData({...data, endDate: e.target.value})}
            style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Platform Selection ────────────────────────────────────────────────
function Step2({ data, setData }) {
  const togglePlatform = (id) => {
    const next = data.platforms.includes(id) 
      ? data.platforms.filter(p => p !== id)
      : [...data.platforms, id];
    setData({ ...data, platforms: next });
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <h3 className="fw-bold mb-1" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Platform Selection</h3>
      <p className="text-muted small mb-1" style={{ fontWeight: 500 }}>Select Target Platforms *</p>
      <p className="extra-small text-muted mb-4">Choose which platforms this campaign will run on</p>

      <div className="assistant-option-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {PLATFORMS.map(plt => {
          const Icon = PLATFORM_ICONS[plt.id];
          const isSelected = data.platforms.includes(plt.id);
          return (
            <button 
              key={plt.id}
              className={`plat-btn text-start px-4 py-3 d-flex align-items-center gap-3 ${isSelected ? 'active' : ''}`}
              onClick={() => togglePlatform(plt.id)}
              style={{ height: 'auto', justifyContent: 'flex-start', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}
            >
              <div className="platform-icon-box" style={{ filter: isSelected ? 'none' : 'grayscale(1) opacity(0.5)', transition: '0.3s ease' }}>
                {Icon && Icon(isSelected ? undefined : '#64748b')}
              </div>
              {plt.label}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 small text-muted d-flex align-items-center gap-2">
        Selected: <span className={`fw-bold ${data.platforms.length > 0 ? 'text-primary' : ''}`}>{data.platforms.length > 0 ? data.platforms.join(', ') : 'None'}</span>
      </div>
    </div>
  );
}

// ── Step 3: Content Types ─────────────────────────────────────────────────────
function Step3({ data, setData }) {
  const toggleType = (id) => {
    const next = data.contentTypes.includes(id) 
      ? data.contentTypes.filter(t => t !== id)
      : [...data.contentTypes, id];
    setData({ ...data, contentTypes: next });
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <h3 className="fw-bold mb-1" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Content Types</h3>
      <p className="text-muted small mb-1" style={{ fontWeight: 500 }}>Content Types *</p>
      <p className="extra-small text-muted mb-4">What type of content will this campaign include?</p>

      <div className="row g-4">
        {CONTENT_TYPES.map(type => (
          <div key={type.id} className="col-md-6">
            <button 
              className={`w-100 text-center transition-all p-5 shadow-sm border-2 ${data.contentTypes.includes(type.id) ? 'border-primary' : 'border-light'}`}
              onClick={() => toggleType(type.id)}
              style={{ background: '#fff', cursor: 'pointer', borderRadius: '16px' }}
            >
              <div className="bg-primary bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px', borderRadius: '12px' }}>
                <i className={`fa-solid ${type.icon} fa-2x text-primary opacity-75`}></i>
              </div>
              <div className="fw-bold mb-1" style={{ fontSize: '1.1rem' }}>{type.label}</div>
              <div className="extra-small text-muted" style={{ fontWeight: 500 }}>{type.desc}</div>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 small text-muted d-flex align-items-center gap-2">
        Selected: <span className={`fw-bold ${data.contentTypes.length > 0 ? 'text-primary' : ''}`}>{data.contentTypes.length > 0 ? data.contentTypes.join(', ') : 'None'}</span>
      </div>
    </div>
  );
}

// ── Step 4: KPI & Metrics ─────────────────────────────────────────────────────
function Step4({ data, setData }) {
  const toggleMetric = (id) => {
    const next = data.metrics.includes(id) 
      ? data.metrics.filter(m => m !== id)
      : [...data.metrics, id];
    setData({ ...data, metrics: next });
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <h3 className="fw-bold mb-1" style={{ fontSize: '1.5rem', color: '#1e293b' }}>KPI & Metrics</h3>
      <p className="text-muted small mb-1" style={{ fontWeight: 500 }}>KPI Intent (Multi-select)</p>
      <p className="extra-small text-muted mb-4">What metrics will you track for this campaign?</p>

      <div className="row g-3">
        {KPI_METRICS.map(m => (
          <div key={m.id} className="col-md-6">
            <button 
              className={`w-100 text-start p-4 border rounded-4 shadow-sm transition-all ${data.metrics.includes(m.id) ? 'border-primary bg-primary bg-opacity-10' : 'border-light bg-white'}`}
              onClick={() => toggleMetric(m.id)}
              style={{ cursor: 'pointer', height: '100%' }}
            >
              <div className="fw-bold mb-1" style={{ color: '#1e293b' }}>{m.label}</div>
              <div className="extra-small text-muted" style={{ fontWeight: 500 }}>{m.desc}</div>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 small text-muted d-flex align-items-center gap-2">
        Selected: <span className={`fw-bold ${data.metrics.length > 0 ? 'text-primary' : ''}`}>{data.metrics.length > 0 ? data.metrics.join(', ') : 'None'}</span>
      </div>
    </div>
  );
}

// ── Step 5: Review ────────────────────────────────────────────────────────────
function Step5({ data }) {
  return (
    <div className="animate__animated animate__fadeIn">
      <h3 className="fw-bold mb-1" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Review Campaign</h3>
      <p className="text-muted small mb-4" style={{ fontWeight: 500 }}>Confirm your campaign strategy</p>

      <div className="assistant-summary-card p-4" style={{ borderRadius: '16px', background: 'var(--surface-secondary)' }}>
        <div className="row g-4">
          <div className="col-md-6">
            <div className="assistant-summary-label">Campaign Name</div>
            <div className="assistant-summary-value text-primary fw-bold" style={{ fontSize: '1.1rem' }}>{data.name}</div>
          </div>
          <div className="col-md-6">
            <div className="assistant-summary-label">Objective</div>
            <div className="assistant-summary-value fw-bold">{data.objective}</div>
          </div>
          <div className="col-md-6">
            <div className="assistant-summary-label">Duration</div>
            <div className="assistant-summary-value small fw-medium">{data.startDate} to {data.endDate}</div>
          </div>
          <div className="col-md-6">
            <div className="assistant-summary-label">Platforms</div>
            <div className="assistant-summary-value small fw-medium">{data.platforms.join(', ')}</div>
          </div>
          <div className="col-md-12 border-top pt-3 mt-3">
             <div className="assistant-summary-label">KPI Metrics</div>
             <div className="assistant-summary-value small fw-medium">{data.metrics.join(', ')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const CampaignBuilderModal = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: '',
    objective: '',
    startDate: '',
    endDate: '',
    platforms: [],
    contentTypes: [],
    metrics: [],
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = () => {
    if (onConfirm) onConfirm(data);
    onClose();
    setStep(1);
  };

  const canNext = () => {
    if (step === 1) return data.name && data.objective && data.startDate && data.endDate;
    if (step === 2) return data.platforms.length > 0;
    if (step === 3) return data.contentTypes.length > 0;
    return true;
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-2xl" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          
          {/* Header */}
          <div className="modal-header border-0 px-5 py-4 d-flex align-items-center justify-content-between">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-3" style={{ fontSize: '1.25rem' }}>
              <div className="bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', borderRadius: '10px' }}>
                <i className="fa-solid fa-bullhorn text-primary"></i>
              </div>
              Create Campaign
            </h5>
            <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body px-5 pb-5 pt-0">
            <Stepper current={step} />

            <div style={{ minHeight: '380px' }} className="mt-2">
              {step === 1 && <Step1 data={data} setData={setData} />}
              {step === 2 && <Step2 data={data} setData={setData} />}
              {step === 3 && <Step3 data={data} setData={setData} />}
              {step === 4 && <Step4 data={data} setData={setData} />}
              {step === 5 && <Step5 data={data} />}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 px-5 pb-5 pt-0 d-flex justify-content-between">
            <button 
              className="btn-grey d-flex align-items-center gap-2 px-4 py-2" 
              onClick={handleBack}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0 : 1, transition: '0.3s ease', borderRadius: '10px', fontWeight: 600 }}
            >
              <i className="fas fa-arrow-left small"></i> Previous
            </button>

            {step < TOTAL_STEPS ? (
              <button 
                className="btn-pilot d-flex align-items-center gap-2 px-4 py-2" 
                onClick={handleNext}
                disabled={!canNext()}
                style={{ opacity: canNext() ? 1 : 0.5, borderRadius: '10px', fontWeight: 600, minWidth: '100px', justifyContent: 'center' }}
              >
                Next <i className="fas fa-arrow-right small"></i>
              </button>
            ) : (
              <button className="btn-pilot px-5 py-2" onClick={handleFinish} style={{ borderRadius: '10px', fontWeight: 600 }}>
                Launch Campaign
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CampaignBuilderModal;
