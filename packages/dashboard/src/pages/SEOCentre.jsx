import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Globe, Search, ShieldCheck, Zap, TrendingUp, 
  AlertCircle, CheckCircle2, ChevronRight, Plus,
  ArrowUpRight, Award, Info, Trash2, Link, Link2, 
  RefreshCw, Check, X, ExternalLink, Lightbulb,
  ArrowUp, ArrowDown, ListFilter, HelpCircle, Eye, Edit
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts";
import { apiRequest, apiSafeFetch } from "../lib/api/client";

/**
 * Production-Hardened SEO & GSC Intelligence Engine
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
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-muted text-center animate__animated animate__fadeIn">
    <Search size={28} strokeWidth={1} className="mb-2 opacity-20" />
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
    Local: "bg-warning-light text-warning"
  };
  return (
    <span className={`badge ${colors[intent] || 'bg-light'} extra-small fw-bold`}>
      {intent}
    </span>
  );
};

// ── Main Page Component ──────────────────────────────────────────────────────

const SEOCentre = ({ activeBrand }) => {
  const [searchDomain, setSearchDomain] = useState("google.com");
  const [domainSearch, setDomainSearch] = useState("");
  const [showDomainSuggest, setShowDomainSuggest] = useState(false);
  
  // Hardened State Models
  const [summary, setSummary] = useState({ status: 'loading', data: null });
  const [keywords, setKeywords] = useState({ status: 'loading', data: [] });
  const [selectedKeywordId, setSelectedKeywordId] = useState(null);
  
  // Search Console State
  const [gscOverview, setGscOverview] = useState({ status: 'loading', data: null });
  const [isSyncingGsc, setIsSyncingGsc] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [newKeywordText, setNewKeywordText] = useState("");
  const [newKeywordIntent, setNewKeywordIntent] = useState("commercial");
  const [newKeywordPriority, setNewKeywordPriority] = useState("0");

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetingKeyword, setTargetingKeyword] = useState(null);
  const [blogPosts, setBlogPosts] = useState({ status: 'loading', data: [] });
  const [isLinkingTarget, setIsLinkingTarget] = useState(false);

  const fetchSEOData = useCallback(async () => {
    if (!activeBrand?.id) {
      setSummary({ status: 'empty', data: null });
      setKeywords({ status: 'empty', data: [] });
      setGscOverview({ status: 'empty', data: null });
      return;
    }

    setSummary(prev => ({ ...prev, status: 'loading' }));
    setKeywords(prev => ({ ...prev, status: 'loading' }));
    setGscOverview(prev => ({ ...prev, status: 'loading' }));

    const [sumRes, kwRes, gscRes] = await Promise.all([
      apiSafeFetch(`/api/customer/seo/summary?brandId=${activeBrand.id}&domain=${searchDomain}`),
      apiSafeFetch(`/api/customer/seo/keywords?brandId=${activeBrand.id}&domain=${searchDomain}`),
      apiSafeFetch(`/api/customer/analytics/search-console/overview`)
    ]);

    setSummary(sumRes);
    setKeywords(kwRes);
    setGscOverview(gscRes);
  }, [activeBrand, searchDomain]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSEOData(), 0);
    return () => clearTimeout(timer);
  }, [fetchSEOData]);

  const filteredDomains = useMemo(() => {
    if (!domainSearch) return [];
    return GOOGLE_DOMAINS.filter(d => d.includes(domainSearch.toLowerCase())).slice(0, 8);
  }, [domainSearch]);

  const selectedKeyword = useMemo(() => {
    if (keywords.status !== 'success') return null;
    return keywords.data.find(k => k.id === selectedKeywordId) || keywords.data[0];
  }, [keywords, selectedKeywordId]);

  // Default SEO Advice if no brand insights exist
  const defaultAdvice = useMemo(() => {
    const advice = [];
    if (gscOverview.data?.connected !== true) {
      advice.push({
        title: "Integrate Search Console",
        message: "Connect your website under Settings to track query rankings, click-through rates, and organic traffic curves in real-time.",
        priority: "high",
        type: "gsc"
      });
    }
    if (!keywords.data || keywords.data.length === 0) {
      advice.push({
        title: "Add Primary Keywords",
        message: "Track important niche terms to check search volume, discover competitor sites, and see content optimization warnings.",
        priority: "medium",
        type: "keyword"
      });
    }
    return advice;
  }, [keywords, gscOverview]);

  // Handle Sync GSC
  const handleSyncGsc = async () => {
    setIsSyncingGsc(true);
    try {
      const res = await apiRequest(`/api/customer/analytics/search-console/sync`, { method: "POST" });
      if (res?.success) {
        alert("Search Console sync completed! 🚀");
        fetchSEOData();
      } else {
        alert(res?.message || "Sync failed. Verify your Search Console property.");
      }
    } catch (err) {
      alert("Search Console sync error: " + err.message);
    } finally {
      setIsSyncingGsc(false);
    }
  };

  // Add Keyword
  const handleAddKeyword = async (e) => {
    e.preventDefault();
    if (!newKeywordText.trim()) return;

    setIsSavingKeyword(true);
    try {
      const res = await apiRequest(`/api/customer/seo/keywords`, {
        method: "POST",
        body: JSON.stringify({
          keyword: newKeywordText,
          intent: newKeywordIntent,
          priority: parseInt(newKeywordPriority, 10)
        })
      });
      if (res.success) {
        setShowAddModal(false);
        setNewKeywordText("");
        setNewKeywordIntent("commercial");
        setNewKeywordPriority("0");
        fetchSEOData();
      }
    } catch (err) {
      alert("Failed to add keyword: " + err.message);
    } finally {
      setIsSavingKeyword(false);
    }
  };

  // Delete Keyword
  const handleDeleteKeyword = async (e, id, keyword) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to stop tracking "${keyword}"?`)) return;

    try {
      await apiRequest(`/api/customer/seo/keywords/${id}`, { method: "DELETE" });
      fetchSEOData();
      if (selectedKeywordId === id) setSelectedKeywordId(null);
    } catch (err) {
      alert("Failed to delete keyword: " + err.message);
    }
  };

  // Open Target Selection Modal
  const openTargetModal = async (e, kw) => {
    e.stopPropagation();
    setTargetingKeyword(kw);
    setShowTargetModal(true);
    setBlogPosts({ status: 'loading', data: [] });

    try {
      const res = await apiSafeFetch(`/api/customer/vault?type=blog`);
      setBlogPosts(res);
    } catch (err) {
      setBlogPosts({ status: 'error', data: [] });
    }
  };

  // Link Target Post
  const handleLinkTarget = async (postId) => {
    if (!targetingKeyword) return;
    setIsLinkingTarget(true);
    try {
      await apiRequest(`/api/customer/seo/keywords/target`, {
        method: "POST",
        body: JSON.stringify({
          keyword_id: targetingKeyword.id,
          blog_post_id: postId,
          remove: false
        })
      });
      setShowTargetModal(false);
      fetchSEOData();
    } catch (err) {
      alert("Failed to link keyword to post: " + err.message);
    } finally {
      setIsLinkingTarget(false);
    }
  };

  // Unlink Target Post
  const handleUnlinkTarget = async (e, keywordId, postId) => {
    e.stopPropagation();
    if (!window.confirm("Remove this target link?")) return;
    try {
      await apiRequest(`/api/customer/seo/keywords/target`, {
        method: "POST",
        body: JSON.stringify({
          keyword_id: keywordId,
          blog_post_id: postId,
          remove: true
        })
      });
      fetchSEOData();
    } catch (err) {
      alert("Failed to remove target link: " + err.message);
    }
  };

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

      {/* 2. SEO Brand Intelligence & Advice Feed (Alerts & Tips) */}
      <div className="card-workspace mb-4 p-4">
        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <Lightbulb size={18} className="text-warning" /> SEO Recommendations & Strategy
        </h6>
        <div className="row g-3">
          {summary.status === 'success' && summary.data?.seoInsights && summary.data.seoInsights.length > 0 ? (
            summary.data.seoInsights.map((insight, idx) => {
              const bgClass = insight.priority === 'high' ? 'bg-danger-light' : insight.priority === 'medium' ? 'bg-warning-light' : 'bg-primary-light';
              const textClass = insight.priority === 'high' ? 'text-danger' : insight.priority === 'medium' ? 'text-warning' : 'text-primary';
              return (
                <div key={idx} className="col-md-6 animate__animated animate__fadeIn">
                  <div className={`p-3 rounded-lg border h-100 ${bgClass}`}>
                    <div className="d-flex align-items-start gap-2">
                      <AlertCircle size={16} className={`${textClass} mt-1`} />
                      <div>
                        <div className={`extra-small fw-bold text-uppercase ${textClass} mb-1`}>{insight.title}</div>
                        <div className="extra-small text-muted">{insight.message}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            defaultAdvice.map((advice, idx) => (
              <div key={idx} className="col-md-6">
                <div className={`p-3 rounded-lg border h-100 ${advice.priority === 'high' ? 'bg-danger-light' : 'bg-warning-light'}`}>
                  <div className="d-flex align-items-start gap-2">
                    <Info size={16} className={`${advice.priority === 'high' ? 'text-danger' : 'text-warning'} mt-1`} />
                    <div>
                      <div className={`extra-small fw-bold text-uppercase ${advice.priority === 'high' ? 'text-danger' : 'text-warning'} mb-1`}>
                        {advice.title}
                      </div>
                      <div className="extra-small text-muted">{advice.message}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. SEO Overview System */}
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
                <Award size={14} /> Trust Certified
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

      {/* 4. Search Console Performance Section */}
      <div className="card-workspace mb-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <TrendingUp size={18} className="text-success" /> Search Console Performance
          </h6>
          {gscOverview.data?.connected && (
            <button 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 extra-small fw-bold px-3 py-2 rounded-pill" 
              onClick={handleSyncGsc}
              disabled={isSyncingGsc}
            >
              <RefreshCw size={12} className={isSyncingGsc ? "animate-spin" : ""} />
              {isSyncingGsc ? "Syncing..." : "Sync performance"}
            </button>
          )}
        </div>

        {gscOverview.status === 'loading' ? <LoadingIndicator message="Fetching Search Console status..." /> :
         gscOverview.status === 'error' ? <ErrorState message="Could not sync Search Console data" /> :
         !gscOverview.data?.connected ? (
           <div className="d-flex flex-column align-items-center text-center p-4">
             <AlertCircle size={28} className="text-warning mb-2" />
             <p className="extra-small text-muted mb-3">Google Search Console is not connected. Connect your property under settings to track real organic CTR, clicks, and impressions.</p>
             <button 
               className="btn btn-sm btn-outline-primary px-4 py-2 rounded-pill extra-small fw-bold"
               onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'integrations' }))}
             >
               Go to Integrations
             </button>
           </div>
         ) : !gscOverview.data?.has_data ? (
           <div className="d-flex flex-column align-items-center text-center p-4">
             <Info size={28} className="text-primary mb-2" />
             <p className="extra-small text-muted mb-3">Your property is connected, but search performance metrics are not synchronized yet.</p>
             <button 
               className="btn btn-sm btn-primary px-4 py-2 rounded-pill extra-small fw-bold text-white"
               onClick={handleSyncGsc}
               disabled={isSyncingGsc}
             >
               Sync Search Console
             </button>
           </div>
         ) : (
           <div>
             {/* GSC Analytics Cards */}
             <div className="row g-3 mb-4">
               <div className="col-md-3">
                 <div className="p-3 border rounded-lg bg-white text-center">
                   <div className="h3 fw-bold text-primary mb-1">{gscOverview.data.summary.clicks}</div>
                   <div className="extra-small text-muted fw-medium uppercase">Clicks</div>
                 </div>
               </div>
               <div className="col-md-3">
                 <div className="p-3 border rounded-lg bg-white text-center">
                   <div className="h3 fw-bold text-success mb-1">{gscOverview.data.summary.impressions}</div>
                   <div className="extra-small text-muted fw-medium uppercase">Impressions</div>
                 </div>
               </div>
               <div className="col-md-3">
                 <div className="p-3 border rounded-lg bg-white text-center">
                   <div className="h3 fw-bold text-info mb-1">{gscOverview.data.summary.ctr}</div>
                   <div className="extra-small text-muted fw-medium uppercase">Average CTR</div>
                 </div>
               </div>
               <div className="col-md-3">
                 <div className="p-3 border rounded-lg bg-white text-center">
                   <div className="h3 fw-bold text-warning mb-1">{gscOverview.data.summary.position}</div>
                   <div className="extra-small text-muted fw-medium uppercase">Avg. Position</div>
                 </div>
               </div>
             </div>

             {/* Chart */}
             <div style={{ width: '100%', height: 220 }}>
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={gscOverview.data.trends || []}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                   <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                   <Tooltip />
                   <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} name="Clicks" />
                   <Line type="monotone" dataKey="impressions" stroke="#10b981" strokeWidth={1.5} name="Impressions" />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>
         )}
      </div>

      {/* 5. Queries Monitoring & Top Performing Pages (Side-by-Side) */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="card-workspace p-0 overflow-hidden h-100">
            <div className="p-4 border-bottom">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Search size={18} className="text-primary" /> Keyword Monitoring (Queries Leading to Site)
              </h6>
            </div>
            {gscOverview.status === 'loading' ? <LoadingIndicator /> :
             !gscOverview.data?.connected || !gscOverview.data?.has_data || !gscOverview.data.top_queries?.length ? (
               <EmptyState message="No query tracking data. Make sure Search Console is fully synced." />
             ) : (
               <div className="table-responsive" style={{ maxHeight: '350px' }}>
                 <table className="table mb-0">
                   <thead className="bg-light sticky-top">
                     <tr>
                       <th className="px-4 py-2">Search Query</th>
                       <th>Clicks</th>
                       <th>Impressions</th>
                       <th>CTR</th>
                       <th className="text-end px-4">Position</th>
                     </tr>
                   </thead>
                   <tbody>
                     {gscOverview.data.top_queries.map((q, i) => (
                       <tr key={i}>
                         <td className="px-4 py-3 small fw-bold">{q.query}</td>
                         <td className="small">{q.clicks}</td>
                         <td className="small">{q.impressions}</td>
                         <td className="small">{Number(q.ctr * 100).toFixed(1)}%</td>
                         <td className="text-end px-4 small font-monospace">{Number(q.position).toFixed(1)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card-workspace p-0 overflow-hidden h-100">
            <div className="p-4 border-bottom">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <TrendingUp size={18} className="text-success" /> Organic Traffic by Pages
              </h6>
            </div>
            {gscOverview.status === 'loading' ? <LoadingIndicator /> :
             !gscOverview.data?.connected || !gscOverview.data?.has_data || !gscOverview.data.top_pages?.length ? (
               <EmptyState message="No organic page traffic recorded yet." />
             ) : (
               <div className="list-group list-group-flush" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                 {gscOverview.data.top_pages.map((p, i) => (
                   <div key={i} className="list-group-item px-4 py-3 border-0 border-bottom">
                     <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                       <span className="extra-small fw-bold text-truncate text-main" style={{ maxWidth: '75%' }}>
                         {p.page}
                       </span>
                       <span className="badge bg-success bg-opacity-10 text-success extra-small fw-bold">
                         {p.clicks} clicks
                       </span>
                     </div>
                     <div className="d-flex gap-3 text-muted extra-small">
                       <span>Imps: <strong>{p.impressions}</strong></span>
                       <span>CTR: <strong>{Number(p.ctr * 100).toFixed(1)}%</strong></span>
                       <span>Rank: <strong>#{Number(p.position).toFixed(1)}</strong></span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>



      {/* 7. Keyword Opportunities System */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card-workspace p-0 overflow-hidden h-100">
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Search size={18} className="text-primary" /> Keyword Opportunities
              </h6>
              <button 
                className="btn btn-sm btn-primary d-flex align-items-center gap-1 extra-small fw-bold px-3 py-2 rounded-pill text-white" 
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={14} /> Add Keyword
              </button>
            </div>
            
            {keywords.status === 'loading' ? <LoadingIndicator /> :
             keywords.status === 'empty' ? <EmptyState message="No tracked keywords yet. Add some keywords to start monitoring." /> :
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
                          {kw.target_titles && kw.target_titles.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {kw.target_titles.map((title, index) => (
                                <span 
                                  key={index}
                                  className="badge bg-primary bg-opacity-10 text-primary extra-small fw-medium d-flex align-items-center gap-1 px-2 py-1 rounded"
                                >
                                  <Link size={10} />
                                  <span className="text-truncate" style={{ maxWidth: '140px' }}>{title}</span>
                                  <X 
                                    size={10} 
                                    className="cursor-pointer text-muted hover-text-danger" 
                                    onClick={(e) => handleUnlinkTarget(e, kw.id, kw.target_ids[index])} 
                                  />
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="extra-small text-muted">{kw.status}</div>
                          )}
                        </td>
                        <td className="small fw-bold">{kw.volume}</td>
                        <td>
                          <span className={`extra-small fw-bold ${kw.difficulty === 'High' ? 'text-danger' : 'text-success'}`}>
                            {kw.difficulty}
                          </span>
                        </td>
                        <td><KeywordIntentBadge intent={kw.intent} /></td>
                        <td className="text-end px-4">
                           <div className="d-flex justify-content-end gap-2" onClick={e => e.stopPropagation()}>
                             <button 
                               className="btn btn-link btn-sm p-0 text-primary" 
                               title="Target a Blog Post" 
                               onClick={(e) => openTargetModal(e, kw)}
                             >
                               <Plus size={16} />
                             </button>
                             <button 
                               className="btn btn-link btn-sm p-0 text-muted hover-text-danger" 
                               title="Delete Keyword"
                               onClick={(e) => handleDeleteKeyword(e, kw.id, kw.term)}
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
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
                    {(selectedKeyword.competitors || []).length > 0 ? (
                      (selectedKeyword.competitors || []).map((comp, i) => (
                        <div key={i} className="p-2 border-bottom d-flex align-items-center justify-content-between gap-2">
                          <div className="text-truncate extra-small fw-medium" style={{ maxWidth: '200px' }}>
                            {i + 1}. {comp.title}
                          </div>
                          <ArrowUpRight size={12} className="text-muted" />
                        </div>
                      ))
                    ) : (
                      <div className="extra-small text-muted italic p-2 border rounded text-center bg-light">No Search Console targets matched yet. Link to a post to start ranking checks.</div>
                    )}
                  </div>
                </div>

                <div className="optimization-fixes">
                  <h6 className="extra-small fw-bold text-uppercase text-muted mb-3">Priority Fixes</h6>
                  <div className="d-flex flex-column gap-2">
                    {(selectedKeyword.recommendations || ['Analyzing content optimization opportunities...']).map((rec, i) => (
                      <div key={i} className="d-flex align-items-start gap-2 bg-warning-light bg-opacity-10 p-2 rounded">
                        <AlertCircle size={14} className="text-warning mt-1 font-shrink-0" />
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

      {/* ── 8. Modals ──────────────────────────────────────────────────────── */}

      {/* Add Keyword Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container p-4 animate__animated animate__fadeInUp animate__faster">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Track New Keyword</h6>
              <button className="btn btn-link p-0 text-muted" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddKeyword}>
              <div className="mb-3">
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Keyword / Phrase</label>
                <input 
                  type="text" 
                  className="form-control form-control-sm premium-input"
                  placeholder="e.g. flight log tracker"
                  value={newKeywordText}
                  onChange={(e) => setNewKeywordText(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Search Intent</label>
                <select 
                  className="form-select form-select-sm premium-input"
                  value={newKeywordIntent}
                  onChange={(e) => setNewKeywordIntent(e.target.value)}
                >
                  <option value="commercial">Commercial (Buyer Research)</option>
                  <option value="transactional">Transactional (Ready to Buy)</option>
                  <option value="informational">Informational (Answers / Guides)</option>
                  <option value="local">Local (Near Me Searches)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Est. Search Volume Priority</label>
                <select 
                  className="form-select form-select-sm premium-input"
                  value={newKeywordPriority}
                  onChange={(e) => setNewKeywordPriority(e.target.value)}
                >
                  <option value="0">Low (up to 1K/mo)</option>
                  <option value="1">Medium (1K - 5K/mo)</option>
                  <option value="2">High (5K - 10K/mo)</option>
                  <option value="3">Very High (50K+/mo)</option>
                </select>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary px-3 rounded-pill extra-small fw-bold" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-primary px-3 rounded-pill extra-small fw-bold text-white" disabled={isSavingKeyword || !newKeywordText.trim()}>
                  {isSavingKeyword ? "Saving..." : "Start tracking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Target Blog Post Selection Modal */}
      {showTargetModal && (
        <div className="modal-overlay">
          <div className="modal-container p-4 animate__animated animate__fadeInUp animate__faster">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Link target post for "{targetingKeyword?.term}"</h6>
              <button className="btn btn-link p-0 text-muted" onClick={() => setShowTargetModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            {blogPosts.status === 'loading' ? <LoadingIndicator message="Loading blog articles..." /> :
             blogPosts.status === 'error' ? <ErrorState message="Could not fetch content list" /> :
             blogPosts.data.length === 0 ? (
               <div className="text-center py-4">
                 <p className="extra-small text-muted mb-3">No blog posts found. Create an article first.</p>
                 <button 
                   className="btn btn-sm btn-primary px-4 py-2 rounded-pill extra-small fw-bold text-white"
                   onClick={() => {
                     setShowTargetModal(false);
                     window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'compose' }));
                   }}
                 >
                   Write Article
                 </button>
               </div>
             ) : (
               <div className="mb-4 overflow-auto" style={{ maxHeight: '240px' }}>
                 <div className="list-group list-group-flush">
                   {blogPosts.data.map(post => {
                     const isAlreadyLinked = (targetingKeyword?.target_ids || []).includes(post.id);
                     return (
                       <button
                         key={post.id}
                         type="button"
                         className={`list-group-item list-group-item-action border-0 px-2 py-3 rounded d-flex justify-content-between align-items-center extra-small fw-bold mb-1 ${isAlreadyLinked ? 'bg-light text-muted opacity-50' : ''}`}
                         onClick={() => !isAlreadyLinked && handleLinkTarget(post.id)}
                         disabled={isLinkingTarget || isAlreadyLinked}
                       >
                         <span className="text-truncate" style={{ maxWidth: '320px' }}>{post.title}</span>
                         {isAlreadyLinked ? <Check size={14} className="text-success" /> : <ChevronRight size={14} />}
                       </button>
                     );
                   })}
                 </div>
               </div>
             )}

            <div className="d-flex justify-content-end">
              <button type="button" className="btn btn-sm btn-outline-secondary px-3 rounded-pill extra-small fw-bold" onClick={() => setShowTargetModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
        .hover-bg-light:hover { background-color: #f8fafc !important; }
        
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-container {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #f1f5f9;
        }
        .premium-input {
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .premium-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        .cursor-pointer { cursor: pointer; }
        .hover-text-danger:hover { color: #ef4444 !important; }
        .font-shrink-0 { flex-shrink: 0; }
        .uppercase { text-transform: uppercase; }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SEOCentre;
