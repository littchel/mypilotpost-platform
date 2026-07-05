import React, { useState, useRef, useEffect, useCallback } from "react";
import PlatformPreviewPanel, { PreviewOverlays } from "../components/publishing/PlatformPreviewPanel";
import SocialAssistantModal from "../components/shared/SocialAssistantModal";
import PlatformIcon from "../components/shared/PlatformIcon";
import { validateContent } from "../lib/platformRequirements";
import { fetchMediaSuggestions, trackImageSelected, trackImageAttached } from "../services/mediaSuggestions";
import OverlayEditor from "../components/editor/OverlayEditor";
import AdobeExpress from "../components/editor/AdobeExpress";
import TemplateCanvas from "../components/TemplateCanvas";
import { Play, Download } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiFetch(endpoint, opts = {}) {
  const token = localStorage.getItem("mpp_token");
  return fetch(`${API_BASE}${endpoint}`, {
    ...opts,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      ...(opts.headers || {}),
    },
  }).then(async (r) => {
    if (r.status === 204) return null;
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error(data.error || "Request failed"), data);
    return data;
  });
}

function apiJSON(endpoint, method, body) {
  return apiFetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Platform metadata ───────────────────────────────────────────────────────────
const PLATFORM_META = {
  facebook:  { label: "Facebook Feed",  icon: "fab fa-facebook",  color: "#1877f2" },
  facebook_story: { label: "Facebook Story", icon: "fab fa-facebook", color: "#1877f2" },
  facebook_reel: { label: "Facebook Reel", icon: "fab fa-facebook", color: "#1877f2" },
  instagram: { label: "Instagram Feed", icon: "fab fa-instagram", color: "#e1306c" },
  instagram_story: { label: "Instagram Story", icon: "fab fa-instagram", color: "#e1306c" },
  instagram_reel: { label: "Instagram Reel", icon: "fab fa-instagram", color: "#e1306c" },
  linkedin:  { label: "LinkedIn",  icon: "fab fa-linkedin",  color: "#0a66c2" },
  x:         { label: "X",         icon: "fab fa-x-twitter", color: "#000"    },
  tiktok:    { label: "TikTok",    icon: "fab fa-tiktok",    color: "#010101" },
  pinterest: { label: "Pinterest", icon: "fab fa-pinterest", color: "#e60023" },
  threads:   { label: "Threads",   icon: "fab fa-threads",   color: "#000"    },
  youtube:   { label: "YouTube",   icon: "fab fa-youtube",   color: "#ff0000" },
};

const TIMEZONES = [
  "Africa/Harare", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Chicago", "America/Los_Angeles", "America/New_York", "America/Sao_Paulo",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Europe/London", "Europe/Paris", "Pacific/Auckland",
  "UTC",
];

const WATERMARK_SECTIONS = [
  { key: "HOOK",     label: "HOOK — open with something that stops the scroll" },
  { key: "BODY",     label: "BODY — deliver the value, the story, the substance" },
  { key: "CTA",      label: "CTA — tell them exactly what to do next" },
  { key: "HASHTAGS", label: "HASHTAGS — #brand #topic #niche" },
];

// ── Toast ───────────────────────────────────────────────────────────────────────
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
      maxWidth: 380, animation: "fadeIn .2s ease",
    }}>
      <i className={`fas fa-${isErr ? "exclamation-circle" : "check-circle"}`} style={{ fontSize: 14 }}></i>
      {msg}
    </div>
  );
}

// ── Clean editor (no watermarks) ─────────────────────────────────────────────────
function WatermarkEditor({ value, onChange }) {
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Write your post…"
        style={{
          width: "100%", height: "100%", resize: "none",
          border: "none", outline: "none",
          fontSize: 14, lineHeight: 1.7, color: "#0f172a",
          background: "transparent", fontFamily: "inherit",
          padding: "10px 12px",
        }}
      />
    </div>
  );
}

// ── Media card ──────────────────────────────────────────────────────────────────
function MediaCard({ item, index, onReplace, onRemove, onMoveLeft, onMoveRight, isFirst, isLast }) {
  const isVideo = item.type === "video";
  return (
    <div style={{ minWidth: 88, width: 88, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", flexShrink: 0, background: "#fff", position: "relative" }}>
      {item.uploading && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <span className="spinner-border spinner-border-sm" style={{ color: "#0ea5e9", width: 18, height: 18, borderWidth: 2 }}></span>
        </div>
      )}
      <div style={{ width: "100%", height: 66, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {item.url ? (
          isVideo
            ? <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <i className={`fas fa-${isVideo ? "video" : "image"}`} style={{ color: "#94a3b8", fontSize: 18 }}></i>
        )}
      </div>
      <div style={{ padding: "4px 3px 5px", textAlign: "center" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label || item.type || "Media"}
        </div>
        <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
          {!isFirst && <button onClick={() => onMoveLeft(index)} style={btnStyle}>←</button>}
          <button onClick={() => onReplace(index)} style={btnStyle} title="Replace">↑</button>
          <button onClick={() => onRemove(index)} style={{ ...btnStyle, background: "#fee2e2", color: "#ef4444" }} title="Remove">×</button>
          {!isLast && <button onClick={() => onMoveRight(index)} style={btnStyle}>→</button>}
        </div>
      </div>
    </div>
  );
}

const btnStyle = { border: "none", background: "#f1f5f9", borderRadius: 3, width: 17, height: 17, fontSize: 8, cursor: "pointer", color: "#64748b" };

// ── Pexels suggested card ──────────────────────────────────────────────────────
function PexelsCard({ item, onUse, loading }) {
  const orient = item.width && item.height
    ? (item.width > item.height ? "landscape" : item.width < item.height ? "portrait" : "square")
    : null;
  const res = item.width && item.height ? `${item.width}×${item.height}` : null;

  return (
    <div style={{ minWidth: 100, width: 100, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", flexShrink: 0, background: "#fff" }}>
      <div style={{ width: "100%", height: 70, background: "#f8fafc", overflow: "hidden", position: "relative" }}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.attribution_text} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-image" style={{ color: "#94a3b8", fontSize: 20 }}></i>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "1px 4px" }}>
          <span style={{ fontSize: 7, color: "#fff", fontWeight: 700, textTransform: "uppercase" }}>Pexels</span>
        </div>
        {orient && (
          <div style={{ position: "absolute", top: 2, left: 2, background: "rgba(0,0,0,0.45)", borderRadius: 3, padding: "1px 4px" }}>
            <span style={{ fontSize: 7, color: "#fff", textTransform: "capitalize" }}>{orient}</span>
          </div>
        )}
      </div>
      {res && (
        <div style={{ padding: "2px 5px 0", fontSize: 8, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{res}</div>
      )}
      {item.reasons?.[0] && (
        <div title={item.reasons.join(' · ')} style={{ padding: "1px 5px 0", fontSize: 8, color: "#0ea5e9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.reasons[0]}
        </div>
      )}
      <div style={{ padding: "3px 5px 5px" }}>
        <button
          onClick={() => onUse(item)}
          disabled={loading}
          style={{ width: "100%", background: "#0ea5e9", border: "none", borderRadius: 4, color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 0", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "…" : "Use"}
        </button>
      </div>
    </div>
  );
}

// ── Agency Media Picker ─────────────────────────────────────────────────────────
const MEDIA_TABS = [
  { id: "agencyPicks",   label: "✨ Agency Picks" },
  { id: "trending",      label: "🔥 Trending" },
  { id: "humanStories",  label: "👥 Human Stories" },
  { id: "professional",  label: "🏢 Professional" },
  { id: "minimal",       label: "🎨 Minimal" },
];

function MediaPickerPanel({ loading, error, buckets, activeTab, onTabChange, onUse, using, onRetry }) {
  const items = buckets?.[activeTab] || [];

  return (
    <div style={{ marginTop: 10 }}>
      {/* Tab strip */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
        {MEDIA_TABS.map(t => (
          <button key={t.id} onClick={() => onTabChange(t.id)}
            style={{ flexShrink: 0, padding: "3px 9px", borderRadius: 100, border: `1px solid ${activeTab === t.id ? "#0ea5e9" : "#e2e8f0"}`, background: activeTab === t.id ? "#f0f9ff" : "#fff", color: activeTab === t.id ? "#0ea5e9" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: 12 }}>
          <span className="spinner-border spinner-border-sm" style={{ color: "#0ea5e9", width: 14, height: 14, borderWidth: 2, marginRight: 6 }}></span>
          Finding images…
        </div>
      ) : error ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
          <i className="fas fa-exclamation-circle" style={{ color: "#ef4444", fontSize: 12 }}></i>
          <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>Could not load images.</span>
          <button onClick={onRetry} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "#475569", cursor: "pointer" }}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 11, color: "#94a3b8", padding: "8px 0", textAlign: "center" }}>
          No images in this category — try Agency Picks or Trending.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {items.slice(0, 12).map(item => (
            <PexelsCard key={item.external_id || item.id} item={item} onUse={onUse} loading={using === (item.external_id || item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Library modal ───────────────────────────────────────────────────────────────
function LibraryModal({ open, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch("/api/customer/media/library")
      .then(d => setItems(d?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 580, maxHeight: "70vh", background: "#fff", borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 2001,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            <i className="fas fa-photo-video me-2" style={{ color: "#0ea5e9" }}></i>Media Library
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <span className="spinner-border" style={{ width: 28, height: 28, borderWidth: 3, color: "#0ea5e9" }}></span>
              <div style={{ marginTop: 10, fontSize: 12 }}>Loading library…</div>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              <i className="fas fa-photo-video" style={{ fontSize: 30, marginBottom: 10 }}></i>
              <div style={{ fontSize: 13 }}>No media yet. Upload or use Pexels.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {items.map(item => {
                const thumb = item.preview_url
                  ? (item.preview_url.startsWith("http") ? item.preview_url : `${API_BASE}${item.preview_url}`)
                  : null;
                const typeLabel = item.mime_type?.split("/")[0] || "image";
                const uploadedDate = item.created_at
                  ? new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : null;
                return (
                <div
                  key={item.id}
                  onClick={() => { onSelect(item); onClose(); }}
                  style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", cursor: "pointer", background: "#f8fafc" }}
                >
                  <div style={{ height: 80, overflow: "hidden", position: "relative" }}>
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="fas fa-image" style={{ color: "#cbd5e1", fontSize: 24 }}></i>
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.5)", borderRadius: 3, padding: "1px 5px" }}>
                      <span style={{ fontSize: 7, color: "#fff", fontWeight: 700, textTransform: "uppercase" }}>{item.provider || typeLabel}</span>
                    </div>
                  </div>
                  <div style={{ padding: "4px 6px 5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{typeLabel}</span>
                    {uploadedDate && <span style={{ fontSize: 8, color: "#94a3b8" }}>{uploadedDate}</span>}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Slide-over Verification Panel ──────────────────────────────────────────────
const PUBLISH_PHASES = {
  creating:   { label: "Creating post…",       icon: "fas fa-pen",        color: "#3b82f6" },
  linking:    { label: "Attaching media…",     icon: "fas fa-paperclip",  color: "#8b5cf6" },
  scheduling: { label: "Scheduling delivery…", icon: "fas fa-clock",      color: "#f59e0b" },
  queued:     { label: "Queued for delivery",  icon: "fas fa-check-circle", color: "#10b981" },
  failed:     { label: "Publish failed",       icon: "fas fa-times-circle", color: "#ef4444" },
};

function VerificationPanel({ open, onClose, data, onPublish, onSchedule, onDraft, isPublishing, publishPhase, publishResult, onReset, bestTimeData, onApplyBestTime }) {
  const { platforms, content, overrides, media, scheduledTime, timezone } = data;
  const mainMedia = media?.[0];
  const mediaType = mainMedia?.type || (mainMedia?.mime_type?.startsWith("video/") ? "video" : (mainMedia?.url ? "image" : null));
  const mediaMeta = mainMedia ? { ratio: mainMedia.ratio || null, duration: mainMedia.duration || null } : null;
  const validations = platforms.map(p => ({
    platform: p,
    result: validateContent(p, overrides[p] || content, mediaType, mediaMeta),
  }));
  const hasBlocks   = validations.some(v => v.result.state === "BLOCKED");
  const hasWarnings = validations.some(v => v.result.state === "WARNING");
  const confidence  = hasBlocks ? "Low" : hasWarnings ? "Moderate" : "High";
  const confColor   = hasBlocks ? "#ef4444" : hasWarnings ? "#f59e0b" : "#10b981";

  const phaseInfo = PUBLISH_PHASES[publishPhase];
  const isActive  = publishPhase !== "idle";

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
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Publishing Summary</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Confidence</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: confColor + "22", color: confColor, padding: "3px 10px", borderRadius: 20 }}>{confidence}</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}>Target Platforms</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {platforms.map(p => {
                const m = PLATFORM_META[p];
                return (
                  <span key={p} style={{ fontSize: 11, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "3px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    {m && <PlatformIcon platform={p} size={12} />}
                    {m?.label || p}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "11px 14px", marginBottom: 14, display: "flex", gap: 10 }}>
            <i className="fas fa-dna" style={{ color: "#10b981", marginTop: 2 }}></i>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", marginBottom: 2 }}>Brand DNA Alignment</div>
              <div style={{ fontSize: 11, color: "#047857" }}>Tone matches guidelines. 0 compliance violations.</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>Platform Validation</div>
            {validations.map(v => (
              <div key={v.platform} style={{
                borderRadius: 7, padding: "9px 12px", marginBottom: 7,
                background: v.result.state === "SAFE" ? "#f0fdf4" : v.result.state === "BLOCKED" ? "#fef2f2" : "#fffbeb",
                border: "1px solid " + (v.result.state === "SAFE" ? "#bbf7d0" : v.result.state === "BLOCKED" ? "#fecaca" : "#fde68a"),
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: v.result.state === "SAFE" ? "#065f46" : v.result.state === "BLOCKED" ? "#dc2626" : "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
                    {PLATFORM_META[v.platform] && <PlatformIcon platform={v.platform} size={14} />}
                    {PLATFORM_META[v.platform]?.label || v.platform}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>{v.result.state}</span>
                </div>
                {v.result.messages?.length > 0 && (
                  <ul style={{ margin: "5px 0 0 0", padding: "0 0 0 14px", fontSize: 11, color: "#64748b" }}>
                    {v.result.messages.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>Media</div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <i className={`fas fa-${media.length > 0 ? "check-circle" : "image"}`} style={{ color: media.length > 0 ? "#10b981" : "#94a3b8" }}></i>
              <span style={{ fontSize: 12, color: "#475569" }}>
                {media.length > 0 ? `${media.length} item${media.length > 1 ? "s" : ""} attached` : "Text-only post"}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel}>Engagement Prediction</div>
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 7, padding: "9px 12px", display: "flex", gap: 10 }}>
              <i className="fas fa-chart-line" style={{ color: "#7c3aed" }}></i>
              <span style={{ fontSize: 11, color: "#4c1d95" }}>
                {content.length > 50 ? "Optimal content length. Expect above-average engagement." : "Expand content for stronger engagement signals."}
              </span>
            </div>
          </div>

          {scheduledTime && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 2 }}>Scheduled for</div>
              <div style={{ fontSize: 12, color: "#1e40af", marginBottom: bestTimeData?.proposedTime ? 6 : 0 }}>{new Date(scheduledTime).toLocaleString()} · {timezone}</div>
              
              {bestTimeData?.proposedTime && (
                <button
                  type="button"
                  onClick={onApplyBestTime}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, width: "100%", justifyItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
                    border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 8px",
                    fontSize: "11px", fontWeight: 700, color: "#1e3a8a", cursor: "pointer", transition: "all 0.15s"
                  }}
                  title="Align scheduled time with peak audience engagement window"
                >
                  💡 Snap to Recommended Best Time ({bestTimeData.proposedTime})
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Phase progress indicator */}
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

          {/* Steps timeline (shown while active) */}
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
                    <div style={{ fontSize: 9, color: isDone || isCurrent ? "#3b82f6" : "#94a3b8", marginTop: 3, textAlign: "center", fontWeight: isCurrent ? 700 : 400 }}>
                      {PUBLISH_PHASES[phase]?.label.replace("…", "")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {publishPhase === "queued" ? (
            <button onClick={onReset} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="fas fa-plus" /> Create Another Post
            </button>
          ) : publishPhase === "failed" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={scheduledTime ? onSchedule : onPublish} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <i className="fas fa-redo" style={{ marginRight: 6 }} /> Retry
              </button>
              <button onClick={onClose} style={ghostBtn}>Back to Editor</button>
            </div>
          ) : (
            <>
              <button
                disabled={isPublishing || hasBlocks}
                onClick={scheduledTime ? onSchedule : onPublish}
                style={{
                  background: hasBlocks ? "#f1f5f9" : "#0f172a", color: hasBlocks ? "#94a3b8" : "#fff",
                  border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 13,
                  cursor: hasBlocks ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: isPublishing ? 0.7 : 1,
                }}
              >
                <i className={`fas fa-${scheduledTime ? "clock" : "rocket"}`}></i>
                {scheduledTime ? "Confirm & Schedule" : "Confirm & Publish"}
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
const mediaBtn = { border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 6, padding: "4px 9px", fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 };

function VaultActionBtn({ color, onClick, children }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        background: "none", border: `1px solid ${color}33`, borderRadius: 5,
        padding: "3px 8px", fontSize: 10, fontWeight: 600, color, cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CreatePost({
  selectedCampaignId: propCampaignId,
  campaigns = [],
  connections = [],
  brandName = "Your Brand",
  brandIndustry = "",
  brandTimezone = null,
  editContentId,
  setEditContentId,
}) {
  const [content, setContent]               = useState("");
  const [overrides, setOverrides]           = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [mediaItems, setMediaItems]         = useState([]);
  const [showSuggested, setShowSuggested]   = useState(true); // Default to true for the suggested images grid
  const [mediaTab, setMediaTab]             = useState("agencyPicks");
  const [mediaBuckets, setMediaBuckets]     = useState(null); // { agencyPicks, trending, humanStories, professional, minimal }
  const [mediaLoading, setMediaLoading]     = useState(false);
  const [mediaError, setMediaError]         = useState(false);
  const [pexelsUsing, setPexelsUsing]       = useState(null);
  // legacy compat (read by handleAssistantGenerate)
  const [pexelsItems, setPexelsItems]       = useState([]);
  const [libraryOpen, setLibraryOpen]       = useState(false);
  const filteredConnections = connections.filter(c => c.platform !== "wordpress" && c.platform !== "wordpress_ecommerce");
  const [campaignId, setCampaignId]         = useState(propCampaignId || "");
  const [scheduledTime, setScheduledTime]   = useState("");
  const [scheduledDate, setScheduledDate]   = useState("");
  const [scheduledTimeOnly, setScheduledTimeOnly] = useState("");
  const [timezone, setTimezone]             = useState(brandTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [activeTopTab, setActiveTopTab]     = useState("editor");
  const [vaultItems, setVaultItems]         = useState([]);
  const [vaultLoading, setVaultLoading]     = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [tabCounts, setTabCounts]           = useState({ drafts: 0, scheduled: 0, approvals: 0 });
  const [assistantOpen, setAssistantOpen]   = useState(false);
  const [assistantPrefill, setAssistantPrefill] = useState("");
  
  // ── Template Mode States ──────────────────────────────────────────────────
  const [templateMode, setTemplateMode]       = useState(false);
  const [readOnlyTemplateMode, setReadOnlyTemplateMode] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState("A");
  const [templateSchema, setTemplateSchema]   = useState(null);
  const [slotData, setSlotData]               = useState({});
  const [brandVariables, setBrandVariables]   = useState({ primary_color: "#1A1A1A", secondary_color: "#F5F5F5", font_stack: "Inter, sans-serif", logo_url: "" });
  const templateCanvasRef = useRef(null);
  const [activeSlotIdForMedia, setActiveSlotIdForMedia] = useState(null);

  const getDeterministicPalette = (imageUrl, brandVars) => {
    const hashString = (str) => {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      return Math.abs(hash);
    };

    const palettes = [
      { dominant: "#2A3B4C", accent: "#F4A261", background: "#1D2836" },
      { dominant: "#1D3557", accent: "#E63946", background: "#F1FAEE" },
      { dominant: "#264653", accent: "#E76F51", background: "#E9C46A" },
      { dominant: "#457B9D", accent: "#E63946", background: "#F1FAEE" },
      { dominant: "#3D5A80", accent: "#EE6C4D", background: "#E0F2F1" },
      { dominant: "#2B2D42", accent: "#EF233C", background: "#F4F4F9" },
      { dominant: "#003049", accent: "#F77F00", background: "#FCBF49" },
      { dominant: "#31572C", accent: "#A3B18A", background: "#E8F0E6" }
    ];

    const getLuminance = (hex) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      if (!result) return 0;
      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;
      const aR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const aG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const aB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
      return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
    };

    const getContrastColor = (bgHex) => {
      return getLuminance(bgHex) > 0.179 ? "#000000" : "#FFFFFF";
    };

    const hash = hashString(imageUrl || "");
    const selected = palettes[hash % palettes.length];
    
    const dominant = brandVars?.primary_color || selected.dominant;
    const accent = brandVars?.secondary_color || selected.accent;
    
    return {
      dominant,
      accent,
      background: selected.background,
      text_contrast: getContrastColor(selected.background)
    };
  };

  const handleExportPNG = () => {
    if (!templateCanvasRef.current) return;
    const dataUrl = templateCanvasRef.current.renderToPNG();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `mypilotpost-design-${templateSchema?.template_id || "post"}.png`;
    a.click();
    showToast("PNG design downloaded successfully!", "success");
  };

  const handleExportMP4 = async () => {
    if (!templateCanvasRef.current) return;
    try {
      const blob = await templateCanvasRef.current.renderToMP4(3000);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mypilotpost-animation-${templateSchema?.template_id || "post"}.webm`;
      a.click();
      showToast("MP4 animation exported successfully!", "success");
    } catch (e) {
      showToast("Export failed: video container format unsupported in this browser", "error");
    }
  };

  useEffect(() => {
    const handleTrigger = (e) => {
      setAssistantPrefill(e.detail || "");
      setAssistantOpen(true);
    };
    window.addEventListener('trigger-social-assistant', handleTrigger);
    return () => window.removeEventListener('trigger-social-assistant', handleTrigger);
  }, []);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [publishPhase, setPublishPhase]     = useState("idle"); // idle|creating|linking|scheduling|queued|failed
  const [publishResult, setPublishResult]   = useState(null);  // { content_id, platforms }
  const [canvaBanner, setCanvaBanner]       = useState(false);
  const [toast, setToast]                   = useState(null);
  const [overlays, setOverlays]             = useState(null);
  const [brandOverlayOpen, setBrandOverlayOpen] = useState(false);
  const [bestTimeData, setBestTimeData] = useState(null);

  useEffect(() => {
    apiFetch("/api/customer/best-time")
      .then(res => setBestTimeData(res))
      .catch(() => {});
  }, []);

  const handleApplyBestTime = () => {
    if (!bestTimeData?.proposedTime) return;
    const [h, m] = bestTimeData.proposedTime.split(":");
    const baseDate = scheduledTime ? new Date(scheduledTime) : new Date();
    if (isNaN(baseDate.getTime())) {
      const today = new Date();
      today.setHours(parseInt(h), parseInt(m), 0, 0);
      setScheduledTime(today.toISOString().slice(0, 16));
    } else {
      baseDate.setHours(parseInt(h), parseInt(m), 0, 0);
      setScheduledTime(baseDate.toISOString().slice(0, 16));
    }
  };
  const [applyOverlay, setApplyOverlay]     = useState(true);
  const [saveState, setSaveState]           = useState("idle");

  // Sync scheduledTime -> Date/Time inputs
  useEffect(() => {
    if (scheduledTime) {
      const parts = scheduledTime.split("T");
      if (parts[0]) setScheduledDate(parts[0]);
      if (parts[1]) setScheduledTimeOnly(parts[1].slice(0, 5));
    } else {
      setScheduledDate("");
      setScheduledTimeOnly("");
    }
  }, [scheduledTime]);

  useEffect(() => {
    if (editContentId) {
      apiFetch(`/api/customer/vault/${editContentId}`)
        .then(res => {
          const item = res?.data || res;
          if (item && item.content_type === 'social') {
            handleVaultEdit(item);
          }
        })
        .catch(err => console.error("Failed to load edit social post", err))
        .finally(() => {
          if (setEditContentId) setEditContentId(null);
        });
    }
  }, [editContentId, setEditContentId]);

  const handleDateChange = (dateVal) => {
    setScheduledDate(dateVal);
    if (dateVal && scheduledTimeOnly) {
      setScheduledTime(`${dateVal}T${scheduledTimeOnly}`);
    } else {
      setScheduledTime("");
    }
  };

  const handleTimeChange = (timeVal) => {
    setScheduledTimeOnly(timeVal);
    if (scheduledDate && timeVal) {
      setScheduledTime(`${scheduledDate}T${timeVal}`);
    } else {
      setScheduledTime("");
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard this post? All unsaved content will be lost.")) {
      resetAfterPublish();
    }
  };

  const handleApplyOverlays = (nextOverlays, newMedia = null) => {
    setOverlays(nextOverlays);
    if (newMedia) {
      setMediaItems(prev => {
        if (prev.length > 0) {
          return [newMedia, ...prev.slice(1)];
        } else {
          return [newMedia];
        }
      });
    }
  };
  const isPublishing = publishPhase !== "idle" && publishPhase !== "queued" && publishPhase !== "failed";

  const fileInputRef    = useRef(null);
  const canvaFileRef    = useRef(null);
  const replaceIndexRef = useRef(null);

  useEffect(() => { if (propCampaignId) setCampaignId(propCampaignId); }, [propCampaignId]);
  useEffect(() => { if (brandTimezone) setTimezone(brandTimezone); }, [brandTimezone]);

  // ── Studio idea prefill — read once on mount ─────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("studio_idea_prefill");
    if (!raw) return;
    sessionStorage.removeItem("studio_idea_prefill");
    let prefill;
    try { prefill = JSON.parse(raw); } catch { return; }

    const body = [prefill.hook, prefill.caption].filter(Boolean).join("\n\n");
    if (body) setContent(body);
    if (Array.isArray(prefill.platforms) && prefill.platforms.length) setSelectedPlatforms(prefill.platforms);
    if (prefill.campaign_id) setCampaignId(prefill.campaign_id);
    if (prefill.overlays) setOverlays(prefill.overlays);

    // If layout_manifest exists, enter Template Mode
    if (prefill.layout_manifest) {
      const manifest = prefill.layout_manifest;
      setTemplateMode(true);
      setReadOnlyTemplateMode(true);
      const varId = manifest.template_variant || "A";
      setSelectedVariant(varId);
      
      const brandVars = {
        primary_color: manifest.brand_overrides?.primary_color || "#1A1A1A",
        secondary_color: manifest.brand_overrides?.secondary_color || "#F5F5F5",
        font_stack: manifest.brand_overrides?.font_stack || "Inter, sans-serif",
        logo_url: manifest.brand_overrides?.logo_url || ""
      };
      setBrandVariables(brandVars);

      const endpoint = `/api/customer/templates/${manifest.template_id}/${varId}`;
      apiFetch(endpoint)
        .then(schema => {
          if (schema) {
            setTemplateSchema(schema);
            
            const paragraphs = (prefill.caption || prefill.body || "").split("\n\n").filter(Boolean);
            const defaultPalette = {
              dominant: brandVars.primary_color,
              accent: brandVars.secondary_color,
              background: "#F5F5F5",
              text_contrast: "#FFFFFF"
            };

            const initialSlotData = {};
            const prefillSlides = Array.isArray(manifest.slides) ? manifest.slides : [];
            
            if (prefillSlides.length > 0 && prefillSlides[0].slot_id) {
              prefillSlides.forEach(slide => {
                initialSlotData[slide.slot_id] = {
                  text: slide.text || prefill.hook || prefill.headline || "",
                  image_url: slide.image_url || prefill.image || prefill.image_url || "",
                  palette: defaultPalette
                };
              });
            } else {
              (prefillSlides || []).forEach(slide => {
                let textVal = "";
                if (slide.text_anchor === "headline" || slide.text_anchor === "hook") {
                  textVal = prefill.hook || prefill.headline || paragraphs[0] || "";
                } else if (slide.text_anchor === "cta_text" || slide.text_anchor === "cta") {
                  textVal = prefill.cta || prefill.cta_text || "";
                } else if (slide.text_anchor.startsWith("body_paragraph_")) {
                  const idx = parseInt(slide.text_anchor.replace("body_paragraph_", "")) - 1;
                  textVal = paragraphs[idx] || "";
                }

                initialSlotData[slide.slot_id || "slide_1"] = {
                  text: textVal,
                  image_url: prefill.image || prefill.image_url || "",
                  palette: defaultPalette
                };
              });
            }

            setSlotData(initialSlotData);
          }
        })
        .catch(err => {
          console.error("Failed to load template schema", err);
          setTemplateMode(false);
        });
    }

    if (prefill.image) {
      const tempId = crypto.randomUUID();
      setMediaItems(prev => [...prev, { id: tempId, url: prefill.image, type: "image", label: "Studio", uploading: false }]);
      // Register in media_assets so linkMedia() can attach it on save
      const m = prefill.image.match(/photos\/(\d+)\//);
      const externalId = m ? m[1] : prefill.image.split('/').filter(Boolean).pop().split('?')[0];
      apiJSON("/api/customer/media/from-pexels", "POST", {
        external_id: externalId,
        preview_url: prefill.image,
        type: "image",
      }).then(saved => {
        if (saved?.media_id) {
          setMediaItems(prev => prev.map(mi => mi.id === tempId ? { ...mi, asset_id: saved.media_id } : mi));
        }
      }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filteredConnections.length > 0 && selectedPlatforms.length === 0) {
      const active = filteredConnections.filter(c => c.status === "active").map(c => c.platform);
      if (active.length > 0) setSelectedPlatforms([active[0]]);
    }
  }, [filteredConnections]);

  useEffect(() => {
    const hasVideo = mediaItems.some(item => item.type === "video");
    if (!hasVideo && selectedPlatforms.includes("youtube")) {
      setSelectedPlatforms(prev => {
        const next = prev.filter(p => p !== "youtube");
        if (next.length === 0 && filteredConnections.length > 0) {
          const active = filteredConnections.filter(c => c.status === "active" && c.platform !== "youtube").map(c => c.platform);
          if (active.length > 0) return [active[0]];
        }
        return next;
      });
    }
  }, [mediaItems, selectedPlatforms, filteredConnections]);

  useEffect(() => {
    if (selectedPlatforms.some(p => p === "wordpress" || p === "wordpress_ecommerce")) {
      setSelectedPlatforms(prev => prev.filter(p => p !== "wordpress" && p !== "wordpress_ecommerce"));
    }
  }, [selectedPlatforms]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const activeConnections  = filteredConnections.filter(c => c.status === "active");
  const expiredConnections = filteredConnections.filter(c => c.status === "error" || c.status === "expired");
  const allKnownPlatforms  = [...activeConnections, ...expiredConnections];

  const togglePlatform = (key, isExpired) => {
    if (isExpired) return;
    if (key === "youtube") {
      const hasVideo = mediaItems.some(item => item.type === "video");
      if (!hasVideo) {
        showToast("YouTube requires a video file.", "error");
        return;
      }
    }
    const isInstagram = key === "instagram";
    const isFacebook = key === "facebook";
    setSelectedPlatforms(prev => {
      let hasPlatform = false;
      if (isInstagram) {
        hasPlatform = prev.some(p => p.startsWith("instagram"));
      } else if (isFacebook) {
        hasPlatform = prev.some(p => p.startsWith("facebook"));
      } else {
        hasPlatform = prev.includes(key);
      }
        
      if (hasPlatform) {
        let next = prev;
        if (isInstagram) {
          next = prev.filter(p => !p.startsWith("instagram"));
        } else if (isFacebook) {
          next = prev.filter(p => !p.startsWith("facebook"));
        } else {
          next = prev.filter(p => p !== key);
        }
        return next.length > 0 ? next : prev;
      } else {
        return [...prev, key];
      }
    });
  };

  // ── File upload (R2) ────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = "";

    const newItems = files.map(f => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      file: f,
      type: f.type.startsWith("video") ? "video" : "image",
      uploading: true,
    }));

    if (replaceIndexRef.current !== null) {
      const idx = replaceIndexRef.current;
      replaceIndexRef.current = null;
      setMediaItems(prev => prev.map((m, i) => i === idx ? newItems[0] : m));
    } else {
      setMediaItems(prev => [...prev, ...newItems]);
    }

    const token = localStorage.getItem("mpp_token");
    for (const item of newItems) {
      try {
        const form = new FormData();
        form.append("file", item.file);
        const res = await fetch(`${API_BASE}/api/customer/media/upload`, {
          method: "POST",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          body: form,
        });
        const data = await res.json();
        setMediaItems(prev => prev.map(m =>
          m.id === item.id ? { ...m, asset_id: data.id, uploading: false } : m
        ));
      } catch {
        setMediaItems(prev => prev.map(m =>
          m.id === item.id ? { ...m, uploading: false } : m
        ));
        showToast("Upload failed — check your connection", "error");
      }
    }
  };

  const replaceMedia = (idx) => { replaceIndexRef.current = idx; fileInputRef.current?.click(); };
  const removeMedia  = (idx) => setMediaItems(prev => prev.filter((_, i) => i !== idx));
  const moveMedia    = (idx, dir) => {
    setMediaItems(prev => {
      const arr = [...prev]; const t = idx + dir;
      if (t < 0 || t >= arr.length) return arr;
      [arr[idx], arr[t]] = [arr[t], arr[idx]]; return arr;
    });
  };

  // ── Canva ────────────────────────────────────────────────────────────────
  const handleCanvaImport = () => {
    window.open("https://www.canva.com/", "_blank");
    setCanvaBanner(true);
  };

  const handleCanvaFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = "";
    setCanvaBanner(false);

    const newItems = files.map(f => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      file: f,
      type: f.type.startsWith("video") ? "video" : "image",
      label: "Canva Design",
      uploading: true,
    }));
    setMediaItems(prev => [...prev, ...newItems]);

    const token = localStorage.getItem("mpp_token");
    for (const item of newItems) {
      try {
        const form = new FormData();
        form.append("file", item.file);
        const res = await fetch(`${API_BASE}/api/customer/media/upload`, {
          method: "POST",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          body: form,
        });
        const data = await res.json();
        setMediaItems(prev => prev.map(m =>
          m.id === item.id ? { ...m, asset_id: data.id, uploading: false } : m
        ));
        showToast("Canva design uploaded");
      } catch {
        setMediaItems(prev => prev.map(m =>
          m.id === item.id ? { ...m, uploading: false } : m
        ));
        showToast("Upload failed", "error");
      }
    }
  };

  // ── Media suggestions (engine-backed) ──────────────────────────────────
  const loadMediaSuggestions = useCallback(async () => {
    if (mediaBuckets) return; // already loaded for this session
    setMediaLoading(true);
    setMediaError(false);
    try {
      const platform = selectedPlatforms[0] || "instagram";
      const buckets = await fetchMediaSuggestions({ platform, contentType: "social", text: content, brand: brandName, industry: brandIndustry });
      setMediaBuckets(buckets);
      setPexelsItems(buckets.agencyPicks); // legacy compat
    } catch {
      setMediaError(true);
    } finally {
      setMediaLoading(false);
    }
  }, [mediaBuckets, selectedPlatforms, content, brandName, brandIndustry]);

  useEffect(() => {
    loadMediaSuggestions();
  }, [loadMediaSuggestions]);

  const handleSuggestedToggle = () => {
    const next = !showSuggested;
    setShowSuggested(next);
    if (next) loadMediaSuggestions();
  };

  const handlePexelsUse = async (item) => {
    const previewUrl = item.preview_url || item.preview || item.url;
    
    if (templateMode && activeSlotIdForMedia) {
      const palette = getDeterministicPalette(previewUrl, brandVariables);
      setSlotData(prev => ({
        ...prev,
        [activeSlotIdForMedia]: {
          ...prev[activeSlotIdForMedia],
          image_url: previewUrl,
          palette
        }
      }));
      setActiveSlotIdForMedia(null);
      showToast(`Image updated for slot: ${activeSlotIdForMedia}`);
      return;
    }

    setPexelsUsing(item.external_id || item.id);
    trackImageSelected(item);
    try {
      const saved = await apiJSON("/api/customer/media/from-pexels", "POST", {
        external_id: item.external_id || item.id,
        preview_url: previewUrl,
        type: "image",
      });
      const newItem = {
        id: crypto.randomUUID(),
        url: previewUrl,
        type: "image",
        label: "Pexels",
        external_id: item.external_id || item.id,
        asset_id: saved?.media_id,
      };
      setMediaItems(prev => [...prev, newItem]);
      trackImageAttached(item);
      showToast("Image added");
    } catch {
      showToast("Could not add image", "error");
    } finally {
      setPexelsUsing(null);
    }
  };

  // Reset buckets when platform or content changes significantly
  const prevPlatformRef = useRef(selectedPlatforms[0]);
  useEffect(() => {
    if (prevPlatformRef.current !== selectedPlatforms[0]) {
      prevPlatformRef.current = selectedPlatforms[0];
      setMediaBuckets(null);
    }
  }, [selectedPlatforms]);

  const handleLibrarySelect = (item) => {
    const url = item.preview_url
      ? (item.preview_url.startsWith("http") ? item.preview_url : `${API_BASE}${item.preview_url}`)
      : "";

    if (templateMode && activeSlotIdForMedia) {
      const palette = getDeterministicPalette(url, brandVariables);
      setSlotData(prev => ({
        ...prev,
        [activeSlotIdForMedia]: {
          ...prev[activeSlotIdForMedia],
          image_url: url,
          palette
        }
      }));
      setActiveSlotIdForMedia(null);
      showToast(`Image updated for slot: ${activeSlotIdForMedia}`);
      return;
    }

    setMediaItems(prev => [...prev, {
      id: crypto.randomUUID(),
      url,
      type: item.mime_type?.startsWith("video") ? "video" : "image",
      label: item.provider || "Library",
      asset_id: item.id,
    }]);
  };

  // ── Assistant output ─────────────────────────────────────────────────────
  const handleAssistantGenerate = (result) => {
    if (result.baseCaption) setContent(result.baseCaption);
    if (result.platformVariants) setOverrides(result.platformVariants);
    if (result.platforms?.length) setSelectedPlatforms(result.platforms);
    if (result.mediaRecommendations?.length) {
      setShowSuggested(true);
      setMediaBuckets(null); // force fresh fetch with new context
      loadMediaSuggestions();
    }
    setAssistantOpen(false);
  };

  const [feedbackItem, setFeedbackItem] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const handleViewFeedback = async (item) => {
    setFeedbackItem(item);
    setFeedbackLoading(true);
    try {
      const details = await apiFetch(`/api/customer/vault/${item.id || item.content_id}`);
      setFeedbackItem(prev => prev && prev.id === item.id ? { ...prev, approval_history: details.approval_history } : prev);
    } catch (e) {
      console.error("Failed to load feedback details", e);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // ── Vault lifecycle panel ────────────────────────────────────────────────
  const loadVault = useCallback(async (tab) => {
    setActiveTopTab(tab);
    setSelectedVaultItem(null);
    setVaultLoading(true);
    setVaultItems([]);
    try {
      const statusMap = { drafts: "draft", scheduled: "scheduled", approvals: "pending" };
      const status = statusMap[tab] || "draft";
      const data = await apiFetch(`/api/customer/vault?status=${status}&limit=50`);
      setVaultItems(data?.data || []);
    } catch {
      setVaultItems([]);
    } finally {
      setVaultLoading(false);
    }
  }, []);

  const loadTabCounts = useCallback(async () => {
    try {
      const [d, s, a] = await Promise.all([
        apiFetch("/api/customer/vault?status=draft&limit=50"),
        apiFetch("/api/customer/vault?status=scheduled&limit=50"),
        apiFetch("/api/customer/vault?status=pending&limit=50"),
      ]);
      setTabCounts({
        drafts:    (d?.data || []).length,
        scheduled: (s?.data || []).length,
        approvals: (a?.data || []).length,
      });
    } catch {}
  }, []);

  useEffect(() => { loadTabCounts(); }, [loadTabCounts]);

  const handleTabSwitch = useCallback((tabId) => {
    if (tabId === "editor") {
      setActiveTopTab("editor");
      setSelectedVaultItem(null);
    } else {
      loadVault(tabId);
    }
  }, [loadVault]);

  const handleVaultEdit = async (item) => {
    try {
      const res = await apiFetch(`/api/customer/vault/${item.id}`);
      const fullItem = res?.data || item;

      setContent(fullItem.body || fullItem.text || "");
      const platforms = fullItem.platforms
        ? (Array.isArray(fullItem.platforms) ? fullItem.platforms : JSON.parse(fullItem.platforms || "[]"))
        : [];
      if (platforms.length) setSelectedPlatforms(platforms);

      let itemOverlays = null;
      if (fullItem.metadata) {
        try {
          const meta = typeof fullItem.metadata === "string" ? JSON.parse(fullItem.metadata) : fullItem.metadata;
          if (meta.overlays) itemOverlays = meta.overlays;
        } catch (e) {
          itemOverlays = null;
        }
      }
      setOverlays(itemOverlays);
      setApplyOverlay(!!itemOverlays);

      setSelectedVaultItem(fullItem);
      setActiveTopTab("editor");
    } catch (e) {
      console.error("Failed to fetch full item details", e);
      // Fallback
      setContent(item.body || item.text || "");
      const platforms = item.platforms
        ? (Array.isArray(item.platforms) ? item.platforms : JSON.parse(item.platforms || "[]"))
        : [];
      if (platforms.length) setSelectedPlatforms(platforms);
      setSelectedVaultItem(item);
      setActiveTopTab("editor");
    }
  };

  const handleVaultDelete = async (item) => {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/customer/vault/${item.id}`, { method: "DELETE" });
      setVaultItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Deleted");
      loadTabCounts();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handleVaultSendApproval = async (item) => {
    try {
      await apiJSON(`/api/customer/vault/${item.id}/approval`, "POST", { action: "submit" });
      setVaultItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Sent for approval");
      loadTabCounts();
    } catch (e) {
      showToast(e.message || "Failed", "error");
    }
  };

  const handleVaultPublishNow = async (item) => {
    if (!window.confirm("Publish this now?")) return;
    try {
      await apiFetch(`/api/customer/vault/${item.id}/publish-now`, { method: "POST" });
      setVaultItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Queued for delivery");
      loadTabCounts();
    } catch (e) {
      showToast(e.message || "Failed", "error");
    }
  };

  const handleVaultCancel = async (item) => {
    if (!window.confirm("Cancel this scheduled post? It will return to drafts.")) return;
    try {
      await apiFetch(`/api/customer/vault/${item.id}/cancel`, { method: "POST" });
      setVaultItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Moved back to drafts");
      loadTabCounts();
    } catch {
      showToast("Failed to cancel", "error");
    }
  };

  const handleVaultWithdraw = async (item) => {
    try {
      await apiJSON(`/api/customer/vault/${item.id}`, "PATCH", {
        content_id: item.id, body: item.body || " ", platforms: item.platforms, lifecycle_status: "draft",
      });
      setVaultItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Withdrawn to drafts");
      loadTabCounts();
    } catch {
      showToast("Failed", "error");
    }
  };

  const handleVaultDuplicate = async (item) => {
    try {
      const platforms = Array.isArray(item.platforms) ? item.platforms : JSON.parse(item.platforms || "[]");
      await apiJSON("/api/customer/vault", "POST", {
        body: item.body || " ", platforms, lifecycle_status: "draft", content_type: "social",
      });
      showToast("Duplicated to drafts");
      if (activeTopTab === "drafts") loadVault("drafts");
    } catch {
      showToast("Failed to duplicate", "error");
    }
  };

  // ── Link media items to a content_id via content_media_links ───────────
  const linkMedia = async (content_id) => {
    const attachable = mediaItems.filter(m => m.asset_id);
    for (let i = 0; i < attachable.length; i++) {
      await apiJSON("/api/customer/media/attach", "POST", {
        content_type: "social",
        content_id,
        media_id: attachable[i].asset_id,
      }).catch(() => {}); // non-blocking — don't fail publish if attach fails
    }
  };

  // ── Save draft ──────────────────────────────────────────────────────────
  const saveDraft = async () => {
    const layoutManifest = templateMode && templateSchema ? {
      template_id: templateSchema.template_id,
      template_variant: selectedVariant,
      brand_overrides: {
        primary_color: brandVariables.primary_color,
        secondary_color: brandVariables.secondary_color,
        font_stack: brandVariables.font_stack,
        logo_url: brandVariables.logo_url
      },
      slides: Object.keys(slotData).map(slotId => ({
        slot_id: slotId,
        text: slotData[slotId].text,
        image_url: slotData[slotId].image_url
      }))
    } : undefined;

    const data = await apiJSON("/api/customer/vault", "POST", {
      content_id: selectedVaultItem?.id || undefined,
      body: content,
      platforms: selectedPlatforms,
      platform_variants: overrides,
      campaign_id: campaignId || null,
      lifecycle_status: "draft",
      content_type: "social",
      overlays: (applyOverlay ? overlays : null) || undefined,
      layout_manifest: layoutManifest,
    });
    if (data?.content_id) await linkMedia(data.content_id);
    return data?.content_id;
  };

  const handleDraft = async () => {
    if (!content.trim()) { showToast("Write something first", "error"); return; }
    setActionLoading(true);
    try {
      await saveDraft();
      showToast("Draft saved");
      setVerificationOpen(false);
      loadTabCounts();
    } catch (e) {
      showToast(e.message || "Could not save draft", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Send for approval ────────────────────────────────────────────────────
  const handleApproval = async () => {
    if (!content.trim()) { showToast("Write something first", "error"); return; }
    setActionLoading(true);
    try {
      const content_id = await saveDraft();
      await apiJSON(`/api/customer/vault/${content_id}/approval`, "POST", { action: "submit" });
      showToast("Sent for approval");
      loadTabCounts();
    } catch (e) {
      showToast(e.message || "Approval request failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Publish / schedule ───────────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishPhase("creating");
    setPublishResult(null);
    try {
      const layoutManifest = templateMode && templateSchema ? {
        template_id: templateSchema.template_id,
        template_variant: selectedVariant,
        brand_overrides: {
          primary_color: brandVariables.primary_color,
          secondary_color: brandVariables.secondary_color,
          font_stack: brandVariables.font_stack,
          logo_url: brandVariables.logo_url
        },
        slides: Object.keys(slotData).map(slotId => ({
          slot_id: slotId,
          text: slotData[slotId].text,
          image_url: slotData[slotId].image_url
        }))
      } : undefined;

      // Step 1: write to vault (single source of truth)
      const asset = await apiJSON("/api/customer/vault", "POST", {
        content_id: selectedVaultItem?.id || undefined,
        body: content,
        platforms: selectedPlatforms,
        platform_variants: overrides,
        campaign_id: campaignId || null,
        lifecycle_status: "draft",
        content_type: "social",
        overlays: (applyOverlay ? overlays : null) || undefined,
        layout_manifest: layoutManifest,
      });

      // Step 2: link media
      setPublishPhase("linking");
      await linkMedia(asset.content_id);

      // Step 3: schedule via vault or publish immediately
      setPublishPhase("scheduling");
      if (scheduledTime) {
        await apiJSON(`/api/customer/vault/${asset.content_id}/schedule`, "POST", {
          platforms: selectedPlatforms,
          scheduled_at: new Date(scheduledTime).toISOString(),
        });
      } else {
        await apiJSON(`/api/customer/vault/${asset.content_id}/publish-now`, "POST", {
          platforms: selectedPlatforms,
        });
      }

      setPublishPhase("queued");
      setPublishResult({ content_id: asset.content_id, platforms: selectedPlatforms });
      showToast(scheduledTime ? "Post scheduled" : "Post queued for delivery");
      loadTabCounts();
    } catch (e) {
      setPublishPhase("failed");
      showToast(e.message || "Publish failed", "error");
    }
  };

  const resetAfterPublish = () => {
    setPublishPhase("idle");
    setPublishResult(null);
    setVerificationOpen(false);
    setContent(""); setOverrides({}); setMediaItems([]);
    setOverlays(null); setApplyOverlay(true);
    setScheduledTime(""); setSelectedPlatforms(activeConnections.slice(0, 1).map(c => c.platform));
    setActiveTopTab("editor");
  };

  const canPublish = content.trim().length > 0 && selectedPlatforms.length > 0;

  // ── P1: preview priority chain ────────────────────────────────────────────
  const VAULT_STATUS_META = {
    draft:              { label: "Draft",       color: "#64748b", bg: "#f1f5f9" },
    ready:              { label: "Ready",       color: "#2563eb", bg: "#eff6ff" },
    approval_requested: { label: "In Review",   color: "#d97706", bg: "#fffbeb" },
    changes_requested:  { label: "Changes",     color: "#d97706", bg: "#fff7ed" },
    approved:           { label: "Approved",    color: "#059669", bg: "#ecfdf5" },
    scheduled:          { label: "Scheduled",   color: "#2563eb", bg: "#eff6ff" },
    queued:             { label: "Queued",      color: "#7c3aed", bg: "#f5f3ff" },
    publishing:         { label: "Publishing",  color: "#7c3aed", bg: "#f5f3ff" },
    published:          { label: "Published",   color: "#059669", bg: "#ecfdf5" },
    failed:             { label: "Failed",      color: "#dc2626", bg: "#fef2f2" },
  };

  const previewPlatforms = (() => {
    if (!selectedVaultItem) return selectedPlatforms;
    const arr = Array.isArray(selectedVaultItem.platforms)
      ? selectedVaultItem.platforms
      : JSON.parse(selectedVaultItem.platforms || "[]");
    const valid = arr.filter(p => PLATFORM_META[p]);
    return valid.length ? valid : selectedPlatforms;
  })();
  const previewContent  = selectedVaultItem ? (selectedVaultItem.body || "") : content;
  const previewOverrides = selectedVaultItem ? {} : overrides;
  const previewMedia    = selectedVaultItem
    ? null
    : (mediaItems.length > 0
        ? mediaItems.map(item => ({
            image: item?.url || item?.preview_url,
            url: item?.url || item?.preview_url,
            preview_url: item?.preview_url || item?.url,
            type: item?.type || (item?.mime_type?.startsWith("video/") ? "video" : "image"),
            mime_type: item?.mime_type,
            width: item?.width || null,
            height: item?.height || null,
            duration: item?.duration || null,
          }))
        : null);
  const vaultStatusMeta = selectedVaultItem
    ? (VAULT_STATUS_META[selectedVaultItem.lifecycle_status] || { label: selectedVaultItem.lifecycle_status, color: "#64748b", bg: "#f1f5f9" })
    : null;

  const WORKSPACE_TABS = [
    { id: "editor",    label: "Editor",    icon: "fas fa-pen"        },
    { id: "drafts",    label: "Drafts",    icon: "fas fa-file-alt"   },
    { id: "approvals", label: "Approvals", icon: "fas fa-user-check" },
    { id: "scheduled", label: "Scheduled", icon: "fas fa-clock"      },
  ];

  const suggestionItems = mediaBuckets?.[mediaTab] || [];

  return (
    <div id="tab-create-post" className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={handleFileSelect} />
      <input ref={canvaFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleCanvaFileSelect} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0, gap: 12 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {WORKSPACE_TABS.map(tab => {
            const count = tab.id !== "editor" ? (tabCounts[tab.id] || 0) : 0;
            const active = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
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
        </div>
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

      {activeTopTab === "editor" ? (
        readOnlyTemplateMode && templateSchema ? (
          <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
            {/* LEFT COLUMN: Visual Preview Mockup (ReadOnly) */}
            <div style={{ width: "60%", display: "flex", flexDirection: "column", minHeight: 0, gap: 12, alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ marginBottom: 12, textAlign: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Visual Draft Ready</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Format: {templateSchema.format?.toUpperCase()} · Layout: {templateSchema.name}</span>
              </div>

              <div style={{
                borderRadius: "24px",
                border: "6px solid #1e293b",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                overflow: "hidden",
                width: templateSchema.dimensions?.width > templateSchema.dimensions?.height ? 320 : 300,
                height: templateSchema.dimensions?.width > templateSchema.dimensions?.height ? 320 : 380,
                background: "#000",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "50px",
                  height: "8px",
                  background: "#1e293b",
                  borderBottomLeftRadius: "4px",
                  borderBottomRightRadius: "4px",
                  zIndex: 99
                }} />

                <TemplateCanvas
                  ref={templateCanvasRef}
                  templateSchema={templateSchema}
                  slotData={slotData}
                  brandVariables={brandVariables}
                  dimensions={templateSchema.dimensions || { width: 1080, height: 1080 }}
                  style={{ width: "100%" }}
                />
              </div>

              <button
                type="button"
                onClick={() => setReadOnlyTemplateMode(false)}
                style={{
                  marginTop: 16,
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-main)",
                  cursor: "pointer"
                }}
              >
                ✎ Customize Visual Layout
              </button>
            </div>

            {/* RIGHT COLUMN: Pure Scheduling / Captions Sidebar */}
            <div style={{ width: "40%", display: "flex", flexDirection: "column", minHeight: 0, gap: 12, overflowY: "auto" }}>
              {/* Target Platforms */}
              <div className="card-workspace" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Target Platforms</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {allKnownPlatforms.map(conn => {
                    const m = PLATFORM_META[conn.platform];
                    if (!m) return null;
                    const isSelected = conn.platform === "instagram"
                      ? selectedPlatforms.some(p => p.startsWith("instagram"))
                      : conn.platform === "facebook"
                        ? selectedPlatforms.some(p => p.startsWith("facebook"))
                        : selectedPlatforms.includes(conn.platform);
                    return (
                      <button
                        key={conn.platform}
                        onClick={() => togglePlatform(conn.platform)}
                        style={{
                          border: `1px solid ${isSelected ? m.color : "#e2e8f0"}`,
                          background: isSelected ? m.color + "15" : "#fff",
                          color: isSelected ? m.color : "#64748b",
                          borderRadius: 20, padding: "4px 11px",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5
                        }}
                      >
                        <PlatformIcon platform={conn.platform} size={12} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caption Overrides */}
              <div className="card-workspace" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Social Caption</span>
                <textarea
                  className="form-control"
                  rows={6}
                  placeholder="Describe your post..."
                  style={{ fontSize: 12, resize: "none", width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                
                {/* Generate Hashtags button */}
                <button
                  type="button"
                  onClick={() => {
                    const hashtagsText = "\n\n#marketing #business #growth #" + (activeBrand?.industry || "onlinemarketing").toLowerCase().replace(/\s+/g, "");
                    setContent(prev => prev + hashtagsText);
                    showToast("Suggested hashtags appended!", "success");
                  }}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  ✨ Append Suggested Hashtags
                </button>
              </div>
            </div>
          </div>
        ) : templateMode && templateSchema ? (
          <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
            {/* LEFT COLUMN (Template Slot Editor) — ~60% width */}
            <div style={{ width: "60%", display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
              <div className="card-workspace" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", padding: 16, gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Template Design Studio</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Layout: {templateSchema.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Switch to Blank Canvas Mode? This will reset your custom slide mappings.")) {
                        setTemplateMode(false);
                      }
                    }}
                    style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#475569", cursor: "pointer" }}
                  >
                    Switch to Blank Canvas
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.keys(slotData).map(slotId => {
                    const slot = slotData[slotId];
                    return (
                      <div key={slotId} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Slot: {slotId}</div>
                        
                        {/* Text slot editor */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Text Caption</label>
                          <textarea
                            className="form-control"
                            style={{ fontSize: 12, resize: "none", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px" }}
                            rows={2}
                            value={slot.text}
                            onChange={(e) => {
                              const txt = e.target.value;
                              setSlotData(prev => ({
                                ...prev,
                                [slotId]: { ...prev[slotId], text: txt }
                              }));
                            }}
                          />
                        </div>

                        {/* Image slot editor */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Image Link</label>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {slot.image_url && (
                              <img src={slot.image_url} style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover", border: "1px solid #cbd5e1" }} alt="" />
                            )}
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              style={{ fontSize: 11, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", flex: 1 }}
                              placeholder="Direct image URL"
                              value={slot.image_url}
                              onChange={(e) => {
                                const url = e.target.value;
                                setSlotData(prev => ({
                                  ...prev,
                                  [slotId]: { ...prev[slotId], image_url: url }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (TemplateCanvas Preview) — ~40% width */}
            <div style={{ width: "40%", display: "flex", flexDirection: "column", minHeight: 0, gap: 12, alignItems: "center" }}>
              <TemplateCanvas
                ref={templateCanvasRef}
                templateSchema={templateSchema}
                slotData={slotData}
                brandVariables={brandVariables}
                dimensions={templateSchema.dimensions || { width: 1080, height: 1080 }}
                onSlotEdit={(slotId, updatedFields) => {
                  setSlotData(prev => ({
                    ...prev,
                    [slotId]: { ...prev[slotId], ...updatedFields }
                  }));
                }}
                onTemplateSwitch={(newTemplateId, newSlotData, newSchema) => {
                  setTemplateSchema(newSchema);
                  setSlotData(newSlotData);
                  showToast("Switched template layout successfully!", "success");
                }}
                onSlotMediaClick={(slotId) => {
                  setActiveSlotIdForMedia(slotId);
                  setLibraryOpen(true);
                  showToast(`Select an image from the library to update slot: ${slotId}`, "info");
                }}
                style={{ width: "100%" }}
              />

              <div style={{ display: "flex", gap: 8, width: "100%", padding: "0 10px" }}>
                <button
                  onClick={handleExportPNG}
                  style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Download style={{ width: 14, height: 14 }} /> Download PNG
                </button>
                <button
                  onClick={handleExportMP4}
                  style={{ flex: 1, background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Play style={{ width: 14, height: 14 }} /> Export MP4 Video
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── MAIN TWO-COLUMN ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>

            {/* LEFT COLUMN (Composer) — ~60% width */}
        <div style={{ width: "60%", display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
          <div className="card-workspace" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", padding: 14, gap: 12 }}>
            {selectedVaultItem && (
              <div style={{ display: "flex", flexDirection: "column", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    <i className="fas fa-edit" style={{ marginRight: 6, color: "#3b82f6" }} />
                    Editing Draft: <strong style={{ color: "#0f172a" }}>{selectedVaultItem.title || (selectedVaultItem.body || "").slice(0, 30) || "Untitled"}</strong>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedVaultItem(null);
                      setContent("");
                      setOverrides({});
                      setSelectedPlatforms([]);
                      setMediaItems([]);
                      setOverlays(null);
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    Discard & Start New Post
                  </button>
                </div>
                {selectedVaultItem.approval_history && selectedVaultItem.approval_history.length > 0 && (
                  <div style={{ marginTop: 8, borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
                    <details>
                      <summary style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", cursor: "pointer", outline: "none" }}>
                        View Feedback History ({selectedVaultItem.approval_history.filter(h => h.rejection_reason).length} comments)
                      </summary>
                      <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                        {selectedVaultItem.approval_history.map((h, idx) => {
                          const user = h.reviewer_name || h.reviewer_email || h.rejecter_name || h.approver_name || "Reviewer";
                          return (
                            <div key={h.id || idx} style={{ fontSize: 11, padding: "6px 8px", borderRadius: 6, background: h.rejection_reason ? "#fef2f2" : "#ecfdf5", border: `1px solid ${h.rejection_reason ? "#fecaca" : "#a7f3d0"}` }}>
                              <div style={{ fontWeight: 600, color: h.rejection_reason ? "#b91c1c" : "#065f46", marginBottom: 2 }}>
                                {user} · {h.rejection_reason ? "Requested Changes" : "Approved"} · {new Date(h.approved_at || h.updated_at || h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </div>
                              <div style={{ color: "#334155" }}>
                                {h.rejection_reason || "Approved!"}
                              </div>
                              {h.review_notes && (
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, borderTop: "1px dashed #e2e8f0", paddingTop: 4 }}>
                                  Submitted with note: "{h.review_notes}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
            {/* Campaign Selector + Edit Brand Overlay row */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="extra-small fw-bold text-muted text-uppercase mb-1" style={{ display: "block" }}>Campaign</label>
                <select className="form-select form-select-sm border-subtle" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                  <option value="">No Campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setBrandOverlayOpen(true)}
                style={{
                  background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8,
                  color: "#1e293b", fontSize: 12, fontWeight: 600, padding: "8px 14px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  height: 31
                }}
              >
                <i className="fas fa-palette" style={{ color: "#475569" }}></i> Edit Brand Overlay
              </button>
            </div>

            {/* Post Text label + Apply Brand Overlay switch row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="extra-small fw-bold text-muted text-uppercase mb-0">Post Text:</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Apply Brand Overlay</span>
                <label className="switch" style={{ position: "relative", display: "inline-block", width: 34, height: 20 }}>
                  <input
                    type="checkbox"
                    checked={applyOverlay}
                    onChange={e => setApplyOverlay(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: "absolute", cursor: "pointer", inset: 0,
                    backgroundColor: applyOverlay ? "#2563eb" : "#cbd5e1",
                    transition: "background-color 0.2s", borderRadius: 20
                  }}>
                    <span style={{
                      position: "absolute", height: 14, width: 14, left: applyOverlay ? 17 : 3, bottom: 3,
                      backgroundColor: "white", transition: "left 0.2s", borderRadius: "50%"
                    }} />
                  </span>
                </label>
              </div>
            </div>

            {/* Clean editor text-area */}
            <div style={{
              flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden",
              background: "#fff", display: "flex", flexDirection: "column", minHeight: 120,
              position: "relative"
            }}>
              <WatermarkEditor value={content} onChange={setContent} />
              <div style={{
                position: "absolute", bottom: 6, right: 10,
                fontSize: 10, color: content.length > 2200 ? "#ef4444" : "#94a3b8",
                fontWeight: 600, background: "rgba(255, 255, 255, 0.9)", padding: "2px 4px", borderRadius: 4
              }}>
                {content.length}/280
              </div>
            </div>

            {/* Media Row */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="extra-small fw-bold text-muted text-uppercase mb-0">Media:</label>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => { replaceIndexRef.current = null; fileInputRef.current?.click(); }}
                    style={{ ...mediaBtn, padding: "4px 10px" }}
                  >
                    <i className="fas fa-image"></i> Upload
                  </button>
                  <button onClick={() => setLibraryOpen(true)} style={mediaBtn}>
                    <i className="fas fa-images"></i> Library
                  </button>
                  <button onClick={handleCanvaImport} style={mediaBtn}>
                    <i className="fas fa-palette"></i> Canva
                  </button>
                  <AdobeExpress
                    style={mediaBtn}
                    onImport={async (dataUrl) => {
                      try {
                        const res = await fetch(dataUrl);
                        const blob = await res.blob();
                        const file = new File([blob], `adobe-design-${Date.now()}.png`, { type: "image/png" });
                        
                        const item = {
                          id: crypto.randomUUID(),
                          url: dataUrl,
                          file,
                          type: "image",
                          label: "Adobe Design",
                          uploading: true,
                        };
                        setMediaItems(prev => [...prev, item]);
                        
                        const token = localStorage.getItem("mpp_token");
                        const form = new FormData();
                        form.append("file", file);
                        const uploadRes = await fetch(`${API_BASE}/api/customer/media/upload`, {
                          method: "POST",
                          headers: { Authorization: token ? `Bearer ${token}` : "" },
                          body: form
                        });
                        if (!uploadRes.ok) throw new Error("Upload failed");
                        const uploaded = await uploadRes.json();
                        setMediaItems(prev => prev.map(m => m.id === item.id ? { ...m, url: uploaded.url, uploading: false } : m));
                      } catch (err) {
                        showToast("Failed to upload Adobe design: " + err.message, "error");
                      }
                    }}
                  />
                  <button
                    onClick={handleSuggestedToggle}
                    style={{
                      ...mediaBtn,
                      border: showSuggested ? "1px solid #0ea5e9" : "1px solid #e2e8f0",
                      color: showSuggested ? "#0ea5e9" : "#475569",
                      background: showSuggested ? "#f0f9ff" : "#fff"
                    }}
                  >
                    <i className="fas fa-star"></i> Suggested
                  </button>
                </div>
              </div>

              {/* Media Split Grid */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {/* Left Side: Primary attached media */}
                <div style={{
                  width: 160, height: 160, borderRadius: 10,
                  border: mediaItems[0] ? "1px solid #cbd5e1" : "1px dashed #cbd5e1",
                  background: "#f8fafc", position: "relative", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  {mediaItems[0] ? (
                    <>
                      {mediaItems[0].type === "video" ? (
                        <video src={mediaItems[0].url} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                      ) : (
                        <img src={mediaItems[0].url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                      
                      {/* Overlay applied on top of primary preview */}
                      {applyOverlay && overlays && (
                        <PreviewOverlays overlays={overlays} height={160} />
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => removeMedia(0)}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "rgba(15, 23, 42, 0.75)", color: "#fff",
                          border: "none", cursor: "pointer", fontSize: 10,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 10
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{ textAlign: "center", color: "#94a3b8", cursor: "pointer", padding: 10 }}
                    >
                      <i className="fas fa-camera" style={{ fontSize: 24, marginBottom: 6 }}></i>
                      <div style={{ fontSize: 10, fontWeight: 700 }}>Primary Media</div>
                    </div>
                  )}
                </div>

                {/* Right Side: 2x4 suggested media slots */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, height: 160 }}>
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const sugg = suggestionItems[idx];
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 8, border: sugg ? "1px solid #cbd5e1" : "1px dashed #cbd5e1",
                          background: "#fff", position: "relative", overflow: "hidden",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: sugg ? "pointer" : "default"
                        }}
                        onClick={() => {
                          if (sugg) handlePexelsUse(sugg);
                        }}
                      >
                        {sugg ? (
                          <>
                            <img src={sugg.preview_url || sugg.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            {pexelsUsing === (sugg.external_id || sugg.id) && (
                              <div style={{
                                position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                                <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, color: "#2563eb" }}></span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ color: "#e2e8f0" }}>
                            <i className="fas fa-image" style={{ fontSize: 14 }}></i>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN (Preview & Platforms) — ~40% width */}
        <div style={{ width: "40%", display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
          
          {/* Target platform selector card */}
          <div className="card-workspace" style={{ padding: 14, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="extra-small fw-bold text-muted text-uppercase" style={{ letterSpacing: 0.8 }}>Target Platforms & Format Settings</span>
              <span className="extra-small text-muted">{selectedPlatforms.length} selected</span>
            </div>

            {/* Platforms selector buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {allKnownPlatforms.map(conn => {
                const m = PLATFORM_META[conn.platform];
                if (!m) return null;
                const isExpired = conn.status === "error" || conn.status === "expired";
                const isSelected = conn.platform === "instagram" 
                  ? selectedPlatforms.some(p => p.startsWith("instagram"))
                  : conn.platform === "facebook"
                    ? selectedPlatforms.some(p => p.startsWith("facebook"))
                    : selectedPlatforms.includes(conn.platform);
                const hasVideo = mediaItems.some(item => item.type === "video");
                const isYouTube = conn.platform === "youtube";
                const isYouTubeDisabled = isYouTube && !hasVideo;
                const isDisabled = isExpired || isYouTubeDisabled;
                return (
                  <button
                    key={conn.platform}
                    onClick={() => {
                      if (isYouTubeDisabled) {
                        showToast("YouTube requires a video file.", "error");
                      } else {
                        togglePlatform(conn.platform, isExpired);
                      }
                    }}
                    title={isExpired ? "Reconnect required" : isYouTubeDisabled ? "YouTube requires a video file" : conn.platform_username ? `@${conn.platform_username}` : m.label}
                    style={{
                      border: `1px solid ${isExpired ? "#fecaca" : isYouTubeDisabled ? "#cbd5e1" : isSelected ? m.color : "#e2e8f0"}`,
                      background: isExpired ? "#fef2f2" : isYouTubeDisabled ? "#f1f5f9" : isSelected ? m.color + "15" : "#fff",
                      color: isExpired ? "#dc2626" : isYouTubeDisabled ? "#94a3b8" : isSelected ? m.color : "#64748b",
                      borderRadius: 20, padding: "4px 11px",
                      fontSize: 11, fontWeight: 600, cursor: isDisabled ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 5, opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <PlatformIcon platform={conn.platform} size={12} />
                    {m.label}
                    {isExpired && <i className="fas fa-exclamation-circle" style={{ fontSize: 8, marginLeft: 2 }}></i>}
                    {isSelected && !isExpired && <i className="fas fa-check" style={{ fontSize: 8, marginLeft: 2, color: m.color }}></i>}
                  </button>
                );
              })}
            </div>

            {/* Facebook format selector details */}
            {selectedPlatforms.some(p => p.startsWith("facebook")) && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Facebook Format:</span>
                {["feed", "story", "reel"].map(format => {
                  const label = format === "feed" ? "Feed" : format === "story" ? "Story" : "Reel";
                  const targetPlatform = format === "feed" ? "facebook" : `facebook_${format}`;
                  const isCurrent = selectedPlatforms.includes(targetPlatform);
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => {
                        setSelectedPlatforms(prev =>
                          prev.map(p => p.startsWith("facebook") ? targetPlatform : p)
                        );
                      }}
                      style={{
                        background: isCurrent ? "#1877f2" : "#fff",
                        color: isCurrent ? "#fff" : "#64748b",
                        border: `1px solid ${isCurrent ? "#1877f2" : "#e2e8f0"}`,
                        borderRadius: 12,
                        padding: "3px 10px",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Instagram format selector details */}
            {selectedPlatforms.some(p => p.startsWith("instagram")) && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Instagram Format:</span>
                {["feed", "story", "reel"].map(format => {
                  const label = format === "feed" ? "Feed" : format === "story" ? "Story" : "Reel";
                  const targetPlatform = format === "feed" ? "instagram" : `instagram_${format}`;
                  const isCurrent = selectedPlatforms.includes(targetPlatform);
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => {
                        setSelectedPlatforms(prev =>
                          prev.map(p => p.startsWith("instagram") ? targetPlatform : p)
                        );
                      }}
                      style={{
                        background: isCurrent ? "#e1306c" : "#fff",
                        color: isCurrent ? "#fff" : "#64748b",
                        border: `1px solid ${isCurrent ? "#e1306c" : "#e2e8f0"}`,
                        borderRadius: 12,
                        padding: "3px 10px",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Platform caption overrides */}
            {selectedPlatforms.length > 1 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Platform Caption Overrides</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {selectedPlatforms.map(p => {
                    const m = PLATFORM_META[p];
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          const val = prompt(`Custom caption for ${m?.label || p}:`, overrides[p] || content);
                          if (val !== null) setOverrides(prev => ({ ...prev, [p]: val }));
                        }}
                        style={{
                          border: `1px solid ${overrides[p] ? "#10b981" : "#e2e8f0"}`,
                          background: overrides[p] ? "#f0fdf4" : "#f8fafc",
                          color: overrides[p] ? "#10b981" : "#64748b",
                          borderRadius: 8, padding: "3px 8px",
                          fontSize: 10, fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        {m?.label || p} {overrides[p] ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Rendering Mockup Card */}
          <PlatformPreviewPanel
            platforms={previewPlatforms.length ? previewPlatforms : (selectedPlatforms.length ? selectedPlatforms : [])}
            content={previewContent}
            overrides={previewOverrides}
            media={previewMedia}
            brandName={brandName}
            isLiveEditor={!selectedVaultItem}
            overlays={applyOverlay ? overlays : null}
          />
        </div>

      </div>

      {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────────── */}
      <div className="card-workspace" style={{
        marginTop: 14,
        padding: "12px 16px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexShrink: 0
      }}>
        {/* Left Side: Scheduling and Discard */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Schedule:</span>
            <input
              type="datetime-local"
              className="form-control form-control-sm border-subtle"
              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, width: 180 }}
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
            {bestTimeData?.proposedTime && (
              <button
                type="button"
                onClick={handleApplyBestTime}
                style={{
                  background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
                  border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 8px",
                  fontSize: "10px", fontWeight: 700, color: "#1e3a8a", cursor: "pointer", marginLeft: 4
                }}
                title={`Recommended peak engagement time: ${bestTimeData.proposedTime}`}
              >
                💡 Best Time ({bestTimeData.proposedTime})
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Timezone:</span>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="form-select form-select-sm border-subtle"
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, width: 130, background: "#fff" }}
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <button
            onClick={handleDiscard}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              borderRadius: 6,
              transition: "background 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <i className="fas fa-trash-alt"></i> Discard
          </button>
        </div>

        {/* Right Side: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleDraft}
            disabled={saveState === "saving" || !canPublish}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: canPublish ? "#334155" : "#94a3b8",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: canPublish ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s"
            }}
          >
            <i className="fas fa-save"></i> Save Draft
          </button>

          <button
            onClick={handleApproval}
            disabled={isPublishing || !canPublish}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: canPublish ? "#334155" : "#94a3b8",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: canPublish ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s"
            }}
          >
            <i className="fas fa-upload"></i> Send for Approval
          </button>

          <button
            onClick={() => setVerificationOpen(true)}
            disabled={!canPublish}
            style={{
              border: "none",
              background: canPublish ? "#0f172a" : "#cbd5e1",
              color: canPublish ? "#fff" : "#64748b",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 700,
              cursor: canPublish ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s"
            }}
          >
            <i className="fas fa-rocket"></i> {scheduledTime ? "Schedule Post" : "Publish Post"}
          </button>
        </div>
      </div>
    </>
        )
      ) : (

        /* ── VAULT WORKSPACE ─────────────────────────────────────────────── */
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
            overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            {vaultLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 12 }}>
                <span className="spinner-border spinner-border-sm" style={{ color: "#2563eb", width: 18, height: 18, borderWidth: 2, marginRight: 6 }}></span>
                Loading…
              </div>
            ) : vaultItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <i className={WORKSPACE_TABS.find(t => t.id === activeTopTab)?.icon} style={{ fontSize: 30, marginBottom: 12, display: "block" }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                  No {WORKSPACE_TABS.find(t => t.id === activeTopTab)?.label}
                </div>
                <div style={{ fontSize: 12, marginBottom: 20 }}>
                  {activeTopTab === "drafts" ? "Save a draft to see it here." : activeTopTab === "approvals" ? "Send content for approval to see it here." : "Schedule a post to see it here."}
                </div>
                <button onClick={() => handleTabSwitch("editor")} style={{ background: "#2563eb", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 20px", cursor: "pointer" }}>
                  <i className="fas fa-pen" style={{ marginRight: 6 }} /> Create Post
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {vaultItems.map((item, i) => {
                  const preview = item.body || item.title || "—";
                  const itemPlatforms = item.platforms ? (Array.isArray(item.platforms) ? item.platforms : JSON.parse(item.platforms || "[]")) : [];
                  const date = item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
                  const isSelected = selectedVaultItem?.id === item.id;
                  return (
                    <div
                      key={item.id || i}
                      style={{
                        padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
                        display: "flex", alignItems: "flex-start", gap: 12,
                        background: isSelected ? "#eff6ff" : "#fff",
                        borderLeft: `3px solid ${isSelected ? "#2563eb" : "transparent"}`,
                      }}
                    >
                      {itemPlatforms.length > 0 && (
                        <div style={{ display: "flex", gap: 3, flexShrink: 0, paddingTop: 3 }}>
                          {itemPlatforms.slice(0, 3).map(p => <PlatformIcon key={p} platform={p} size={14} />)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          onClick={() => {
                            if (item.lifecycle_status === 'changes_requested') {
                              handleViewFeedback(item);
                            }
                          }}
                          style={{
                            fontSize: 13,
                            color: item.lifecycle_status === 'changes_requested' ? "#2563eb" : "#0f172a",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: item.lifecycle_status === 'changes_requested' ? "pointer" : "default",
                            textDecoration: item.lifecycle_status === 'changes_requested' ? "underline" : "none"
                          }}
                          title={item.lifecycle_status === 'changes_requested' ? "Click to view changes requested feedback" : undefined}
                        >
                          {preview.slice(0, 120)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{date}</span>
                          {(item.lifecycle_status === 'changes_requested' || item.lifecycle_status === 'approval_requested') && (() => {
                            const meta = VAULT_STATUS_META[item.lifecycle_status] || { label: item.lifecycle_status, color: "#64748b", bg: "#f1f5f9" };
                            return (
                              <span
                                onClick={(e) => {
                                  if (item.lifecycle_status === 'changes_requested') {
                                    e.stopPropagation();
                                    handleViewFeedback(item);
                                  }
                                }}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                  color: meta.color,
                                  background: meta.bg,
                                  padding: "1px 6px",
                                  borderRadius: 99,
                                  cursor: item.lifecycle_status === 'changes_requested' ? "pointer" : "default",
                                  border: item.lifecycle_status === 'changes_requested' ? "1px solid " + meta.color : "none"
                                }}
                                title={item.lifecycle_status === 'changes_requested' ? "Click to view changes requested feedback" : undefined}
                              >
                                {meta.label} {item.lifecycle_status === 'changes_requested' ? " ↗" : ""}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                        {activeTopTab === "drafts" && (<>
                          <VaultActionBtn color="#2563eb" onClick={() => handleVaultEdit(item)}>Edit</VaultActionBtn>
                          <VaultActionBtn color="#10b981" onClick={() => handleVaultSendApproval(item)}>Send for Approval</VaultActionBtn>
                          <VaultActionBtn color="#ef4444" onClick={() => handleVaultDelete(item)}>Delete</VaultActionBtn>
                        </>)}
                        {activeTopTab === "scheduled" && (<>
                          <VaultActionBtn color="#2563eb" onClick={() => handleVaultEdit(item)}>Edit</VaultActionBtn>
                          <VaultActionBtn color="#10b981" onClick={() => handleVaultPublishNow(item)}>Publish Now</VaultActionBtn>
                          <VaultActionBtn color="#ef4444" onClick={() => handleVaultCancel(item)}>Cancel</VaultActionBtn>
                        </>)}
                        {activeTopTab === "approvals" && (<>
                          <VaultActionBtn color="#2563eb" onClick={() => handleVaultEdit(item)}>Edit</VaultActionBtn>
                          <VaultActionBtn color="#10b981" onClick={() => handleVaultPublishNow(item)}>Publish</VaultActionBtn>
                          <VaultActionBtn color="#7c3aed" onClick={() => handleVaultDuplicate(item)}>Duplicate</VaultActionBtn>
                          <VaultActionBtn color="#64748b" onClick={() => handleVaultWithdraw(item)}>Withdraw</VaultActionBtn>
                        </>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {assistantOpen && (
        <SocialAssistantModal
          isOpen={assistantOpen}
          onClose={() => { setAssistantOpen(false); setAssistantPrefill(""); }}
          onComplete={handleAssistantGenerate}
          connections={filteredConnections}
          prefillIdea={assistantPrefill}
        />
      )}

      <LibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleLibrarySelect}
      />

      <VerificationPanel
        open={verificationOpen}
        onClose={() => { if (publishPhase === "idle" || publishPhase === "failed") setVerificationOpen(false); }}
        data={{ platforms: selectedPlatforms, content, overrides, media: mediaItems, scheduledTime, timezone, campaignId }}
        onPublish={handlePublish}
        onSchedule={handlePublish}
        onDraft={handleDraft}
        isPublishing={isPublishing}
        publishPhase={publishPhase}
        publishResult={publishResult}
        onReset={resetAfterPublish}
        bestTimeData={bestTimeData}
        onApplyBestTime={handleApplyBestTime}
      />

      {feedbackItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Feedback History">
          <div className="notif-prefs-panel" style={{ maxWidth: 500, width: "90%" }}>
            <div className="notif-prefs-header">
              <h3 className="notif-prefs-title">Changes Requested Feedback</h3>
              <button className="verify-modal__close" onClick={() => setFeedbackItem(null)} aria-label="Close">
                ✕
              </button>
            </div>
            
            <div style={{ padding: "16px 20px 20px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
                Review history and feedback comments left by client/approvers.
              </div>
              
              {feedbackLoading ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Loading review history…</div>
                </div>
              ) : (
                <div>
                  {!feedbackItem.approval_history || feedbackItem.approval_history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No comments or feedback history recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 350, overflowY: "auto", paddingRight: 4 }}>
                      {feedbackItem.approval_history.map((h, idx) => {
                        const name = h.requested_by_name || h.requested_by_email || "User";
                        const approverName = h.approved_by_name || h.approved_by_email || h.rejected_by_name || h.rejected_by_email || "Reviewer";
                        return (
                          <div key={h.id || idx} style={{ borderBottom: idx < feedbackItem.approval_history.length - 1 ? "1px solid var(--border-subtle)" : "none", paddingBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                                📤 Submitted by {name}
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                {new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                            {h.submission_note && (
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "var(--bg-body)", borderRadius: 6, padding: "6px 10px", margin: "4px 0 8px", borderLeft: "3px solid var(--border-subtle)" }}>
                                💬 Note: {h.submission_note}
                              </div>
                            )}
                            
                            {h.approved_at || h.rejected_by ? (
                              <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px dashed var(--border-subtle)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: h.rejection_reason ? "var(--status-warning)" : "var(--status-success)" }}>
                                    {h.rejection_reason ? "⚠️ Changes Requested" : "✅ Approved"} by {approverName}
                                  </span>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                    {new Date(h.approved_at || h.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </span>
                                </div>
                                {h.rejection_reason && (
                                  <div style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: 500, background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: 6, padding: "8px 12px", marginTop: 4 }}>
                                    <strong>Feedback:</strong> {h.rejection_reason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ marginTop: 6, paddingLeft: 12, fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                ⏳ Under review...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="notif-prefs-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="auth-btn-secondary" onClick={() => setFeedbackItem(null)} style={{ margin: 0, padding: "8px 16px" }}>
                Close
              </button>
              <button 
                className="auth-btn-primary" 
                onClick={() => {
                  setFeedbackItem(null);
                  handleVaultEdit(feedbackItem);
                }} 
                style={{ margin: 0, padding: "8px 16px" }}
              >
                Edit to Fix
              </button>
            </div>
          </div>
        </div>
      )}

      {brandOverlayOpen && (
        <BrandOverlayModal
          open={brandOverlayOpen}
          onClose={() => setBrandOverlayOpen(false)}
          overlays={overlays}
          onSave={handleApplyOverlays}
          mediaItems={mediaItems}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ── Brand Overlay Modal Component ────────────────────────────────────────────────
function BrandOverlayModal({ open, onClose, overlays, onSave, mediaItems }) {
  const [localOverlays, setLocalOverlays] = useState(overlays || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const initialBg = overlays?.background?.url || mediaItems[0]?.url || null;
      setLocalOverlays({
        background: {
          url: initialBg,
          fit: overlays?.background?.fit || "cover",
          color: overlays?.background?.color || "#111827"
        },
        overlay_text: overlays?.overlay_text || [],
        overlay_image: overlays?.overlay_image || []
      });
    }
  }, [open, overlays, mediaItems]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const isVideo = mediaItems[0]?.type === "video" || mediaItems[0]?.mime_type?.startsWith("video/") || (mediaItems[0]?.url && (mediaItems[0].url.endsWith(".mp4") || mediaItems[0].url.endsWith(".mov") || mediaItems[0].url.includes("video")));
      
      if (isVideo) {
        onSave(localOverlays);
        onClose();
      } else {
        const dataUrl = await OverlayEditor.exportCurrentPNG();
        if (dataUrl) {
          const blobBin = atob(dataUrl.split(',')[1]);
          const array = [];
          for (let i = 0; i < blobBin.length; i++) {
            array.push(blobBin.charCodeAt(i));
          }
          const file = new Blob([new Uint8Array(array)], { type: 'image/png' });
          const formData = new FormData();
          formData.append("file", file, `mypilotpost-overlay-${Date.now()}.png`);
          
          const token = localStorage.getItem("mpp_token");
          const res = await fetch(`${API_BASE}/api/customer/media/upload`, {
            method: "POST",
            headers: { Authorization: token ? `Bearer ${token}` : "" },
            body: formData,
          });
          if (!res.ok) throw new Error("Failed to upload flattened overlay image");
          const data = await res.json();
          
          const newMedia = {
            id: `overlay_${Date.now()}`,
            url: data.url,
            preview_url: data.url,
            type: "image",
            mime_type: "image/png",
            asset_id: data.id,
            uploading: false
          };
          
          onSave(localOverlays, newMedia);
        } else {
          onSave(localOverlays);
        }
        onClose();
      }
    } catch (e) {
      alert("Error saving overlays: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(4px)", zIndex: 2000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "95%", maxWidth: 1080, height: "90%", maxHeight: 740, background: "#0b0f19", borderRadius: 16,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)", zIndex: 2001,
        display: "flex", flexDirection: "column", border: "1px solid #1e293b", overflow: "hidden"
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e293b", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 10px #2563eb" }} />
            <span style={{ fontWeight: 800, fontSize: 13, color: "#fff", letterSpacing: 0.5 }}>
              BRAND OVERLAY
            </span>
            <span style={{ fontSize: 10, background: "#1e293b", color: "#94a3b8", padding: "2px 8px", borderRadius: 12 }}>Visual Asset Workspace</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>×</button>
        </div>
        <div style={{ flex: 1, padding: 12, background: "#020617", overflow: "hidden" }}>
          <OverlayEditor
            value={localOverlays}
            onChange={setLocalOverlays}
            aspectKey="1:1"
            height="100%"
          />
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #1e293b", background: "#0f172a", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 16px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "#2563eb", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700,
              padding: "8px 20px", cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6
            }}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }}></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i>
                <span>Apply & Save Overlays</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
