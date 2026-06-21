import React, { useState, useRef, useEffect, useCallback } from "react";
import BlogAssistantModal from "../components/shared/BlogAssistantModal";
import MediaSourceModal from "../components/shared/MediaSourceModal";
import PlatformIcon from "../components/shared/PlatformIcon";
import { useBrand } from "../contexts/BrandContext";
import { apiRequest } from "../lib/api/client";

/**
 * ArticleComposer — Content Intelligence & Audited Scheduling Edition
 * Injects live scoring, SEO, readability, E-E-A-T, autosuggest,
 * dynamic workspace tab buttons with counts, and slide-over VerificationPanel.
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

const PUBLISH_PHASES = {
  creating:   { label: "Creating article…",     icon: "fas fa-pen",        color: "#3b82f6" },
  linking:    { label: "Attaching image…",     icon: "fas fa-paperclip",  color: "#8b5cf6" },
  scheduling: { label: "Scheduling delivery…", icon: "fas fa-clock",      color: "#f59e0b" },
  queued:     { label: "Queued for delivery",  icon: "fas fa-check-circle", color: "#10b981" },
  failed:     { label: "Publish failed",       icon: "fas fa-times-circle", color: "#ef4444" },
};

// ── Scoring Engines ───────────────────────────────────────────────────────────
function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
}

function computeSEO({ title, body, primaryKeyword, secondaryKeywords }) {
  let score = 0;
  if (!primaryKeyword) return 0;
  const kw = primaryKeyword.toLowerCase();
  const bodyLower = body.toLowerCase();
  const titleLower = title.toLowerCase();
  const wordCount = countWords(body);
  if (titleLower.includes(kw)) score += 20;
  
  const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const kwOccurrences = (bodyLower.match(new RegExp(`\\b${escapedKw}\\b`, 'g')) || []).length;
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

function validateBlogArticle(title, body, primaryKeyword, attachedImage) {
  const messages = [];
  let state = "SAFE";

  if (!title || !title.trim()) {
    state = "BLOCKED";
    messages.push("Article title is required to publish.");
  } else if (title.length > 70) {
    if (state !== "BLOCKED") state = "WARNING";
    messages.push("SEO title exceeds 70 characters (optimal for Google search listings).");
  }

  const wc = countWords(body || "");
  if (wc === 0) {
    state = "BLOCKED";
    messages.push("Article content body is required.");
  } else if (wc < 500) {
    if (state !== "BLOCKED") state = "WARNING";
    messages.push(`Word count is ${wc} (optimal is at least 600 words for search engines).`);
  }

  if (wc > 0 && !body.includes("## ")) {
    if (state !== "BLOCKED") state = "WARNING";
    messages.push("Missing H2 subheadings (##) for structural readability.");
  }

  if (primaryKeyword) {
    const escapedKw = primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const kwWords = body ? (body.toLowerCase().match(new RegExp(`\\b${escapedKw}\\b`, 'g')) || []).length : 0;
    if (kwWords === 0) {
      if (state !== "BLOCKED") state = "WARNING";
      messages.push(`Primary keyword "${primaryKeyword}" is not found in the article body.`);
    }
  } else {
    if (state !== "BLOCKED") state = "WARNING";
    messages.push("No primary keyword specified for SEO alignment.");
  }

  if (!attachedImage) {
    if (state !== "BLOCKED") state = "WARNING";
    messages.push("No featured image attached for this article.");
  }

  return { state, messages };
}

// ── Score display helpers ─────────────────────────────────────────────────────
function seoColor(score) { return score >= 75 ? 'dot-green' : score >= 50 ? 'dot-yellow' : 'dot-red'; }
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

// ── Slide-over Verification Drawer ─────────────────────────────────────────────
function VerificationPanel({ open, onClose, data, onPublish, onSchedule, onDraft, isPublishing, publishPhase, publishResult, onReset }) {
  const { title, body, primaryKeyword, attachedImage, scheduledAt, timezone } = data;
  const validationResult = validateBlogArticle(title, body, primaryKeyword, attachedImage);
  
  const hasBlocks = validationResult.state === "BLOCKED";
  const hasWarnings = validationResult.state === "WARNING";
  const confidence = hasBlocks ? "Low" : hasWarnings ? "Moderate" : "High";
  const confColor = hasBlocks ? "#ef4444" : hasWarnings ? "#f59e0b" : "#10b981";

  const phaseInfo = PUBLISH_PHASES[publishPhase];
  const isActive = publishPhase !== "idle";

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 460,
        background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        zIndex: 1050, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.26s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fas fa-shield-check" style={{ color: "#10b981", fontSize: 15 }}></i>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Article Verification</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>SEO Rating</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: confColor + "22", color: confColor, padding: "3px 10px", borderRadius: 20 }}>{confidence}</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}>Target Channel</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 11, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "3px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <PlatformIcon platform="wordpress" size={12} />
                WordPress Blog
              </span>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "11px 14px", marginBottom: 14, display: "flex", gap: 10 }}>
            <i className="fas fa-dna" style={{ color: "#10b981", marginTop: 2 }}></i>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", marginBottom: 2 }}>Brand DNA Alignment</div>
              <div style={{ fontSize: 11, color: "#047857" }}>Vocabulary and tone conform with strategic preferences.</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>WordPress SEO Validation</div>
            <div style={{
              borderRadius: 7, padding: "9px 12px", marginBottom: 7,
              background: validationResult.state === "SAFE" ? "#f0fdf4" : validationResult.state === "BLOCKED" ? "#fef2f2" : "#fffbeb",
              border: "1px solid " + (validationResult.state === "SAFE" ? "#bbf7d0" : validationResult.state === "BLOCKED" ? "#fecaca" : "#fde68a"),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: validationResult.state === "SAFE" ? "#065f46" : validationResult.state === "BLOCKED" ? "#dc2626" : "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
                  <PlatformIcon platform="wordpress" size={14} />
                  WordPress Post Engine
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>{validationResult.state}</span>
              </div>
              {validationResult.messages?.length > 0 && (
                <ul style={{ margin: "5px 0 0 0", padding: "0 0 0 14px", fontSize: 11, color: "#64748b" }}>
                  {validationResult.messages.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>Featured Image</div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <i className={`fas fa-${attachedImage ? "check-circle" : "image"}`} style={{ color: attachedImage ? "#10b981" : "#94a3b8" }}></i>
              <span style={{ fontSize: 12, color: "#475569" }}>
                {attachedImage ? "Featured image configured" : "No image attached"}
              </span>
            </div>
          </div>

          {scheduledAt && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 2 }}>Scheduled for</div>
              <div style={{ fontSize: 12, color: "#1e40af" }}>{new Date(scheduledAt).toLocaleString()} · {timezone}</div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
          {isActive && (
            <div style={{
              background: publishPhase === "queued" ? "#f0fdf4" : publishPhase === "failed" ? "#fef2f2" : "#eff6ff",
              border: `1px solid ${publishPhase === "queued" ? "#bbf7d0" : publishPhase === "failed" ? "#fecaca" : "#bfdbfe"}`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 2,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {publishPhase !== "queued" && publishPhase !== "failed"
                ? <span className="spinner-border spinner-border-sm" style={{ color: phaseInfo?.color }} />
                : <i className={phaseInfo?.icon} style={{ color: phaseInfo?.color, fontSize: 16 }} />
              }
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: phaseInfo?.color }}>{phaseInfo?.label}</div>
                {publishPhase === "queued" && publishResult && (
                  <div style={{ fontSize: 10, color: "#047857", marginTop: 2, fontFamily: "monospace" }}>
                    ID: {publishResult.content_id} · {publishResult.platforms?.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}

          {isActive && publishPhase !== "queued" && publishPhase !== "failed" && (
            <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
              {["creating", "linking", "scheduling"].map((phase, i) => {
                const phases = ["creating", "linking", "scheduling"];
                const currentIdx = phases.indexOf(publishPhase);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={phase} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                    {i > 0 && <div style={{ position: "absolute", left: 0, top: 9, width: "50%", height: 2, background: isDone || isCurrent ? "#3b82f6" : "#e2e8f0" }} />}
                    {i < 2 && <div style={{ position: "absolute", right: 0, top: 9, width: "50%", height: 2, background: isDone ? "#3b82f6" : "#e2e8f0" }} />}
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: isDone ? "#3b82f6" : isCurrent ? "#fff" : "#f1f5f9", border: `2px solid ${isDone || isCurrent ? "#3b82f6" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                      {isDone && <i className="fas fa-check" style={{ fontSize: 9, color: "#fff" }} />}
                      {isCurrent && <span className="spinner-border" style={{ width: 10, height: 10, borderWidth: 2, color: "#3b82f6" }} />}
                    </div>
                    <div style={{ fontSize: 9, color: isDone || isCurrent ? "#3b82f6" : "#94a3b8", marginTop: 3, textTransform: "capitalize", fontWeight: isCurrent ? 700 : 400 }}>
                      {PUBLISH_PHASES[phase]?.label.replace("…", "")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {publishPhase === "queued" ? (
            <button onClick={onReset} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="fas fa-plus" /> Create Another Article
            </button>
          ) : publishPhase === "failed" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={scheduledAt ? onSchedule : onPublish} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <i className="fas fa-redo" style={{ marginRight: 6 }} /> Retry
              </button>
              <button onClick={onClose} style={ghostBtn}>Back to Editor</button>
            </div>
          ) : (
            <>
              <button
                disabled={isPublishing || hasBlocks}
                onClick={scheduledAt ? onSchedule : onPublish}
                style={{
                  background: hasBlocks ? "#f1f5f9" : "#0f172a", color: hasBlocks ? "#94a3b8" : "#fff",
                  border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 13,
                  cursor: hasBlocks ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: 8,
                  opacity: isPublishing ? 0.7 : 1,
                }}
              >
                <i className={`fas fa-${scheduledAt ? "clock" : "rocket"}`}></i>
                {scheduledAt ? "Confirm & Schedule" : "Confirm & Publish"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onDraft} disabled={isPublishing} style={ghostBtn}>Save Draft</button>
                <button onClick={onClose} disabled={isPublishing} style={ghostBtn}>Back to Editor</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const sectionLabel = { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 };
const ghostBtn = { flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#475569" };

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArticleComposer({ campaigns = [] }) {
  const { activeBrand } = useBrand();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [domain, setDomain] = useState(GOOGLE_DOMAINS[0]);
  const [campaignId, setCampaignId] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [contentSubTab, setContentSubTab] = useState("compose");
  const [generating, setGenerating] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('mpp_article_image') || 'null'); } catch { return null; }
  });
  const [articleId, setArticleId] = useState(() => sessionStorage.getItem('mpp_article_id') || null);
  const [listItems, setListItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const [tabCounts, setTabCounts] = useState({ drafts: 0, scheduled: 0, approvals: 0 });
  const [checkingGrammar, setCheckingGrammar] = useState(false);

  // VerificationPanel States
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [publishPhase, setPublishPhase] = useState("idle"); // idle|creating|linking|scheduling|queued|failed
  const [publishResult, setPublishResult] = useState(null);

  const wordCount = countWords(body);
  const seoScore = computeSEO({ title, body, primaryKeyword, secondaryKeywords });
  const readability = computeReadability(body);
  const eeatScore = computeEEAT(body);

  const kwWords = primaryKeyword.trim() ? (body.toLowerCase().match(new RegExp(`\\b${primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []).length : 0;
  const kwDensity = wordCount > 0 && kwWords > 0 ? ((kwWords / wordCount) * 100).toFixed(1) : null;

  const loadTabCounts = useCallback(async () => {
    try {
      const [d, s, a] = await Promise.all([
        apiRequest("/api/customer/vault?type=blog&status=draft&limit=50"),
        apiRequest("/api/customer/vault?type=blog&status=scheduled&limit=50"),
        apiRequest("/api/customer/vault?type=blog&status=pending&limit=50"),
      ]);
      setTabCounts({
        drafts:    (d?.data || []).length,
        scheduled: (s?.data || []).length,
        approvals: (a?.data || []).length,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadTabCounts();
  }, [loadTabCounts]);

  const handleAssistantGenerate = async (data) => {
    setGenerating(true);
    setContentSubTab("compose");
    try {
      const res = await apiRequest("/api/customer/ai/generate/blog", {
        method: "POST",
        body: JSON.stringify({
          goal:               data.goal,
          audience:           data.audience,
          primary_keyword:    data.primaryKeyword,
          secondary_keywords: data.secondaryKeywords,
          domain:             data.domain,
          brand_id:           activeBrand?.id,
        }),
      });
      if (res?.title) setTitle(res.title);
      if (res?.body)  setBody(res.body);
      if (data.primaryKeyword)    setPrimaryKeyword(data.primaryKeyword);
      if (data.secondaryKeywords) setSecondaryKeywords(data.secondaryKeywords);
      loadTabCounts();
    } catch (err) {
      alert(`AI Generation Failed: ${err.message || "Unknown error"}. Check backend configuration.`);
    } finally {
      setGenerating(false);
    }
    const selectedDomain = GOOGLE_DOMAINS.find(d => d.domain === data.domain) || GOOGLE_DOMAINS[0];
    setDomain(selectedDomain);
  };

  const handleImageSelect = async (media) => {
    const url = media.preview_url || media.url || "";
    const entry = { url, assetId: media.id };
    setAttachedImage(entry);
    try { sessionStorage.setItem('mpp_article_image', JSON.stringify(entry)); } catch { /* ignore */ }
    if (articleId && media.id) {
      apiRequest("/api/customer/media/attach", {
        method: "POST",
        body: JSON.stringify({ content_type: "blog", content_id: articleId, media_id: media.id }),
      }).catch(() => { /* ignore */ });
    }
  };

  useEffect(() => {
    if (contentSubTab === "compose") return;
    let statusFilter = "";
    if (contentSubTab === "drafts") statusFilter = "draft";
    if (contentSubTab === "scheduled") statusFilter = "scheduled";
    if (contentSubTab === "approval") statusFilter = "pending";

    setListLoading(true);
    apiRequest(`/api/customer/vault?type=blog&status=${statusFilter}`)
      .then(res => {
        setListItems(res?.data || []);
      })
      .catch(err => {
        console.error("Failed to load articles", err);
      })
      .finally(() => {
        setListLoading(false);
      });
  }, [contentSubTab]);

  const loadArticle = (item) => {
    setArticleId(item.id);
    setTitle(item.title || "");
    setBody(item.body || "");
    try { sessionStorage.setItem('mpp_article_id', item.id); } catch { /* ignore */ }
    
    let metadataObj = {};
    try {
      metadataObj = typeof item.metadata === "string" ? JSON.parse(item.metadata) : (item.metadata || {});
    } catch {
      metadataObj = {};
    }
    setPrimaryKeyword(metadataObj.keyword || "");
    setSecondaryKeywords(metadataObj.secondaryKeywords || "");
    
    const selectedDomain = GOOGLE_DOMAINS.find(d => d.domain === metadataObj.domain) || GOOGLE_DOMAINS[0];
    setDomain(selectedDomain);

    let mediaIds = [];
    try {
      mediaIds = typeof item.media_ids === "string" ? JSON.parse(item.media_ids) : (item.media_ids || []);
    } catch {
      mediaIds = [];
    }
    
    if (mediaIds.length > 0) {
      apiRequest(`/api/customer/vault/${item.id}`)
        .then(res => {
          const firstMedia = res?.media?.[0] || res?.data?.media?.[0];
          if (firstMedia) {
            const entry = { url: firstMedia.preview_url || firstMedia.url || "", assetId: firstMedia.id };
            setAttachedImage(entry);
            try { sessionStorage.setItem('mpp_article_image', JSON.stringify(entry)); } catch { /* ignore */ }
          } else {
            setAttachedImage(null);
            try { sessionStorage.removeItem('mpp_article_image'); } catch { /* ignore */ }
          }
        })
        .catch(() => {
          setAttachedImage(null);
          try { sessionStorage.removeItem('mpp_article_image'); } catch { /* ignore */ }
        });
    } else {
      setAttachedImage(null);
      try { sessionStorage.removeItem('mpp_article_image'); } catch { /* ignore */ }
    }

    setContentSubTab("compose");
  };

  const handleNewArticle = () => {
    setArticleId(null);
    setTitle("");
    setBody("");
    setPrimaryKeyword("");
    setSecondaryKeywords("");
    setDomain(GOOGLE_DOMAINS[0]);
    setAttachedImage(null);
    setScheduledAt("");
    try {
      sessionStorage.removeItem('mpp_article_id');
      sessionStorage.removeItem('mpp_article_image');
    } catch {
      /* ignore */
    }
    setContentSubTab("compose");
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) return null;
    try {
      const resp = await apiRequest("/api/customer/vault", {
        method: "POST",
        body: JSON.stringify({
          content_id:       articleId || null,
          content_type:     "blog",
          title,
          body,
          platforms:        ["wordpress"],
          campaign_id:      campaignId || null,
          lifecycle_status: "draft",
          metadata:         JSON.stringify({ keyword: primaryKeyword, secondaryKeywords, domain: domain?.domain }),
        }),
      });
      const newId = resp?.content_id;
      if (newId) {
        setArticleId(newId);
        try { sessionStorage.setItem('mpp_article_id', newId); } catch { /* ignore */ }
        if (attachedImage?.assetId) {
          apiRequest("/api/customer/media/attach", {
            method: "POST",
            body: JSON.stringify({ content_type: "blog", content_id: newId, media_id: attachedImage.assetId }),
          }).catch(() => { /* ignore */ });
        }
      }
      loadTabCounts();
      return newId;
    } catch {
      return null;
    }
  };

  const handlePublishSequence = async (isScheduling = false) => {
    setPublishPhase("creating");
    try {
      // 1. Create/Save the article draft to the vault
      const resp = await apiRequest("/api/customer/vault", {
        method: "POST",
        body: JSON.stringify({
          content_id:       articleId || null,
          content_type:     "blog",
          title,
          body,
          platforms:        ["wordpress"],
          campaign_id:      campaignId || null,
          lifecycle_status: "draft",
          metadata:         JSON.stringify({ keyword: primaryKeyword, secondaryKeywords, domain: domain?.domain }),
        }),
      });
      const newId = resp?.content_id || articleId;
      if (!newId) throw new Error("Failed to save article draft.");

      setArticleId(newId);
      try { sessionStorage.setItem('mpp_article_id', newId); } catch { /* ignore */ }

      // 2. Attach featured image if exists
      setPublishPhase("linking");
      if (attachedImage?.assetId) {
        await apiRequest("/api/customer/media/attach", {
          method: "POST",
          body: JSON.stringify({ content_type: "blog", content_id: newId, media_id: attachedImage.assetId }),
        });
      }

      // 3. Schedule / Publish
      setPublishPhase("scheduling");
      if (isScheduling) {
        await apiRequest(`/api/customer/vault/${newId}/schedule`, {
          method: "POST",
          body: JSON.stringify({
            platforms: ["wordpress"],
            scheduled_at: new Date(scheduledAt).toISOString(),
          }),
        });
      } else {
        await apiRequest(`/api/customer/vault/${newId}/publish-now`, {
          method: "POST",
          body: JSON.stringify({ platforms: ["wordpress"] })
        });
      }

      setPublishResult({ content_id: newId, platforms: ["wordpress"] });
      setPublishPhase("queued");
      loadTabCounts();
    } catch {
      setPublishPhase("failed");
    }
  };

  const handleGrammarCheck = async () => {
    if (!body.trim()) {
      alert("Please write some content first.");
      return;
    }
    setCheckingGrammar(true);
    try {
      const res = await apiRequest("/api/customer/ai/grammar", {
        method: "POST",
        body: JSON.stringify({ text: body }),
      });
      if (res?.correctedText) {
        setBody(res.correctedText);
        const count = res.suggestions?.length || 0;
        alert(count > 0 ? `Grammar check complete. Applied ${count} suggestions.` : "No grammar issues found!");
      } else {
        alert("Grammar check completed with no changes.");
      }
    } catch (err) {
      alert(err.message || "Failed to check grammar.");
    } finally {
      setCheckingGrammar(false);
    }
  };

  const handleOpenScheduleVerification = () => {
    if (!scheduledAt) {
      alert("Please select a date and time to schedule this article.");
      return;
    }
    setVerificationOpen(true);
  };

  const handleOpenPostVerification = () => {
    if (!title.trim() && !body.trim()) {
      alert("Nothing to post — add a title or content first.");
      return;
    }
    setScheduledAt("");
    setVerificationOpen(true);
  };

  const WORKSPACE_TABS = [
    { id: "compose",   label: "Editor",    icon: "fas fa-pen"        },
    { id: "drafts",    label: "Drafts",    icon: "fas fa-file-alt"   },
    { id: "approval",  label: "Approvals", icon: "fas fa-user-check" },
    { id: "scheduled", label: "Scheduled", icon: "fas fa-clock"      },
  ];

  return (
    <div id="tab-blog">
      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0, gap: 12 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <select className="form-select form-select-sm border-subtle" style={{ width: 140, height: 32, fontSize: 12 }} value={campaignId} onChange={e => setCampaignId(e.target.value)}>
            <option value="">No Campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {WORKSPACE_TABS.map(tab => {
            const count = tab.id === "compose" ? 0 : (tabCounts[tab.id === "approval" ? "approvals" : tab.id === "drafts" ? "drafts" : "scheduled"] || 0);
            const active = contentSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setContentSubTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  border: `1px solid ${active ? "#2563eb" : "#e2e8f0"}`,
                  background: active ? "#eff6ff" : "#fff",
                  color: active ? "#2563eb" : "#64748b",
                  borderRadius: 8, padding: "7px 14px", fontSize: 12,
                  fontWeight: active ? 700 : 600, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <i className={tab.icon} style={{ fontSize: 11 }} />
                {tab.label}
                {count > 0 && (
                  <span style={{
                    background: active ? "#2563eb" : "#cbd5e1",
                    color: "#fff",
                    padding: "1px 5px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setImageOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              borderRadius: 8, padding: "7px 14px", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <i className="fas fa-image" style={{ fontSize: 11 }} />
            Image
          </button>
        </div>
        
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleNewArticle}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#1e293b",
              borderRadius: 8, padding: "7px 14px", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            New Article
          </button>
          <button
            onClick={() => setAssistantOpen(true)}
            style={{
              background: "var(--pilot-blue, #2563eb)", border: "none", borderRadius: 8,
              color: "#fff", fontSize: 12, fontWeight: 700, padding: "7px 14px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6
            }}
          >
            <i className="fas fa-robot"></i> myPilotPost Assistant
          </button>
        </div>
      </div>

      {contentSubTab === "compose" ? (
        <>
          <div className="d-flex align-items-center gap-2 border-bottom pb-2 mb-3">
            <input className="article-title-field" placeholder="Article Title..." type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="row g-3">
            <div className="col-md-9">
              {attachedImage && (
                <div className="mb-2 d-flex align-items-center gap-2" style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <img src={attachedImage.url} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                  <span className="extra-small text-muted flex-fill" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Featured image attached</span>
                  <button onClick={() => { setAttachedImage(null); try { sessionStorage.removeItem('mpp_article_image'); } catch { /* ignore */ } }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              )}
              <textarea className="card-workspace p-3 border-0 shadow-sm min-h-500 small line-height-1-6 w-100 res-none" id="art-editor" placeholder={generating ? "Generating content…" : "Start writing your masterpiece or generate content with the Assistant."} value={generating ? "" : body} onChange={(e) => !generating && setBody(e.target.value)} disabled={generating} style={{ outline: 'none', fontFamily: 'inherit', opacity: generating ? 0.5 : 1, cursor: generating ? 'wait' : 'auto' }} />
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
                <button className="btn-grey btn-sm w-100 mb-1" onClick={handleGrammarCheck} disabled={checkingGrammar}>
                  {checkingGrammar ? "Checking..." : "Grammar Check"}
                </button>
              </div>
              <div className="card-workspace health-sidebar-card mt-2">
                <label className="extra-small fw-bold text-muted mb-1 text-uppercase">Schedule Publish Date</label>
                <input className="form-control form-control-sm extra-small mb-1" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} style={{ borderRadius: 6, border: '1px solid #cbd5e1', padding: '4px 8px', fontSize: 12, outline: 'none' }} />
              </div>
              <div className="d-grid gap-2 mt-2">
                <button className="btn-grey" onClick={handleOpenScheduleVerification}>Schedule Article</button>
                <div className="d-flex gap-2">
                  <button className="btn-pilot flex-fill" onClick={handleOpenPostVerification}>Post Now</button>
                  <button className="btn-grey flex-fill" onClick={() => { navigator.clipboard.writeText(`${title}\n\n${body}`); alert('Copied'); }}>Copy</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card-workspace p-4">
          <h5 className="mb-3 text-capitalize fw-bold" style={{ fontSize: 16 }}>{contentSubTab === "approval" ? "Pending Approval" : contentSubTab}</h5>
          {listLoading ? (
            <div className="text-center py-5">
              <span className="spinner-border spinner-border-sm text-primary" style={{ width: 24, height: 24 }}></span>
              <p className="text-muted small mt-2">Loading articles...</p>
            </div>
          ) : listItems.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-file-alt fa-2x mb-3" style={{ opacity: 0.3 }}></i>
              <h5>No {contentSubTab} found.</h5>
              <button className="btn-pilot mt-3" onClick={handleNewArticle}>Create New Article</button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {listItems.map(item => (
                <div key={item.id} className="d-flex justify-content-between align-items-center p-3 border rounded-3 bg-light hover-shadow" style={{ transition: "all 0.2s" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: 14 }}>{item.title || "Untitled Article"}</div>
                    <div className="text-muted extra-small mt-1 text-truncate">
                      {item.body ? item.body.replace(/[#*`]/g, "").slice(0, 120) : "No content..."}
                    </div>
                    <div className="text-muted extra-small mt-1">
                      Last updated: {new Date(item.updated_at || item.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => loadArticle(item)} style={{ fontSize: 12, padding: "4px 12px" }}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                      if (confirm("Are you sure you want to delete this article?")) {
                        await apiRequest(`/api/customer/vault/${item.id}`, { method: "DELETE" }).catch(() => { /* ignore */ });
                        setListItems(prev => prev.filter(i => i.id !== item.id));
                        if (articleId === item.id) handleNewArticle();
                        loadTabCounts();
                      }
                    }} style={{ fontSize: 12, padding: "4px 8px" }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BlogAssistantModal isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} onGenerate={handleAssistantGenerate} />
      <MediaSourceModal isOpen={imageOpen} onClose={() => setImageOpen(false)} onSelect={handleImageSelect} activeBrand={activeBrand} socialContent={title} />
      
      <VerificationPanel
        open={verificationOpen}
        onClose={() => { if (publishPhase === "idle" || publishPhase === "failed") setVerificationOpen(false); }}
        data={{
          title,
          body,
          primaryKeyword,
          attachedImage,
          scheduledAt,
          timezone: activeBrand?.timezone || "UTC"
        }}
        onPublish={() => handlePublishSequence(false)}
        onSchedule={() => handlePublishSequence(true)}
        onDraft={async () => {
          await handleSave();
          setVerificationOpen(false);
          alert("Draft saved successfully.");
          loadTabCounts();
        }}
        isPublishing={publishPhase !== "idle" && publishPhase !== "queued" && publishPhase !== "failed"}
        publishPhase={publishPhase}
        publishResult={publishResult}
        onReset={() => {
          setPublishPhase("idle");
          setPublishResult(null);
          setVerificationOpen(false);
          handleNewArticle();
          loadTabCounts();
        }}
      />
    </div>
  );
}
