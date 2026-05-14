import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, Save, Globe, CheckCircle, Plus, Image as ImageIcon,
  Copy, Wand2, Eye, Send, Target, Users, MessageSquare, Key,
  Layout, Zap, X, AlertCircle
} from "lucide-react";
import BlogGeneratorModal from "../components/shared/BlogGeneratorModal";
import MediaSourceModal from "../components/shared/MediaSourceModal";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { apiSafeFetch, apiRequest } from "../lib/api/client";

/**
 * Production-Hardened Article Creator
 * Implements strict status modeling for SEO, Campaigns, and Media
 */

// ── Shared UI States ──────────────────────────────────────────────────────

const InlineLoading = ({ message = "Analyzing..." }) => (
  <div className="d-flex align-items-center gap-2 py-2 animate__animated animate__pulse animate__infinite">
    <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ width: '0.8rem', height: '0.8rem' }}></div>
    <span className="extra-small text-muted fw-medium">{message}</span>
  </div>
);

const InlineError = ({ message = "Failed to load", onRetry }) => (
  <div className="d-flex align-items-center justify-content-between py-2 text-danger">
    <div className="d-flex align-items-center gap-2">
      <AlertCircle size={14} />
      <span className="extra-small fw-bold">{message}</span>
    </div>
    {onRetry && (
      <button 
        className="btn btn-link btn-sm p-0 text-danger extra-small fw-bold text-decoration-none" 
        onClick={onRetry}
      >
        Retry
      </button>
    )}
  </div>
);

const ArticleCreator = ({ activeBrandOverride, initialArticle, onSaveSuccess, onPreview }) => {
  const { token } = useAuth();
  const { activeBrand: contextBrand } = useBrand();
  const activeBrand = activeBrandOverride || contextBrand;

  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Editor state
  const [articleId, setArticleId] = useState(initialArticle?.id || null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [localization, setLocalization] = useState({
    region: "Africa",
    country: "Nigeria",
    language: "English",
    market_context: "google.com.ng"
  });

  // Hardened States
  const [seoState, setSeoState] = useState({ status: 'success', data: null });
  const [campaignsState, setCampaignsState] = useState({ status: 'loading', data: [] });
  const [mediaState, setMediaState] = useState({ status: 'success', data: [] });
  
  const [isSeoLocked, setIsSeoLocked] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialArticle?.campaign_id || "");

  // Media state
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (initialArticle) {
      setArticleId(initialArticle.id || null);
      setTitle(initialArticle.title || "");
      setContent(initialArticle.content || initialArticle.body || "");
      setKeyword(initialArticle.keyword || "");
      if (initialArticle.localization) {
        try {
          const loc = typeof initialArticle.localization === "string"
            ? JSON.parse(initialArticle.localization)
            : initialArticle.localization;
          setLocalization(loc);
        } catch (e) { console.error("Failed to parse localization", e); }
      }
    } else {
      setArticleId(null);
      setTitle("");
      setContent("");
      setKeyword("");
    }
  }, [initialArticle]);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsState(prev => ({ ...prev, status: 'loading' }));
    const res = await apiSafeFetch("/api/customer/campaigns");
    setCampaignsState(res);
  }, []);

  useEffect(() => {
    if (token) fetchCampaigns();
  }, [token, fetchCampaigns]);

  const fetchAttachedMedia = useCallback(async () => {
    if (!articleId) {
      setMediaState({ status: 'success', data: [] });
      return;
    }
    setMediaState(prev => ({ ...prev, status: 'loading' }));
    const res = await apiSafeFetch(`/api/customer/media/attached/blog/${articleId}`);
    setMediaState({ status: res.status, data: res.data?.items || [] });
  }, [articleId]);

  useEffect(() => {
    fetchAttachedMedia();
  }, [fetchAttachedMedia]);

  const handleMediaSelect = async (media) => {
    if (!articleId) {
      const ok = window.confirm("Save article draft before attaching media?");
      if (!ok) return;
      await handleSaveDraft();
    }

    try {
      await apiRequest(`/api/customer/media/attach`, {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'blog',
          content_id: articleId || initialArticle?.id,
          media_id: media.id
        })
      });
      fetchAttachedMedia();
    } catch (err) {
      console.error("Failed to attach media", err);
    }
  };

  const handleMediaDetach = async (mediaId) => {
    try {
      await apiRequest(`/api/customer/media/detach`, {
        method: 'POST',
        body: JSON.stringify({
          content_id: articleId,
          media_id: mediaId
        })
      });
      fetchAttachedMedia();
    } catch (err) {
      console.error("Failed to detach media", err);
    }
  };

  const runSEOAnalysis = useCallback(async () => {
    if (!content && !title) return;
    setSeoState(prev => ({ ...prev, status: 'loading' }));
    
    try {
      const res = await apiRequest("/api/customer/seo/analyze", {
        method: "POST",
        body: JSON.stringify({
          title, content, keywords: { primary: keyword }, type: 'blog'
        })
      });
      setSeoState({ status: 'success', data: res });
    } catch (e) {
      if (e.status === 403 || e.code === 'UPGRADE_REQUIRED') {
        setIsSeoLocked(true);
        setSeoState({ status: 'success', data: null });
      } else {
        setSeoState({ status: 'error', data: null });
      }
    }
  }, [title, content, keyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSEOAnalysis();
    }, 1200);
    return () => clearTimeout(timer);
  }, [runSEOAnalysis]);

  const handleWizardGenerate = async (formData) => {
    setGenerating(true);
    try {
      const res = await apiRequest("/api/customer/ai/generate/blog", {
        method: "POST",
        body: JSON.stringify({ ...formData, brand_id: activeBrand?.id })
      });
      return res;
    } catch (err) {
      console.error("AI generation failed", err);
      return {
        title: `${formData.intention} — A Deep Dive`,
        body:  `# Introduction\n\nThis article explores ${formData.audience} in a ${formData.tone} tone.\n\n## Key Insights\n\nStrategic content development for ${formData.intention}.`
      };
    } finally {
      setGenerating(false);
    }
  };

  const applyGeneratedContent = (result) => {
    if (result) {
      setTitle(result.title || "");
      setContent(result.body || "");
      setShowWizard(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeBrand?.id) return alert("Please select a brand first.");
    setLoading(true);
    try {
      const method  = articleId ? "PATCH" : "POST";
      const url     = articleId ? `/api/customer/content/blog/${articleId}` : "/api/customer/content/blog";

      const resp = await apiRequest(url, {
        method,
        body: JSON.stringify({ 
          title, body: content, localization, keyword, 
          campaign_id: selectedCampaignId || null, status: "draft" 
        })
      });

      const newId = resp.draft_id || resp.id;
      if (!articleId && newId) setArticleId(newId);
      alert("Article draft saved!");
      onSaveSuccess?.();
    } catch (e) {
      alert("Failed to save draft: " + (e.message || "Unknown error"));
    }
    setLoading(false);
  };

  const handleSendForApproval = async () => {
    if (!articleId) {
      if (!window.confirm("Save draft before sending for approval?")) return;
      await handleSaveDraft();
    }
    setLoading(true);
    try {
      await apiRequest(`/api/customer/content/${articleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approval" })
      });
      alert("Article sent for approval!");
      onSaveSuccess?.();
    } catch {
      alert("Failed to send for approval.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${title}\n\n${content}`);
    alert("Content copied to clipboard!");
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview({ 
        id: articleId, title, content, body: content, type: "article", 
        localization, status: "draft", image_url: mediaState.data[0]?.preview_url
      });
    }
  };

  const countries = {
    Africa: ["Nigeria","South Africa","Egypt","Kenya","Ethiopia","Ghana","Morocco"],
    Europe: ["United Kingdom","Germany","France","Italy","Spain","Netherlands"],
    Asia: ["Japan","China","India","South Korea","Singapore","Vietnam"],
    "Rest of World":["USA","Canada","Australia","Brazil","Mexico"]
  };

  return (
    <div className="article-creator-container py-4">
      <div className="container-fluid">
        <div className="row g-4">
          {/* ── LEFT: Editor ── */}
          <div className="col-lg-9">
            <div className="editor-workspace bg-white rounded-4 shadow-sm p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-main">Article Creator</h5>
                    <span className="text-muted extra-small">SEO-optimized narrative engine</span>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-primary btn-sm rounded-3 px-3 d-flex align-items-center gap-2"
                    onClick={() => setShowWizard(true)}
                    style={{ background: 'linear-gradient(135deg, var(--pilot-blue), #7c3aed)', border: 'none' }}
                  >
                    <Wand2 size={15} /> Assistant
                  </button>
                  <button className="btn btn-outline-primary btn-sm rounded-3 px-3" onClick={handlePreview}>
                    <Eye size={16} className="me-2" /> Preview
                  </button>
                  <button
                    className="btn btn-primary btn-sm rounded-3 px-3 shadow-sm"
                    onClick={handleSendForApproval}
                    disabled={loading || (!title && !content)}
                  >
                    <Send size={16} className="me-2" /> {loading ? "..." : "Publish"}
                  </button>
                </div>
              </div>

              <input
                type="text"
                className="article-title-field w-100 border-0 mb-3 text-main"
                placeholder="Article Headline..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ fontSize: "2.4rem", fontWeight: 900, outline: "none", letterSpacing: "-0.03em" }}
              />

              <div className="editor-toolbar d-flex gap-4 mb-4 py-3 border-bottom border-top border-light align-items-center">
                <button className="btn btn-link btn-sm text-dark p-0 text-decoration-none fw-bold extra-small" onClick={() => setIsMediaModalOpen(true)}>
                  <ImageIcon size={16} className="me-2 text-primary" /> {mediaState.data.length > 0 ? "Change Image" : "Add Image"}
                </button>
                <button className="btn btn-link btn-sm text-dark p-0 text-decoration-none fw-bold extra-small" onClick={handleCopy}>
                  <Copy size={16} className="me-2 text-primary" /> Copy
                </button>
                <div className="ms-auto extra-small text-muted fw-bold">
                  {content.split(/\s+/).filter(Boolean).length} words
                </div>
              </div>

              {mediaState.status === 'loading' ? <div className="placeholder-glow mb-4"><div className="placeholder rounded-4 w-100" style={{ height: '200px' }}></div></div> :
               mediaState.data.length > 0 && (
                <div className="featured-image-preview mb-4 position-relative">
                   <img src={mediaState.data[0].preview_url} className="img-fluid rounded-4 border shadow-sm w-100" style={{ maxHeight: '300px', objectFit: 'cover' }} alt="Featured" />
                   <button className="btn btn-danger btn-sm position-absolute top-0 end-0 m-3 rounded-circle p-2 shadow" onClick={() => handleMediaDetach(mediaState.data[0].id)}><X size={16} /></button>
                </div>
              )}

              <textarea
                className="article-body-editor w-100 border-0 text-main"
                placeholder="Begin your narrative here..."
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ minHeight: "500px", fontSize: "1.1rem", lineHeight: "1.8", outline: "none", resize: "none" }}
              />
            </div>
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="col-lg-3">
            <div className="sidebar-module bg-white rounded-4 shadow-sm p-4 mb-4 border-subtle">
              <h6 className="fw-bold mb-3 d-flex align-items-center text-main">
                <CheckCircle size={18} className="text-primary me-2" /> Intelligence
              </h6>
              
              {isSeoLocked ? (
                <div className="premium-sidebar-prompt p-3 rounded-3 bg-primary-light text-center">
                  <Zap size={24} className="text-primary mb-2 mx-auto" />
                  <div className="fw-bold extra-small mb-1">SEO Suite Locked</div>
                  <p className="extra-small text-muted mb-3 opacity-75">Upgrade to Professional for live scoring and analysis.</p>
                  <button onClick={() => window.location.hash = '#billing'} className="btn btn-primary btn-sm w-100 fw-bold extra-small">View Plans</button>
                </div>
              ) : (
                <div className="seo-engine-container">
                  {seoState.status === 'loading' ? <InlineLoading /> :
                   seoState.status === 'error' ? <InlineError onRetry={runSEOAnalysis} /> :
                   seoState.data ? (
                    <>
                      <div className="score-meter mb-4">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="extra-small text-muted fw-bold">SEO SCORE</span>
                          <span className="extra-small fw-bold text-primary">{seoState.data.score || 0}%</span>
                        </div>
                        <div className="progress rounded-pill bg-light" style={{ height: "6px" }}>
                          <div className="progress-bar bg-primary" style={{ width: `${seoState.data.score || 0}%` }}></div>
                        </div>
                      </div>

                      <div className="score-meter mb-4">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="extra-small text-muted fw-bold">READABILITY</span>
                          <span className="extra-small fw-bold text-success">{seoState.data.readability_score || 0}%</span>
                        </div>
                        <div className="progress rounded-pill bg-light" style={{ height: "6px" }}>
                          <div className="progress-bar bg-success" style={{ width: `${seoState.data.readability_score || 0}%` }}></div>
                        </div>
                      </div>

                      {(seoState.data.suggestions || []).length > 0 && (
                        <div className="seo-suggestions-list mt-3">
                           {seoState.data.suggestions.slice(0, 3).map((s, i) => (
                             <div key={i} className="suggestion-pill d-flex align-items-center gap-2 mb-2 p-2 rounded-3 bg-light border-subtle" style={{ fontSize: '0.65rem' }}>
                                <Zap size={10} className="text-warning" />
                                <span className="text-muted fw-medium">{s}</span>
                             </div>
                           ))}
                        </div>
                      )}
                    </>
                  ) : <div className="text-muted extra-small opacity-50 py-2">Start writing to see SEO scores...</div>}
                </div>
              )}
            </div>

            <div className="sidebar-module bg-white rounded-4 shadow-sm p-4 mb-4 border-subtle">
              <h6 className="fw-bold mb-4 d-flex align-items-center text-main">
                <Globe size={18} className="text-primary me-2" /> Localization
              </h6>
              <div className="mb-3">
                <label className="form-label extra-small text-muted fw-bold text-uppercase">Region</label>
                <select className="form-select border-0 bg-surface-secondary rounded-3 extra-small fw-bold" value={localization.region} onChange={e => setLocalization({ ...localization, region: e.target.value })}>
                  {Object.keys(countries).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="mb-0">
                <label className="form-label extra-small text-muted fw-bold text-uppercase">Market Context</label>
                <input type="text" className="form-control border-0 bg-surface-secondary rounded-3 extra-small" value={localization.market_context} onChange={e => setLocalization({ ...localization, market_context: e.target.value })} placeholder="e.g. google.com.ng" />
              </div>
            </div>

            <div className="sidebar-module bg-white rounded-4 shadow-sm p-4 mb-4 border-left-pilot border-subtle">
              <h6 className="fw-bold mb-3 d-flex align-items-center text-main">
                <Target size={18} className="text-primary me-2" /> Campaign
              </h6>
              {campaignsState.status === 'loading' ? <InlineLoading message="Loading..." /> :
               campaignsState.status === 'error' ? <InlineError onRetry={fetchCampaigns} /> : (
                <select className="form-select border-0 bg-surface-secondary rounded-3 extra-small fw-bold" value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)}>
                  <option value="">No Campaign</option>
                  {(campaignsState.data || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div className="extra-small text-muted mt-2 opacity-75 fw-medium" style={{ fontSize: '0.6rem' }}>Strategic roadmap association.</div>
            </div>

            <div className="sidebar-module bg-white rounded-4 shadow-sm p-4 border-subtle">
              <h6 className="fw-bold mb-3 d-flex align-items-center text-main">
                <Plus size={18} className="text-primary me-2" /> Keywords
              </h6>
              <input type="text" className="form-control border-0 bg-surface-secondary rounded-3 extra-small fw-bold mb-2" placeholder="Primary Keyword..." value={keyword} onChange={e => setKeyword(e.target.value)} />
              <p className="text-muted extra-small mb-0 opacity-75">Used for semantic analysis.</p>
            </div>
          </div>
        </div>
      </div>

      <BlogGeneratorModal isOpen={showWizard} onClose={() => setShowWizard(false)} onGenerate={handleWizardGenerate} onConfirm={applyGeneratedContent} isGenerating={generating} activeBrand={activeBrand} />
      <MediaSourceModal isOpen={isMediaModalOpen} onClose={() => setIsMediaModalOpen(false)} onSelect={handleMediaSelect} activeBrand={activeBrand} socialContent={title} />
      
      <style>{`
        .border-subtle { border-color: var(--border-subtle) !important; }
        .bg-surface-secondary { background-color: var(--surface-secondary) !important; }
        .border-left-pilot { border-left: 4px solid var(--pilot-blue) !important; }
      `}</style>
    </div>
  );
};

export default ArticleCreator;
