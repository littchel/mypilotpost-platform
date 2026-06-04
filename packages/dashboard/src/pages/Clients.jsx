/**
 * myPilotPost — Client Management
 * Add/edit/send approvals and reports to external clients.
 * No client login required — access via secure token links.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api/client';

function ClientRow({ client, onSend, onEdit, onArchive }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{client.name}</div>
        {client.company && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{client.company}</div>}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-main)' }}>{client.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-main)' }}>{client.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: client.status === 'active' ? '#f0fdf4' : '#f1f5f9', color: client.status === 'active' ? '#16a34a' : '#94a3b8', textTransform: 'capitalize' }}>
          {client.status}
        </span>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => onSend(client)} style={{ padding: '5px 12px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          <button onClick={() => onEdit(client)} style={{ padding: '5px 10px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Edit</button>
          <button onClick={() => onArchive(client.id)} style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Archive</button>
        </div>
      </td>
    </tr>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '', ...(client || {}) });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); } catch { /* silent */ }
    finally { setSaving(false); }
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <h5 style={{ margin: '0 0 20px', fontWeight: 800, color: 'var(--text-main)' }}>{client ? 'Edit Client' : 'Add Client'}</h5>
        <form onSubmit={submit}>
          {field('Name *', 'name', 'text', 'Client name')}
          {field('Email', 'email', 'email', 'client@company.com')}
          {field('WhatsApp Number', 'phone', 'tel', '+1234567890')}
          {field('Company', 'company', 'text', 'Company name')}
          {field('Notes', 'notes', 'text', 'Internal notes')}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={saving || !form.name} style={{ padding: '9px 24px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Saving…' : client ? 'Update' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SendModal({ client, onClose }) {
  const [form, setForm] = useState({ type: 'approval', channels: ['email'], content_title: '', message: '', expiry_hours: 72 });
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  async function send(e) {
    e.preventDefault();
    setSending(true);
    try {
      const data = await apiRequest(`/api/customer/clients/${client.id}/send`, { method: 'POST', body: JSON.stringify(form) });
      setResult(data);
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function toggleChannel(ch) {
    setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  }

  if (result) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
        <h5 style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>Sent to {client.name}</h5>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>Link expires: {result.expires_at ? new Date(result.expires_at).toLocaleDateString() : '—'}</p>
        <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 16 }}>{result.link}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => navigator.clipboard.writeText(result.link)} style={{ padding: '8px 16px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Copy Link</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <h5 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-main)' }}>Send to {client.name}</h5>
        <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Choose what to send and how to deliver it.</p>
        <form onSubmit={send}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem' }}>
              <option value="approval">Content for Approval</option>
              <option value="report">Report</option>
              <option value="invite">Invite</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject / Title</label>
            <input type="text" value={form.content_title} onChange={e => setForm(f => ({ ...f, content_title: e.target.value }))} placeholder="e.g. Q3 Campaign Post"
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note to Client</label>
            <textarea rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Optional message…"
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deliver via</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['email', 'whatsapp'].map(ch => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '7px 14px', border: `1.5px solid ${form.channels.includes(ch) ? 'var(--pilot-blue)' : 'var(--border-subtle)'}`, borderRadius: 8, background: form.channels.includes(ch) ? 'var(--pilot-blue-light)' : '#fff', fontSize: '0.82rem', fontWeight: 600, color: form.channels.includes(ch) ? 'var(--pilot-blue)' : 'var(--text-muted)' }}>
                  <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleChannel(ch)} style={{ display: 'none' }} />
                  {ch === 'email' ? '✉️' : '💬'} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={sending} style={{ padding: '9px 24px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: sending ? 'wait' : 'pointer' }}>
              {sending ? 'Sending…' : 'Send →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // 'add' | 'edit' | 'send'
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/customer/clients');
      setClients(data?.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveClient(form) {
    if (selected) {
      await apiRequest(`/api/customer/clients/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await apiRequest('/api/customer/clients', { method: 'POST', body: JSON.stringify(form) });
    }
    await load();
  }

  async function archive(id) {
    if (!confirm('Archive this client?')) return;
    await apiRequest(`/api/customer/clients/${id}`, { method: 'DELETE' });
    setClients(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pilot-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Team</div>
          <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Clients</h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage external stakeholders. Send approvals and reports without a login.</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('add'); }}
          style={{ padding: '9px 20px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
          + Add Client
        </button>
      </div>

      <div style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-secondary)' }}>
              {['Client', 'Email', 'WhatsApp', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: h === '' ? 'right' : 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>👥</div>
                No clients yet. Add your first client to start sending approvals and reports.
              </td></tr>
            ) : clients.map(c => (
              <ClientRow key={c.id} client={c}
                onSend={cl => { setSelected(cl); setModal('send'); }}
                onEdit={cl => { setSelected(cl); setModal('edit'); }}
                onArchive={archive} />
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <ClientModal client={modal === 'edit' ? selected : null} onClose={() => setModal(null)} onSave={saveClient} />
      )}
      {modal === 'send' && selected && (
        <SendModal client={selected} onClose={() => { setModal(null); setSelected(null); }} />
      )}
    </div>
  );
}
