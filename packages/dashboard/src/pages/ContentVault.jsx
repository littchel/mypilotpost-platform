import React, { useState, useCallback, useEffect } from "react";
import { apiRequest } from "../lib/api/client";
import PlatformPreviewPanel from "../components/publishing/PlatformPreviewPanel";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue:    "#2563eb", green:  "#059669", amber: "#d97706",
  red:     "#dc2626", slate:  "#0f172a", muted: "#64748b",
  border:  "#e2e8f0", surface: "#f8fafc", white: "#ffffff",
};

const STATUS_META = {
  draft:              { label: "Draft",      color: "#64748b", bg: "#f1f5f9" },
  approval_requested: { label: "In Review",  color: "#d97706", bg: "#fffbeb" },
  changes_requested:  { label: "Changes",    color: "#d97706", bg: "#fff7ed" },
  approved:           { label: "Approved",   color: "#059669", bg: "#ecfdf5" },
  archived:           { label: "Archived",   color: "#64748b", bg: "#f1f5f9" },
};

const PLATFORM_EMOJI = {
  facebook: "📘", instagram: "📸", linkedin: "💼", x: "𝕏",
  twitter: "𝕏", tiktok: "🎵", pinterest: "📌", youtube: "▶️", threads: "🧵",
};

const PREVIEW_PLATFORMS = ["facebook", "instagram", "linkedin", "x", "pinterest", "youtube"];

const TABS = [
  { id: "drafts-social", label: "Draft Content" },
  { id: "drafts-blog",   label: "Draft Articles" },
  { id: "approvals",     label: "Content Approval" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function parsePlatforms(v) {
  if (!v) return [];
  try { return Array.isArray(v) ? v : JSON.parse(v); }
  catch { return []; }
}

function filterForTab(tab, items) {
  if (tab === "drafts-social") return items.filter(i => i.content_type === "social" && i.lifecycle_status === "draft");
  if (tab === "drafts-blog")   return items.filter(i => i.content_type === "blog"   && i.lifecycle_status === "draft");
  return [];
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: C.muted, bg: "#f1f5f9" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: m.color, background: m.bg, padding: "2px 7px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

function PlatformCell({ platforms }) {
  const arr = parsePlatforms(platforms).slice(0, 3);
  if (!arr.length) return <span style={{ color: C.muted, fontSize: 12 }}>—</span>;
  return <div style={{ display: "flex", gap: 4 }}>{arr.map(p => <span key={p} title={p} style={{ fontSize: 14 }}>{PLATFORM_EMOJI[p] || "🌐"}</span>)}</div>;
}

function TH({ children, width }) {
  return (
    <th style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", width }}>
      {children}
    </th>
  );
}

function TBtn({ title, icon, onClick, color, active }) {
  const c = color || (active ? C.blue : C.muted);
  return (
    <button title={title} onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ border: `1px solid ${active ? C.blue : "transparent"}`, background: active ? "#eff6ff" : "none", cursor: "pointer", color: c, fontSize: 12, padding: "4px 6px", borderRadius: 5 }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.surface; e.currentTarget.style.border = `1px solid ${C.border}`; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.border = "1px solid transparent"; } }}
    >
      <i className={`fas ${icon}`} />
    </button>
  );
}

function Backdrop({ onClose, zIndex = 400 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex, backdropFilter: "blur(2px)" }} />
  );
}

const INP = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 11px", fontSize: 13, color: C.slate, boxSizing: "border-box", outline: "none" };
const LBL = { display: "block", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };

// ─── Draft Table ──────────────────────────────────────────────────────────────
function DraftTable({ items, activeTab, onPreview, onEdit, onDuplicate, onDelete, onShare }) {
  if (!items.length) {
    return (
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 36, opacity: 0.25, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.slate, marginBottom: 6 }}>
          {activeTab === "drafts-blog" ? "No draft articles" : "No draft content"}
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>Content created in Create Social Post and AI Studio appears here.</div>
      </div>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: C.surface, borderBottom: `2px solid ${C.border}` }}>
          <TH>Content Title</TH>
          <TH width={80}>Platforms</TH>
          <TH width={130}>Objective</TH>
          <TH width={120}>Last Updated</TH>
          <TH width={140}>Updated By</TH>
          <TH width={100}>Status</TH>
          <TH width={170}>Actions</TH>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, background: C.white }}
            onMouseEnter={e => e.currentTarget.style.background = C.surface}
            onMouseLeave={e => e.currentTarget.style.background = C.white}
          >
            <td style={{ padding: "12px 14px", maxWidth: 240 }}>
              <div style={{ fontWeight: 600, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title || (item.body || "").slice(0, 60) || "Untitled"}
              </div>
              {item.hook && <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{item.hook}</div>}
            </td>
            <td style={{ padding: "12px 14px" }}><PlatformCell platforms={item.platforms} /></td>
            <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12 }}>{item.campaign_objective || item.objective || "—"}</td>
            <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(item.updated_at)}</td>
            <td style={{ padding: "12px 14px", fontSize: 12 }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130, color: C.slate }}>{item.updated_by || item.created_by || "—"}</div>
            </td>
            <td style={{ padding: "12px 14px" }}><StatusBadge status={item.lifecycle_status} /></td>
            <td style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                <TBtn title="Preview" icon="fa-eye" onClick={() => onPreview(item)} />
                <TBtn title="Edit" icon="fa-edit" onClick={() => onEdit(item)} />
                <TBtn title="Duplicate" icon="fa-copy" onClick={() => onDuplicate(item)} />
                <TBtn title="Delete" icon="fa-trash-alt" onClick={() => onDelete(item)} color={C.red} />
                <TBtn title="Share for Approval" icon="fa-share-alt" onClick={() => onShare(item)} color={C.blue} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Approval Table ───────────────────────────────────────────────────────────
function ApprovalTable({ items, onReview }) {
  if (!items.length) {
    return (
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 36, opacity: 0.25, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.slate, marginBottom: 6 }}>No content pending approval</div>
        <div style={{ fontSize: 13, color: C.muted }}>Use Share for Approval on draft content to send it for review.</div>
      </div>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: C.surface, borderBottom: `2px solid ${C.border}` }}>
          <TH>Title</TH>
          <TH width={150}>Shared By</TH>
          <TH width={180}>Reviewer</TH>
          <TH width={120}>Submitted</TH>
          <TH width={120}>Due</TH>
          <TH width={110}>Status</TH>
          <TH width={90}>Actions</TH>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const ap = item._approval || {};
          const expired = ap.expires_at && new Date(ap.expires_at) < new Date();
          return (
            <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, background: C.white }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = C.white}
            >
              <td style={{ padding: "12px 14px", maxWidth: 220 }}>
                <div style={{ fontWeight: 600, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title || (item.body || "").slice(0, 60) || "Untitled"}
                </div>
              </td>
              <td style={{ padding: "12px 14px", fontSize: 12, color: C.muted }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                  {ap.requested_by || item.created_by || "—"}
                </div>
              </td>
              <td style={{ padding: "12px 14px", fontSize: 12 }}>
                {ap.reviewer_name && <div style={{ fontWeight: 600, color: C.slate }}>{ap.reviewer_name}</div>}
                {ap.reviewer_email && <div style={{ color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{ap.reviewer_email}</div>}
                {!ap.reviewer_name && !ap.reviewer_email && <span style={{ color: C.muted }}>Internal</span>}
              </td>
              <td style={{ padding: "12px 14px", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(ap.submitted_at)}</td>
              <td style={{ padding: "12px 14px", fontSize: 12, whiteSpace: "nowrap" }}>
                {ap.expires_at ? (
                  <span style={{ color: expired ? C.red : C.muted }}>{fmtDate(ap.expires_at)}</span>
                ) : (
                  <span style={{ color: C.muted }}>Never</span>
                )}
              </td>
              <td style={{ padding: "12px 14px" }}><StatusBadge status={item.lifecycle_status} /></td>
              <td style={{ padding: "12px 14px" }}>
                <button onClick={() => onReview(item)}
                  style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Review
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ item, brandName, onClose, onEdit, onShare }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "86vw", maxWidth: 1100, height: "85vh",
        background: C.white, borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        zIndex: 401, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.slate }}>{item.title || (item.body || "").slice(0, 70) || "Untitled"}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Platform preview — how this content renders across platforms</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <PlatformPreviewPanel
            platforms={PREVIEW_PLATFORMS}
            content={item.body || ""}
            brandName={brandName || "Your Brand"}
            isLiveEditor={false}
          />
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: C.surface }}>
          <button onClick={onClose}
            style={{ border: `1px solid ${C.border}`, background: C.white, borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.muted }}>
            Close
          </button>
          <button onClick={() => { onClose(); onEdit(item); }}
            style={{ border: `1px solid ${C.border}`, background: C.white, borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.slate }}>
            <i className="fas fa-edit" style={{ marginRight: 6 }} />Edit
          </button>
          <button onClick={() => { onClose(); onShare(item); }}
            style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <i className="fas fa-share-alt" style={{ marginRight: 6 }} />Share for Approval
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Share for Approval Modal ─────────────────────────────────────────────────
function ShareModal({ item, onClose, onSubmit, submitting }) {
  const [reviewType, setReviewType]   = useState("client");
  const [byEmail, setByEmail]         = useState(true);
  const [byWhatsApp, setByWhatsApp]   = useState(false);
  const [byLink, setByLink]           = useState(false);
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [message, setMessage]         = useState("");
  const [expiry, setExpiry]           = useState("7d");
  const [shareUrl, setShareUrl]       = useState(null);
  const [copied, setCopied]           = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const channels = [byEmail && "email", byWhatsApp && "whatsapp", byLink && "link"].filter(Boolean);
    const result = await onSubmit({
      review_type:       reviewType,
      delivery_channels: channels.length ? channels : ["email"],
      reviewer_name:     name    || undefined,
      reviewer_email:    email   || undefined,
      reviewer_phone:    phone   || undefined,
      notes:             message || undefined,
      expiry,
    });
    if (result?.share_url) setShareUrl(result.share_url);
    else if (result?.success) setShareUrl(""); // sent without link
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 540, maxHeight: "90vh",
        background: C.white, borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        zIndex: 401, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.slate }}>Share for Approval</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, fontSize: 24, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {shareUrl !== null ? (
            // ── Success state ──
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 52, height: 52, background: "#ecfdf5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <i className="fas fa-check" style={{ color: C.green, fontSize: 20 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.slate, marginBottom: 6 }}>Sent for Approval</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>The approval request has been sent.</div>
              {shareUrl && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <input readOnly value={shareUrl} style={{ flex: 1, border: "none", background: "none", fontSize: 12, color: C.muted, outline: "none", minWidth: 0 }} />
                  <button onClick={copyLink}
                    style={{ background: copied ? C.green : C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
              {byWhatsApp && shareUrl && (
                <a href={`https://wa.me/?text=${encodeURIComponent("Please review this content: " + shareUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 14 }}>
                  <i className="fab fa-whatsapp" style={{ fontSize: 16 }} />Send via WhatsApp
                </a>
              )}
              <button onClick={onClose}
                style={{ display: "block", margin: "0 auto", background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 24px", fontSize: 13, cursor: "pointer", color: C.muted }}>
                Close
              </button>
            </div>
          ) : (
            // ── Form ──
            <form onSubmit={handleSubmit}>
              {/* Review type */}
              <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Review Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["internal", "Internal Review"], ["client", "Client Review"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setReviewType(v)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `2px solid ${reviewType === v ? C.blue : C.border}`, background: reviewType === v ? "#eff6ff" : C.white, color: reviewType === v ? C.blue : C.muted }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery */}
              <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Delivery</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    ["email",    "Email (via Resend)",    byEmail,    setByEmail],
                    ["whatsapp", "WhatsApp",              byWhatsApp, setByWhatsApp],
                    ["link",     "Copy Link",             byLink,     setByLink],
                  ].map(([k, l, checked, setter]) => (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.slate, fontWeight: 500 }}>
                      <input type="checkbox" checked={checked} onChange={e => setter(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {/* Reviewer */}
              <div style={{ marginBottom: 12 }}>
                <label style={LBL}>Reviewer Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={INP} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={LBL}>Email {byEmail && <span style={{ color: C.red }}>*</span>}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="reviewer@company.com" required={byEmail} style={INP} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={LBL}>Phone <span style={{ fontWeight: 400, textTransform: "none", color: "#94a3b8" }}>(optional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" style={INP} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Please review this content and share your feedback…"
                  rows={3} style={{ ...INP, resize: "vertical" }} />
              </div>

              {/* Expiry */}
              <div style={{ marginBottom: 22 }}>
                <label style={LBL}>Link Expiry</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["24h", "24 hours"], ["72h", "72 hours"], ["7d", "7 days"], ["never", "Never"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setExpiry(v)}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `2px solid ${expiry === v ? C.blue : C.border}`, background: expiry === v ? "#eff6ff" : C.white, color: expiry === v ? C.blue : C.muted }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting}
                style={{ width: "100%", background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {submitting ? "Sending…" : "Send for Approval"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ item, brandName, onClose, onAction, submitting }) {
  const [pendingAction, setPending]   = useState(null);
  const [actionNote, setActionNote]   = useState("");
  const ap = item._approval || {};

  const activity = [
    item.content_created_at && { icon: "fa-plus-circle", color: "#94a3b8", label: "Created",              date: item.content_created_at },
    item.updated_at && item.updated_at !== item.content_created_at && { icon: "fa-edit", color: "#94a3b8", label: "Edited", date: item.updated_at },
    ap.submitted_at  && { icon: "fa-share-alt",   color: C.amber, label: "Shared for review",           date: ap.submitted_at },
    ap.email_sent_at && { icon: "fa-envelope",    color: C.blue,  label: "Review email sent",            date: ap.email_sent_at },
    ap.approved_at   && { icon: "fa-check-circle", color: C.green, label: "Approved",                   date: ap.approved_at },
  ].filter(Boolean);

  function confirm(action) {
    onAction(item, action, actionNote || undefined);
    setPending(null);
    setActionNote("");
  }

  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "90vw", maxWidth: 1200, height: "88vh",
        background: C.white, borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        zIndex: 401, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.slate }}>{item.title || "Untitled Content"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <StatusBadge status={item.lifecycle_status} />
              {ap.reviewer_name && <span style={{ fontSize: 12, color: C.muted }}>Reviewer: {ap.reviewer_name}</span>}
              {ap.reviewer_email && !ap.reviewer_name && <span style={{ fontSize: 12, color: C.muted }}>{ap.reviewer_email}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, fontSize: 24, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {/* Left: Render engine */}
          <div style={{ flex: "0 0 55%", borderRight: `1px solid ${C.border}`, overflow: "hidden" }}>
            <PlatformPreviewPanel
              platforms={PREVIEW_PLATFORMS}
              content={item.body || ""}
              brandName={brandName || "Your Brand"}
              isLiveEditor={false}
            />
          </div>

          {/* Right: Thread + Activity + Actions */}
          <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Comments */}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Approval Thread</div>

              {ap.review_notes && (
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="fas fa-user" style={{ color: C.blue, fontSize: 11 }} />
                  </div>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "0 8px 8px 8px", padding: "10px 12px", flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>
                      {ap.requested_by || "Shared by"} · {fmtDate(ap.submitted_at)}
                    </div>
                    <div style={{ fontSize: 13, color: C.slate, lineHeight: 1.55 }}>{ap.review_notes}</div>
                  </div>
                </div>
              )}

              {ap.rejection_reason && (
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="fas fa-user-tie" style={{ color: C.red, fontSize: 11 }} />
                  </div>
                  <div style={{ background: "#fef2f2", border: `1px solid #fecaca`, borderRadius: "0 8px 8px 8px", padding: "10px 12px", flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>
                      {ap.reviewer_name || ap.reviewer_email || "Reviewer"} — Feedback
                    </div>
                    <div style={{ fontSize: 13, color: C.slate, lineHeight: 1.55 }}>{ap.rejection_reason}</div>
                  </div>
                </div>
              )}

              {!ap.review_notes && !ap.rejection_reason && (
                <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic", marginBottom: 12 }}>No comments yet.</div>
              )}

              {/* Activity */}
              {activity.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Activity</div>
                  {activity.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className={`fas ${a.icon}`} style={{ fontSize: 9, color: a.color }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.slate }}>{a.label}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(a.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decision panel */}
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              {pendingAction ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 8 }}>
                    {pendingAction === "approve" ? "Approve" : pendingAction === "request_changes" ? "Request Changes" : "Reject"} — add a note (optional)
                  </div>
                  <textarea
                    value={actionNote} onChange={e => setActionNote(e.target.value)}
                    placeholder="Comment for the team…"
                    rows={2}
                    style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 13, resize: "none", boxSizing: "border-box", marginBottom: 10, outline: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => confirm(pendingAction)} disabled={submitting}
                      style={{ flex: 1, color: "#fff", border: "none", borderRadius: 7, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", background: pendingAction === "approve" ? C.green : pendingAction === "request_changes" ? C.amber : C.red }}>
                      {submitting ? "Saving…" : "Confirm"}
                    </button>
                    <button onClick={() => setPending(null)}
                      style={{ border: `1px solid ${C.border}`, background: "none", borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer", color: C.muted }}>
                      Back
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPending("approve")} disabled={submitting}
                    style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 7, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <i className="fas fa-check" style={{ marginRight: 5 }} />Approve
                  </button>
                  <button onClick={() => setPending("request_changes")} disabled={submitting}
                    style={{ flex: 1, background: "#fffbeb", color: C.amber, border: `1px solid #fde68a`, borderRadius: 7, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <i className="fas fa-redo" style={{ marginRight: 5 }} />Request Changes
                  </button>
                  <button onClick={() => setPending("reject")} disabled={submitting}
                    style={{ flex: 1, background: "#fef2f2", color: C.red, border: `1px solid #fecaca`, borderRadius: 7, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <i className="fas fa-times" style={{ marginRight: 5 }} />Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContentManagement({ activeBrand, switchTab }) {
  const [activeTab, setActiveTab]         = useState("drafts-social");
  const [items, setItems]                 = useState([]);
  const [approvalItems, setApprovalItems] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [previewItem, setPreviewItem]     = useState(null);
  const [shareItem, setShareItem]         = useState(null);
  const [reviewItem, setReviewItem]       = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [toast, setToast]                 = useState(null);

  const brandId = activeBrand?.id;

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const [drafts, approvals] = await Promise.all([
        apiRequest("/api/customer/vault?limit=200"),
        apiRequest("/api/customer/vault/approvals").catch(() => ({ data: [] })),
      ]);
      setItems(drafts?.data || []);
      setApprovalItems(approvals?.data || []);
    } catch {
      setItems([]);
      setApprovalItems([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleEdit(item) {
    setPreviewItem(null);
    switchTab(item.content_type === "blog" ? "blog" : "social", { openContentId: item.id });
  }

  async function handleDuplicate(item) {
    try {
      await apiRequest("/api/customer/vault", {
        method: "POST",
        body: JSON.stringify({
          content_type: item.content_type,
          title: `${item.title || "Copy"} (Copy)`,
          body: item.body, hook: item.hook, cta: item.cta,
          platforms: parsePlatforms(item.platforms),
          lifecycle_status: "draft",
        }),
      });
      await load();
      showToast("Duplicated.");
    } catch { showToast("Duplicate failed.", "error"); }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title || "this content"}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/customer/vault/${item.id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast("Deleted.");
    } catch { showToast("Delete failed.", "error"); }
  }

  async function handleSubmitApproval(data) {
    setSubmitting(true);
    try {
      const result = await apiRequest(`/api/customer/vault/${shareItem.id}/approval`, {
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          reviewer_type:    data.review_type || "client",
          reviewer_email:   data.reviewer_email,
          reviewer_name:    data.reviewer_name,
          reviewer_phone:   data.reviewer_phone,
          notes:            data.notes,
          delivery_channels: data.delivery_channels,
          expiry:           data.expiry,
          channel:          (data.delivery_channels || []).includes("email") ? "email" : "dashboard",
        }),
      });
      await load();
      showToast("Sent for approval!");
      return result;
    } catch (e) {
      showToast(e.message || "Failed to send.", "error");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprovalAction(item, action, notes) {
    setSubmitting(true);
    try {
      await apiRequest(`/api/customer/vault/${item.id}/approval`, {
        method: "POST",
        body: JSON.stringify({ action, notes }),
      });
      setReviewItem(null);
      await load();
      const msgs = {
        approve:          "Approved! Content is ready to schedule.",
        request_changes:  "Changes requested — item returned to drafts.",
        reject:           "Rejected and archived.",
      };
      showToast(msgs[action] || "Done.");
    } catch (e) {
      showToast(e.message || "Action failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Counts and filter
  const tabItems   = filterForTab(activeTab, items);
  const q          = search.toLowerCase();
  const filtered   = q ? tabItems.filter(i => (i.title || i.body || "").toLowerCase().includes(q)) : tabItems;
  const filteredAp = q ? approvalItems.filter(i => (i.title || i.body || "").toLowerCase().includes(q)) : approvalItems;

  const counts = {
    "drafts-social": items.filter(i => i.content_type === "social" && i.lifecycle_status === "draft").length,
    "drafts-blog":   items.filter(i => i.content_type === "blog"   && i.lifecycle_status === "draft").length,
    "approvals":     approvalItems.length,
  };

  if (!brandId) {
    return <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>Select a brand to view Content Management.</div>;
  }

  return (
    <div style={{ minHeight: "100%", background: C.white }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: C.slate, margin: 0 }}>Content Management</h2>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>Manage drafts, preview content, and run approval workflows.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <i className="fas fa-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 12 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px 7px 28px", fontSize: 13, width: 180, outline: "none", color: C.slate }} />
            </div>
            <button onClick={() => switchTab("social")}
              style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fas fa-plus" />New
            </button>
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                style={{
                  border: "none", background: "none", cursor: "pointer",
                  padding: "9px 16px", fontSize: 13, fontWeight: active ? 700 : 500,
                  color: active ? C.blue : C.muted, whiteSpace: "nowrap",
                  borderBottom: `2px solid ${active ? C.blue : "transparent"}`,
                  marginBottom: -1, display: "flex", alignItems: "center", gap: 7,
                }}>
                {tab.label}
                {counts[tab.id] > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 6px", background: active ? C.blue : "#e2e8f0", color: active ? "#fff" : C.muted }}>
                    {counts[tab.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: "center" }}>
            <i className="fas fa-spinner fa-spin" style={{ color: C.blue, fontSize: 22 }} />
          </div>
        ) : activeTab === "approvals" ? (
          <ApprovalTable items={filteredAp} onReview={setReviewItem} />
        ) : (
          <DraftTable
            items={filtered}
            activeTab={activeTab}
            onPreview={setPreviewItem}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onShare={setShareItem}
          />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          brandName={activeBrand?.name}
          onClose={() => setPreviewItem(null)}
          onEdit={handleEdit}
          onShare={item => { setPreviewItem(null); setShareItem(item); }}
        />
      )}

      {shareItem && (
        <ShareModal
          item={shareItem}
          onClose={() => setShareItem(null)}
          onSubmit={handleSubmitApproval}
          submitting={submitting}
        />
      )}

      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          brandName={activeBrand?.name}
          onClose={() => setReviewItem(null)}
          onAction={handleApprovalAction}
          submitting={submitting}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${toast.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          color: toast.type === "error" ? C.red : "#065f46",
          borderRadius: 9, padding: "12px 18px", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fas fa-${toast.type === "error" ? "exclamation-circle" : "check-circle"}`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
