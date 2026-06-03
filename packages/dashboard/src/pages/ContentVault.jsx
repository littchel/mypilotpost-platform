import React, { useState, useCallback, useEffect } from "react";
import { apiRequest as apiFetch } from "../lib/api/client";

/* ─── Palette ──────────────────────────────────────────────── */
const C = {
  blue:    "#2563eb",
  green:   "#059669",
  amber:   "#d97706",
  red:     "#dc2626",
  purple:  "#7c3aed",
  slate:   "#0f172a",
  muted:   "#64748b",
  border:  "#e2e8f0",
  surface: "#f8fafc",
  white:   "#ffffff",
};

const STATUS_META = {
  draft:               { label: "Draft",       color: C.muted,   bg: "#f1f5f9" },
  ready:               { label: "Ready",       color: C.blue,    bg: "#eff6ff" },
  approval_requested:  { label: "In Review",   color: C.amber,   bg: "#fffbeb" },
  approved:            { label: "Approved",    color: C.green,   bg: "#ecfdf5" },
  scheduled:           { label: "Scheduled",   color: C.blue,    bg: "#eff6ff" },
  queued:              { label: "Queued",      color: C.purple,  bg: "#f5f3ff" },
  publishing:          { label: "Publishing",  color: C.purple,  bg: "#f5f3ff" },
  published:           { label: "Published",   color: C.green,   bg: "#ecfdf5" },
  failed:              { label: "Failed",      color: C.red,     bg: "#fef2f2" },
  archived:            { label: "Archived",    color: C.muted,   bg: "#f1f5f9" },
};

const TYPE_ICON = { social: "fa-comments", blog: "fa-file-alt", campaign: "fa-bullhorn" };

const TABS = [
  { id: "",                   label: "All" },
  { id: "draft",              label: "Drafts" },
  { id: "pending",            label: "In Review" },
  { id: "approved",           label: "Approved" },
  { id: "scheduled",          label: "Scheduled" },
  { id: "published",          label: "Published" },
  { id: "failed",             label: "Failed" },
];

/* ─── Status Badge ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: C.muted, bg: "#f1f5f9" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
      color: m.color, background: m.bg,
      padding: "2px 8px", borderRadius: 99,
    }}>{m.label.toUpperCase()}</span>
  );
}

/* ─── Platform Pills ───────────────────────────────────────── */
function PlatformPills({ platforms }) {
  let arr = [];
  try { arr = Array.isArray(platforms) ? platforms : JSON.parse(platforms || "[]"); }
  catch { arr = []; }
  if (!arr.length) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {arr.slice(0, 5).map(p => (
        <span key={p} style={{
          fontSize: 10, fontWeight: 600, color: C.muted,
          background: C.surface, border: `1px solid ${C.border}`,
          padding: "1px 6px", borderRadius: 4, textTransform: "capitalize",
        }}>{p}</span>
      ))}
    </div>
  );
}

/* ─── Content Row ──────────────────────────────────────────── */
function VaultRow({ item, onOpen, onDelete }) {
  const icon  = TYPE_ICON[item.content_type] || "fa-file";
  const date  = item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const preview = (item.body || item.title || "").slice(0, 120);

  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr auto auto",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = C.white}
    >
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`fas ${icon}`} style={{ color: C.blue, fontSize: 14 }} />
      </div>

      {/* Content preview */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.slate, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title || preview || "Untitled"}
        </div>
        {item.title && (
          <div style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {preview}
          </div>
        )}
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <PlatformPills platforms={item.platforms} />
        </div>
      </div>

      {/* Status + date */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, whiteSpace: "nowrap" }}>
        <StatusBadge status={item.lifecycle_status} />
        <span style={{ fontSize: 11, color: C.muted }}>{date}</span>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(item); }}
        title="Delete"
        style={{
          border: "none", background: "none", cursor: "pointer",
          color: C.muted, fontSize: 14, padding: "4px 6px", borderRadius: 4,
          opacity: 0.5,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = C.red; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = C.muted; }}
      >
        <i className="fas fa-trash-alt" />
      </button>
    </div>
  );
}

/* ─── Empty State ──────────────────────────────────────────── */
function EmptyVault({ onCreateSocial }) {
  return (
    <div style={{ padding: "64px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.slate, marginBottom: 8 }}>Content Vault is empty</div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
        Create your first piece of content from the AI Content Studio or the Create Social Post editor.
      </div>
      <button
        onClick={onCreateSocial}
        style={{
          background: C.blue, color: "#fff", border: "none", borderRadius: 8,
          padding: "10px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}
      >
        <i className="fas fa-plus" style={{ marginRight: 8 }} />
        Create Post
      </button>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function ContentVault({ activeBrand, switchTab }) {
  const [activeStatus, setActiveStatus] = useState("");
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [deleting, setDeleting]         = useState(null);

  const brandId = activeBrand?.id;

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeStatus) params.set("status", activeStatus);
      params.set("limit", "100");
      const data = await apiFetch(`/api/customer/vault?${params}`);
      setItems(data?.data || []);
    } catch {
      setError("Failed to load content. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [brandId, activeStatus]);

  useEffect(() => { load(); }, [load]);

  const handleOpen = (item) => {
    if (item.content_type === "blog") {
      switchTab("blog", { openContentId: item.id });
    } else {
      switchTab("social", { openContentId: item.id });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title || "this content"}"? This cannot be undone.`)) return;
    setDeleting(item.id);
    try {
      await apiFetch(`/api/customer/vault/${item.id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      alert("Delete failed — content may be scheduled or published.");
    } finally {
      setDeleting(null);
    }
  };

  if (!brandId) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>
        Select a brand to view your Content Vault.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.slate, margin: 0 }}>Content Vault</h2>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 3, marginBottom: 0 }}>
            Single source of truth for all content — social, blog, campaigns.
          </p>
        </div>
        <button
          onClick={() => switchTab("social")}
          style={{
            background: C.blue, color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          <i className="fas fa-plus" style={{ marginRight: 6 }} />
          Create Content
        </button>
      </div>

      {/* Status tab bar */}
      <div style={{
        display: "flex", gap: 2, borderBottom: `2px solid ${C.border}`,
        marginBottom: 20, overflowX: "auto",
      }}>
        {TABS.map(t => {
          const active = activeStatus === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveStatus(t.id)}
              style={{
                border: "none", background: "none", cursor: "pointer",
                padding: "10px 16px", fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? C.blue : C.muted,
                borderBottom: active ? `2px solid ${C.blue}` : "2px solid transparent",
                marginBottom: -2, whiteSpace: "nowrap",
              }}
            >{t.label}</button>
          );
        })}
      </div>

      {/* Content list */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <i className="fas fa-spinner fa-spin" style={{ color: C.blue, fontSize: 20 }} />
        </div>
      ) : error ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: C.red, fontSize: 13 }}>
          {error}
          <button onClick={load} style={{ marginLeft: 12, color: C.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <EmptyVault onCreateSocial={() => switchTab("social")} />
      ) : (
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {items.map(item => (
            <VaultRow
              key={item.id}
              item={item}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          ))}
          <div style={{ padding: "12px 20px", background: C.surface, fontSize: 12, color: C.muted, textAlign: "right" }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
