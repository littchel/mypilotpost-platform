import React, { useState, useEffect, useCallback } from "react";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import {
  Building2, Image as ImageIcon, Save, CheckCircle2,
  Settings as SettingsIcon, Shield, Download, Trash2,
  AlertTriangle, ExternalLink, ToggleLeft, ToggleRight,
  Lock, Key, Monitor, LogOut
} from "lucide-react";
import { apiRequest } from "../lib/api/client";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";
const TABS = ["Branding", "Security", "Privacy & Data"];

const Settings = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("Branding");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [branding, setBranding] = useState({ agency_name: "", agency_logo_url: "" });

  // Security state
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [pwdSaving, setPwdSaving]     = useState(false);
  const [pwdMsg, setPwdMsg]           = useState(null);

  // Privacy & Data state
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [consent, setConsent] = useState({ analytics_consent: false, marketing_consent: false });
  const [consentSaving, setConsentSaving] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState(null);

  // Listen for subtab navigation from Header dropdown
  useEffect(() => {
    const handler = (e) => {
      if (e.detail && TABS.includes(e.detail)) setActiveTab(e.detail);
    };
    window.addEventListener('settings-subtab', handler);
    return () => window.removeEventListener('settings-subtab', handler);
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      const data = await apiRequest("/api/customer/settings/agency");
      setBranding(data);
    } catch (e) {
      console.error("Failed to fetch branding", e);
    }
    setLoading(false);
  }, []);

  const fetchPrivacyData = useCallback(async () => {
    try {
      const [statusData, consentData, historyData] = await Promise.allSettled([
        apiRequest("/api/customer/account/delete-status"),
        apiRequest("/api/customer/consent"),
        apiRequest("/api/customer/data/export/history"),
      ]);
      if (statusData.status === "fulfilled") setDeletionStatus(statusData.value?.deletion_request || null);
      if (consentData.status === "fulfilled" && consentData.value?.consent) setConsent(consentData.value.consent);
      if (historyData.status === "fulfilled") setExportHistory(historyData.value?.exports || []);
    } catch (e) {
      console.error("Failed to fetch privacy data", e);
    }
  }, []);

  useEffect(() => { fetchBranding(); }, [fetchBranding]);
  useEffect(() => { if (activeTab === "Privacy & Data") fetchPrivacyData(); }, [activeTab, fetchPrivacyData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await apiRequest("/api/customer/settings/agency", { method: "PATCH", body: JSON.stringify(branding) });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to update branding", e);
      alert("Failed to save settings");
    }
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwdSaving(true);
    try {
      await apiRequest('/api/customer/account/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd })
      });
      setPwdMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err?.error || 'Password change failed. Please verify your current password.' });
    } finally {
      setPwdSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    setDeletionLoading(true);
    setPrivacyMsg(null);
    try {
      const res = await apiRequest("/api/customer/account/delete-request", {
        method: "POST",
        body: JSON.stringify({ reason: deleteReason }),
      });
      setDeleteConfirm(false);
      setPrivacyMsg({ type: "warning", text: `Deletion scheduled for ${new Date(res.scheduled_for).toLocaleDateString()}. You can cancel within 7 days.` });
      await fetchPrivacyData();
    } catch (e) {
      setPrivacyMsg({ type: "error", text: "Failed to submit deletion request. Please try again." });
    }
    setDeletionLoading(false);
  };

  const handleCancelDeletion = async () => {
    setDeletionLoading(true);
    setPrivacyMsg(null);
    try {
      await apiRequest("/api/customer/account/delete-request", { method: "DELETE" });
      setPrivacyMsg({ type: "success", text: "Account deletion cancelled. Your account is safe." });
      await fetchPrivacyData();
    } catch (e) {
      setPrivacyMsg({ type: "error", text: "Failed to cancel deletion request." });
    }
    setDeletionLoading(false);
  };

  const handleExportData = async () => {
    setExportLoading(true);
    setPrivacyMsg(null);
    try {
      const response = await fetch(`${API_BASE}/api/customer/data/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("mpp_token") || ""}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mypilotpost-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setPrivacyMsg({ type: "success", text: "Your data export has been downloaded." });
      await fetchPrivacyData();
    } catch (e) {
      setPrivacyMsg({ type: "error", text: "Export failed. Please try again." });
    }
    setExportLoading(false);
  };

  const handleConsentSave = async () => {
    setConsentSaving(true);
    setPrivacyMsg(null);
    try {
      await apiRequest("/api/customer/consent", { method: "POST", body: JSON.stringify(consent) });
      setPrivacyMsg({ type: "success", text: "Consent preferences saved." });
    } catch (e) {
      setPrivacyMsg({ type: "error", text: "Failed to save consent preferences." });
    }
    setConsentSaving(false);
  };

  if (loading) return <div className="p-5 text-muted small">Loading settings…</div>;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="header-left">
          <h2>Account Settings</h2>
          <p>Manage your account, security, privacy, and data rights.</p>
        </div>
      </header>

      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`settings-tab-btn${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "Branding"     && <Building2 size={15} />}
            {tab === "Security"     && <Lock size={15} />}
            {tab === "Privacy & Data" && <Shield size={15} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── BRANDING ── */}
      {activeTab === "Branding" && (
        <div className="settings-grid">
          <div className="settings-column">
            <WorkspaceCard title="Agency Branding" subtitle="These details appear on all client-facing reports.">
              <form onSubmit={handleSave} className="settings-form">
                <div className="form-group">
                  <label className="form-label"><Building2 size={16} /> Agency Name</label>
                  <input type="text" className="form-control" placeholder="e.g. My Global Agency"
                    value={branding.agency_name}
                    onChange={(e) => setBranding({...branding, agency_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label"><ImageIcon size={16} /> Agency Logo URL</label>
                  <div className="logo-input-group">
                    <input type="text" className="form-control" placeholder="https://example.com/logo.png"
                      value={branding.agency_logo_url}
                      onChange={(e) => setBranding({...branding, agency_logo_url: e.target.value})} />
                    {branding.agency_logo_url && (
                      <div className="logo-preview-mini">
                        <img src={branding.agency_logo_url} alt="Preview" />
                      </div>
                    )}
                  </div>
                  <p className="form-help text-muted mt-2">Use a high-resolution PNG or SVG on a transparent background.</p>
                </div>
                <div className="form-actions mt-4 pt-4 border-top">
                  <PilotButton type="primary" icon={success ? CheckCircle2 : Save} disabled={saving}>
                    {saving ? "Saving…" : success ? "Settings Saved" : "Save Changes"}
                  </PilotButton>
                </div>
              </form>
            </WorkspaceCard>
          </div>
          <div className="settings-column">
            <WorkspaceCard title="System Information">
              <div className="system-info-list">
                <div className="info-item">
                  <div className="info-icon"><SettingsIcon size={18} /></div>
                  <div className="info-details">
                    <strong>Dashboard Version</strong>
                    <span>v1.2.0 (Phase 14)</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon"><CheckCircle2 size={18} /></div>
                  <div className="info-details">
                    <strong>API Status</strong>
                    <span>Connected</span>
                  </div>
                </div>
              </div>
            </WorkspaceCard>
          </div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {activeTab === "Security" && (
        <div className="privacy-section">
          {pwdMsg && (
            <div className={`privacy-msg privacy-msg--${pwdMsg.type}`}>{pwdMsg.text}</div>
          )}

          {/* Change Password */}
          <WorkspaceCard
            title="Change Password"
            subtitle="Use a strong, unique password to protect your account."
          >
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="form-group">
                <label className="form-label"><Key size={15} /> Current Password</label>
                <input
                  type="password" className="form-control"
                  placeholder="Enter your current password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label"><Lock size={15} /> New Password</label>
                <input
                  type="password" className="form-control"
                  placeholder="Min. 8 characters"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label"><Lock size={15} /> Confirm New Password</label>
                <input
                  type="password" className="form-control"
                  placeholder="Repeat new password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <PilotButton type="primary" icon={Save} disabled={pwdSaving}>
                {pwdSaving ? "Updating…" : "Update Password"}
              </PilotButton>
            </form>
          </WorkspaceCard>

          {/* Active Session */}
          <WorkspaceCard
            title="Active Session"
            subtitle="Your current login session and device."
          >
            <div className="session-card">
              <div className="session-icon">
                <Monitor size={20} className="text-primary" />
              </div>
              <div className="session-info">
                <div className="session-label">Current Device</div>
                <div className="session-sub">{user?.email} · This session is active</div>
              </div>
              <span className="session-badge">Active</span>
            </div>
            <p className="privacy-desc mt-3">
              Sessions expire after 7 days of inactivity. To invalidate all sessions, change your password above.
            </p>
          </WorkspaceCard>

          {/* Sign Out */}
          <WorkspaceCard
            title="Sign Out"
            subtitle="Sign out of your account on this device."
          >
            <p className="privacy-desc">
              Signing out removes your session from this browser. Your data is preserved.
            </p>
            <PilotButton type="danger" icon={LogOut} onClick={logout}>
              Sign Out Now
            </PilotButton>
          </WorkspaceCard>

          {/* Account Protection */}
          <WorkspaceCard title="Account Protection">
            <div className="protection-list">
              <div className="protection-item">
                <Shield size={16} className="text-success" />
                <div>
                  <strong>Secure transport</strong>
                  <span>All data is encrypted in transit (TLS 1.3).</span>
                </div>
              </div>
              <div className="protection-item">
                <Shield size={16} className="text-success" />
                <div>
                  <strong>Password hashing</strong>
                  <span>Passwords are stored using PBKDF2 with 100,000 iterations — never in plain text.</span>
                </div>
              </div>
              <div className="protection-item">
                <Shield size={16} className="text-primary" />
                <div>
                  <strong>Rate limiting</strong>
                  <span>Login attempts are rate-limited to prevent brute force attacks.</span>
                </div>
              </div>
              <div className="protection-item">
                <Shield size={16} className="text-primary" />
                <div>
                  <strong>JWT authentication</strong>
                  <span>Sessions use signed JSON Web Tokens that expire after 7 days.</span>
                </div>
              </div>
            </div>
          </WorkspaceCard>
        </div>
      )}

      {/* ── PRIVACY & DATA ── */}
      {activeTab === "Privacy & Data" && (
        <div className="privacy-section">
          {privacyMsg && (
            <div className={`privacy-msg privacy-msg--${privacyMsg.type}`}>{privacyMsg.text}</div>
          )}

          <WorkspaceCard title="Analytics & Consent Preferences"
            subtitle="Control how myPilotPost uses analytics on your account.">
            <div className="consent-list">
              <div className="consent-row">
                <div className="consent-info">
                  <strong>Strictly Necessary</strong>
                  <span>Required for the platform to function. Cannot be disabled.</span>
                </div>
                <span className="consent-badge consent-badge--locked">Always On</span>
              </div>
              <div className="consent-row">
                <div className="consent-info">
                  <strong>Analytics</strong>
                  <span>Usage analytics that help us improve the platform.</span>
                </div>
                <button className="consent-toggle" onClick={() => setConsent(c => ({...c, analytics_consent: !c.analytics_consent}))}>
                  {consent.analytics_consent
                    ? <ToggleRight size={28} className="toggle-on" />
                    : <ToggleLeft  size={28} className="toggle-off" />}
                </button>
              </div>
              <div className="consent-row">
                <div className="consent-info">
                  <strong>Marketing</strong>
                  <span>Personalised recommendations and product updates.</span>
                </div>
                <button className="consent-toggle" onClick={() => setConsent(c => ({...c, marketing_consent: !c.marketing_consent}))}>
                  {consent.marketing_consent
                    ? <ToggleRight size={28} className="toggle-on" />
                    : <ToggleLeft  size={28} className="toggle-off" />}
                </button>
              </div>
            </div>
            <div className="mt-4">
              <PilotButton type="primary" icon={Save} disabled={consentSaving} onClick={handleConsentSave}>
                {consentSaving ? "Saving…" : "Save Preferences"}
              </PilotButton>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Download My Data"
            subtitle="Export all your data in JSON format (GDPR/POPIA Article 20).">
            <p className="privacy-desc">
              Your export includes: account profile, brands, scheduled posts, integrations, billing history, and support messages.
            </p>
            {exportHistory.length > 0 && (
              <div className="export-history">
                <p className="export-history-label">Previous exports:</p>
                {exportHistory.slice(0, 3).map(e => (
                  <div key={e.id} className="export-history-row">
                    <span>{new Date(e.requested_at).toLocaleDateString()}</span>
                    <span className="badge-success">{e.status}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <PilotButton type="secondary" icon={Download} disabled={exportLoading} onClick={handleExportData}>
                {exportLoading ? "Generating export…" : "Download My Data"}
              </PilotButton>
            </div>
            <p className="form-help text-muted mt-2">Exports are rate-limited to 5 per day.</p>
          </WorkspaceCard>

          <WorkspaceCard title="Account Deletion"
            subtitle="Permanently delete your account and all associated data.">
            {deletionStatus?.status === "pending" ? (
              <div className="deletion-pending">
                <div className="deletion-warning">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Deletion scheduled</strong>
                    <p>Scheduled for {new Date(deletionStatus.scheduled_for).toLocaleDateString()}. You can cancel this before that date.</p>
                  </div>
                </div>
                <PilotButton type="secondary" disabled={deletionLoading} onClick={handleCancelDeletion}>
                  {deletionLoading ? "Cancelling…" : "Cancel Deletion Request"}
                </PilotButton>
              </div>
            ) : deletionStatus?.status === "completed" ? (
              <p className="text-muted">Your deletion request was completed on {new Date(deletionStatus.completed_at).toLocaleDateString()}.</p>
            ) : !deleteConfirm ? (
              <div>
                <p className="privacy-desc">
                  Before deleting, download your data. Deletion is permanent — all brands, posts, integrations, and personal data will be removed within 7 days. Legally required billing records are retained in anonymised form.
                </p>
                <PilotButton type="danger" icon={Trash2} onClick={() => setDeleteConfirm(true)}>
                  Request Account Deletion
                </PilotButton>
              </div>
            ) : (
              <div className="deletion-confirm">
                <div className="deletion-warning">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>This action is irreversible after the 7-day grace period.</strong>
                    <p>All your brands, posts, integrations, and personal data will be permanently deleted.</p>
                  </div>
                </div>
                <div className="form-group mt-4">
                  <label className="form-label">Reason for leaving (optional)</label>
                  <input type="text" className="form-control" placeholder="e.g. Switching to another platform"
                    value={deleteReason} onChange={e => setDeleteReason(e.target.value)} />
                </div>
                <div className="mt-4" style={{ display: 'flex', gap: 12 }}>
                  <PilotButton type="danger" icon={Trash2} disabled={deletionLoading} onClick={handleRequestDeletion}>
                    {deletionLoading ? "Submitting…" : "Confirm Deletion Request"}
                  </PilotButton>
                  <PilotButton type="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</PilotButton>
                </div>
              </div>
            )}
          </WorkspaceCard>

          <WorkspaceCard title="Trust & Compliance">
            <div className="trust-links">
              <a href="https://mypilotpost.com/privacy"    target="_blank" rel="noopener noreferrer" className="trust-link">Privacy Policy <ExternalLink size={14} /></a>
              <a href="https://mypilotpost.com/terms"      target="_blank" rel="noopener noreferrer" className="trust-link">Terms of Service <ExternalLink size={14} /></a>
              <a href="https://mypilotpost.com/trust"      target="_blank" rel="noopener noreferrer" className="trust-link">Trust Center <ExternalLink size={14} /></a>
              <a href="https://mypilotpost.com/compliance" target="_blank" rel="noopener noreferrer" className="trust-link">GDPR / POPIA Compliance <ExternalLink size={14} /></a>
            </div>
            <p className="form-help text-muted mt-3">
              For data requests, email <strong>privacy@mypilotpost.com</strong>
            </p>
          </WorkspaceCard>
        </div>
      )}

      <style>{`
        .settings-page { display: flex; flex-direction: column; gap: 32px; }
        .settings-header h2 { font-size: 1.5rem; font-weight: 800; color: var(--text-dark); margin-bottom: 4px; }
        .settings-tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0; }
        .settings-tab-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 18px; border: none; background: none; cursor: pointer;
          font-size: 0.875rem; font-weight: 600; color: var(--text-gray);
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .settings-tab-btn.active { color: var(--primary-blue); border-bottom-color: var(--primary-blue); }
        .settings-tab-btn:hover:not(.active) { color: var(--text-dark); }
        .settings-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
        .settings-form { display: flex; flex-direction: column; gap: 24px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 0.85rem; font-weight: 700; color: var(--text-dark); display: flex; align-items: center; gap: 8px; }
        .logo-input-group { display: flex; gap: 12px; align-items: center; }
        .logo-preview-mini { width: 48px; height: 48px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: white; padding: 4px; display: flex; align-items: center; justify-content: center; }
        .logo-preview-mini img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .system-info-list { display: flex; flex-direction: column; gap: 20px; }
        .info-item { display: flex; gap: 16px; align-items: center; }
        .info-icon { width: 40px; height: 40px; background: var(--bg-body); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary-blue); }
        .info-details { display: flex; flex-direction: column; }
        .info-details strong { font-size: 0.9rem; color: var(--text-dark); }
        .info-details span { font-size: 0.8rem; color: var(--text-gray); }
        .privacy-section { display: flex; flex-direction: column; gap: 24px; max-width: 720px; }
        .privacy-msg { padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; margin-bottom: 4px; }
        .privacy-msg--success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .privacy-msg--warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .privacy-msg--error   { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .privacy-desc { font-size: 0.875rem; color: var(--text-gray); line-height: 1.6; margin-bottom: 4px; }
        .consent-list { display: flex; flex-direction: column; gap: 16px; }
        .consent-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-subtle); }
        .consent-row:last-child { border-bottom: none; }
        .consent-info { display: flex; flex-direction: column; gap: 2px; }
        .consent-info strong { font-size: 0.875rem; color: var(--text-dark); font-weight: 600; }
        .consent-info span { font-size: 0.8rem; color: var(--text-gray); }
        .consent-badge--locked { font-size: 0.75rem; font-weight: 600; color: var(--text-gray); background: var(--bg-body); padding: 4px 10px; border-radius: 99px; border: 1px solid var(--border-subtle); }
        .consent-toggle { background: none; border: none; cursor: pointer; padding: 0; display: flex; }
        .toggle-on { color: var(--primary-blue); }
        .toggle-off { color: var(--border-subtle); }
        .export-history { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
        .export-history-label { font-size: 0.75rem; color: var(--text-gray); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .export-history-row { display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--text-gray); }
        .badge-success { background: #d1fae5; color: #065f46; font-size: 0.7rem; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
        .deletion-pending { display: flex; flex-direction: column; gap: 16px; }
        .deletion-confirm { display: flex; flex-direction: column; gap: 12px; }
        .deletion-warning { display: flex; gap: 12px; align-items: flex-start; padding: 14px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; }
        .deletion-warning svg { color: #d97706; flex-shrink: 0; margin-top: 2px; }
        .deletion-warning strong { font-size: 0.875rem; color: #92400e; display: block; margin-bottom: 4px; }
        .deletion-warning p { font-size: 0.8rem; color: #92400e; margin: 0; line-height: 1.5; }
        .trust-links { display: flex; flex-direction: column; gap: 10px; }
        .trust-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--primary-blue); text-decoration: none; font-weight: 500; }
        .trust-link:hover { text-decoration: underline; }
        .session-card { display: flex; align-items: center; gap: 16px; padding: 14px; background: var(--bg-body); border-radius: 10px; border: 1px solid var(--border-subtle); }
        .session-icon { width: 40px; height: 40px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .session-info { flex: 1; }
        .session-label { font-size: 0.875rem; font-weight: 600; color: var(--text-dark); }
        .session-sub { font-size: 0.8rem; color: var(--text-gray); }
        .session-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 99px; background: #d1fae5; color: #065f46; }
        .protection-list { display: flex; flex-direction: column; gap: 16px; }
        .protection-item { display: flex; align-items: flex-start; gap: 12px; }
        .protection-item div { display: flex; flex-direction: column; gap: 2px; }
        .protection-item strong { font-size: 0.875rem; color: var(--text-dark); font-weight: 600; }
        .protection-item span { font-size: 0.8rem; color: var(--text-gray); }
      `}</style>
    </div>
  );
};

export default Settings;
