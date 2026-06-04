/**
 * myPilotPost — Client Management + Profile Drawer
 * Drawer tabs: Overview · Approvals · Reports · Activity · Preferences
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../lib/api/client';

const STATUS_PILL = (status) => ({
  active:   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  archived: { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' },
}[status] || { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' });

// ── Profile Drawer ────────────────────────────────────────────────────────────
const DRAWER_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'approvals',    label: 'Approvals' },
  { id: 'reports',      label: 'Reports' },
  { id: 'activity',     label: 'Activity' },
  { id: 'preferences',  label: 'Preferences' },
];

function ProfileDrawer({ client, onClose, onSend }) {
  const [tab, setTab]     = useState('overview');
  const [links, setLinks] = useState([]);
  const [activity, setActivity] = useState([]);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!client) return;
    apiRequest(`/api/customer/clients/${client.id}/links`)
      .then(d => setLinks(d?.data || [])).catch(() => {});
    apiRequest(`/api/customer/activity?entity_type=client&entity_id=${client.id}&limit=20`)
      .then(d => setActivity(d?.data || [])).catch(() => {});
  }, [client]);

  useEffect(() => {
    function handle(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  if (!client) return null;

  const approvalLinks = links.filter(l => l.type === 'approval');
  const reportLinks   = links.filter(l => l.type === 'report');
  const lastContact   = links[0]?.created_at;

  const sp = STATUS_PILL(client.status);

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9000 }} />

      {/* Drawer */}
      <div ref={drawerRef} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,.14)', zIndex: 9001, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--pilot-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--pilot-blue)' }}>
                  {client.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{client.name}</div>
                  {client.company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{client.company}</div>}
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: sp.bg, color: sp.color, border: `1px solid ${sp.border}` }}>{client.status}</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: 4 }}>✕</button>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {['approval','report','invite'].map(type => (
              <button key={type} onClick={() => onSend(client, type)}
                style={{ padding: '6px 12px', background: type === 'approval' ? 'var(--pilot-blue)' : 'var(--surface-secondary)', color: type === 'approval' ? '#fff' : 'var(--text-main)', border: '1.5px solid var(--border-subtle)', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>
                Send {type}
              </button>
            ))}
          </div>

          {/* Drawer tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {DRAWER_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '8px 12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--pilot-blue)' : 'transparent'}`, marginBottom: -1, fontSize: '0.78rem', fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--pilot-blue)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 24px' }}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  ['Email',         client.email || '—'],
                  ['WhatsApp',      client.phone || '—'],
                  ['Company',       client.company || '—'],
                  ['Last Contact',  lastContact ? new Date(lastContact).toLocaleDateString() : '—'],
                  ['Approvals Sent', String(approvalLinks.length)],
                  ['Reports Sent',   String(reportLinks.length)],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: '10px 12px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                  </div>
                ))}
              </div>
              {client.notes && (
                <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.82rem', color: '#78350f' }}>
                  <strong>Notes:</strong> {client.notes}
                </div>
              )}
            </div>
          )}

          {/* APPROVALS */}
          {tab === 'approvals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{approvalLinks.length} approval link{approvalLinks.length !== 1 ? 's' : ''} sent</div>
                <button onClick={() => onSend(client, 'approval')} style={{ padding: '5px 12px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>+ Send Approval</button>
              </div>
              {approvalLinks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No approval links sent yet.</div>
              ) : approvalLinks.map(l => (
                <LinkRow key={l.id} link={l} />
              ))}
            </div>
          )}

          {/* REPORTS */}
          {tab === 'reports' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{reportLinks.length} report{reportLinks.length !== 1 ? 's' : ''} shared</div>
                <button onClick={() => onSend(client, 'report')} style={{ padding: '5px 12px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>+ Share Report</button>
              </div>
              {reportLinks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No reports shared yet.</div>
              ) : reportLinks.map(l => (
                <LinkRow key={l.id} link={l} />
              ))}
            </div>
          )}

          {/* ACTIVITY */}
          {tab === 'activity' && (
            <div>
              {activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No activity yet.</div>
              ) : activity.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>•</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                      <strong>{a.actor_name || 'System'}</strong> {a.action?.replace(/\./g, ' ')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PREFERENCES */}
          {tab === 'preferences' && (
            <ClientPreferences client={client} />
          )}
        </div>
      </div>
    </>
  );
}

function LinkRow({ link }) {
  const expired = link.expires_at && new Date(link.expires_at) < new Date();
  const accessed = !!link.accessed_at;
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-main)' }}>{link.type}</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: expired ? '#fef2f2' : accessed ? '#f0fdf4' : '#fffbeb', color: expired ? '#dc2626' : accessed ? '#16a34a' : '#d97706' }}>
          {expired ? 'Expired' : accessed ? 'Opened' : 'Pending'}
        </span>
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sent {new Date(link.created_at).toLocaleDateString()}{link.expires_at ? ` · Expires ${new Date(link.expires_at).toLocaleDateString()}` : ''}</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <button onClick={() => navigator.clipboard.writeText(`https://app.mypilotpost.com/public/review?token=${link.token}`)}
          style={{ padding: '3px 10px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
          Copy Link
        </button>
      </div>
    </div>
  );
}

function ClientPreferences({ client }) {
  const [channels, setChannels] = useState({ email: !!client.email, whatsapp: !!client.phone });
  return (
    <div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 12 }}>Preferred delivery channels</div>
      {[['email', '✉️ Email', client.email], ['whatsapp', '💬 WhatsApp', client.phone]].map(([ch, label, value]) => (
        <div key={ch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{value || 'Not set'}</div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: value ? '#16a34a' : '#e2e8f0' }} />
        </div>
      ))}
      {!client.email && !client.phone && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>Edit this client to add an email or WhatsApp number.</p>
      )}
    </div>
  );
}

// ── Send modal ────────────────────────────────────────────────────────────────
function SendModal({ client, defaultType, onClose }) {
  const [form, setForm]   = useState({ type: defaultType || 'approval', channels: ['email'], content_title: '', message: '', expiry_hours: 72 });
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  function toggleCh(ch) { setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] })); }

  if (result) return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✅</div>
        <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: 6, fontSize: '1rem' }}>Sent to {client.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Expires: {result.expires_at ? new Date(result.expires_at).toLocaleDateString() : '—'}
        </div>
        <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 16, textAlign: 'left' }}>{result.link}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => navigator.clipboard.writeText(result.link)} style={{ padding: '8px 16px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Copy Link</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose} title={`Send to ${client.name}`} subtitle="Choose type and delivery channels.">
      <form onSubmit={async e => { e.preventDefault(); setSending(true); try { const d = await apiRequest(`/api/customer/clients/${client.id}/send`, { method: 'POST', body: JSON.stringify(form) }); setResult(d); } catch { /* silent */ } finally { setSending(false); } }}>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Type</FieldLabel>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={selectStyle}>
            <option value="approval">Content for Approval</option>
            <option value="report">Report</option>
            <option value="invite">Invite</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Title</FieldLabel>
          <input type="text" value={form.content_title} onChange={e => setForm(f => ({ ...f, content_title: e.target.value }))} placeholder="e.g. Q3 Campaign Post" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Note (optional)</FieldLabel>
          <textarea rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Deliver via</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['email','✉️ Email'], ['whatsapp','💬 WhatsApp']].map(([ch, label]) => (
              <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1.5px solid ${form.channels.includes(ch) ? 'var(--pilot-blue)' : 'var(--border-subtle)'}`, borderRadius: 8, background: form.channels.includes(ch) ? 'var(--pilot-blue-light)' : '#fff', fontSize: '0.82rem', fontWeight: 600, color: form.channels.includes(ch) ? 'var(--pilot-blue)' : 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleCh(ch)} style={{ display: 'none' }} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <ModalFooter onCancel={onClose} submitLabel={sending ? 'Sending…' : 'Send →'} disabled={sending} />
      </form>
    </Modal>
  );
}

// ── Client add/edit modal ─────────────────────────────────────────────────────
function ClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '', ...(client || {}) });
  const [saving, setSaving] = useState(false);
  async function submit(e) { e.preventDefault(); setSaving(true); try { await onSave(form); onClose(); } catch { /* silent */ } finally { setSaving(false); } }
  const f = (label, key, type = 'text', ph = '') => (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <input type={type} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
    </div>
  );
  return (
    <Modal onClose={onClose} title={client ? 'Edit Client' : 'Add Client'}>
      <form onSubmit={submit}>
        {f('Name *', 'name', 'text', 'Client name')}
        {f('Email', 'email', 'email', 'client@company.com')}
        {f('WhatsApp Number', 'phone', 'tel', '+1234567890')}
        {f('Company', 'company', 'text', 'Company name')}
        {f('Notes', 'notes', 'text', 'Internal notes')}
        <ModalFooter onCancel={onClose} submitLabel={saving ? 'Saving…' : client ? 'Update' : 'Add Client'} disabled={saving || !form.name} />
      </form>
    </Modal>
  );
}

// ── Tiny shared helpers ───────────────────────────────────────────────────────
const inputStyle  = { width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem', outline: 'none' };
const selectStyle = { ...inputStyle };

function FieldLabel({ children }) {
  return <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{children}</label>;
}

function Modal({ children, onClose, title, subtitle }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        {title && <h5 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-main)' }}>{title}</h5>}
        {subtitle && <p style={{ margin: '0 0 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, submitLabel, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
      <button type="button" onClick={onCancel} style={{ padding: '9px 20px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
      <button type="submit" disabled={disabled} style={{ padding: '9px 24px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.7 : 1 }}>{submitLabel}</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Clients() {
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [drawer, setDrawer]     = useState(null);   // client in drawer
  const [modal, setModal]       = useState(null);   // 'add' | 'edit' | 'send'
  const [sendType, setSendType] = useState('approval');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiRequest('/api/customer/clients'); setClients(d?.data || []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveClient(form) {
    if (selected) await apiRequest(`/api/customer/clients/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
    else await apiRequest('/api/customer/clients', { method: 'POST', body: JSON.stringify(form) });
    await load();
  }

  async function archive(id) {
    if (!confirm('Archive this client?')) return;
    await apiRequest(`/api/customer/clients/${id}`, { method: 'DELETE' });
    setClients(p => p.filter(c => c.id !== id));
    if (drawer?.id === id) setDrawer(null);
  }

  function openSend(client, type = 'approval') { setSelected(client); setSendType(type); setModal('send'); }

  const TH = ({ children, right }) => (
    <th style={{ padding: '10px 16px', textAlign: right ? 'right' : 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-secondary)' }}>{children}</th>
  );

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pilot-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Team</div>
          <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Clients</h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>External stakeholders. Send approvals and reports without a login.</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('add'); }}
          style={{ padding: '9px 20px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
          + Add Client
        </button>
      </div>

      <div style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><TH>Client</TH><TH>Email</TH><TH>WhatsApp</TH><TH>Status</TH><TH right>Actions</TH></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>👥</div>
                No clients yet. Add one to start sending approvals and reports.
              </td></tr>
            ) : clients.map(c => {
              const sp = STATUS_PILL(c.status);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => setDrawer(c)}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{c.name}</div>
                    {c.company && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.company}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-main)' }}>{c.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-main)' }}>{c.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: sp.bg, color: sp.color, border: `1px solid ${sp.border}` }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openSend(c, 'approval')} style={{ padding: '5px 12px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Send</button>
                      <button onClick={() => { setSelected(c); setModal('edit'); }} style={{ padding: '5px 10px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Edit</button>
                      <button onClick={() => archive(c.id)} style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626' }}>Archive</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drawer && <ProfileDrawer client={drawer} onClose={() => setDrawer(null)} onSend={(c, type) => { setDrawer(null); openSend(c, type); }} />}
      {(modal === 'add' || modal === 'edit') && <ClientModal client={modal === 'edit' ? selected : null} onClose={() => setModal(null)} onSave={saveClient} />}
      {modal === 'send' && selected && <SendModal client={selected} defaultType={sendType} onClose={() => { setModal(null); setSelected(null); }} />}
    </div>
  );
}
