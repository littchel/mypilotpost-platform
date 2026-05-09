import React, { useState, useEffect } from "react";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import { 
  Building2, 
  Image as ImageIcon, 
  Save, 
  CheckCircle2,
  Settings as SettingsIcon
} from "lucide-react";
import { apiRequest } from "../lib/api/client";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [branding, setBranding] = useState({
    agency_name: "",
    agency_logo_url: ""
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const data = await apiRequest("/api/customer/settings/agency");
      setBranding(data);
    } catch (e) {
      console.error("Failed to fetch branding", e);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await apiRequest("/api/customer/settings/agency", {
        method: "PATCH",
        body: JSON.stringify(branding)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to update branding", e);
      alert("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-muted">Loading settings...</div>;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="header-left">
          <h2>Account Settings</h2>
          <p>Manage your global agency identity and dashboard preferences.</p>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-column">
          <WorkspaceCard 
            title="Agency Branding" 
            subtitle="These details will appear on all client-facing reports."
          >
            <form onSubmit={handleSave} className="settings-form">
              <div className="form-group">
                <label className="form-label">
                  <Building2 size={16} />
                  Agency Name
                </label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. My Global Agency"
                  value={branding.agency_name}
                  onChange={(e) => setBranding({...branding, agency_name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <ImageIcon size={16} />
                  Agency Logo URL
                </label>
                <div className="logo-input-group">
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="https://example.com/logo.png"
                    value={branding.agency_logo_url}
                    onChange={(e) => setBranding({...branding, agency_logo_url: e.target.value})}
                  />
                  {branding.agency_logo_url && (
                    <div className="logo-preview-mini">
                      <img src={branding.agency_logo_url} alt="Preview" />
                    </div>
                  )}
                </div>
                <p className="form-help text-muted mt-2">
                  Use a high-resolution PNG or SVG on a transparent background for best results.
                </p>
              </div>

              <div className="form-actions mt-4 pt-4 border-top">
                <PilotButton 
                  type="primary" 
                  icon={success ? CheckCircle2 : Save} 
                  disabled={saving}
                >
                  {saving ? "Saving..." : success ? "Settings Saved" : "Save Changes"}
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
                  <span>v1.2.0 (Agency Reporting Pack)</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><CheckCircle2 size={18} /></div>
                <div className="info-details">
                  <strong>API Status</strong>
                  <span>Connected & Authoritative</span>
                </div>
              </div>
            </div>
          </WorkspaceCard>
        </div>
      </div>

      <style>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .settings-header h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-dark);
          margin-bottom: 4px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .logo-preview-mini {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          background: white;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-preview-mini img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .system-info-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-item {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .info-icon {
          width: 40px;
          height: 40px;
          background: var(--bg-body);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-blue);
        }

        .info-details {
          display: flex;
          flex-direction: column;
        }

        .info-details strong {
          font-size: 0.9rem;
          color: var(--text-dark);
        }

        .info-details span {
          font-size: 0.8rem;
          color: var(--text-gray);
        }
      `}</style>
    </div>
  );
};

export default Settings;
