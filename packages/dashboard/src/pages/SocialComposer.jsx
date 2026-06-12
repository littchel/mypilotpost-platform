import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "../lib/api/client";
import OverlayEditor from "../components/editor/OverlayEditor";
import AdobeExpress from "../components/editor/AdobeExpress";
import { useAuth } from "../contexts/AuthContext";
import SocialAssistantModal from "../components/shared/SocialAssistantModal";

/**
 * SocialComposer — FIXED
 * - SVG platform icons (no FA dependency)
 * - Multi-select platforms
 * - Multi-preview toggle
 * - Corrected button layout
 */

// ── Inline SVG icons (reliable, no CDN dependency) ──────────────────────────
const PlatformSVG = ({ platform, size = 20 }) => {
  const icons = {
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 3.675a6.162 6.162 0 1 1 0 12.324 6.162 6.162 0 0 1 0-12.324zm0 10.162a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6.406-11.845a1.44 1.44 0 1 1 0 2.881 1.44 1.44 0 0 1 0-2.881z"/>
      </svg>
    ),
    x: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    pinterest: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.8a8.18 8.18 0 0 0 4.78 1.52V6.87a4.85 4.85 0 0 1-1.01-.18z"/>
      </svg>
    ),
    threads: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 1.427-.012 2.635-.226 3.594-.636.671-.285 1.232-.67 1.675-1.144.654-.702 1.036-1.625 1.131-2.743H12.19v-2.032h8.81c.07.51.1 1.028.1 1.545 0 2.338-.643 4.386-1.908 5.962-1.567 1.935-3.946 2.964-6.996 2.991h-.01z"/>
      </svg>
    ),
  };
  return icons[platform] || null;
};

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', color: '#E4405F' },
  { key: 'x',        label: 'X',         color: '#000000' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2' },
  { key: 'pinterest', label: 'Pinterest', color: '#BD081C' },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000' },
  { key: 'tiktok',   label: 'TikTok',    color: '#010101' },
  { key: 'threads',  label: 'Threads',   color: '#000000' },
];

// ── Per-platform preview cards ───────────────────────────────────────────────
const PlatformPreviewCard = ({ platform, content }) => {
  const _meta = PLATFORMS.find(p => p.key === platform);

  const previews = {
    facebook: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="facebook" size={16} />
          <span className="fw-bold small ms-2">Facebook</span>
        </div>
        <div className="preview-card-body small">{content || 'This is how your post appears on Facebook.'}</div>
        <div className="preview-card-footer extra-small text-muted">
          Like &nbsp;·&nbsp; Comment &nbsp;·&nbsp; Share
        </div>
      </div>
    ),
    instagram: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="instagram" size={16} />
          <span className="fw-bold small ms-2">Instagram</span>
        </div>
        <div className="preview-card-image bg-light d-flex align-items-center justify-content-center" style={{ height: 100, borderRadius: 8, marginBottom: 8 }}>
          <span className="text-muted small">Media Preview</span>
        </div>
        <div className="preview-card-body small">{content || 'Your caption will appear here.'}</div>
        <div className="preview-card-footer extra-small text-muted">View insights</div>
      </div>
    ),
    x: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="x" size={16} />
          <span className="fw-bold small ms-2">X (Twitter)</span>
        </div>
        <div className="preview-card-body small">{content || 'This is how your tweet will appear.'}</div>
        <div className="preview-card-footer extra-small text-muted">Reply &nbsp;·&nbsp; Repost &nbsp;·&nbsp; Like</div>
      </div>
    ),
    linkedin: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="linkedin" size={16} />
          <span className="fw-bold small ms-2">LinkedIn</span>
        </div>
        <div className="preview-card-body small">{content || 'This is a LinkedIn professional post.'}</div>
        <div className="preview-card-footer extra-small text-muted">Like &nbsp;·&nbsp; Comment &nbsp;·&nbsp; Repost</div>
      </div>
    ),
    pinterest: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="pinterest" size={16} />
          <span className="fw-bold small ms-2">Pinterest</span>
        </div>
        <div className="preview-card-image bg-light d-flex align-items-center justify-content-center" style={{ height: 120, borderRadius: 8, marginBottom: 8 }}>
          <span className="text-muted small">Pin Preview</span>
        </div>
        <div className="preview-card-body small">{content || 'Pin description will appear here.'}</div>
      </div>
    ),
    youtube: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="youtube" size={16} />
          <span className="fw-bold small ms-2">YouTube</span>
        </div>
        <div className="preview-card-image bg-dark d-flex align-items-center justify-content-center" style={{ height: 100, borderRadius: 8, marginBottom: 8 }}>
          <span style={{ color: '#fff', opacity: 0.5 }}>Video Preview</span>
        </div>
        <div className="preview-card-body small">{content || 'Video title and description here.'}</div>
      </div>
    ),
    tiktok: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="tiktok" size={16} />
          <span className="fw-bold small ms-2">TikTok</span>
        </div>
        <div className="preview-card-image bg-dark d-flex align-items-center justify-content-center" style={{ height: 120, borderRadius: 8, marginBottom: 8 }}>
          <span className="text-white small" style={{ opacity: 0.5 }}>Video Preview</span>
        </div>
        <div className="preview-card-body small">{content || 'TikTok caption will appear here.'}</div>
      </div>
    ),
    threads: (
      <div className="preview-card">
        <div className="preview-card-header">
          <PlatformSVG platform="threads" size={16} />
          <span className="fw-bold small ms-2">Threads</span>
        </div>
        <div className="preview-card-body small">{content || 'This is how your thread will appear.'}</div>
        <div className="preview-card-footer extra-small text-muted">Reply &nbsp;·&nbsp; Repost &nbsp;·&nbsp; Like</div>
      </div>
    ),
  };

  return previews[platform] || null;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function SocialComposer({
  selectedCampaignId: propCampaignId,
  selectedAsset,
  switchTab
}) {
  const { token } = useAuth();

  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["facebook"]);
  const [focusedPlatform, setFocusedPlatform] = useState("facebook");
  const [multiPreview, setMultiPreview] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setLocalCampaignId] = useState("");
  const [contentSubTab, setContentSubTab] = useState("drafts");

  const [assistantOpen, setAssistantOpen] = useState(false);

  // ── Overlay designer state (ITEM 2) ──────────────────────────────────────────
  const [showDesigner, setShowDesigner] = useState(false);
  const [overlays, setOverlays] = useState(null);            // {background, overlay_text[], overlay_image[]}
  const [assetId, setAssetId] = useState(selectedAsset?.id || null);
  const [saveState, setSaveState] = useState("idle");        // idle | saving | saved | error
  const autosaveTimer = useRef(null);
  const skipFirstAutosave = useRef(true);

  // Hydrate overlays from an existing asset (edit/reuse — preserves editable state)
  useEffect(() => {
    if (!selectedAsset) return;
    setAssetId(selectedAsset.id || null);
    if (selectedAsset.overlays) setOverlays(selectedAsset.overlays);
    if (typeof selectedAsset.text === "string") setContent(selectedAsset.text);
  }, [selectedAsset]);

  // Persist (draft/scheduled/published) — overlays always travel with the asset, never flattened
  const persist = useCallback(async (status) => {
    if (!content && !overlays) return null;
    setSaveState("saving");
    try {
      const res = await apiRequest("/api/customer/content/social", {
        method: "POST",
        body: JSON.stringify({
          content_id: assetId || undefined,
          text: content || " ",
          platforms: selectedPlatforms,
          campaign_id: selectedCampaignId || null,
          status,
          overlays: overlays || undefined,
        }),
      });
      const newId = res?.data?.id || res?.id || res?.content_id;
      if (newId && !assetId) setAssetId(newId);
      setSaveState("saved");
      return res;
    } catch (e) {
      console.error("save failed", e);
      setSaveState("error");
      return null;
    }
  }, [content, overlays, assetId, selectedPlatforms, selectedCampaignId]);

  // Autosave (debounced) whenever content or overlays change
  useEffect(() => {
    if (skipFirstAutosave.current) { skipFirstAutosave.current = false; return; }
    if (!content && !overlays) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { persist("draft"); }, 1500);
    return () => clearTimeout(autosaveTimer.current);
  }, [content, overlays]); // eslint-disable-line

  // Export the composed overlay as a PNG (objects → canvas, never the DOM)
  const handleExport = async () => {
    const dataUrl = await OverlayEditor.exportCurrentPNG();
    if (!dataUrl) { alert("Open the Designer and add a background or overlays first."); return; }
    const a = document.createElement("a");
    a.href = dataUrl; a.download = `mypilotpost-${Date.now()}.png`; a.click();
  };

  useEffect(() => {
    if (propCampaignId) {
      const timer = setTimeout(() => setLocalCampaignId(propCampaignId), 0);
      return () => clearTimeout(timer);
    }
  }, [propCampaignId]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const resp = await apiRequest("/api/customer/campaigns");
      setCampaigns(resp.data || []);
    } catch (e) {
      console.error("Failed to fetch campaigns", e);
    }
  }, []);

  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => fetchCampaigns(), 0);
      return () => clearTimeout(timer);
    }
  }, [token, fetchCampaigns]);

  // Multi-select: toggle platform in/out of selection, keep at least 1
  const togglePlatform = (key) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // keep at least one selected
        const next = prev.filter(p => p !== key);
        // if removed platform was focused, shift focus to first remaining
        if (focusedPlatform === key) setFocusedPlatform(next[0]);
        return next;
      } else {
        setFocusedPlatform(key);
        return [...prev, key];
      }
    });
  };

  const handlePlatformClick = (key) => {
    togglePlatform(key);
    setFocusedPlatform(key);
  };

  const handleGenerate = (assistantData) => {
    // Populate composer from assistant output
    const platformList = assistantData.platforms.join(', ');
    const draft = `[Generated for ${platformList} | ${assistantData.tone} tone | Goal: ${assistantData.intention} | CTA: ${assistantData.cta}]\n\nWrite your content here...`;
    setContent(draft);
    if (assistantData.platforms.length > 0) setSelectedPlatforms(assistantData.platforms);
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const handlePostNow = async () => {
    if (!content && !overlays) return alert("Please add content or a design.");
    const res = await persist("published");
    if (res) alert("Post saved & published. Overlays preserved.");
  };

  const handleSchedule = async () => {
    if (!content && !overlays) return alert("Please add content or a design.");
    const res = await persist("scheduled");
    if (res) alert("Post scheduled. Overlays preserved.");
  };

  const handleSaveDraft = async () => {
    const res = await persist("draft");
    if (res) alert("Draft saved.");
  };

  // In multi-preview, clicking a preview card sets focused platform for single-preview
  const handlePreviewFocus = (key) => {
    setFocusedPlatform(key);
    setMultiPreview(false);
  };

  const previewsToShow = multiPreview ? selectedPlatforms : [focusedPlatform];

  return (
    <div id="tab-social">

      {/* ── TOP BAR ── */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-1 align-items-center">
          <button
            className={`btn-grey${contentSubTab === "drafts" ? " active" : ""}`}
            onClick={() => setContentSubTab("drafts")}
          >
            Drafts
          </button>
          <button
            className={`btn-grey${contentSubTab === "scheduled" ? " active" : ""}`}
            onClick={() => setContentSubTab("scheduled")}
          >
            Scheduled
          </button>
          <button className="btn-grey">
            Share for Approval
          </button>
        </div>
        <button className="btn-pilot" onClick={() => setAssistantOpen(true)}>
          <i className="fas fa-robot me-1"></i>
          myPilotPost Assistant
        </button>
      </div>

      {/* ── SOCIAL ASSISTANT MODAL ── */}
      <SocialAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onGenerate={handleGenerate}
      />
      {/* ── MAIN COLUMNS ── */}
      <div className="row g-3">

        {/* ── LEFT: Content Composer ── */}
        <div className="col-md-7">
          <div className="card-workspace">
            {/* Media action buttons — above textarea */}
            <div className="d-flex gap-1 mb-2">
              <button className="btn-grey btn-sm" onClick={() => switchTab && switchTab("media")}>
                <i className="fas fa-image me-1"></i> Image
              </button>
              <button className="btn-grey btn-sm" onClick={() => switchTab && switchTab("media")}>
                <i className="fas fa-video me-1"></i> Video
              </button>
              <button className="btn-grey btn-sm" onClick={() => switchTab && switchTab("blog")}>
                <i className="fas fa-blog me-1"></i> Add Blog
              </button>
              <button
                className={`btn-grey btn-sm${showDesigner ? " active" : ""}`}
                onClick={() => setShowDesigner(v => !v)}
                title="Add text & image overlays"
              >
                <i className="fas fa-layer-group me-1"></i> Designer
              </button>
              <button className="btn-grey btn-sm ms-auto">
                <i className="fas fa-hashtag me-1"></i> Hashtag Generator
              </button>
            </div>

            {/* Textarea */}
            <textarea
              className="form-control border-0 bg-light p-2 res-none small"
              rows="8"
              placeholder="Start to create your post here or generate using myPilotPost Assistant."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {selectedAsset && (
              <div className="mt-2 p-2 bg-light border rounded d-flex align-items-center gap-2">
                <img
                  src={selectedAsset.url || selectedAsset.public_url}
                  alt=""
                  style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }}
                />
                <div className="small">
                  <div className="fw-bold">{selectedAsset.filename || selectedAsset.name}</div>
                  <div className="text-muted extra-small">Asset attached</div>
                </div>
              </div>
            )}

            {/* ── OVERLAY DESIGNER (ITEM 2) ── */}
            {showDesigner && (
              <div className="mt-3 p-3" style={{ background: "#0b0f1a", borderRadius: 12, border: "1px solid #252D42" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="extra-small fw-bold text-uppercase" style={{ color: "#8892B0" }}>Overlay Designer</span>
                  <div className="d-flex align-items-center gap-2">
                    <AdobeExpress
                      seedImage={overlays?.background?.url || null}
                      onImport={(dataUrl) =>
                        setOverlays(prev => ({
                          ...(prev || { overlay_text: [], overlay_image: [] }),
                          background: { ...((prev && prev.background) || { fit: "cover", color: "#111827" }), url: dataUrl },
                        }))
                      }
                    />
                    <span className="extra-small" style={{ color: saveState === "saved" ? "#22c55e" : saveState === "saving" ? "#f59e0b" : "#64748b" }}>
                      {saveState === "saving" ? "Autosaving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Editable"}
                    </span>
                  </div>
                </div>
                <OverlayEditor
                  value={overlays ? { ...overlays, __assetId: assetId } : { __assetId: assetId }}
                  onChange={setOverlays}
                />
              </div>
            )}
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="d-flex gap-2 mt-2">
            <button className="btn-pilot btn-sm flex-fill" onClick={handlePostNow}>
              <i className="fas fa-bolt me-1"></i> Post Now
            </button>
            <button className="btn-grey btn-sm flex-fill" onClick={handleSaveDraft}>
              <i className="fas fa-save me-1"></i> Draft
            </button>
            <button className="btn-grey btn-sm flex-fill" onClick={handleSchedule}>
              <i className="fas fa-calendar me-1"></i> Schedule
            </button>
          </div>
          <div className="d-flex gap-2 mt-2">
            <button className="btn-grey btn-sm flex-fill" onClick={handleCopy}>
              <i className="fas fa-copy me-1"></i> Copy text
            </button>
            <button className="btn-grey btn-sm flex-fill" onClick={handleExport} disabled={!showDesigner && !overlays}>
              <i className="fas fa-download me-1"></i> Export PNG
            </button>
          </div>
        </div>

        {/* ── RIGHT: Preview + Platform Grid ── */}
        <div className="col-md-5">

          {/* Multi-preview toggle — above preview section */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="extra-small fw-bold text-muted text-uppercase">
              {multiPreview
                ? `Multi-preview (${selectedPlatforms.length})`
                : `Preview — ${PLATFORMS.find(p => p.key === focusedPlatform)?.label}`}
            </span>
            <button
              className={`btn-grey btn-sm${multiPreview ? " active" : ""}`}
              onClick={() => setMultiPreview(v => !v)}
              title="Toggle multi-preview"
            >
              <i className={`fas fa-${multiPreview ? "compress-alt" : "expand-alt"} me-1`}></i>
              {multiPreview ? "Single" : "Multi"} Preview
            </button>
          </div>

          {/* Preview area — scrollable in multi mode */}
          <div
            className="preview-scroll-area"
            style={{
              maxHeight: multiPreview ? 380 : "auto",
              overflowY: multiPreview ? "auto" : "visible",
            }}
          >
            {previewsToShow.map(key => (
              <div
                key={key}
                className={`mb-2 ${multiPreview ? "cursor-pointer" : ""}`}
                onClick={multiPreview ? () => handlePreviewFocus(key) : undefined}
                title={multiPreview ? `Click to focus ${PLATFORMS.find(p => p.key === key)?.label}` : ""}
              >
                <PlatformPreviewCard platform={key} content={content} />
              </div>
            ))}
          </div>

          {/* ── Platform icon grid — Post to: — multi-select ── */}
          <div className="card-workspace mt-2">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="extra-small fw-bold text-muted text-uppercase">Post to:</span>
              <span className="extra-small text-muted">{selectedPlatforms.length} selected</span>
            </div>
            <div className="platform-icon-grid">
              {PLATFORMS.map(p => {
                const isSelected = selectedPlatforms.includes(p.key);
                const isFocused = focusedPlatform === p.key;
                return (
                  <button
                    key={p.key}
                    className={`platform-icon-btn${isSelected ? " active" : ""}`}
                    onClick={() => handlePlatformClick(p.key)}
                    title={p.label}
                    style={isSelected ? { borderColor: p.color, color: p.color, backgroundColor: `${p.color}12` } : {}}
                  >
                    <PlatformSVG platform={p.key} size={16} />
                    {isFocused && isSelected && !multiPreview && (
                      <span
                        className="platform-focus-dot"
                        style={{ background: p.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campaign selector */}
          {campaigns.length > 0 && (
            <div className="card-workspace mt-2">
              <div className="small fw-bold mb-2">Link to Campaign</div>
              <select
                className="form-select form-select-sm"
                value={selectedCampaignId}
                onChange={(e) => setLocalCampaignId(e.target.value)}
              >
                <option value="">No Campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
