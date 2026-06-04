/**
 * myPilotPost — Notification Center Bell
 * Shared component used in the app header.
 * Shows unread count, opens a lightweight dropdown of recent notifications.
 * Full notification center is at /notifications.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '../../lib/api/client';

const TYPE_ICON = {
  content_approved: '✅',
  content_rejected: '❌',
  content_comment:  '💬',
  post_scheduled:   '📅',
  post_published:   '🚀',
  post_failed:      '⚠️',
  approval_required:'🔔',
  team_invite:      '👥',
  team_joined:      '🎉',
  report:           '📊',
  intel_report_ready:'📊',
  default:          '•',
};

function icon(type) { return TYPE_ICON[type] || TYPE_ICON.default; }

export default function NotificationCenter() {
  const [open, setOpen]     = useState(false);
  const [count, setCount]   = useState(0);
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const data = await apiRequest('/api/customer/notifications/unread-count');
      setCount(data?.unread_count || 0);
    } catch { /* silent */ }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/customer/notifications?limit=8');
      setItems(data?.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchRecent();
  }, [open, fetchRecent]);

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function markRead(id) {
    try {
      await apiRequest('/api/customer/notifications/read', { method: 'POST', body: JSON.stringify({ notification_id: id }) });
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await apiRequest('/api/customer/notifications/read-all', { method: 'POST' });
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setCount(0);
    } catch { /* silent */ }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
        title="Notifications"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--status-danger)', color: '#fff', borderRadius: '10px', fontSize: '9px', fontWeight: 800, padding: '1px 5px', minWidth: 16, textAlign: 'center', border: '1.5px solid var(--surface-primary)' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 9999, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>Notifications {count > 0 && <span style={{ fontSize: '0.7rem', background: 'var(--pilot-blue)', color: '#fff', borderRadius: 10, padding: '1px 6px', marginLeft: 4 }}>{count}</span>}</span>
            {count > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--pilot-blue)', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔔</div>
                No notifications yet
              </div>
            ) : items.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'flex-start', background: n.read ? 'transparent' : 'rgba(37,99,235,0.04)', cursor: n.read ? 'default' : 'pointer', transition: 'background .12s' }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{icon(n.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4, fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pilot-blue)', flexShrink: 0, marginTop: 5 }} />}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <a href="/notifications" style={{ fontSize: '0.78rem', color: 'var(--pilot-blue)', fontWeight: 600, textDecoration: 'none' }}>View all notifications →</a>
          </div>
        </div>
      )}
    </div>
  );
}
