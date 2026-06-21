import React, { useState } from 'react';

/**
 * BlogAssistantModal
 * Dual-mode wizard for myPilotPost Assistant — Blog
 * Matches the style and layout of SocialAssistantModal.jsx exactly.
 */

const TOTAL_STEPS = 6;

const BLUE      = "#2563eb";
const BLUE_BG   = "#eff6ff";
const DARK      = "#0f172a";
const MUTED     = "#64748b";
const LIGHT     = "#f8fafc";
const SIDEBAR   = "#0f172a";
const SIDEBAR_B = "#1e293b";

const LENGTH_OPTIONS = [
  { value: "short", label: "Short (300-500 words)" },
  { value: "medium", label: "Medium (800-1200 words)" },
  { value: "long", label: "Long (1500-2000 words)" },
  { value: "comprehensive", label: "Comprehensive (2500+ words)" }
];

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

const STEP_LABELS = [
  "Article Goal",
  "Target Audience",
  "Focus Keywords",
  "Localization",
  "Length & Options",
  "Review & Generate"
];

// ── Left sidebar step nav ──────────────────────────────────────────────────────
function StepNav({ step, goal, audience, primaryKeyword, domain, lengthDepth }) {
  const summaries = [
    goal || null,
    audience || null,
    primaryKeyword || null,
    GOOGLE_DOMAINS.find(d => d.value === domain)?.label || domain || null,
    lengthDepth ? (LENGTH_OPTIONS.find(l => l.value === lengthDepth)?.label || lengthDepth) : null,
    null
  ];

  return (
    <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < TOTAL_STEPS - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: done ? BLUE : active ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.08)",
              border: `2px solid ${done ? BLUE : active ? BLUE : "rgba(255,255,255,0.15)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
            }}>
              {done
                ? <i className="fas fa-check" style={{ fontSize: 10, color: "#fff" }}></i>
                : <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.4)" }}>{num}</span>
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#fff" : done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", lineHeight: 1.3 }}>{label}</div>
              {summaries[i] && (
                <div style={{ fontSize: 10, color: done ? BLUE : "rgba(255,255,255,0.5)", marginTop: 2, fontWeight: done ? 600 : 400, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 140 }}>{summaries[i]}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────
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

function Step5({ data, setData }) {
  const toggleCheckbox = (field) => {
    setData(d => ({ ...d, [field]: !d[field] }));
  };

  return (
    <div>
      <h5 className="fw-bold mb-1">Article Length & Depth</h5>
      <p className="text-muted small mb-4">Choose the length and depth for your article.</p>
      
      <div className="assistant-option-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {LENGTH_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`assistant-option-btn${data.lengthDepth === opt.value ? ' selected' : ''}`}
            onClick={() => setData(d => ({ ...d, lengthDepth: opt.value }))}
            style={{
              padding: "16px",
              borderRadius: 10,
              border: data.lengthDepth === opt.value ? "2px solid #2563eb" : "1px solid #cbd5e1",
              background: data.lengthDepth === opt.value ? "#eff6ff" : "#fff",
              color: data.lengthDepth === opt.value ? "#2563eb" : "#475569",
              fontWeight: data.lengthDepth === opt.value ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
              textAlign: "left"
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <h5 className="fw-bold mb-1">Additional Options</h5>
      <p className="text-muted small mb-3">Refine content inclusions.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={!!data.includeStats} onChange={() => toggleCheckbox("includeStats")} style={{ width: 16, height: 16 }} />
          <span>Include statistics and data</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={!!data.includeExamples} onChange={() => toggleCheckbox("includeExamples")} style={{ width: 16, height: 16 }} />
          <span>Include real-world examples</span>
        </label>
      </div>
    </div>
  );
}

function Step6({ data, onGenerate }) {
  const domainLabel = GOOGLE_DOMAINS.find(d => d.value === data.domain)?.label || data.domain;
  const lengthLabel = LENGTH_OPTIONS.find(l => l.value === data.lengthDepth)?.label || data.lengthDepth;

  return (
    <div>
      <h5 className="fw-bold mb-1">Generate Article</h5>
      <p className="text-muted small mb-4">Review your settings and generate</p>

      <div className="assistant-summary-card mb-4" style={{ background: LIGHT, border: "1px solid #e2e8f0", padding: 18, borderRadius: 10 }}>
        <div className="row g-3">
          <div className="col-6">
            <div className="extra-small text-muted text-uppercase fw-bold mb-1">Goal</div>
            <div className="small fw-bold text-dark">{data.goal || '—'}</div>
          </div>
          <div className="col-6">
            <div className="extra-small text-muted text-uppercase fw-bold mb-1">Audience</div>
            <div className="small fw-bold text-dark">{data.audience || '—'}</div>
          </div>
          <div className="col-6">
            <div className="extra-small text-muted text-uppercase fw-bold mb-1">Primary Keyword</div>
            <div className="small fw-bold text-dark">{data.primaryKeyword || '—'}</div>
          </div>
          <div className="col-6">
            <div className="extra-small text-muted text-uppercase fw-bold mb-1">Target Domain</div>
            <div className="small fw-bold text-dark">{domainLabel}</div>
          </div>
          <div className="col-6">
            <div className="extra-small text-muted text-uppercase fw-bold mb-1">Length & Depth</div>
            <div className="small fw-bold text-dark">{lengthLabel}</div>
          </div>
          <div className="col-6">
            <div className="extra-small text-muted text-uppercase fw-bold mb-1">Additional Options</div>
            <div className="small fw-bold text-dark">
              {data.includeStats && "✓ Stats/Data "}
              {data.includeExamples && "✓ Examples "}
              {!data.includeStats && !data.includeExamples && "None"}
            </div>
          </div>
          {data.secondaryKeywords && (
            <div className="col-12 border-top pt-2">
              <div className="extra-small text-muted text-uppercase fw-bold mb-1">Secondary Keywords</div>
              <div className="small text-dark">{data.secondaryKeywords}</div>
            </div>
          )}
        </div>
      </div>

      <button
        className="btn-pilot w-100 d-flex align-items-center justify-content-center gap-2"
        style={{ padding: '14px 24px', fontSize: '0.95rem', borderRadius: 10 }}
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
  const [mode, setMode] = useState(null); // null, "generate", "improve"
  const [step, setStep] = useState(1);
  
  // "Generate for me" state
  const [data, setData] = useState({
    goal: '',
    audience: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    domain: 'google.com',
    lengthDepth: 'medium',
    includeStats: false,
    includeExamples: false
  });

  // "Improve my idea" state
  const [improveIdea, setImproveIdea] = useState('');
  const [improveAudience, setImproveAudience] = useState('');
  const [improvePrimaryKeyword, setImprovePrimaryKeyword] = useState('');
  const [improveSecondaryKeywords, setImproveSecondaryKeywords] = useState('');
  const [improveDomain, setImproveDomain] = useState('google.com');
  const [improveLengthDepth, setImproveLengthDepth] = useState('medium');
  const [improveIncludeStats, setImproveIncludeStats] = useState(false);
  const [improveIncludeExamples, setImproveIncludeExamples] = useState(false);

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
    handleClose();
  };

  const handleImproveGenerate = () => {
    if (onGenerate) {
      onGenerate({
        goal: improveIdea,
        audience: improveAudience,
        primaryKeyword: improvePrimaryKeyword,
        secondaryKeywords: improveSecondaryKeywords,
        domain: improveDomain,
        lengthDepth: improveLengthDepth,
        includeStats: improveIncludeStats,
        includeExamples: improveIncludeExamples
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setMode(null);
    setStep(1);
    setImproveIdea('');
    setImproveAudience('');
    setImprovePrimaryKeyword('');
    setImproveSecondaryKeywords('');
    setImproveDomain('google.com');
    setImproveLengthDepth('medium');
    setImproveIncludeStats(false);
    setImproveIncludeExamples(false);
    onClose();
  };

  return (
    <>
      <style>{`
        @keyframes mppSpin { to { transform: rotate(360deg); } }
        .mpp-modal-right::-webkit-scrollbar { width: 4px; }
        .mpp-modal-right::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1060, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ background: "#fff", borderRadius: 16, width: "90vw", maxWidth: 1080, height: "88vh", display: "flex", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.35)", flexDirection: "row" }}>
          
          {/* ── LEFT SIDEBAR ── */}
          <div style={{ width: 240, background: SIDEBAR, flexShrink: 0, display: "flex", flexDirection: "column", borderRadius: "16px 0 0 16px" }}>
            {/* Header */}
            <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${SIDEBAR_B}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fas fa-robot" style={{ color: "#fff", fontSize: 16 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>AI Assistant</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>myPilotPost</div>
                </div>
              </div>
            </div>

            {/* Step navigation / Brief */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {mode === "generate" && (
                <StepNav step={step} goal={data.goal} audience={data.audience} primaryKeyword={data.primaryKeyword} domain={data.domain} lengthDepth={data.lengthDepth} />
              )}
              {mode === "improve" && (
                <div style={{ padding: "28px 20px", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  <i className="fas fa-magic" style={{ fontSize: 24, color: BLUE, display: "block", marginBottom: 10 }}></i>
                  We will apply your Brand DNA and guidelines to transform your custom idea into a structured, high-quality blog article.
                </div>
              )}
              {mode === null && (
                <div style={{ padding: "28px 20px", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  <i className="fas fa-lightbulb" style={{ fontSize: 24, color: BLUE, display: "block", marginBottom: 10 }}></i>
                  Select a workflow to begin. The AI helper uses search optimization and credibility guidelines automatically.
                </div>
              )}
            </div>

            {/* Footer close */}
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${SIDEBAR_B}` }}>
              <button onClick={handleClose} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Header */}
            <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: DARK, lineHeight: 1.2 }}>
                  {mode === null ? "myPilotPost Assistant - Blog" : mode === "generate" ? `Step ${step}: ${STEP_LABELS[step - 1]}` : "Improve my idea"}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                  {mode === null && "Choose how you'd like to draft your article."}
                  {mode === "generate" && (
                    step === 1 ? "Choose the core objective for this blog post." :
                    step === 2 ? "Who is the primary reader segment for this post?" :
                    step === 3 ? "Define search terms you want the article to rank for." :
                    step === 4 ? "Select which localized Google index to optimize search scores against." :
                    "Review all information and trigger article generation."
                  )}
                  {mode === "improve" && "Paste or describe your article idea — the assistant writes a full structured article."}
                </div>
              </div>
              {mode !== null && (
                <button onClick={() => { setMode(null); setStep(1); }} style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: 6, color: "#475569", fontSize: 11, fontWeight: 600, padding: "5px 10px", cursor: "pointer" }}>
                  ← Back to Options
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="mpp-modal-right" style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>
              {mode === null && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto", width: "100%" }}>
                    <button onClick={() => setMode("generate")} style={{
                      border: `2px solid ${BLUE}`, background: BLUE_BG, borderRadius: 14, padding: "20px 24px",
                      display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s",
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <i className="fas fa-magic" style={{ color: "#fff", fontSize: 17 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: BLUE, marginBottom: 4 }}>Generate for me</div>
                        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Tell the assistant your goal, target audience, focus keywords, and localization domain — it builds the article from scratch using your Brand DNA.</div>
                      </div>
                    </button>
                    <button onClick={() => setMode("improve")} style={{
                      border: "2px solid #e5e7eb", background: "#fff", borderRadius: 14, padding: "20px 24px",
                      display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#f5f3ff"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <i className="fas fa-pencil-alt" style={{ color: "#6366f1", fontSize: 17 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#4f46e5", marginBottom: 4 }}>Improve my idea</div>
                        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Paste or describe your article idea — the assistant writes a full structured SEO article based on your idea.</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {mode === "generate" && (
                <div style={{ minHeight: 280 }}>
                  {step === 1 && <Step1 data={data} setData={setData} />}
                  {step === 2 && <Step2 data={data} setData={setData} />}
                  {step === 3 && <Step3 data={data} setData={setData} />}
                  {step === 4 && <Step4 data={data} setData={setData} />}
                  {step === 5 && <Step5 data={data} setData={setData} />}
                  {step === 6 && <Step6 data={data} onGenerate={handleGenerate} />}
                </div>
              )}

              {mode === "improve" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="mb-2">
                    <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Article Idea / Concept</label>
                    <textarea
                      className="form-control"
                      value={improveIdea}
                      onChange={e => setImproveIdea(e.target.value)}
                      placeholder="e.g. 'Write a guide on solar energy ROI for homeowners in South Africa, covering installation costs, grid rebates, and monthly savings...'"
                      style={{ borderRadius: 10, padding: "12px 16px", minHeight: 120, fontSize: 13, lineHeight: 1.6 }}
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Target Audience</label>
                      <select
                        className="form-select form-select-sm"
                        value={improveAudience}
                        onChange={e => setImproveAudience(e.target.value)}
                        style={{ borderRadius: 10, padding: "10px 14px", height: 44, fontSize: 13 }}
                      >
                        <option value="">Select target audience...</option>
                        {AUDIENCES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Primary Keyword</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="e.g. solar energy ROI"
                        value={improvePrimaryKeyword}
                        onChange={e => setImprovePrimaryKeyword(e.target.value)}
                        style={{ borderRadius: 10, padding: "10px 14px", height: 44, fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Secondary Keywords (comma-separated)</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="e.g. solar panel savings, load shedding"
                        value={improveSecondaryKeywords}
                        onChange={e => setImproveSecondaryKeywords(e.target.value)}
                        style={{ borderRadius: 10, padding: "10px 14px", height: 44, fontSize: 13 }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Localization</label>
                      <select
                        className="form-select form-select-sm"
                        value={improveDomain}
                        onChange={e => setImproveDomain(e.target.value)}
                        style={{ borderRadius: 10, padding: "10px 14px", height: 44, fontSize: 13 }}
                      >
                        {GOOGLE_DOMAINS.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Article Length & Depth</label>
                      <select
                        className="form-select form-select-sm"
                        value={improveLengthDepth}
                        onChange={e => setImproveLengthDepth(e.target.value)}
                        style={{ borderRadius: 10, padding: "10px 14px", height: 44, fontSize: 13 }}
                      >
                        {LENGTH_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="extra-small fw-bold text-muted text-uppercase mb-2 d-block">Additional Options</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 8px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", userSelect: "none" }}>
                          <input type="checkbox" checked={improveIncludeStats} onChange={() => setImproveIncludeStats(!improveIncludeStats)} style={{ width: 14, height: 14 }} />
                          <span>Include statistics and data</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", userSelect: "none" }}>
                          <input type="checkbox" checked={improveIncludeExamples} onChange={() => setImproveIncludeExamples(!improveIncludeExamples)} style={{ width: 14, height: 14 }} />
                          <span>Include real-world examples</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      className="btn-pilot w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={handleImproveGenerate}
                      disabled={!improveIdea.trim() || !improveAudience || !improvePrimaryKeyword.trim()}
                      style={{
                        padding: "14px 24px", fontSize: "0.95rem", borderRadius: 10,
                        opacity: (!improveIdea.trim() || !improveAudience || !improvePrimaryKeyword.trim()) ? 0.5 : 1,
                        cursor: (!improveIdea.trim() || !improveAudience || !improvePrimaryKeyword.trim()) ? "not-allowed" : "pointer"
                      }}
                    >
                      <i className="fas fa-magic"></i>
                      Generate Article Content
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons (only in step-by-step wizard) */}
            {mode === "generate" && (
              <div className="modal-footer border-top px-4 py-3 d-flex justify-content-between">
                {step > 1 ? (
                  <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={prev} style={{ borderRadius: 8, padding: "8px 16px", fontSize: 12 }}>
                    <i className="fas fa-arrow-left"></i> Previous
                  </button>
                ) : (
                  <div />
                )}
                {step < TOTAL_STEPS && (
                  <button
                    className="btn btn-primary d-flex align-items-center gap-2"
                    onClick={next}
                    disabled={!canNext()}
                    style={{
                      borderRadius: 8, padding: "8px 16px", fontSize: 12,
                      opacity: canNext() ? 1 : 0.5, cursor: canNext() ? 'pointer' : 'default'
                    }}
                  >
                    Next <i className="fas fa-arrow-right"></i>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
