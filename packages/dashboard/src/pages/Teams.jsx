/**
 * myPilotPost — Teams
 * Tabs: Members · Clients · Activity · Invites
 */
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api/client';

const ASSIGNABLE_ROLES = ['admin', 'brand_manager', 'creator', 'approver', 'viewer'];
const ROLE_COLORS = {
  owner:         '#7c3aed', admin: '#2563eb', brand_manager: '#0891b2',
  creator:       '#16a34a', approver: '#d97706', viewer: '#94a3b8',
  team:          '#2563eb', client: '#ec4899',
};

function RolePill({ role }) {
  const color = ROLE_COLORS[role] || '#94a3b8';
  return <span style={{ padding: '2px 9px', borderRadius: 100, background: `${color}18`, color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${color}33` }}>{role?.replace('_', ' ')}</span>;
}

// ── Members tab ───────────────────────────────────────────────────────────────
function MembersTab({ brandId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id, role }

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try { const d = await apiRequest('/api/customer/team'); setMembers(d?.data || []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  async function changeRole(memberId, role) {
    try { await apiRequest(`/api/customer/team/${memberId}`, { method: 'PUT', body: JSON.stringify({ role }) }); setEditing(null); await load(); }
    catch { /* silent */ }
  }

  async function remove(memberId) {
    if (!confirm('Remove this team member?')) return;
    try { await apiRequest(`/api/customer/team/${memberId}`, { method: 'DELETE' }); await load(); }
    catch { /* silent */ }
  }

  return (
    <div>
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>
      : members.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No team members yet.</div>
      : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--surface-secondary)' }}>
            {['Name', 'Role', 'Joined', ''].map(h => <th key={h} style={{ padding: '10px 16px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === '' ? 'right' : 'left', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{m.full_name || m.email}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.email}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {editing?.id === m.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={editing.role} onChange={e => setEditing(ed => ({ ...ed, role: e.target.value }))}
                        style={{ padding: '4px 8px', border: '1.5px solid var(--pilot-blue)', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                      <button onClick={() => changeRole(m.id, editing.role)} style={{ padding: '4px 10px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>Save</button>
                      <button onClick={() => setEditing(null)} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RolePill role={m.role} />
                      {m.role !== 'owner' && <button onClick={() => setEditing({ id: m.id, role: m.role })} style={{ background: 'none', border: 'none', fontSize: '0.68rem', color: 'var(--pilot-blue)', cursor: 'pointer', padding: '2px 4px' }}>Change</button>}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  {m.role !== 'owner' && <button onClick={() => remove(m.id)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 7, padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626' }}>Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Invites tab ───────────────────────────────────────────────────────────────
function InvitesTab({ brandId }) {
  const [invites, setInvites]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState('creator');
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try { const d = await apiRequest('/api/customer/invites'); setInvites(d?.data || []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  async function invite(e) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      await apiRequest('/api/customer/invites', { method: 'POST', body: JSON.stringify({ email, role }) });
      setEmail(''); setSent(true); setTimeout(() => setSent(false), 2500);
      await load();
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function revoke(inviteId) {
    try { await apiRequest(`/api/customer/invites/${inviteId}`, { method: 'DELETE' }); await load(); }
    catch { /* silent */ }
  }

  return (
    <div style={{ padding: 20 }}>
      <form onSubmit={invite} style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', background: 'var(--surface-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required
          style={{ flex: 1, minWidth: 200, padding: '9px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding: '9px 12px', border: '1.5px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-main)' }}>
          {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
        </select>
        <button type="submit" disabled={sending || !email}
          style={{ padding: '9px 20px', background: 'var(--pilot-blue)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: sending ? 'wait' : 'pointer' }}>
          {sending ? 'Sending…' : sent ? '✓ Sent' : 'Send Invite'}
        </button>
      </form>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: '0.85rem' }}>Loading…</div>
      : invites.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: '0.85rem' }}>No pending invites.</div>
      : invites.map(inv => (
        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 10, marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{inv.email}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expires {new Date(inv.expires_at).toLocaleDateString()}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RolePill role={inv.role} />
            <button onClick={() => revoke(inv.id)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626' }}>Revoke</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity tab ──────────────────────────────────────────────────────────────
function ActivityTab({ brandId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId) return;
    apiRequest('/api/customer/activity?limit=50')
      .then(d => setItems(d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandId]);

  const ACTION_ICON = { 'content.approved':'✅', 'content.rejected':'❌', 'member.invited':'👥', 'member.removed':'🚪', 'client.created':'🧑‍💼', 'client.approval_sent':'📨', 'report.shared':'📊' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</div>;
  if (items.length === 0) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}><div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>No activity yet.</div>;

  return (
    <div style={{ padding: '8px 0' }}>
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{ACTION_ICON[item.action] || '•'}</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)' }}>
              <strong>{item.actor_name || 'System'}</strong>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{item.action?.replace(/\./g, ' ')}</span>
              {item.entity_label && <> — <em style={{ color: 'var(--text-secondary)' }}>{item.entity_label}</em></>}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'members', label: 'Members', icon: '👤' },
  { id: 'clients', label: 'Clients', icon: '🧑‍💼' },
  { id: 'activity', label: 'Activity', icon: '📋' },
  { id: 'invites', label: 'Invites', icon: '✉️' },
];

const Teams = ({ brandId }) => {
  const [tab, setTab] = useState('members');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pilot-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Collaboration</div>
        <h4 style={{ margin: '0 0 2px', fontWeight: 800, color: 'var(--text-main)' }}>Team & Clients</h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage your team, invite collaborators, and share content with clients.</p>
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

      <div style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 12px 12px', minHeight: 300 }}>
        {tab === 'members'  && <MembersTab brandId={brandId} />}
        {tab === 'clients'  && (
          <div style={{ padding: 12 }}>
            <a href="/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--pilot-blue-light)', color: 'var(--pilot-blue)', border: '1.5px solid var(--pilot-blue)', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', marginBottom: 16 }}>
              Open Clients Page →
            </a>
          </div>
        )}
        {tab === 'activity' && <ActivityTab brandId={brandId} />}
        {tab === 'invites'  && <InvitesTab brandId={brandId} />}
      </div>
    </div>
  );
};

export default Teams;
