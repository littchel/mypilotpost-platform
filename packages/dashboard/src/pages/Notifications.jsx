/**
 * myPilotPost — Notification Center (full page)
 * Tabs: Inbox · Approvals · Reports · Scheduler · Settings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api/client';

const TABS = [
  { id: 'inbox',     label: 'Inbox',     icon: '📥' },
  { id: 'approvals', label: 'Approvals', icon: '✅' },
  { id: 'reports',   label: 'Reports',   icon: '📊' },
  { id: 'scheduler', label: 'Scheduler', icon: '📅' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
];

const APPROVAL_TYPES  = new Set(['content_approved','content_rejected','content_comment','approval_required']);
const REPORT_TYPES    = new Set(['intel_report_ready','report']);
const SCHEDULE_TYPES  = new Set(['post_scheduled','post_published','post_failed']);

const CHANNELS = ['email', 'whatsapp'];
const NOTIF_TYPES = ['approval', 'report', 'invite', 'scheduler', 'digest'];

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({ n, onRead, onArchive }) {
  const TYPE_ICON = { content_approved:'✅', content_rejected:'❌', content_comment:'💬', post_scheduled:'📅', post_published:'🚀', post_failed:'⚠️', approval_required:'🔔', team_invite:'👥', intel_report_ready:'📊', default:'•' };
  const ic = TYPE_ICON[n.type] || TYPE_ICON.default;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: n.read ? 'transparent' : 'rgba(37,99,235,0.03)', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ic}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</p>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
        {!n.read && (
          <button onClick={() => onRead(n.id)} title="Mark read"
            style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer', color: 'var(--pilot-blue)' }}>
            Read
          </button>
        )}
        <button onClick={() => onArchive(n.id)} title="Archive"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2px 4px' }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [prefs, setPrefs]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    apiRequest('/api/customer/communication/preferences')
      .then(d => setPrefs(d?.data || {}))
      .catch(() => setPrefs({}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiRequest('/api/customer/communication/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  function toggle(channel, key, val) {
    setPrefs(p => ({ ...p, [channel]: { ...(p[channel] || {}), [key]: val } }));
  }
  function toggleType(channel, type, val) {
    setPrefs(p => ({ ...p, [channel]: { ...(p[channel] || {}), types: { ...(p[channel]?.types || {}), [type]: val } } }));
  }

  if (!prefs) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>;

  return (
    <div style={{ padding: '24px', maxWidth: 560 }}>
      <h5 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Notification Preferences</h5>
      <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose how you receive notifications. Quiet hours prevent delivery during off-hours.</p>

      {CHANNELS.map(ch => {
        const cfg = prefs[ch] || {};
        return (
          <div key={ch} style={{ marginBottom: 28, background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                {ch === 'email' ? '✉️ Email' : '💬 WhatsApp'}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={cfg.enabled !== false} onChange={e => toggle(ch, 'enabled', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--pilot-blue)' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{cfg.enabled !== false ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            {ch === 'whatsapp' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>WhatsApp Number (E.164)</label>
                <input
                  type="tel" placeholder="+27821234567"
                  value={cfg.whatsapp_number || ''}
                  onChange={e => toggle(ch, 'whatsapp_number', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>NOTIFICATION TYPES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {NOTIF_TYPES.map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={cfg.types?.[t] !== false} onChange={e => toggleType(ch, t, e.target.checked)} style={{ accentColor: 'var(--pilot-blue)' }} />
                  <span style={{ textTransform: 'capitalize' }}>{t}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Quiet From</label>
                <input type="time" value={cfg.quiet_start || ''} onChange={e => toggle(ch, 'quiet_start', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.82rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Quiet Until</label>
                <input type="time" value={cfg.quiet_end || ''} onChange={e => toggle(ch, 'quiet_end', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.82rem' }} />
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={save} disabled={saving}
        style={{ padding: '10px 28px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const [tab, setTab]         = useState('inbox');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/customer/notifications?limit=50');
      setItems(data?.data || []);
      setUnread(data?.pagination?.unread_count || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleItems = items.filter(n => {
    if (tab === 'inbox')     return true;
    if (tab === 'approvals') return APPROVAL_TYPES.has(n.type);
    if (tab === 'reports')   return REPORT_TYPES.has(n.type);
    if (tab === 'scheduler') return SCHEDULE_TYPES.has(n.type);
    return true;
  });

  async function markRead(id) {
    try {
      await apiRequest('/api/customer/notifications/read', { method: 'POST', body: JSON.stringify({ notification_id: id }) });
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await apiRequest('/api/customer/notifications/read-all', { method: 'POST' });
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* silent */ }
  }

  function archive(id) {
    setItems(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pilot-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Communication</div>
          <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Notification Center</h4>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ padding: '6px 16px', background: 'var(--surface-secondary)', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>
            Mark all read ({unread})
          </button>
        )}
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-subtle)', marginBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--pilot-blue)' : 'transparent'}`, marginBottom: -2, fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--pilot-blue)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
        {tab === 'settings' ? <SettingsTab /> : loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>
        ) : visibleItems.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No notifications in this category.</p>
          </div>
        ) : visibleItems.map(n => (
          <NotifItem key={n.id} n={n} onRead={markRead} onArchive={archive} />
        ))}
      </div>
    </div>
  );
}
