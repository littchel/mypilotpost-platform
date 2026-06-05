import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Save, Eye, Send, Target, Key, Image as ImageIcon,
  X, AlertCircle, Clock, CheckCircle, Wand2, Copy, Zap
} from "lucide-react";
import BlogGeneratorModal from "../components/shared/BlogGeneratorModal";
import MediaSourceModal from "../components/shared/MediaSourceModal";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { apiSafeFetch, apiRequest } from "../lib/api/client";
import { fetchMediaSuggestions } from "../services/mediaSuggestions";

// ── Local utilities ───────────────────────────────────────────────────────────

function countWords(text) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function computeReadability(body) {
  if (!body.trim()) return { label: "—", level: "none" };
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = body.trim().split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return { label: "—", level: "none" };
  const avgWords = words.length / sentences.length;
  const syllables = words.reduce((a, w) => a + (w.match(/[aeiouy]+/gi) || []).length, 0);
  const fk = 206.835 - 1.015 * avgWords - 84.6 * (syllables / words.length);
  if (fk >= 70) return { label: "Easy", level: "easy" };
  if (fk >= 50) return { label: "Moderate", level: "moderate" };
  return { label: "Complex", level: "hard" };
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 80);
}

function renderPreview(text) {
  return text.split(/\n\n+/).map((block, i) => {
    if (/^### /.test(block)) return <h4 key={i} style={{ fontWeight: 700, marginBottom: 8 }}>{block.replace(/^### /, "")}</h4>;
    if (/^## /.test(block)) return <h3 key={i} style={{ fontWeight: 700, marginBottom: 10 }}>{block.replace(/^## /, "")}</h3>;
    if (/^# /.test(block))  return <h2 key={i} style={{ fontWeight: 800, marginBottom: 12 }}>{block.replace(/^# /, "")}</h2>;
    if (/^- /.test(block)) {
      const items = block.split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, ""));
      return <ul key={i} style={{ paddingLeft: 20, marginBottom: 12 }}>{items.map((it, j) => <li key={j} style={{ marginBottom: 4 }}>{it}</li>)}</ul>;
    }
    return <p key={i} style={{ lineHeight: 1.8, marginBottom: 12 }}>{block}</p>;
  });
}

function dotColor(level) {
  if (level === "easy" || level === "good") return "#10b981";
  if (level === "moderate" || level === "ok") return "#f59e0b";
  return "#ef4444";
}

function articleStatusMeta(status) {
  const map = {
    draft:              { label: "Draft",     color: "#64748b", bg: "#f1f5f9" },
    approval_requested: { label: "In Review", color: "#d97706", bg: "#fffbeb" },
    approved:           { label: "Approved",  color: "#059669", bg: "#ecfdf5" },
    published:          { label: "Published", color: "#059669", bg: "#ecfdf5" },
  };
  return map[status] || map.draft;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  const isErr = type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: isErr ? "#fef2f2" : "#f0fdf4",
      border: `1px solid ${isErr ? "#fecaca" : "#bbf7d0"}`,
      color: isErr ? "#dc2626" : "#065f46",
      padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      display: "flex", alignItems: "center", gap: 9,
    }}>
      <i className={`fas fa-${isErr ? "exclamation-circle" : "check-circle"}`} style={{ fontSize: 14 }} />
      {msg}
    </div>
  );
}

const InlineLoading = ({ msg = "Loading…" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", color: "#94a3b8", fontSize: 12 }}>
    <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 2 }} />
    {msg}
  </div>
);

const InlineError = ({ msg = "Failed to load", onRetry }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", fontSize: 12, color: "#dc2626" }}>
    <span><AlertCircle size={12} style={{ marginRight: 5 }} />{msg}</span>
    {onRetry && <button onClick={onRetry} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", color: "#475569" }}>Retry</button>}
  </div>
);

// ── Simple Pexels card for Media tab ─────────────────────────────────────────
function AgencyPickCard({ item, onUse, using }) {
  const isUsing = using === (item.external_id || item.id);
  return (
    <div style={{ minWidth: 110, width: 110, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", flexShrink: 0, background: "#fff" }}>
      <div style={{ width: "100%", height: 76, background: "#f8fafc", overflow: "hidden", position: "relative" }}>
        {item.thumbnail_url && <img src={item.thumbnail_url} alt={item.attribution_text} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "1px 4px" }}>
          <span style={{ fontSize: 7, color: "#fff", fontWeight: 700 }}>Pexels</span>
        </div>
      </div>
      {item.reasons?.[0] && (
        <div title={item.reasons.join(" · ")} style={{ padding: "1px 5px 0", fontSize: 7, color: "#0ea5e9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.reasons[0]}
        </div>
      )}
      <div style={{ padding: "3px 5px 5px" }}>
        <button
          onClick={() => onUse(item)}
          disabled={isUsing}
          style={{ width: "100%", background: "#0ea5e9", border: "none", borderRadius: 4, color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 0", cursor: isUsing ? "wait" : "pointer", opacity: isUsing ? 0.6 : 1 }}
        >
          {isUsing ? "…" : "Use as Featured"}
        </button>
      </div>
    </div>
  );
}

// ── ARTICLE_TABS definition ───────────────────────────────────────────────────
const ARTICLE_TABS = [
  { id: "write",     label: "Write",     Icon: FileText },
  { id: "preview",   label: "Preview",   Icon: Eye },
  { id: "seo",       label: "SEO",       Icon: Key },
  { id: "media",     label: "Media",     Icon: ImageIcon },
  { id: "versions",  label: "Versions",  Icon: Clock },
  { id: "approvals", label: "Approvals", Icon: CheckCircle },
];

const AUTOSAVE_LIMIT = 10; // keep last 10 versions

// ── Main component ────────────────────────────────────────────────────────────
const ArticleCreator = ({ activeBrandOverride, initialArticle, onSaveSuccess }) => {
  const { token } = useAuth();
  const { activeBrand: contextBrand } = useBrand();
  const activeBrand = activeBrandOverride || contextBrand;

  // ── Core content state ───────────────────────────────────────────────────
  const [articleId, setArticleId]           = useState(initialArticle?.id || null);
  const [title, setTitle]                   = useState(initialArticle?.title || "");
  const [slug, setSlug]                     = useState("");
  const [slugLocked, setSlugLocked]         = useState(!!initialArticle?.id);
  const [author, setAuthor]                 = useState(activeBrand?.name || "");
  const [content, setContent]               = useState(initialArticle?.content || initialArticle?.body || "");
  const [keyword, setKeyword]               = useState(initialArticle?.keyword || "");
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialArticle?.campaign_id || "");
  const [articleStatus, setArticleStatus]   = useState(initialArticle?.lifecycle_status || "draft");
  const [seoMeta, setSeoMeta]               = useState({
    metaTitle:          initialArticle?.seo_title || "",
    metaDescription:    initialArticle?.seo_description || "",
    ogImage:            initialArticle?.og_image || "",
    secondaryKeywords:  "",
  });
  const [localization, setLocalization]     = useState({ region: "Africa", country: "Nigeria", language: "English", market_context: "google.com.ng" });

  // ── UI state ─────────────────────────────────────────────────────────────
  const [articleTab, setArticleTab]         = useState("write");
  const [loading, setLoading]               = useState(false);
  const [generating, setGenerating]         = useState(false);
  const [showWizard, setShowWizard]         = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [toast, setToast]                   = useState(null);
  const [autosaveLabel, setAutosaveLabel]   = useState(null);
  const [agencyUsing, setAgencyUsing]       = useState(null);

  // ── Data state ───────────────────────────────────────────────────────────
  const [campaignsState, setCampaignsState] = useState({ status: "loading", data: [] });
  const [mediaState, setMediaState]         = useState({ status: "success", data: [] });
  const [seoState, setSeoState]             = useState({ status: "idle", data: null });
  const [isSeoLocked, setIsSeoLocked]       = useState(false);
  const [approvalState, setApprovalState]   = useState({ status: "idle", data: null });
  const [agencyState, setAgencyState]       = useState({ status: "idle", featured: [], recommended: [] });
  const [versions, setVersions]             = useState([]);

  // ── Autosave key ─────────────────────────────────────────────────────────
  const autosaveKey = `mpp_article_autosave_${activeBrand?.id || "default"}`;

  // ── Refs ─────────────────────────────────────────────────────────────────
  const contentRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Initialise from props ─────────────────────────────────────────────────
  useEffect(() => {
    if (initialArticle) {
      setArticleId(initialArticle.id || null);
      setTitle(initialArticle.title || "");
      setContent(initialArticle.content || initialArticle.body || "");
      setKeyword(initialArticle.keyword || "");
      setArticleStatus(initialArticle.lifecycle_status || "draft");
      setSlugLocked(!!initialArticle.id);
      if (initialArticle.localization) {
        try {
          const loc = typeof initialArticle.localization === "string" ? JSON.parse(initialArticle.localization) : initialArticle.localization;
          setLocalization(loc);
        } catch {}
      }
    }
  }, [initialArticle]);

  // ── Studio idea prefill ───────────────────────────────────────────────────
  useEffect(() => {
    if (initialArticle) return;
    const raw = sessionStorage.getItem("studio_idea_prefill");
    if (!raw) return;
    sessionStorage.removeItem("studio_idea_prefill");
    try {
      const prefill = JSON.parse(raw);
      if (prefill.contentType && prefill.contentType !== "blog") return;
      if (prefill.title) setTitle(prefill.title);
      if (prefill.caption || prefill.hook) setContent([prefill.hook, prefill.caption].filter(Boolean).join("\n\n"));
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-slug from title ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slugLocked) setSlug(slugify(title));
  }, [title, slugLocked]);

  // ── Load versions from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      setVersions(JSON.parse(localStorage.getItem(autosaveKey) || "[]"));
    } catch {}
  }, [autosaveKey]);

  // ── Autosave every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    if (!title && !content) return;
    const timer = setInterval(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(autosaveKey) || "[]");
        const entry = { id: Date.now(), savedAt: new Date().toISOString(), title, content };
        const updated = [entry, ...saved].slice(0, AUTOSAVE_LIMIT);
        localStorage.setItem(autosaveKey, JSON.stringify(updated));
        setVersions(updated);
        const t = new Date();
        setAutosaveLabel(`Saved ${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`);
      } catch {}
    }, 30000);
    return () => clearInterval(timer);
  }, [title, content, autosaveKey]);

  // ── Fetch campaigns ───────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setCampaignsState(prev => ({ ...prev, status: "loading" }));
    const res = await apiSafeFetch("/api/customer/campaigns");
    setCampaignsState(res);
  }, []);

  useEffect(() => { if (token) fetchCampaigns(); }, [token, fetchCampaigns]);

  // ── Fetch attached media ──────────────────────────────────────────────────
  const fetchMedia = useCallback(async () => {
    if (!articleId) { setMediaState({ status: "success", data: [] }); return; }
    setMediaState(prev => ({ ...prev, status: "loading" }));
    const res = await apiSafeFetch(`/api/customer/media/attached/blog/${articleId}`);
    setMediaState({ status: res.status, data: res.data?.items || [] });
  }, [articleId]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  // ── SEO analysis (debounced) ──────────────────────────────────────────────
  const runSEO = useCallback(async () => {
    if (!content && !title) return;
    setSeoState(prev => ({ ...prev, status: "loading" }));
    try {
      const res = await apiRequest("/api/customer/seo/analyze", {
        method: "POST",
        body: JSON.stringify({ title, content, keywords: { primary: keyword }, type: "blog" }),
      });
      setSeoState({ status: "success", data: res });
    } catch (e) {
      if (e.status === 403 || e.code === "UPGRADE_REQUIRED") {
        setIsSeoLocked(true);
        setSeoState({ status: "success", data: null });
      } else {
        setSeoState({ status: "error", data: null });
      }
    }
  }, [title, content, keyword]);

  useEffect(() => {
    const t = setTimeout(runSEO, 1200);
    return () => clearTimeout(t);
  }, [runSEO]);

  // ── Load approval status (when tab opened) ────────────────────────────────
  const loadApprovalStatus = useCallback(async () => {
    if (!articleId) { setApprovalState({ status: "none", data: null }); return; }
    setApprovalState({ status: "loading", data: null });
    try {
      const res = await apiRequest(`/api/customer/vault/approvals?content_id=${articleId}`);
      setApprovalState({ status: "loaded", data: res?.data?.[0] || null });
    } catch {
      setApprovalState({ status: "loaded", data: null });
    }
  }, [articleId]);

  // ── Load agency picks (when Media tab opened) ─────────────────────────────
  const loadAgencyPicks = useCallback(async () => {
    if (agencyState.status === "loaded" || agencyState.status === "loading") return;
    setAgencyState({ status: "loading", featured: [], recommended: [] });
    try {
      const result = await fetchMediaSuggestions({
        platform: "blog",
        contentType: "article",
        text: content.slice(0, 300),
        title,
        brand: activeBrand?.name || "",
        industry: activeBrand?.industry || "",
      });
      setAgencyState({ status: "loaded", featured: result.featured || [], recommended: result.recommended || [] });
    } catch {
      setAgencyState({ status: "error", featured: [], recommended: [] });
    }
  }, [agencyState.status, content, title, activeBrand]);

  const handleTabSwitch = (tabId) => {
    setArticleTab(tabId);
    if (tabId === "approvals") loadApprovalStatus();
    if (tabId === "media")     loadAgencyPicks();
  };

  // ── Media actions ─────────────────────────────────────────────────────────
  const handleMediaSelect = async (media) => {
    if (!articleId) {
      if (!window.confirm("Save article draft before attaching media?")) return;
      await handleSaveDraft();
    }
    try {
      await apiRequest("/api/customer/media/attach", {
        method: "POST",
        body: JSON.stringify({ content_type: "blog", content_id: articleId, media_id: media.id }),
      });
      fetchMedia();
    } catch { showToast("Failed to attach media", "error"); }
  };

  const handleMediaDetach = async (mediaId) => {
    try {
      await apiRequest("/api/customer/media/detach", {
        method: "POST",
        body: JSON.stringify({ content_id: articleId, media_id: mediaId }),
      });
      fetchMedia();
    } catch { showToast("Failed to remove media", "error"); }
  };

  const handleAgencyUse = async (item) => {
    setAgencyUsing(item.external_id || item.id);
    try {
      const saved = await apiRequest("/api/customer/media/from-pexels", {
        method: "POST",
        body: JSON.stringify({ external_id: item.external_id || item.id, preview_url: item.preview_url || item.url, type: "image" }),
      });
      if (saved?.media_id) await handleMediaSelect({ id: saved.media_id });
      showToast("Featured image set");
    } catch { showToast("Could not use this image", "error"); }
    finally { setAgencyUsing(null); }
  };

  // ── Save draft ────────────────────────────────────────────────────────────
  const buildPayload = (status = "draft") => ({
    ...(articleId ? { content_id: articleId } : {}),
    content_type: "blog",
    title,
    body: content,
    metadata: JSON.stringify({
      localization,
      keyword,
      slug,
      author,
      seoMeta,
    }),
    campaign_id: selectedCampaignId || null,
    lifecycle_status: status,
  });

  const handleSaveDraft = async () => {
    if (!activeBrand?.id) return showToast("Select a brand first", "error");
    setLoading(true);
    try {
      const resp = await apiRequest("/api/customer/vault", { method: "POST", body: JSON.stringify(buildPayload("draft")) });
      const newId = resp.content_id;
      if (!articleId && newId) { setArticleId(newId); setSlugLocked(true); }
      setArticleStatus("draft");
      showToast("Draft saved");
      onSaveSuccess?.();
    } catch (e) { showToast(e.message || "Failed to save draft", "error"); }
    setLoading(false);
  };

  // ── Send for approval ─────────────────────────────────────────────────────
  const handleSendForApproval = async () => {
    if (!activeBrand?.id) return showToast("Select a brand first", "error");
    let id = articleId;
    if (!id) {
      setLoading(true);
      try {
        const resp = await apiRequest("/api/customer/vault", { method: "POST", body: JSON.stringify(buildPayload("draft")) });
        id = resp.content_id;
        if (id) { setArticleId(id); setSlugLocked(true); }
      } catch (e) { showToast(e.message || "Failed to save draft", "error"); setLoading(false); return; }
      setLoading(false);
    }
    setLoading(true);
    try {
      await apiRequest(`/api/customer/vault/${id}/approval`, { method: "POST", body: JSON.stringify({ action: "submit" }) });
      setArticleStatus("approval_requested");
      showToast("Sent for approval");
      onSaveSuccess?.();
    } catch { showToast("Failed to send for approval", "error"); }
    setLoading(false);
  };

  // ── AI wizard ─────────────────────────────────────────────────────────────
  const handleWizardGenerate = async (formData) => {
    setGenerating(true);
    try {
      const res = await apiRequest("/api/customer/ai/generate/blog", {
        method: "POST",
        body: JSON.stringify({ ...formData, brand_id: activeBrand?.id }),
      });
      return res;
    } catch {
      return {
        title: `${formData.intention} — A Deep Dive`,
        body: `# Introduction\n\nThis article explores ${formData.audience}.\n\n## Key Insights\n\nStrategic content for ${formData.intention}.`,
      };
    } finally { setGenerating(false); }
  };

  const applyGeneratedContent = (result) => {
    if (result) { setTitle(result.title || ""); setContent(result.body || ""); setShowWizard(false); }
  };

  // ── Restore from version ──────────────────────────────────────────────────
  const handleRestore = (v) => {
    if (!window.confirm(`Restore version saved at ${new Date(v.savedAt).toLocaleString("en-GB")}?`)) return;
    setTitle(v.title); setContent(v.content);
    showToast("Version restored");
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const wordCount    = countWords(content);
  const readability  = computeReadability(content);
  const statusMeta   = articleStatusMeta(articleStatus);
  const campaigns    = campaignsState.data || [];
  const featuredImg  = mediaState.data[0] || null;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>

      {/* ── HEADER ROW ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>

        {/* Campaign */}
        <div style={{ minWidth: 160 }}>
          {campaignsState.status === "loading" ? (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Loading campaigns…</div>
          ) : (
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              className="form-select form-select-sm border-subtle"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              <option value="">No Campaign</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Status badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
          color: statusMeta.color, background: statusMeta.bg,
          border: `1px solid ${statusMeta.color}44`,
          padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap",
        }}>
          {statusMeta.label}
        </span>

        {/* Autosave indicator */}
        {autosaveLabel && (
          <span style={{ fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} /> {autosaveLabel}
          </span>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button
            onClick={() => setShowWizard(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer" }}
          >
            <Wand2 size={13} /> Assistant
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={loading || (!title && !content)}
            style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 7, fontSize: 12, fontWeight: 600, padding: "7px 14px", cursor: "pointer" }}
          >
            <Save size={13} /> Save Draft
          </button>
          <button
            onClick={handleSendForApproval}
            disabled={loading || (!title && !content)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "#0f172a", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "7px 14px", cursor: "pointer" }}
          >
            <Send size={13} /> {loading ? "…" : "Send for Approval"}
          </button>
        </div>
      </div>

      {/* ── TITLE ─────────────────────────────────────────────────────────── */}
      <input
        type="text"
        placeholder="Article Headline…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{
          width: "100%", fontSize: "2rem", fontWeight: 900, border: "none", outline: "none",
          color: "#0f172a", background: "transparent", marginBottom: 8,
          letterSpacing: "-0.02em", lineHeight: 1.2,
        }}
      />

      {/* ── SLUG + AUTHOR ROW ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", whiteSpace: "nowrap" }}>Slug</span>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugLocked(true); }}
            placeholder="article-slug"
            style={{ flex: 1, fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", color: "#475569", fontFamily: "monospace", background: "#f8fafc" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", whiteSpace: "nowrap" }}>Author</span>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Author name"
            style={{ width: 160, fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", color: "#475569", background: "#f8fafc" }}
          />
        </div>
      </div>

      {/* ── SECTION TABS ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 16, flexShrink: 0 }}>
        {ARTICLE_TABS.map(({ id, label, Icon }) => {
          const active = articleTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabSwitch(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", fontSize: 12, fontWeight: active ? 700 : 600,
                border: "none", background: "none", cursor: "pointer",
                color: active ? "#2563eb" : "#64748b",
                borderBottom: `2px solid ${active ? "#2563eb" : "transparent"}`,
                marginBottom: -2, transition: "all 0.15s",
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* WRITE TAB */}
        {articleTab === "write" && (
          <div style={{ display: "flex", gap: 14, height: "100%" }}>
            {/* Editor */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {featuredImg && (
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <img src={featuredImg.preview_url} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }} />
                  <button onClick={() => handleMediaDetach(featuredImg.id)} style={{ position: "absolute", top: 8, right: 8, background: "#dc2626", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={14} color="#fff" />
                  </button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <button onClick={() => setIsMediaModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#475569" }}>
                  <ImageIcon size={12} /> {featuredImg ? "Change Image" : "Add Image"}
                </button>
                <button onClick={() => navigator.clipboard.writeText(`${title}\n\n${content}`)} style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>
                  <Copy size={12} style={{ marginRight: 4 }} /> Copy
                </button>
              </div>
              <textarea
                ref={contentRef}
                placeholder="Begin your narrative here…"
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", fontSize: 15, lineHeight: 1.8, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Health sidebar */}
            <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>Article Health</div>

                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: wordCount >= 300 ? "#10b981" : wordCount >= 100 ? "#f59e0b" : "#ef4444", flexShrink: 0 }} />
                  Words: <strong>{wordCount.toLocaleString()}</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(readability.level), flexShrink: 0 }} />
                  Readability: <strong>{readability.label}</strong>
                </div>

                {seoState.data && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: seoState.data.score >= 75 ? "#10b981" : seoState.data.score >= 50 ? "#f59e0b" : "#ef4444", flexShrink: 0 }} />
                      SEO: <strong>{seoState.data.score || 0}%</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: (seoState.data.readability_score || 0) >= 70 ? "#10b981" : "#f59e0b", flexShrink: 0 }} />
                      Readability API: <strong>{seoState.data.readability_score || 0}%</strong>
                    </div>
                  </>
                )}
                {seoState.status === "loading" && <InlineLoading msg="Scoring…" />}

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Primary Keyword</div>
                  <input
                    type="text"
                    placeholder="Enter keyword…"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    style={{ width: "100%", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 7px", color: "#475569" }}
                  />
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Localization</div>
                  <select
                    className="form-select form-select-sm border-subtle"
                    style={{ fontSize: 11, marginBottom: 5 }}
                    value={localization.region}
                    onChange={e => setLocalization(l => ({ ...l, region: e.target.value }))}
                  >
                    {["Africa", "Europe", "Asia", "Americas"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Market context (e.g. google.com.ng)"
                    value={localization.market_context}
                    onChange={e => setLocalization(l => ({ ...l, market_context: e.target.value }))}
                    style={{ width: "100%", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 7px", color: "#475569" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {articleTab === "preview" && (
          <div style={{ height: "100%", overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "32px 48px", maxWidth: 800 }}>
            {featuredImg && (
              <img src={featuredImg.preview_url} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 8, marginBottom: 28 }} />
            )}
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>{title || "Article Headline…"}</h1>
            {author && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>By {author}</div>}
            <div style={{ fontSize: 16, color: "#334155" }}>
              {content ? renderPreview(content) : <p style={{ color: "#94a3b8", fontStyle: "italic" }}>Start writing to see your preview…</p>}
            </div>
          </div>
        )}

        {/* SEO TAB */}
        {articleTab === "seo" && (
          <div style={{ display: "flex", gap: 16, height: "100%", overflowY: "auto" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Scores */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>Live Scores</div>
                {isSeoLocked ? (
                  <div style={{ background: "#f0f9ff", borderRadius: 8, padding: 12, textAlign: "center" }}>
                    <Zap size={18} color="#0ea5e9" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>SEO Suite Locked</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Upgrade to Professional for live scoring.</div>
                  </div>
                ) : seoState.status === "loading" ? (
                  <InlineLoading msg="Analyzing…" />
                ) : seoState.status === "error" ? (
                  <InlineError msg="Analysis failed" onRetry={runSEO} />
                ) : seoState.data ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "SEO Score", value: `${seoState.data.score || 0}%`, ok: (seoState.data.score || 0) >= 75 },
                      { label: "Readability", value: `${seoState.data.readability_score || 0}%`, ok: (seoState.data.readability_score || 0) >= 70 },
                      { label: "Word Count", value: wordCount.toLocaleString(), ok: wordCount >= 600 },
                      { label: "Read Level", value: readability.label, ok: readability.level === "easy" || readability.level === "moderate" },
                    ].map(m => (
                      <div key={m.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: m.ok ? "#059669" : "#ef4444" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Start writing to see scores…</div>
                )}
              </div>

              {/* SEO Fields */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>SEO Metadata</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Primary Keyword</label>
                  <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Primary keyword" className="form-control form-control-sm border-subtle" style={{ fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Secondary Keywords</label>
                  <input type="text" value={seoMeta.secondaryKeywords} onChange={e => setSeoMeta(m => ({ ...m, secondaryKeywords: e.target.value }))} placeholder="keyword1, keyword2, keyword3" className="form-control form-control-sm border-subtle" style={{ fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Meta Title</label>
                  <input type="text" value={seoMeta.metaTitle || title} onChange={e => setSeoMeta(m => ({ ...m, metaTitle: e.target.value }))} placeholder="SEO title (auto-fills from headline)" className="form-control form-control-sm border-subtle" style={{ fontSize: 12 }} />
                  <div style={{ fontSize: 10, color: (seoMeta.metaTitle || title).length > 60 ? "#ef4444" : "#94a3b8", marginTop: 3 }}>
                    {(seoMeta.metaTitle || title).length}/60 chars
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Meta Description</label>
                  <textarea value={seoMeta.metaDescription} onChange={e => setSeoMeta(m => ({ ...m, metaDescription: e.target.value }))} placeholder="Describe this article in 1-2 sentences…" rows={3} className="form-control border-subtle" style={{ fontSize: 12, resize: "none" }} />
                  <div style={{ fontSize: 10, color: seoMeta.metaDescription.length > 160 ? "#ef4444" : "#94a3b8", marginTop: 3 }}>
                    {seoMeta.metaDescription.length}/160 chars
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>OG Image URL</label>
                  <input type="url" value={seoMeta.ogImage} onChange={e => setSeoMeta(m => ({ ...m, ogImage: e.target.value }))} placeholder="https://…" className="form-control form-control-sm border-subtle" style={{ fontSize: 12 }} />
                  {seoMeta.ogImage && <img src={seoMeta.ogImage} alt="" style={{ marginTop: 6, width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6 }} onError={e => e.target.style.display = "none"} />}
                </div>

                {seoState.data?.suggestions?.length > 0 && (
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Suggestions</div>
                    {seoState.data.suggestions.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6, fontSize: 11, color: "#475569" }}>
                        <Zap size={10} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {articleTab === "media" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflowY: "auto" }}>
            {/* Featured image */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Featured Image</div>
                <button onClick={() => setIsMediaModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #0ea5e9", background: "#f0f9ff", color: "#0ea5e9", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  <ImageIcon size={12} /> {featuredImg ? "Change" : "Add Image"}
                </button>
              </div>
              {mediaState.status === "loading" ? (
                <InlineLoading msg="Loading attached media…" />
              ) : featuredImg ? (
                <div style={{ position: "relative" }}>
                  <img src={featuredImg.preview_url} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <button onClick={() => handleMediaDetach(featuredImg.id)} style={{ position: "absolute", top: 8, right: 8, background: "#dc2626", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={14} color="#fff" />
                  </button>
                </div>
              ) : (
                <div style={{ border: "1px dashed #e2e8f0", borderRadius: 8, padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <ImageIcon size={28} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12 }}>No featured image yet</div>
                </div>
              )}
            </div>

            {/* Agency Picks */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>✨ Agency Picks</div>
                {agencyState.status !== "idle" && agencyState.status !== "loading" && (
                  <button onClick={() => { setAgencyState({ status: "idle", featured: [], recommended: [] }); loadAgencyPicks(); }} style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>Refresh</button>
                )}
              </div>
              {agencyState.status === "idle" || agencyState.status === "loading" ? (
                <InlineLoading msg="Finding images…" />
              ) : agencyState.status === "error" ? (
                <InlineError msg="Could not load suggestions" onRetry={loadAgencyPicks} />
              ) : (agencyState.featured.length + agencyState.recommended.length) === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>No suggestions — try adding a title</div>
              ) : (
                <>
                  {agencyState.featured.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Agency Picks</div>
                      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
                        {agencyState.featured.map(item => (
                          <AgencyPickCard key={item.external_id || item.id} item={item} onUse={handleAgencyUse} using={agencyUsing} />
                        ))}
                      </div>
                    </>
                  )}
                  {agencyState.recommended.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Recommended</div>
                      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                        {agencyState.recommended.slice(0, 8).map(item => (
                          <AgencyPickCard key={item.external_id || item.id} item={item} onUse={handleAgencyUse} using={agencyUsing} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* VERSIONS TAB */}
        {articleTab === "versions" && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Version History (Autosave)</div>
              <button
                onClick={() => {
                  try {
                    const saved = JSON.parse(localStorage.getItem(autosaveKey) || "[]");
                    const entry = { id: Date.now(), savedAt: new Date().toISOString(), title, content };
                    const updated = [entry, ...saved].slice(0, AUTOSAVE_LIMIT);
                    localStorage.setItem(autosaveKey, JSON.stringify(updated));
                    setVersions(updated);
                    showToast("Version saved");
                  } catch {}
                }}
                style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#475569" }}
              >
                <Save size={11} /> Save Now
              </button>
            </div>

            {versions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <Clock size={28} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>No versions yet</div>
                <div style={{ fontSize: 11 }}>Autosave runs every 30 seconds when you're writing.</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {versions.map((v, i) => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.title || "(no title)"}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {new Date(v.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {countWords(v.content)} words
                        {i === 0 && <span style={{ marginLeft: 6, background: "#f0fdf4", color: "#059669", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99, textTransform: "uppercase" }}>Latest</span>}
                      </div>
                    </div>
                    <button onClick={() => handleRestore(v)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#475569", whiteSpace: "nowrap" }}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPROVALS TAB */}
        {articleTab === "approvals" && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>Approval Status</div>

            {!articleId ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8" }}>
                <CheckCircle size={28} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Not saved yet</div>
                <div style={{ fontSize: 11, marginBottom: 16 }}>Save a draft first, then submit for approval.</div>
                <button onClick={handleSaveDraft} style={{ background: "#2563eb", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 18px", cursor: "pointer" }}>
                  Save Draft
                </button>
              </div>
            ) : approvalState.status === "loading" ? (
              <InlineLoading msg="Loading approval status…" />
            ) : approvalState.status === "error" ? (
              <InlineError msg="Could not load status" onRetry={loadApprovalStatus} />
            ) : (
              <div>
                {/* Current status */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: statusMeta.bg, borderRadius: 8, border: `1px solid ${statusMeta.color}33`, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                  {approvalState.data?.approved_at && (
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(approvalState.data.approved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  {approvalState.data?.approved_by && (
                    <span style={{ fontSize: 11, color: "#64748b" }}>by {approvalState.data.approved_by}</span>
                  )}
                </div>

                {/* Send for approval action */}
                {(articleStatus === "draft" || !articleStatus) && (
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                      Ready to submit? Send this article to your approver for review.
                    </div>
                    <button
                      onClick={handleSendForApproval}
                      disabled={loading || (!title && !content)}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f172a", border: "none", borderRadius: 7, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 20px", cursor: "pointer" }}
                    >
                      <Send size={13} /> {loading ? "Submitting…" : "Send for Approval"}
                    </button>
                  </div>
                )}

                {articleStatus === "approval_requested" && (
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    This article is currently in review. You will be notified when a decision is made.
                  </div>
                )}

                {approvalState.data?.rejection_reason && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#dc2626" }}>
                    <strong>Rejection note:</strong> {approvalState.data.rejection_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      <BlogGeneratorModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onGenerate={handleWizardGenerate}
        onConfirm={applyGeneratedContent}
        isGenerating={generating}
        activeBrand={activeBrand}
      />
      <MediaSourceModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleMediaSelect}
        activeBrand={activeBrand}
        socialContent={title}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
};

export default ArticleCreator;
