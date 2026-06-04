/**
 * myPilotPost — Notification Center Bell
 * Always visible in header. Unread count. 6 category tabs.
 * Every notification opens its destination — no dead links.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '../../lib/api/client';

const TABS = [
  { id: 'all',        label: 'All' },
  { id: 'approvals',  label: 'Approvals' },
  { id: 'reports',    label: 'Reports' },
  { id: 'publishing', label: 'Publishing' },
  { id: 'team',       label: 'Team' },
  { id: 'support',    label: 'Support' },
];

const TAB_TYPES = {
  approvals:  new Set(['approval_requested','approval_approved','approval_rejected','content_comment']),
  reports:    new Set(['intel_report_ready','report_shared','report_opened']),
  publishing: new Set(['post_scheduled','post_published','post_failed','content_published','schedule_created','schedule_failed']),
  team:       new Set(['team_invite','team_joined','invite_sent','invite_accepted','team_role_changed','client_added']),
  support:    new Set(['support_created','support_replied','verification_required','billing_warning']),
};

const TYPE_ICON = {
  approval_requested:'🔔', approval_approved:'✅', approval_rejected:'❌',
  content_comment:'💬', post_scheduled:'📅', post_published:'🚀', post_failed:'⚠️',
  intel_report_ready:'📊', report_shared:'📊', team_invite:'👥', team_joined:'🎉',
  invite_sent:'✉️', invite_accepted:'👋', support_created:'🆘', support_replied:'💬',
  billing_warning:'⚡', verification_required:'🔒', schedule_failed:'⚠️',
};

function resolveDestination(n) {
  const data = (() => { try { return JSON.parse(n.data || '{}'); } catch { return {}; } })();
  const link = data.link;
  if (link) return link;
  const type = n.type || '';
  if (TAB_TYPES.approvals.has(type)) return '/dashboard?tab=approvals';
  if (TAB_TYPES.reports.has(type))   return '/dashboard?tab=reports';
  if (TAB_TYPES.publishing.has(type))return '/dashboard?tab=schedule';
  if (TAB_TYPES.team.has(type))      return '/teams';
  if (TAB_TYPES.support.has(type))   return '/settings?tab=support';
  return '/notifications';
}

export default function NotificationCenter() {
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState('all');
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(() => { try { return JSON.parse(localStorage.getItem('mpp_notif_muted') || '[]'); } catch { return []; } });
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try { const d = await apiRequest('/api/customer/notifications/unread-count'); setCount(d?.unread_count || 0); }
    catch { /* silent */ }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try { const d = await apiRequest('/api/customer/notifications?limit=20'); setItems(d?.data || []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCount(); const t = setInterval(fetchCount, 60_000); return () => clearInterval(t); }, [fetchCount]);
  useEffect(() => { if (open) fetchRecent(); }, [open, fetchRecent]);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function markRead(id) {
    try {
      await apiRequest('/api/customer/notifications/read', { method: 'POST', body: JSON.stringify({ notification_id: id }) });
      setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n));
      setCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  }

  function muteType(type) {
    const next = muted.includes(type) ? muted.filter(t => t !== type) : [...muted, type];
    setMuted(next);
    localStorage.setItem('mpp_notif_muted', JSON.stringify(next));
  }

  function archive(id) { setItems(p => p.filter(n => n.id !== id)); }

  const visible = items.filter(n => {
    if (muted.includes(n.type)) return false;
    if (tab === 'all') return true;
    return TAB_TYPES[tab]?.has(n.type);
  });

  const unreadVisible = visible.filter(n => !n.read).length;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: open ? 'var(--hover-bg)' : 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{ position: 'absolute', top: 1, right: 1, background: 'var(--status-danger)', color: '#fff', borderRadius: 10, fontSize: '9px', fontWeight: 800, padding: '1px 4px', minWidth: 14, textAlign: 'center', lineHeight: '14px', border: '1.5px solid var(--surface-primary)' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,.14)', zIndex: 9999, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Notifications {unreadVisible > 0 && <span style={{ fontSize: '0.7rem', background: 'var(--pilot-blue)', color: '#fff', borderRadius: 10, padding: '1px 6px', marginLeft: 4 }}>{unreadVisible}</span>}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {unreadVisible > 0 && <button onClick={async () => { await apiRequest('/api/customer/notifications/read-all', { method: 'POST' }); setItems(p => p.map(n => ({ ...n, read: true }))); setCount(0); }} style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--pilot-blue)', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
                <a href="/notifications" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>See all →</a>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '3px 9px', borderRadius: 100, border: `1px solid ${tab === t.id ? 'var(--pilot-blue)' : 'var(--border-subtle)'}`, background: tab === t.id ? 'var(--pilot-blue-light)' : 'transparent', color: tab === t.id ? 'var(--pilot-blue)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading…</div>
            ) : visible.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🔔</div>
                No notifications here
              </div>
            ) : visible.map(n => {
              const dest = resolveDestination(n);
              const ic   = TYPE_ICON[n.type] || '•';
              return (
                <div key={n.id}
                  style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: n.read ? 'transparent' : 'rgba(37,99,235,0.03)', alignItems: 'flex-start', transition: 'background .12s' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{ic}</span>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { if (!n.read) markRead(n.id); window.location.href = dest; }}>
                    <p style={{ margin: '0 0 2px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    {!n.read && <button onClick={() => markRead(n.id)} title="Mark read" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--pilot-blue)', padding: 0 }}>✓</button>}
                    <button onClick={() => muteType(n.type)} title={`Mute ${n.type}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-muted)', padding: 0 }}>🔕</button>
                    <button onClick={() => archive(n.id)} title="Archive" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-muted)', padding: 0 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
