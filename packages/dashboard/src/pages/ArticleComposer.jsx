import React, { useState, useRef, useEffect } from "react";
import BlogAssistantModal from "../components/shared/BlogAssistantModal";

/**
 * ArticleComposer — Content Intelligence Edition
 * Injects live scoring, SEO, readability, E-E-A-T, and autosuggest
 * into the EXACT existing layout. No structural changes.
 */

// ── Google Domain Dataset (120+ Domains) ───────────────────────────────────────
const GOOGLE_DOMAINS = [
  { domain: 'google.com', region: 'Global / USA' },
  { domain: 'google.co.za', region: 'South Africa' },
  { domain: 'google.com.ng', region: 'Nigeria' },
  { domain: 'google.co.ke', region: 'Kenya' },
  { domain: 'google.com.eg', region: 'Egypt' },
  { domain: 'google.com.gh', region: 'Ghana' },
  { domain: 'google.co.tz', region: 'Tanzania' },
  { domain: 'google.co.ug', region: 'Uganda' },
  { domain: 'google.com.et', region: 'Ethiopia' },
  { domain: 'google.co.mz', region: 'Mozambique' },
  { domain: 'google.co.ma', region: 'Morocco' },
  { domain: 'google.dz', region: 'Algeria' },
  { domain: 'google.sn', region: 'Senegal' },
  { domain: 'google.ci', region: "Côte d'Ivoire" },
  { domain: 'google.cm', region: 'Cameroon' },
  { domain: 'google.co.zw', region: 'Zimbabwe' },
  { domain: 'google.rw', region: 'Rwanda' },
  { domain: 'google.com.ly', region: 'Libya' },
  { domain: 'google.tg', region: 'Togo' },
  { domain: 'google.bj', region: 'Benin' },
  { domain: 'google.ml', region: 'Mali' },
  { domain: 'google.mw', region: 'Malawi' },
  { domain: 'google.co.bw', region: 'Botswana' },
  { domain: 'google.com.na', region: 'Namibia' },
  { domain: 'google.co.zm', region: 'Zambia' },
  { domain: 'google.mg', region: 'Madagascar' },
  { domain: 'google.mu', region: 'Mauritius' },
  { domain: 'google.sc', region: 'Seychelles' },
  { domain: 'google.ga', region: 'Gabon' },
  { domain: 'google.co.ao', region: 'Angola' },
  { domain: 'google.cd', region: 'Congo DRC' },
  { domain: 'google.ne', region: 'Niger' },
  { domain: 'google.com.sd', region: 'Sudan' },
  { domain: 'google.com.tn', region: 'Tunisia' },
  { domain: 'google.co.uk', region: 'United Kingdom' },
  { domain: 'google.de', region: 'Germany' },
  { domain: 'google.fr', region: 'France' },
  { domain: 'google.it', region: 'Italy' },
  { domain: 'google.es', region: 'Spain' },
  { domain: 'google.nl', region: 'Netherlands' },
  { domain: 'google.pl', region: 'Poland' },
  { domain: 'google.pt', region: 'Portugal' },
  { domain: 'google.se', region: 'Sweden' },
  { domain: 'google.be', region: 'Belgium' },
  { domain: 'google.ch', region: 'Switzerland' },
  { domain: 'google.at', region: 'Austria' },
  { domain: 'google.dk', region: 'Denmark' },
  { domain: 'google.fi', region: 'Finland' },
  { domain: 'google.no', region: 'Norway' },
  { domain: 'google.ie', region: 'Ireland' },
  { domain: 'google.cz', region: 'Czech Republic' },
  { domain: 'google.sk', region: 'Slovakia' },
  { domain: 'google.hu', region: 'Hungary' },
  { domain: 'google.ro', region: 'Romania' },
  { domain: 'google.bg', region: 'Bulgaria' },
  { domain: 'google.gr', region: 'Greece' },
  { domain: 'google.hr', region: 'Croatia' },
  { domain: 'google.rs', region: 'Serbia' },
  { domain: 'google.si', region: 'Slovenia' },
  { domain: 'google.lt', region: 'Lithuania' },
  { domain: 'google.lv', region: 'Latvia' },
  { domain: 'google.ee', region: 'Estonia' },
  { domain: 'google.lu', region: 'Luxembourg' },
  { domain: 'google.is', region: 'Iceland' },
  { domain: 'google.com.mt', region: 'Malta' },
  { domain: 'google.com.cy', region: 'Cyprus' },
  { domain: 'google.al', region: 'Albania' },
  { domain: 'google.mk', region: 'North Macedonia' },
  { domain: 'google.me', region: 'Montenegro' },
  { domain: 'google.ba', region: 'Bosnia' },
  { domain: 'google.md', region: 'Moldova' },
  { domain: 'google.ge', region: 'Georgia' },
  { domain: 'google.am', region: 'Armenia' },
  { domain: 'google.az', region: 'Azerbaijan' },
  { domain: 'google.com.ua', region: 'Ukraine' },
  { domain: 'google.ca', region: 'Canada' },
  { domain: 'google.com.br', region: 'Brazil' },
  { domain: 'google.com.mx', region: 'Mexico' },
  { domain: 'google.com.ar', region: 'Argentina' },
  { domain: 'google.com.co', region: 'Colombia' },
  { domain: 'google.com.pe', region: 'Peru' },
  { domain: 'google.co.ve', region: 'Venezuela' },
  { domain: 'google.cl', region: 'Chile' },
  { domain: 'google.com.ec', region: 'Ecuador' },
  { domain: 'google.com.bo', region: 'Bolivia' },
  { domain: 'google.com.py', region: 'Paraguay' },
  { domain: 'google.com.uy', region: 'Uruguay' },
  { domain: 'google.com.gt', region: 'Guatemala' },
  { domain: 'google.co.cr', region: 'Costa Rica' },
  { domain: 'google.com.pa', region: 'Panama' },
  { domain: 'google.hn', region: 'Honduras' },
  { domain: 'google.com.sv', region: 'El Salvador' },
  { domain: 'google.com.ni', region: 'Nicaragua' },
  { domain: 'google.com.do', region: 'Dominican Republic' },
  { domain: 'google.com.cu', region: 'Cuba' },
  { domain: 'google.com.jm', region: 'Jamaica' },
  { domain: 'google.tt', region: 'Trinidad' },
  { domain: 'google.gy', region: 'Guyana' },
  { domain: 'google.co.in', region: 'India' },
  { domain: 'google.co.jp', region: 'Japan' },
  { domain: 'google.com.au', region: 'Australia' },
  { domain: 'google.co.nz', region: 'New Zealand' },
  { domain: 'google.co.kr', region: 'South Korea' },
  { domain: 'google.com.sg', region: 'Singapore' },
  { domain: 'google.co.id', region: 'Indonesia' },
  { domain: 'google.com.ph', region: 'Philippines' },
  { domain: 'google.com.pk', region: 'Pakistan' },
  { domain: 'google.co.th', region: 'Thailand' },
  { domain: 'google.com.vn', region: 'Vietnam' },
  { domain: 'google.com.hk', region: 'Hong Kong' },
  { domain: 'google.com.tw', region: 'Taiwan' },
  { domain: 'google.com.my', region: 'Malaysia' },
  { domain: 'google.com.bd', region: 'Bangladesh' },
  { domain: 'google.com.np', region: 'Nepal' },
  { domain: 'google.lk', region: 'Sri Lanka' },
  { domain: 'google.com.mm', region: 'Myanmar' },
  { domain: 'google.com.kh', region: 'Cambodia' },
  { domain: 'google.mn', region: 'Mongolia' },
  { domain: 'google.kz', region: 'Kazakhstan' },
  { domain: 'google.co.uz', region: 'Uzbekistan' },
  { domain: 'google.com.fj', region: 'Fiji' },
  { domain: 'google.ae', region: 'UAE' },
  { domain: 'google.com.sa', region: 'Saudi Arabia' },
  { domain: 'google.co.il', region: 'Israel' },
  { domain: 'google.com.tr', region: 'Turkey' },
  { domain: 'google.jo', region: 'Jordan' },
  { domain: 'google.com.lb', region: 'Lebanon' },
  { domain: 'google.com.bh', region: 'Bahrain' },
  { domain: 'google.com.qa', region: 'Qatar' },
  { domain: 'google.com.kw', region: 'Kuwait' },
  { domain: 'google.com.om', region: 'Oman' },
  { domain: 'google.com.iq', region: 'Iraq' },
  { domain: 'google.ps', region: 'Palestine' },
];

// ── Scoring Engines ───────────────────────────────────────────────────────────

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function computeSEO({ title, body, primaryKeyword, secondaryKeywords }) {
  let score = 0;
  if (!primaryKeyword) return 0;
  const kw = primaryKeyword.toLowerCase();
  const bodyLower = body.toLowerCase();
  const titleLower = title.toLowerCase();
  const wordCount = countWords(body);
  if (titleLower.includes(kw)) score += 20;
  const kwOccurrences = (bodyLower.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
  if (kwOccurrences > 0) score += 10;
  if (wordCount > 0) {
    const density = (kwOccurrences / wordCount) * 100;
    if (density >= 0.5 && density <= 3) score += 15;
    else if (density > 0 && density < 0.5) score += 5;
  }
  const secondaryList = secondaryKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  let secFound = 0;
  secondaryList.forEach(sk => { if (bodyLower.includes(sk)) secFound++; });
  if (secondaryList.length > 0) {
    score += Math.round((secFound / secondaryList.length) * 15);
  } else { score += 5; }
  if (/^#\s.+/m.test(body)) score += 8;
  if (/^##\s.+/m.test(body)) score += 7;
  if (wordCount >= 800) score += 15;
  else if (wordCount >= 400) score += 10;
  else if (wordCount >= 150) score += 5;
  return Math.min(100, score);
}

function computeReadability(body) {
  if (!body.trim()) return { label: '—', level: 'none' };
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = body.trim().split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return { label: '—', level: 'none' };
  const avgWordsPerSentence = words.length / sentences.length;
  const syllableCount = words.reduce((acc, w) => acc + (w.match(/[aeiouy]+/gi) || []).length, 0);
  const avgSyllables = syllableCount / words.length;
  const fk = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllables;
  if (fk >= 70) return { label: 'Easy', level: 'easy' };
  if (fk >= 50) return { label: 'Moderate', level: 'moderate' };
  return { label: 'Complex', level: 'hard' };
}

function computeEEAT(body) {
  if (!body.trim()) return 0;
  let score = 0;
  const lower = body.toLowerCase();
  if (/\d+%|\d+ percent|according to|study|research|report|survey/.test(lower)) score += 20;
  if (/therefore|furthermore|consequently|in conclusion|evidence|demonstrates/.test(lower)) score += 20;
  const paragraphs = body.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length >= 3) score += 20;
  else if (paragraphs.length >= 2) score += 10;
  if (/source:|via|cited|reference|published/.test(lower)) score += 20;
  const wc = countWords(body);
  if (wc >= 600) score += 20;
  else if (wc >= 300) score += 10;
  return Math.min(100, score);
}

// ── Score display helpers ─────────────────────────────────────────────────────
function seoColor(score) { return score >= 75 ? 'dot-green' : score >= 50 ? 'dot-yellow' : 'dot-red'; }
function _seoLabel(score) { return score >= 75 ? 'Good' : score >= 50 ? 'Fair' : score > 0 ? 'Weak' : 'No keyword set'; }
function readabilityColor(level) { return level === 'easy' ? 'dot-green' : level === 'moderate' ? 'dot-yellow' : 'dot-red'; }
function eeatColor(score) { return score >= 70 ? 'dot-green' : score >= 40 ? 'dot-yellow' : 'dot-red'; }

// ── Domain Autosuggest ────────────────────────────────────────────────────────
function DomainAutosuggest({ value, onChange }) {
  const [query, setQuery] = useState(value?.domain ? `${value.domain}` : '');
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapRef = useRef(null);
  useEffect(() => {
    const q = query.toLowerCase().trim();
    const timer = setTimeout(() => {
      if (!q) { setFiltered([]); return; }
      setFiltered(GOOGLE_DOMAINS.filter(d => d.domain.includes(q) || d.region.toLowerCase().includes(q)).slice(0, 8));
    }, 0);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const select = (item) => { setQuery(item.domain); onChange(item); setOpen(false); };
  const handleInput = (e) => { setQuery(e.target.value); setOpen(true); onChange(null); };
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input className="input-pill mb-1 w-100 extra-small" type="text" placeholder="Search Google domain..." value={query} onChange={handleInput} onFocus={() => query && setOpen(true)} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="domain-suggest-list">
          {filtered.map(item => (
            <div key={item.domain} className="domain-suggest-item" onMouseDown={() => select(item)}>
              <span className="domain-suggest-name">{item.domain}</span>
              <span className="domain-suggest-region">{item.region}</span>
            </div>
          ))}
        </div>
      )}
      {value && (
        <div className="extra-small text-muted mb-1" style={{ marginTop: 2 }}>
          <span className="indicator-dot dot-green" style={{ display: 'inline-block' }}></span>&nbsp;{value.region}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArticleComposer({ campaigns = [] }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [domain, setDomain] = useState(GOOGLE_DOMAINS[0]);
  const [campaignId, setCampaignId] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [contentSubTab, setContentSubTab] = useState("compose");

  const wordCount = countWords(body);
  const seoScore = computeSEO({ title, body, primaryKeyword, secondaryKeywords });
  const readability = computeReadability(body);
  const eeatScore = computeEEAT(body);

  const kwWords = primaryKeyword.trim() ? (body.toLowerCase().match(new RegExp(`\\b${primaryKeyword.toLowerCase()}\\b`, 'g')) || []).length : 0;
  const kwDensity = wordCount > 0 && kwWords > 0 ? ((kwWords / wordCount) * 100).toFixed(1) : null;

  const handleAssistantGenerate = (data) => {
    setTitle(`${data.goal} for ${data.audience}`);
    setBody(`# ${data.goal} Strategy\n\nThis article focuses on ${data.primaryKeyword} to target ${data.audience}.\n\nSecondary focus areas: ${data.secondaryKeywords}.\n\nLocalization set to ${data.domain}.\n\nGenerated with myPilotPost Assistant.`);
    setPrimaryKeyword(data.primaryKeyword);
    setSecondaryKeywords(data.secondaryKeywords);
    const selectedDomain = GOOGLE_DOMAINS.find(d => d.domain === data.domain) || GOOGLE_DOMAINS[0];
    setDomain(selectedDomain);
    setContentSubTab("compose");
  };

  return (
    <div id="tab-blog">
      {/* ── TOP BAR ── */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-1 align-items-center">
          <select className="form-select form-select-sm border-subtle" style={{ width: 160, fontSize: 12 }} value={campaignId} onChange={e => setCampaignId(e.target.value)}>
            <option value="">No Campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className={`btn-grey${contentSubTab === "drafts" ? " active" : ""}`} onClick={() => setContentSubTab("drafts")}>Drafts</button>
          <button className={`btn-grey${contentSubTab === "scheduled" ? " active" : ""}`} onClick={() => setContentSubTab("scheduled")}>Scheduled</button>
          <button className={`btn-grey${contentSubTab === "approval" ? " active" : ""}`} onClick={() => setContentSubTab("approval")}>Share for Approval</button>
          <button className="btn-grey" onClick={() => alert("Media Library opened")}>Image</button>
        </div>
        <div>
          <button className="btn-pilot" onClick={() => setAssistantOpen(true)}>myPilotPost Assistant</button>
        </div>
      </div>

      {contentSubTab === "compose" ? (
        <>
          <div className="d-flex align-items-center gap-2 border-bottom pb-2 mb-3">
            <input className="article-title-field" placeholder="Article Title..." type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="row g-3">
            <div className="col-md-9">
              <textarea className="card-workspace p-3 border-0 shadow-sm min-h-500 small line-height-1-6 w-100 res-none" id="art-editor" placeholder="Start writing your masterpiece or generate content with the Assistant." value={body} onChange={(e) => setBody(e.target.value)} style={{ outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div className="col-md-3">
              <div className="card-workspace health-sidebar-card">
                <h6 className="small fw-bold mb-2">Article Health</h6>
                <div className="small mb-1"><span className={`indicator-dot ${wordCount >= 300 ? 'dot-green' : wordCount >= 100 ? 'dot-yellow' : 'dot-red'}`}></span>Word Count: <strong>{wordCount.toLocaleString()}</strong></div>
                <div className="small mb-1"><span className={`indicator-dot ${seoColor(seoScore)}`}></span>SEO Score: <strong>{seoScore}/100</strong></div>
                {primaryKeyword && <div className="small mb-1"><span className={`indicator-dot ${kwWords > 0 ? 'dot-green' : 'dot-red'}`}></span>Keyword: <strong>"{primaryKeyword}"</strong>{kwDensity && <span className="text-muted"> ({kwDensity}%)</span>}</div>}
                <div className="small mb-1"><span className={`indicator-dot ${readabilityColor(readability.level)}`}></span>Readability: <strong>{readability.label}</strong></div>
                <div className="small mb-2"><span className={`indicator-dot ${eeatColor(eeatScore)}`}></span>Credibility: <strong>{eeatScore}/100</strong></div>
                <hr className="my-1" />
                <label className="extra-small fw-bold text-muted mb-1 text-uppercase">Keywords</label>
                <input className="input-pill mb-1 w-100 extra-small" placeholder="Primary keyword" type="text" value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} />
                <input className="input-pill mb-2 w-100 extra-small" placeholder="Secondary keywords" type="text" value={secondaryKeywords} onChange={(e) => setSecondaryKeywords(e.target.value)} />
                <hr className="my-1" />
                <label className="extra-small fw-bold text-muted mb-1 text-uppercase">Localization</label>
                <DomainAutosuggest value={domain} onChange={setDomain} />
                <hr className="my-1" />
                <button className="btn-grey btn-sm w-100 mb-1">Grammar Check</button>
              </div>
              <div className="d-grid gap-2 mt-2">
                <button className="btn-grey" onClick={() => alert('Scheduled')}>Schedule Article</button>
                <div className="d-flex gap-2">
                  <button className="btn-pilot flex-fill" onClick={() => alert('Posted')}>Post Now</button>
                  <button className="btn-grey flex-fill" onClick={() => { navigator.clipboard.writeText(`${title}\n\n${body}`); alert('Copied'); }}>Copy</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card-workspace p-5 text-center text-muted">
          <h5>No {contentSubTab} found.</h5>
          <button className="btn-pilot mt-3" onClick={() => setContentSubTab("compose")}>Back to Editor</button>
        </div>
      )}

      <BlogAssistantModal isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} onGenerate={handleAssistantGenerate} />
    </div>
  );
}
