import React, { useState, useRef, useEffect, useCallback } from "react";
import PlatformPreviewPanel from "../components/publishing/PlatformPreviewPanel";
import SocialAssistantModal from "../components/shared/SocialAssistantModal";
import PlatformIcon from "../components/shared/PlatformIcon";
import { validateContent } from "../lib/platformRequirements";
import { fetchMediaSuggestions, trackImageSelected, trackImageAttached } from "../services/mediaSuggestions";

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
  facebook:  { label: "Facebook",  icon: "fab fa-facebook",  color: "#1877f2" },
  instagram: { label: "Instagram", icon: "fab fa-instagram", color: "#e1306c" },
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

function VerificationPanel({ open, onClose, data, onPublish, onSchedule, onDraft, isPublishing, publishPhase, publishResult, onReset }) {
  const { platforms, content, overrides, media, scheduledTime, timezone } = data;
  const validations = platforms.map(p => ({
    platform: p,
    result: validateContent(p, overrides[p] || content, media.length > 0 ? "image" : null, null),
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
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 2 }}>Scheduled for</div>
              <div style={{ fontSize: 12, color: "#1e40af" }}>{new Date(scheduledTime).toLocaleString()} · {timezone}</div>
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
  brandTimezone = null,
}) {
  const [content, setContent]               = useState("");
  const [overrides, setOverrides]           = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [mediaItems, setMediaItems]         = useState([]);
  const [showSuggested, setShowSuggested]   = useState(false);
  const [mediaTab, setMediaTab]             = useState("agencyPicks");
  const [mediaBuckets, setMediaBuckets]     = useState(null); // { agencyPicks, trending, humanStories, professional, minimal }
  const [mediaLoading, setMediaLoading]     = useState(false);
  const [mediaError, setMediaError]         = useState(false);
  const [pexelsUsing, setPexelsUsing]       = useState(null);
  // legacy compat (read by handleAssistantGenerate)
  const [pexelsItems, setPexelsItems]       = useState([]);
  const [libraryOpen, setLibraryOpen]       = useState(false);
  const [campaignId, setCampaignId]         = useState(propCampaignId || "");
  const [scheduledTime, setScheduledTime]   = useState("");
  const [timezone, setTimezone]             = useState(brandTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [activeTopTab, setActiveTopTab]     = useState("drafts");
  const [vaultItems, setVaultItems]         = useState([]);
  const [vaultLoading, setVaultLoading]     = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [tabCounts, setTabCounts]           = useState({ drafts: 0, scheduled: 0, approvals: 0 });
  const [assistantOpen, setAssistantOpen]   = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [publishPhase, setPublishPhase]     = useState("idle"); // idle|creating|linking|scheduling|queued|failed
  const [publishResult, setPublishResult]   = useState(null);  // { content_id, platforms }
  const [canvaBanner, setCanvaBanner]       = useState(false);
  const [toast, setToast]                   = useState(null);
  const isPublishing = publishPhase !== "idle" && publishPhase !== "queued" && publishPhase !== "failed";

  const fileInputRef    = useRef(null);
  const canvaFileRef    = useRef(null);
  const replaceIndexRef = useRef(null);
  const editorRef       = useRef(null);

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
    if (connections.length > 0 && selectedPlatforms.length === 0) {
      const active = connections.filter(c => c.status === "active").map(c => c.platform);
      if (active.length > 0) setSelectedPlatforms([active[0]]);
    }
  }, [connections]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const activeConnections  = connections.filter(c => c.status === "active");
  const expiredConnections = connections.filter(c => c.status === "error" || c.status === "expired");
  const allKnownPlatforms  = [...activeConnections, ...expiredConnections];

  const togglePlatform = (key, isExpired) => {
    if (isExpired) return;
    setSelectedPlatforms(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(p => p !== key) : prev) : [...prev, key]
    );
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
      const buckets = await fetchMediaSuggestions({ platform, contentType: "social", text: content, brand: brandName, industry: "" });
      setMediaBuckets(buckets);
      setPexelsItems(buckets.agencyPicks); // legacy compat
    } catch {
      setMediaError(true);
    } finally {
      setMediaLoading(false);
    }
  }, [mediaBuckets, selectedPlatforms, content, brandName]);

  const handleSuggestedToggle = () => {
    const next = !showSuggested;
    setShowSuggested(next);
    if (next) loadMediaSuggestions();
  };

  const handlePexelsUse = async (item) => {
    const previewUrl = item.preview_url || item.preview || item.url;
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
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
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

  useEffect(() => { loadVault("drafts"); loadTabCounts(); }, [loadVault, loadTabCounts]);

  const handleVaultEdit = (item) => {
    setContent(item.body || item.text || "");
    const platforms = item.platforms
      ? (Array.isArray(item.platforms) ? item.platforms : JSON.parse(item.platforms || "[]"))
      : [];
    if (platforms.length) setSelectedPlatforms(platforms);
    setSelectedVaultItem(item);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const data = await apiJSON("/api/customer/vault", "POST", {
      body: content,
      platforms: selectedPlatforms,
      platform_variants: overrides,
      campaign_id: campaignId || null,
      lifecycle_status: "draft",
      content_type: "social",
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
      loadVault("drafts");
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
      loadVault("approvals");
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
      // Step 1: write to vault (single source of truth)
      const asset = await apiJSON("/api/customer/vault", "POST", {
        body: content,
        platforms: selectedPlatforms,
        platform_variants: overrides,
        campaign_id: campaignId || null,
        lifecycle_status: "draft",
        content_type: "social",
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
      loadVault(scheduledTime ? "scheduled" : "drafts");
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
    setScheduledTime(""); setSelectedPlatforms(activeConnections.slice(0, 1).map(c => c.platform));
  };

  const canPublish = content.trim().length > 0 && selectedPlatforms.length > 0;

  // ── P1: preview priority chain ────────────────────────────────────────────
  const VAULT_STATUS_META = {
    draft:              { label: "Draft",       color: "#64748b", bg: "#f1f5f9" },
    ready:              { label: "Ready",       color: "#2563eb", bg: "#eff6ff" },
    approval_requested: { label: "In Review",   color: "#d97706", bg: "#fffbeb" },
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
  const previewMedia    = selectedVaultItem ? null : (mediaItems.length > 0 ? { image: mediaItems[0]?.url } : null);
  const vaultStatusMeta = selectedVaultItem
    ? (VAULT_STATUS_META[selectedVaultItem.lifecycle_status] || { label: selectedVaultItem.lifecycle_status, color: "#64748b", bg: "#f1f5f9" })
    : null;

  const TOP_TABS = [
    { id: "drafts",    label: "Drafts",    icon: "fas fa-file-alt"   },
    { id: "scheduled", label: "Scheduled", icon: "fas fa-clock"      },
    { id: "approvals", label: "Approvals", icon: "fas fa-user-check" },
  ];

  const scheduleLabel = (() => {
    if (!scheduledTime) return null;
    const d = new Date(scheduledTime);
    return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · ${timezone}`;
  })();

  return (
    <div id="tab-create-post" className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={handleFileSelect} />
      <input ref={canvaFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleCanvaFileSelect} />

      {/* ── TOP BAR: Lifecycle tabs + Assistant ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0, gap: 12 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {TOP_TABS.map(tab => {
            const count = tabCounts[tab.id] || 0;
            const active = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => loadVault(tab.id)}
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
                    fontSize: 10, fontWeight: 700,
                    background: active ? "#2563eb" : "#e2e8f0",
                    color: active ? "#fff" : "#64748b",
                    borderRadius: 99, padding: "1px 6px", minWidth: 18, textAlign: "center",
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          className="btn-pilot"
          onClick={() => setAssistantOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}
        >
          <i className="fas fa-robot"></i> myPilotPost Assistant
        </button>
      </div>

      {/* ── LIFECYCLE ROWS — collapsible, shown when items present ────── */}
      {(vaultLoading || vaultItems.length > 0) && (
        <div style={{ marginBottom: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, flexShrink: 0, overflow: "hidden" }}>
          <div style={{ maxHeight: 210, overflowY: "auto" }}>
            {vaultLoading ? (
              <div style={{ textAlign: "center", padding: "14px 0", color: "#94a3b8", fontSize: 12 }}>
                <span className="spinner-border spinner-border-sm" style={{ color: "#2563eb", width: 14, height: 14, borderWidth: 2, marginRight: 6 }}></span>
                Loading…
              </div>
            ) : (
              vaultItems.map((item, i) => {
                const preview = item.body || item.title || "—";
                const itemPlatforms = item.platforms ? (Array.isArray(item.platforms) ? item.platforms : JSON.parse(item.platforms || "[]")) : [];
                const date = item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
                const isSelected = selectedVaultItem?.id === item.id;
                return (
                  <div
                    key={item.id || i}
                    onClick={() => setSelectedVaultItem(isSelected ? null : item)}
                    style={{
                      padding: "9px 14px", borderBottom: "1px solid #f8fafc",
                      display: "flex", alignItems: "center", gap: 10,
                      cursor: "pointer",
                      background: isSelected ? "#eff6ff" : "#fff",
                      borderLeft: `3px solid ${isSelected ? "#2563eb" : "transparent"}`,
                      transition: "background 0.1s",
                    }}
                  >
                    {itemPlatforms.length > 0 && (
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {itemPlatforms.slice(0, 3).map(p => <PlatformIcon key={p} platform={p} size={12} />)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 500, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {preview.slice(0, 80)}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{date}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
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
              })
            )}
          </div>
        </div>
      )}

      {/* ── CANVA BANNER ────────────────────────────────────────────────── */}
      {canvaBanner && (
        <div style={{
          background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8,
          padding: "10px 14px", marginBottom: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className="fas fa-pen-fancy" style={{ color: "#7c3aed", fontSize: 14 }}></i>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#4c1d95" }}>
              Finished designing in Canva? Export as PNG, JPG, or MP4 and upload it here.
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => canvaFileRef.current?.click()}
              style={{ background: "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}
            >
              <i className="fas fa-upload me-1"></i> Upload Design
            </button>
            <button onClick={() => setCanvaBanner(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* ── MAIN TWO-COLUMN ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>

        {/* LEFT 45% */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="card-workspace" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", padding: 0 }}>

            {/* Campaign + Platform row */}
            <div style={{ padding: "12px 14px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="extra-small fw-bold text-muted text-uppercase mb-1">Campaign</label>
                  <select className="form-select form-select-sm border-subtle" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                    <option value="">No Campaign</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Platform selector */}
              <div style={{ marginBottom: 12 }}>
                <label className="extra-small fw-bold text-muted text-uppercase mb-1">Platforms</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {allKnownPlatforms.map(conn => {
                    const m = PLATFORM_META[conn.platform];
                    if (!m) return null;
                    const isExpired = conn.status === "error" || conn.status === "expired";
                    const isSelected = selectedPlatforms.includes(conn.platform);
                    return (
                      <button
                        key={conn.platform}
                        onClick={() => togglePlatform(conn.platform, isExpired)}
                        title={isExpired ? "Reconnect required" : conn.platform_username ? `@${conn.platform_username}` : m.label}
                        style={{
                          border: `1px solid ${isExpired ? "#fecaca" : isSelected ? m.color : "#e2e8f0"}`,
                          background: isExpired ? "#fef2f2" : isSelected ? m.color + "15" : "#fff",
                          color: isExpired ? "#dc2626" : isSelected ? m.color : "#64748b",
                          borderRadius: 20, padding: "4px 11px",
                          fontSize: 11, fontWeight: 600, cursor: isExpired ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 5, opacity: isExpired ? 0.7 : 1,
                        }}
                      >
                        <PlatformIcon platform={conn.platform} size={12} />
                        {m.label}
                        {isExpired && <i className="fas fa-exclamation-circle" style={{ fontSize: 8, marginLeft: 2 }}></i>}
                        {isSelected && !isExpired && <i className="fas fa-check" style={{ fontSize: 8, marginLeft: 2, color: m.color }}></i>}
                      </button>
                    );
                  })}
                  {allKnownPlatforms.length === 0 && (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>No platforms connected — go to Integrations</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── CONTENT EDITOR ─────────────────────────────────────── */}
            <div ref={editorRef} style={{ padding: "0 14px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexShrink: 0 }}>
                <label className="extra-small fw-bold text-muted text-uppercase mb-0">Post</label>
                <span style={{ fontSize: 10, color: content.length > 2200 ? "#ef4444" : "#94a3b8" }}>{content.length} chars</span>
              </div>

              <div style={{
                flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden",
                background: "#fff", display: "flex", flexDirection: "column", minHeight: 140,
              }}>
                <WatermarkEditor value={content} onChange={setContent} />
              </div>

              {/* Per-platform overrides */}
              {selectedPlatforms.length > 1 && (
                <div style={{ marginTop: 8, flexShrink: 0 }}>
                  <label className="extra-small fw-bold text-muted text-uppercase mb-1">Platform overrides</label>
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
                            borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 600,
                            cursor: "pointer", color: overrides[p] ? "#065f46" : "#64748b",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {m && <PlatformIcon platform={p} size={11} />}
                          {m?.label || p} {overrides[p] ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── MEDIA STRIP ─────────────────────────────────────────── */}
            <div style={{ padding: "10px 14px 14px", flexShrink: 0, borderTop: "1px solid #f1f5f9", marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label className="extra-small fw-bold text-muted text-uppercase mb-0">Media</label>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={handleCanvaImport}
                    style={{ border: "1px solid #7c3aed", background: "#fff", color: "#7c3aed", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <i className="fas fa-pen-fancy"></i> Canva
                  </button>
                  <button onClick={() => { replaceIndexRef.current = null; fileInputRef.current?.click(); }} style={mediaBtn}>
                    <i className="fas fa-upload"></i> Upload
                  </button>
                  <button onClick={() => setLibraryOpen(true)} style={mediaBtn}>
                    <i className="fas fa-photo-video"></i> Library
                  </button>
                  <button
                    onClick={handleSuggestedToggle}
                    style={{ ...mediaBtn, border: showSuggested ? "1px solid #0ea5e9" : "1px solid #e2e8f0", color: showSuggested ? "#0ea5e9" : "#475569", background: showSuggested ? "#f0f9ff" : "#fff" }}
                  >
                    ✨ Agency Picks
                  </button>
                </div>
              </div>

              {/* Attached media */}
              <div style={{
                display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
                minHeight: mediaItems.length === 0 && !showSuggested ? 80 : "auto",
                alignItems: mediaItems.length === 0 && !showSuggested ? "center" : "flex-start",
                justifyContent: mediaItems.length === 0 && !showSuggested ? "center" : "flex-start",
                border: mediaItems.length === 0 && !showSuggested ? "1px dashed #e2e8f0" : "none",
                borderRadius: 8, background: mediaItems.length === 0 && !showSuggested ? "#f8fafc" : "transparent",
              }}>
                {mediaItems.length === 0 && !showSuggested ? (
                  <div style={{ textAlign: "center", color: "#cbd5e1" }}>
                    <i className="fas fa-photo-video" style={{ fontSize: 20, marginBottom: 4 }}></i>
                    <div style={{ fontSize: 10 }}>Upload, Library, Canva, or Suggested</div>
                  </div>
                ) : (
                  mediaItems.map((item, i) => (
                    <MediaCard
                      key={item.id || i}
                      item={item} index={i}
                      onReplace={replaceMedia} onRemove={removeMedia}
                      onMoveLeft={idx => moveMedia(idx, -1)} onMoveRight={idx => moveMedia(idx, 1)}
                      isFirst={i === 0} isLast={i === mediaItems.length - 1}
                    />
                  ))
                )}
              </div>

              {/* Agency media picker */}
              {showSuggested && (
                <MediaPickerPanel
                  loading={mediaLoading}
                  error={mediaError}
                  buckets={mediaBuckets}
                  activeTab={mediaTab}
                  onTabChange={setMediaTab}
                  onUse={handlePexelsUse}
                  using={pexelsUsing}
                  onRetry={() => { setMediaBuckets(null); loadMediaSuggestions(); }}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 55% — Platform Rendering */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", minHeight: 0, gap: 8 }}>

          {/* Lifecycle status banner — appears when a vault item is selected */}
          {selectedVaultItem && vaultStatusMeta && (
            <div style={{
              background: vaultStatusMeta.bg,
              border: `1px solid ${vaultStatusMeta.color}44`,
              borderRadius: 8, padding: "8px 14px", flexShrink: 0,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                color: vaultStatusMeta.color, background: "#fff",
                border: `1px solid ${vaultStatusMeta.color}55`,
                padding: "2px 8px", borderRadius: 20,
              }}>
                {vaultStatusMeta.label}
              </span>
              {selectedVaultItem.scheduled_at && (
                <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="fas fa-clock" style={{ fontSize: 10 }}></i>
                  {new Date(selectedVaultItem.scheduled_at).toLocaleString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
              <span style={{ flex: 1, fontSize: 11, color: "#94a3b8", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(selectedVaultItem.title || selectedVaultItem.body || "").slice(0, 60)}
              </span>
              <button
                onClick={() => setSelectedVaultItem(null)}
                title="Back to live editor"
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
              >×</button>
            </div>
          )}

          <PlatformPreviewPanel
            platforms={previewPlatforms.length ? previewPlatforms : (selectedPlatforms.length ? selectedPlatforms : [])}
            content={previewContent}
            overrides={previewOverrides}
            media={previewMedia}
            brandName={brandName}
            isLiveEditor={!selectedVaultItem}
          />
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>

        <button
          onClick={handleDraft}
          disabled={isPublishing}
          style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          <i className="fas fa-save me-1"></i> Save Draft
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            {scheduleLabel && (
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, fontWeight: 600 }}>
                <i className="fas fa-clock me-1"></i>{scheduleLabel}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="datetime-local"
                className="form-control form-control-sm border-subtle"
                style={{ fontSize: 11, width: 175 }}
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="form-select form-select-sm border-subtle"
                style={{ fontSize: 10, width: 130 }}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleApproval}
            disabled={isPublishing || !canPublish}
            style={{
              border: "1px solid #e2e8f0", background: "#fff", color: canPublish ? "#475569" : "#cbd5e1",
              borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
              cursor: canPublish ? "pointer" : "not-allowed", whiteSpace: "nowrap",
            }}
          >
            <i className="fas fa-user-check me-1"></i> Send For Approval
          </button>
        </div>

        <button
          onClick={() => setVerificationOpen(true)}
          disabled={!canPublish}
          style={{
            border: "none",
            background: canPublish ? "#0f172a" : "#e2e8f0",
            color: canPublish ? "#fff" : "#94a3b8",
            borderRadius: 8, padding: "10px 22px",
            fontSize: 13, fontWeight: 700,
            cursor: canPublish ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <i className="fas fa-rocket"></i> {scheduledTime ? "Schedule" : "Publish"}
        </button>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      {assistantOpen && (
        <SocialAssistantModal
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          onComplete={handleAssistantGenerate}
          connections={connections}
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
      />

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
