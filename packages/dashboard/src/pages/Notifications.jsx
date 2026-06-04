/**
 * myPilotPost — Notification Center (full page)
 * Tabs: All · Approvals · Reports · Publishing · Team · Support · Settings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api/client';

const TABS = [
  { id: 'all',        label: 'All',       icon: '📥' },
  { id: 'approvals',  label: 'Approvals', icon: '✅' },
  { id: 'reports',    label: 'Reports',   icon: '📊' },
  { id: 'publishing', label: 'Publishing',icon: '🚀' },
  { id: 'team',       label: 'Team',      icon: '👥' },
  { id: 'support',    label: 'Support',   icon: '🆘' },
  { id: 'settings',   label: 'Settings',  icon: '⚙️' },
];

const TAB_FILTER = {
  approvals:  n => ['approval_requested','approval_approved','approval_rejected','content_comment'].includes(n.type),
  reports:    n => ['intel_report_ready','report_shared','report_opened'].includes(n.type),
  publishing: n => ['post_scheduled','post_published','post_failed','content_published','schedule_created','schedule_failed'].includes(n.type),
  team:       n => ['team_invite','team_joined','invite_sent','invite_accepted','team_role_changed','client_added'].includes(n.type),
  support:    n => ['support_created','support_replied','billing_warning','verification_required'].includes(n.type),
};

const TYPE_ICON = {
  approval_requested:'🔔', approval_approved:'✅', approval_rejected:'❌',
  content_comment:'💬', post_scheduled:'📅', post_published:'🚀', post_failed:'⚠️',
  intel_report_ready:'📊', report_shared:'📊', team_invite:'👥', team_joined:'🎉',
  invite_sent:'✉️', invite_accepted:'👋', support_created:'🆘', support_replied:'💬',
  billing_warning:'⚡', schedule_failed:'⚠️',
};

function resolveDestination(n) {
  try { const d = JSON.parse(n.data || '{}'); if (d.link) return d.link; } catch { /* */ }
  const type = n.type || '';
  if (['approval_requested','approval_approved','approval_rejected','content_comment'].includes(type)) return '/dashboard?tab=approvals';
  if (['intel_report_ready','report_shared'].includes(type)) return '/dashboard?tab=reports';
  if (['post_published','post_failed','schedule_created'].includes(type)) return '/dashboard?tab=schedule';
  if (['team_invite','invite_sent','invite_accepted'].includes(type)) return '/teams';
  if (['support_created','support_replied'].includes(type)) return '/notifications?tab=support';
  return '#';
}

// ── Support request form ──────────────────────────────────────────────────────
const CATEGORIES = ['technical', 'billing', 'platform', 'approval', 'bug'];

function SupportForm() {
  const [form, setForm] = useState({ category: 'technical', subject: '', message: '' });
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [history, setHistory] = useState([]);

  useEffect(() => {
    apiRequest('/api/customer/support').then(d => setHistory(d?.data || [])).catch(() => {});
  }, [state]);

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    try {
      await apiRequest('/api/customer/support', { method: 'POST', body: JSON.stringify(form) });
      setForm({ category: 'technical', subject: '', message: '' });
      setState('done');
    } catch { setState('error'); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h5 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-main)' }}>Get Help</h5>
      <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>We respond within 24 hours. Describe your issue clearly.</p>

      {state === 'done' ? (
        <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Request received</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We'll email you within 24 hours.</div>
          <button onClick={() => setState('idle')} style={{ marginTop: 14, padding: '7px 18px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer' }}>Submit another</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>Subject</label>
            <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>Message</label>
            <textarea rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical' }} />
          </div>
          {state === 'error' && <p style={{ color: 'var(--status-danger)', fontSize: '0.8rem', marginBottom: 12 }}>Failed to submit. Please try again.</p>}
          <button type="submit" disabled={state === 'sending'}
            style={{ padding: '10px 28px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: state === 'sending' ? 'wait' : 'pointer' }}>
            {state === 'sending' ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Previous Requests</div>
          {history.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 6, fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{r.subject}</span>
              <span style={{ padding: '1px 8px', borderRadius: 100, background: r.status === 'resolved' ? '#f0fdf4' : '#fff7ed', color: r.status === 'resolved' ? '#16a34a' : '#d97706', fontSize: '0.68rem', fontWeight: 700 }}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────
const COMM_CHANNELS = ['email', 'whatsapp'];
const COMM_TYPES = ['approval', 'report', 'invite', 'scheduler', 'digest'];

function SettingsTab() {
  const [prefs, setPrefs]   = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    apiRequest('/api/customer/communication/preferences').then(d => setPrefs(d?.data || {})).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try { await apiRequest('/api/customer/communication/preferences', { method: 'PUT', body: JSON.stringify(prefs) }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { /* silent */ }
    finally { setSaving(false); }
  }

  function toggle(ch, key, val) { setPrefs(p => ({ ...p, [ch]: { ...(p[ch] || {}), [key]: val } })); }
  function toggleType(ch, type, val) { setPrefs(p => ({ ...p, [ch]: { ...(p[ch] || {}), types: { ...(p[ch]?.types || {}), [type]: val } } })); }

  return (
    <div style={{ padding: 24, maxWidth: 540 }}>
      <h5 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-main)' }}>Notification Preferences</h5>
      <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose channels, types, and quiet hours.</p>
      {COMM_CHANNELS.map(ch => {
        const cfg = prefs[ch] || {};
        return (
          <div key={ch} style={{ marginBottom: 24, background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{ch === 'email' ? '✉️ Email' : '💬 WhatsApp'}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={cfg.enabled !== false} onChange={e => toggle(ch, 'enabled', e.target.checked)} style={{ accentColor: 'var(--pilot-blue)' }} />
                {cfg.enabled !== false ? 'Enabled' : 'Disabled'}
              </label>
            </div>
            {ch === 'whatsapp' && (
              <input type="tel" value={cfg.whatsapp_number || ''} onChange={e => toggle(ch, 'whatsapp_number', e.target.value)}
                placeholder="+27821234567" style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }} />
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
              {COMM_TYPES.map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', cursor: 'pointer', padding: '4px 9px', border: '1px solid var(--border-subtle)', borderRadius: 7, background: '#fff' }}>
                  <input type="checkbox" checked={cfg.types?.[t] !== false} onChange={e => toggleType(ch, t, e.target.checked)} style={{ accentColor: 'var(--pilot-blue)' }} />
                  <span style={{ textTransform: 'capitalize' }}>{t}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['quiet_start', 'quiet_end'].map(k => (
                <div key={k} style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{k === 'quiet_start' ? 'Quiet from' : 'Until'}</label>
                  <input type="time" value={cfg[k] || ''} onChange={e => toggle(ch, k, e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.82rem' }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <button onClick={save} disabled={saving} style={{ padding: '9px 24px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({ n, onRead, onArchive }) {
  const dest = resolveDestination(n);
  const ic   = TYPE_ICON[n.type] || '•';
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: n.read ? 'transparent' : 'rgba(37,99,235,0.03)', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ic}</span>
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { if (!n.read) onRead(n.id); if (dest && dest !== '#') window.location.href = dest; }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.message}</p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}{dest && dest !== '#' && <span style={{ color: 'var(--pilot-blue)', marginLeft: 6, fontSize: '0.68rem' }}>Open →</span>}</p>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
        {!n.read && <button onClick={() => onRead(n.id)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer', color: 'var(--pilot-blue)' }}>Read</button>}
        <button onClick={() => onArchive(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2px 4px' }}>✕</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const [tab, setTab]   = useState(() => new URLSearchParams(window.location.search).get('tab') || 'all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiRequest('/api/customer/notifications?limit=60'); setItems(d?.data || []); setUnread(d?.pagination?.unread_count || 0); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleItems = items.filter(n => {
    if (tab === 'all' || tab === 'settings' || tab === 'support') return true;
    return TAB_FILTER[tab]?.(n);
  });

  async function markRead(id) {
    try { await apiRequest('/api/customer/notifications/read', { method: 'POST', body: JSON.stringify({ notification_id: id }) }); setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n)); setUnread(c => Math.max(0, c - 1)); }
    catch { /* silent */ }
  }

  function archive(id) { setItems(p => p.filter(n => n.id !== id)); }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pilot-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Communication</div>
          <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Notification Center</h4>
        </div>
        {unread > 0 && <button onClick={async () => { await apiRequest('/api/customer/notifications/read-all', { method: 'POST' }); setItems(p => p.map(n => ({ ...n, read: true }))); setUnread(0); }} style={{ padding: '6px 16px', background: 'var(--surface-secondary)', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>Mark all read ({unread})</button>}
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-subtle)', marginBottom: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--pilot-blue)' : 'transparent'}`, marginBottom: -2, fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--pilot-blue)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
        {tab === 'settings' ? <SettingsTab /> :
         tab === 'support'  ? <SupportForm /> :
         loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div> :
         visibleItems.length === 0 ? <div style={{ padding: 48, textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div><p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No notifications in this category.</p></div> :
         visibleItems.map(n => <NotifItem key={n.id} n={n} onRead={markRead} onArchive={archive} />)}
      </div>
    </div>
  );
}
