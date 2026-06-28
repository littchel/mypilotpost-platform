import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api/client";

const TYPE_ICON = {
  success: "fas fa-check-circle",
  warning: "fas fa-exclamation-triangle",
  alert:   "fas fa-times-circle",
  info:    "fas fa-info-circle",
  system:  "fas fa-cog",
};

const TYPE_COLOR = {
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  alert:   "var(--status-danger)",
  info:    "var(--pilot-blue)",
  system:  "var(--slate-500)",
};

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso.replace(" ", "T") + "Z").getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getContextualExplanation(title, type) {
  const t = (title || "").toLowerCase();
  if (t.includes("approved")) {
    return "This content has passed review and is ready. You can now schedule it or publish it immediately from the drafts vault.";
  }
  if (t.includes("changes") || t.includes("rejected")) {
    return "The reviewer requested changes. Open this draft in the editor to view the specific comments, make the requested fixes, and submit it for review again.";
  }
  if (t.includes("failed") || t.includes("delivery failed")) {
    return "The post could not be published. This is usually caused by an expired social account connection or API rate limiting. Go to Settings -> Integrations to re-connect.";
  }
  if (t.includes("disconnected") || t.includes("expired")) {
    return "Your platform connection has been lost. Go to Settings -> Integrations to authenticate and restore the connection so scheduling works.";
  }
  if (t.includes("invite")) {
    return "An invitation has been sent to a new team member. They will receive an email to join your workspace.";
  }
  if (t.includes("joined") || t.includes("member")) {
    return "A new team member has successfully joined your brand workspace. You can manage roles in the Teams tab.";
  }
  if (t.includes("trial") || t.includes("ending")) {
    return "Your trial period is ending. Please review your subscription in Billing & Plan to prevent any interruption to your social publishing.";
  }
  if (t.includes("milestone") || t.includes("streak") || t.includes("points")) {
    return "Congratulations on your progress! Check the Rewards tab to view your current level and explore new ways to earn points.";
  }
  if (t.includes("insight")) {
    return "We analyzed your brand profile and generated a new optimization suggestion. Go to Brand Intelligence to view the recommendation.";
  }
  if (t.includes("review") || t.includes("approvals")) {
    return "A draft is waiting for your evaluation. Head over to Content Management -> Content Approval to approve it or request changes.";
  }
  
  // Generic fallbacks based on type
  if (type === "warning") {
    return "This notification is a warning message. Please check the details above and take appropriate action.";
  }
  if (type === "alert") {
    return "An alert has been raised. Please check the integrations or billing settings to resolve the issue.";
  }
  return "You received a system update. No further action is required.";
}

const CATEGORIES = [
  { id: "all",        label: "All",          icon: "fas fa-bell" },
  { id: "success",    label: "Success",      icon: "fas fa-check-circle" },
  { id: "warning",    label: "Warning",      icon: "fas fa-exclamation-triangle" },
  { id: "alert",      label: "Alerts",       icon: "fas fa-times-circle" },
  { id: "info",       label: "Info",         icon: "fas fa-info-circle" },
  { id: "system",     label: "System",       icon: "fas fa-cog" },
];

// ── Preference toggle row ──────────────────────────────────────────────────
function PrefRow({ pref, onChange }) {
  return (
    <div className="notif-pref-row">
      <span className="notif-pref-label">{pref.display}</span>
      <label className="notif-toggle" title="In-app">
        <input
          type="checkbox"
          checked={!!pref.in_app}
          onChange={e => onChange(pref.type, "in_app", e.target.checked)}
        />
        <span className="notif-toggle__track"></span>
      </label>
      <label className="notif-toggle" title="Email">
        <input
          type="checkbox"
          checked={!!pref.email}
          onChange={e => onChange(pref.type, "email", e.target.checked)}
        />
        <span className="notif-toggle__track"></span>
      </label>
    </div>
  );
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [pagination,    setPagination]    = useState({ total: 0, unread_count: 0 });
  const [loadState,     setLoadState]     = useState("loading");
  const [filter,        setFilter]        = useState("all");
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState(null);
  const [showPrefs,     setShowPrefs]     = useState(false);
  const [prefs,         setPrefs]         = useState([]);
  const [prefsLoading,  setPrefsLoading]  = useState(false);
  const [savingPrefs,   setSavingPrefs]   = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await apiRequest("/api/customer/notifications?limit=50");
      setNotifications(res.data || []);
      setPagination(res.pagination || {});
      setLoadState(res.data?.length ? "success" : "empty");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchNotifications(), 0);
    return () => clearTimeout(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener("refresh-data", handleRefresh);
    return () => window.removeEventListener("refresh-data", handleRefresh);
  }, [fetchNotifications]);

  const loadPrefs = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await apiRequest("/api/customer/notifications/preferences");
      setPrefs(res.preferences || []);
    } catch { /* noop */ }
    setPrefsLoading(false);
  }, []);

  useEffect(() => {
    if (showPrefs) {
      const timer = setTimeout(() => loadPrefs(), 0);
      return () => clearTimeout(timer);
    }
  }, [showPrefs, loadPrefs]);

  async function markAllRead() {
    try {
      await apiRequest("/api/customer/notifications/read-all", { method: "POST" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setPagination(prev => ({ ...prev, unread_count: 0 }));
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch { /* noop */ }
  }

  async function markRead(notifId) {
    try {
      await apiRequest("/api/customer/notifications/read", {
        method: "POST",
        body: JSON.stringify({ notification_ids: [notifId] }),
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
      setPagination(prev => ({ ...prev, unread_count: Math.max(0, (prev.unread_count || 1) - 1) }));
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch { /* noop */ }
  }

  function selectNotif(n) {
    setSelected(n);
    if (!n.read) markRead(n.id);
  }

  function handlePrefChange(type, channel, val) {
    setPrefs(prev => prev.map(p => p.type === type ? { ...p, [channel]: val ? 1 : 0 } : p));
  }

  async function savePrefs() {
    setSavingPrefs(true);
    try {
      await apiRequest("/api/customer/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify({ preferences: prefs.map(p => ({ type: p.type, in_app: p.in_app, email: p.email })) }),
      });
    } catch { /* noop */ }
    setSavingPrefs(false);
  }

  const filtered = notifications.filter(n => {
    if (filter !== "all" && n.type !== filter) return false;
    const q = search.toLowerCase();
    return !q || (n.message || "").toLowerCase().includes(q);
  });

  const activeNotif = selected || filtered[0] || null;

  return (
    <div className="notif-shell">
      {/* ── Left panel ── */}
      <div className="notif-list-panel">
        {/* Header */}
        <div className="notif-list-header">
          <div className="notif-list-header__top">
            <h2 className="notif-list-header__title">
              Notifications
              {pagination.unread_count > 0 && (
                <span className="notif-badge">{pagination.unread_count}</span>
              )}
            </h2>
            <div className="notif-header-actions">
              <button className="notif-icon-btn" title="Preferences" onClick={() => setShowPrefs(true)}>
                <i className="fas fa-sliders-h" aria-hidden="true"></i>
              </button>
              <button className="notif-icon-btn" title="Mark all read" onClick={markAllRead}>
                <i className="fas fa-check-double" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div className="notif-search-wrap">
            <i className="fas fa-search notif-search-icon" aria-hidden="true"></i>
            <input
              type="search"
              className="notif-search"
              placeholder="Search notifications…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search notifications"
            />
          </div>

          <div className="notif-filters" role="tablist" aria-label="Filter by type">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={filter === cat.id}
                className={`notif-filter-btn${filter === cat.id ? " notif-filter-btn--active" : ""}`}
                onClick={() => setFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="notif-list-body" role="list">
          {loadState === "loading" && (
            <div className="notif-state-center">
              <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
              <span className="notif-state-label">Loading…</span>
            </div>
          )}
          {loadState === "error" && (
            <div className="notif-state-center">
              <i className="fas fa-exclamation-circle text-danger mb-2" style={{ fontSize: "1.5rem" }}></i>
              <span className="notif-state-label">Failed to load</span>
              <button className="btn-verify-trigger" onClick={fetchNotifications}>Retry</button>
            </div>
          )}
          {(loadState === "empty" || (loadState === "success" && filtered.length === 0)) && (
            <div className="notif-state-center">
              <i className="fas fa-bell-slash mb-2" style={{ fontSize: "2rem", opacity: 0.2 }}></i>
              <span className="notif-state-label">No notifications</span>
            </div>
          )}
          {loadState === "success" && filtered.map(n => (
            <button
              key={n.id}
              role="listitem"
              className={`notif-item${activeNotif?.id === n.id ? " notif-item--active" : ""}${!n.read ? " notif-item--unread" : ""}`}
              onClick={() => selectNotif(n)}
              aria-current={activeNotif?.id === n.id ? "true" : undefined}
            >
              <span
                className="notif-item__dot"
                style={{ background: TYPE_COLOR[n.type] || TYPE_COLOR.info }}
                aria-hidden="true"
              ></span>
              <span className="notif-item__body">
                <span className="notif-item__title" style={{ fontWeight: !n.read ? 700 : 600, color: "var(--text-main)", fontSize: "0.85rem", display: "block", marginBottom: 2, textAlign: "left" }}>
                  {n.title || "System Message"}
                </span>
                <span className="notif-item__msg text-truncate" style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4, textAlign: "left" }}>
                  {n.message}
                </span>
                <span className="notif-item__meta">
                  <span className="notif-item__type">{n.type}</span>
                  <span className="notif-item__time">{relativeTime(n.created_at)}</span>
                </span>
              </span>
              {!n.read && <span className="notif-item__unread-dot" aria-label="Unread"></span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div className="notif-detail-panel">
        {activeNotif ? (
          <>
            <div className="notif-detail-header">
              <span
                className="notif-detail-icon"
                style={{ background: TYPE_COLOR[activeNotif.type] + "1a", color: TYPE_COLOR[activeNotif.type] }}
                aria-hidden="true"
              >
                <i className={TYPE_ICON[activeNotif.type] || TYPE_ICON.info}></i>
              </span>
              <div className="notif-detail-header__copy">
                <p className="notif-detail-header__type">{activeNotif.type?.toUpperCase()} · {relativeTime(activeNotif.created_at)}</p>
              </div>
              {!activeNotif.read && (
                <button className="notif-icon-btn" title="Mark as read" onClick={() => markRead(activeNotif.id)}>
                  <i className="fas fa-envelope-open" aria-hidden="true"></i>
                </button>
              )}
            </div>

            <div className="notif-detail-body">
              <div className="notif-detail-card">
                <span className="notif-detail-badge" style={{ background: TYPE_COLOR[activeNotif.type] + "22", color: TYPE_COLOR[activeNotif.type] }}>
                  {activeNotif.title || "System Message"}
                </span>
                <p className="notif-detail-message" style={{ fontWeight: 600, fontSize: "1.1rem", color: "var(--text-main)", margin: "16px 0 8px" }}>
                  {activeNotif.message}
                </p>
                <div style={{ background: "var(--bg-body, #f8fafc)", borderRadius: 10, padding: "14px", border: "1.5px solid var(--border-subtle)", margin: "16px 0" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    What this means / Actions
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", margin: 0, lineHeight: 1.6, textAlign: "left" }}>
                    {getContextualExplanation(activeNotif.title || activeNotif.message, activeNotif.type)}
                  </p>
                </div>
                <p className="notif-detail-ts">Received {new Date(activeNotif.created_at).toLocaleString()}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="notif-state-center">
            <i className="fas fa-bell mb-2" style={{ fontSize: "2rem", opacity: 0.15 }}></i>
            <span className="notif-state-label">Select a notification</span>
          </div>
        )}
      </div>

      {/* ── Preferences slide-over ── */}
      {showPrefs && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Notification preferences">
          <div className="notif-prefs-panel">
            <div className="notif-prefs-header">
              <h3 className="notif-prefs-title">Notification Preferences</h3>
              <button className="verify-modal__close" onClick={() => setShowPrefs(false)} aria-label="Close">
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>

            <div className="notif-prefs-cols-header">
              <span className="notif-pref-label">Event</span>
              <span className="notif-pref-channel-label">In-app</span>
              <span className="notif-pref-channel-label">Email</span>
            </div>

            <div className="notif-prefs-list">
              {prefsLoading ? (
                <div className="notif-state-center"><div className="spinner-border spinner-border-sm" role="status"></div></div>
              ) : (
                prefs.map(p => (
                  <PrefRow key={p.type} pref={p} onChange={handlePrefChange} />
                ))
              )}
            </div>

            <div className="notif-prefs-footer">
              <button className="auth-btn-primary" onClick={savePrefs} disabled={savingPrefs}>
                {savingPrefs ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
