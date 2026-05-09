import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Globe, Search, ShieldCheck, Zap, TrendingUp, 
  AlertCircle, CheckCircle2, ChevronRight, Plus,
  ArrowUpRight, Award, Info
} from "lucide-react";
import { apiSafeFetch } from "../lib/api/client";

/**
 * Production-Hardened SEO Engine
 * Implements strict status modeling: loading | empty | error | success
 */

// ── Shared Constants ─────────────────────────────────────────────────────────

const GOOGLE_DOMAINS = [
  "google.com", "google.co.uk", "google.com.ng", "google.co.za", "google.com.br",
  "google.ca", "google.com.au", "google.co.in", "google.co.jp", "google.de",
  "google.fr", "google.it", "google.es", "google.com.mx", "google.com.ar",
  "google.cl", "google.com.co", "google.com.pe", "google.com.ve", "google.com.eg",
  "google.com.sa", "google.ae", "google.com.tr", "google.ru", "google.com.pk",
  "google.com.bd", "google.com.vn", "google.co.th", "google.com.my", "google.com.sg",
  "google.co.id", "google.com.ph", "google.co.kr", "google.com.tw", "google.com.hk"
].sort();

// ── Shared UI States ──────────────────────────────────────────────────────

const LoadingIndicator = ({ message = "Analyzing search data..." }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn">
    <div className="spinner-border spinner-border-sm mb-3 text-primary" role="status"></div>
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const EmptyState = ({ message = "No analysis data yet" }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn">
    <Search size={32} strokeWidth={1} className="mb-3 opacity-20" />
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const ErrorState = ({ message = "Unable to load SEO data", onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-danger animate__animated animate__fadeIn">
    <AlertCircle size={32} strokeWidth={1} className="mb-3 opacity-50" />
    <span className="extra-small fw-bold mb-3">{message}</span>
    {onRetry && (
      <button 
        className="btn btn-sm btn-outline-danger px-4 py-2 rounded-pill fw-bold" 
        style={{ fontSize: '0.65rem' }}
        onClick={onRetry}
      >
        Retry
      </button>
    )}
  </div>
);

// ── Components ───────────────────────────────────────────────────────────────

const ScoreProgress = ({ label, value, colorClass, status }) => (
  <div className="mb-3">
    <div className="d-flex justify-content-between mb-1">
      <span className="extra-small fw-bold text-muted text-uppercase">{label}</span>
      <span className={`extra-small fw-bold text-${colorClass}`}>
        {status === 'success' ? `${value}%` : '—'}
      </span>
    </div>
    <div className="progress" style={{ height: "6px", background: "#f1f5f9" }}>
      <div 
        className={`progress-bar bg-${colorClass}`} 
        style={{ width: status === 'success' ? `${value}%` : '0%', transition: 'width 1s ease' }}
      ></div>
    </div>
  </div>
);

const KeywordIntentBadge = ({ intent }) => {
  const colors = {
    Commercial: "bg-primary-light text-primary",
    Transactional: "bg-success-light text-success",
    Informational: "bg-info-light text-info",
  };
  return (
    <span className={`badge ${colors[intent] || 'bg-light'} extra-small fw-bold`}>
      {intent}
    </span>
  );
};

// ── Main Page Component ──────────────────────────────────────────────────────

const SEOCentre = ({ activeBrand }) => {
  const [searchDomain, setSearchDomain] = useState("google.com.ng");
  const [domainSearch, setDomainSearch] = useState("");
  const [showDomainSuggest, setShowDomainSuggest] = useState(false);
  
  // Hardened State Models
  const [summary, setSummary] = useState({ status: 'loading', data: null });
  const [keywords, setKeywords] = useState({ status: 'loading', data: [] });
  const [selectedKeywordId, setSelectedKeywordId] = useState(null);

  const fetchSEOData = useCallback(async () => {
    if (!activeBrand?.id) {
      setSummary({ status: 'empty', data: null });
      setKeywords({ status: 'empty', data: [] });
      return;
    }

    setSummary(prev => ({ ...prev, status: 'loading' }));
    setKeywords(prev => ({ ...prev, status: 'loading' }));

    const [sumRes, kwRes] = await Promise.all([
      apiSafeFetch(`/api/customer/seo/summary?brandId=${activeBrand.id}&domain=${searchDomain}`),
      apiSafeFetch(`/api/customer/seo/keywords?brandId=${activeBrand.id}&domain=${searchDomain}`)
    ]);

    setSummary(sumRes);
    setKeywords(kwRes);
  }, [activeBrand?.id, searchDomain]);

  useEffect(() => {
    fetchSEOData();
  }, [fetchSEOData]);

  const filteredDomains = useMemo(() => {
    if (!domainSearch) return [];
    return GOOGLE_DOMAINS.filter(d => d.includes(domainSearch.toLowerCase())).slice(0, 8);
  }, [domainSearch]);

  const selectedKeyword = useMemo(() => {
    if (keywords.status !== 'success') return null;
    return keywords.data.find(k => k.id === selectedKeywordId) || keywords.data[0];
  }, [keywords, selectedKeywordId]);

  return (
    <div className="seo-engine animate__animated animate__fadeIn p-2">
      
      {/* 1. Header & Localization Engine */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0 text-main">SEO Intelligence Engine</h4>
          <p className="extra-small text-muted mb-0">Global search data for <span className="fw-bold text-primary">{searchDomain}</span></p>
        </div>
        
        <div className="localization-engine position-relative" style={{ width: '280px' }}>
          <div className="input-pill d-flex align-items-center gap-2 bg-white">
            <Globe size={16} className="text-muted" />
            <input 
              type="text" 
              className="border-0 bg-transparent flex-1 extra-small fw-bold"
              placeholder="Search Google Domain..."
              value={domainSearch || searchDomain}
              onChange={(e) => {
                setDomainSearch(e.target.value);
                setShowDomainSuggest(true);
              }}
              onFocus={() => setShowDomainSuggest(true)}
            />
          </div>
          {showDomainSuggest && filteredDomains.length > 0 && (
            <div className="domain-suggest-card shadow-lg">
              {filteredDomains.map(d => (
                <div 
                  key={d} 
                  className="suggest-item"
                  onClick={() => {
                    setSearchDomain(d);
                    setDomainSearch("");
                    setShowDomainSuggest(false);
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. SEO Overview System */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="card-workspace h-100 p-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <ShieldCheck size={18} className="text-primary" /> Authority Snapshot
            </h6>
            <div className="text-center mb-4">
              <div className="h1 fw-bold mb-0 text-primary">
                {summary.status === 'success' ? summary.data?.globalScore : '—'}
              </div>
              <div className="extra-small text-muted fw-bold text-uppercase">Global SEO Score</div>
            </div>
            <ScoreProgress label="Keyword Coverage" value={summary.data?.keywordCoverage} colorClass="primary" status={summary.status} />
            <ScoreProgress label="Readability Index" value={summary.data?.readabilityIndex} colorClass="success" status={summary.status} />
            <ScoreProgress label="E-E-A-T Maturity" value={summary.data?.eeatMaturity} colorClass="info" status={summary.status} />
            <div className="bg-light p-3 rounded-lg mt-4 extra-small">
              <span className="fw-bold text-main">Intelligence:</span> {summary.data?.topRecommendation || 'Analyzing domain authority signals...'}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card-workspace h-100 p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-bold mb-0">E-E-A-T Scorecard (Agency Grade)</h6>
              <div className="extra-small text-muted d-flex align-items-center gap-2">
                < Award size={14} /> Trust Certified
              </div>
            </div>
            
            {summary.status === 'loading' ? <LoadingIndicator /> :
             summary.status === 'empty' || !summary.data?.eeatFactors ? <EmptyState /> :
             summary.status === 'error' ? <ErrorState onRetry={fetchSEOData} /> : (
              <div className="row g-3">
                {summary.data.eeatFactors.map(f => (
                  <div key={f.name} className="col-md-6">
                    <div className="p-3 border rounded-lg bg-white h-100">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold">{f.name}</span>
                        <span className="extra-small fw-bold px-2 py-1 bg-light rounded text-main">{f.score}/100</span>
                      </div>
                      <div className="extra-small text-muted mb-2">{f.desc}</div>
                      <div className="progress" style={{ height: "4px" }}>
                        <div className="progress-bar" style={{ width: `${f.score}%`, backgroundColor: f.color || '#2563eb' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Keyword Intelligence System */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card-workspace p-0 overflow-hidden h-100">
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Search size={18} className="text-primary" /> Keyword Opportunities
              </h6>
            </div>
            
            {keywords.status === 'loading' ? <LoadingIndicator /> :
             keywords.status === 'empty' ? <EmptyState /> :
             keywords.status === 'error' ? <ErrorState onRetry={fetchSEOData} /> : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3">Keyword</th>
                      <th>Volume</th>
                      <th>Difficulty</th>
                      <th>Intent</th>
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.data.map(kw => (
                      <tr 
                        key={kw.id} 
                        className={selectedKeyword?.id === kw.id ? 'bg-primary-light bg-opacity-10' : ''} 
                        onClick={() => setSelectedKeywordId(kw.id)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="px-4 py-3">
                          <div className="fw-bold small">{kw.term}</div>
                          <div className="extra-small text-muted">{kw.status}</div>
                        </td>
                        <td className="small fw-bold">{kw.volume}</td>
                        <td>
                          <span className={`extra-small fw-bold ${kw.difficulty === 'High' ? 'text-danger' : 'text-success'}`}>
                            {kw.difficulty}
                          </span>
                        </td>
                        <td><KeywordIntentBadge intent={kw.intent} /></td>
                        <td className="text-end px-4">
                           <button className="btn btn-link btn-sm p-0 text-primary"><Plus size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-workspace p-4 h-100">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Zap size={18} className="text-warning" /> Competitor Snapshot
            </h6>
            
            {!selectedKeyword ? <EmptyState message="Select a keyword to analyze competitors" /> : (
              <>
                <div className="extra-small text-muted mb-4 italic">Analysis for: <span className="fw-bold text-main">"{selectedKeyword.term}"</span></div>
                
                <div className="competitor-insight mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="extra-small fw-bold">Avg. Word Count</span>
                    <span className="extra-small fw-bold">{selectedKeyword.avgWords || '—'} words</span>
                  </div>
                  <div className="progress mb-4" style={{ height: '4px' }}>
                    <div className="progress-bar bg-primary" style={{ width: `${selectedKeyword.wordScore || 0}%` }}></div>
                  </div>

                  <div className="top-results">
                    {(selectedKeyword.competitors || []).map((comp, i) => (
                      <div key={i} className="p-2 border-bottom d-flex align-items-center justify-content-between gap-2">
                        <div className="text-truncate extra-small fw-medium" style={{ maxWidth: '200px' }}>
                          {i + 1}. {comp.title}
                        </div>
                        <ArrowUpRight size={12} className="text-muted" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="optimization-fixes">
                  <h6 className="extra-small fw-bold text-uppercase text-muted mb-3">Priority Fixes</h6>
                  <div className="d-flex flex-column gap-2">
                    {(selectedKeyword.recommendations || ['Analyzing content optimization opportunities...']).map((rec, i) => (
                      <div key={i} className="d-flex align-items-start gap-2 bg-warning-light bg-opacity-10 p-2 rounded">
                        <AlertCircle size={14} className="text-warning mt-1" />
                        <span className="extra-small fw-medium text-warning">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .seo-engine { max-width: 1300px; margin: 0 auto; }
        .localization-engine { z-index: 100; }
        .domain-suggest-card { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 12px; margin-top: 8px; overflow: hidden; border: 1px solid #e2e8f0; z-index: 1000; }
        .suggest-item { padding: 10px 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .suggest-item:hover { background: #f8fafc; color: var(--pilot-blue); }
        .bg-primary-light { background: #eff6ff; }
        .bg-success-light { background: #f0fdf4; }
        .bg-info-light { background: #f0f9ff; }
        .bg-danger-light { background: #fef2f2; }
        .bg-warning-light { background: #fffbeb; }
        .table th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
      `}</style>
    </div>
  );
};

export default SEOCentre;
