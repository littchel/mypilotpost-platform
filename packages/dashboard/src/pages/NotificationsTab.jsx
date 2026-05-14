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
                <span className="notif-item__msg">{n.message}</span>
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
                <span className="notif-detail-badge">System Message</span>
                <p className="notif-detail-message">{activeNotif.message}</p>
                <p className="notif-detail-ts">Received {relativeTime(activeNotif.created_at)}</p>
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
