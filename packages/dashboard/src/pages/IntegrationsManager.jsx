import React, { useState, useEffect, useCallback } from "react";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import { 
  Linkedin, 
  Facebook, 
  Instagram, 
  Globe, 
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api/client";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.mypilotpost.com";

const IntegrationsManager = () => {
  const { token } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [_loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/customer/social-connections");
      setIntegrations(data.connections || []);
    } catch (e) {
      console.error("Failed to fetch integrations", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => fetchIntegrations(), 0);
      return () => clearTimeout(timer);
    }
  }, [token, fetchIntegrations]);

  const handleConnect = (provider) => {
    const url = `${API_BASE}/api/oauth/${provider}/connect`;
    window.location.assign(url);
  };

  const handleDisconnect = async (id) => {
    if (!confirm("Are you sure you want to disconnect this platform?")) return;
    try {
      await apiRequest(`/api/customer/social-connections/${id}`, {
        method: "DELETE"
      });
      setIntegrations(prev => prev.filter(i => i.id !== id));
    } catch {
      alert("Disconnect failed");
    }
  };

  const providers = [
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0a66c2", description: "Publish posts and track engagement on your company page." },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "#1877f2", description: "Connect your Facebook Business Pages for scheduling." },
    { id: "instagram", name: "Instagram", icon: Instagram, color: "#e4405f", description: "Schedule visual content and stories." },
    { id: "google", name: "Google", icon: RefreshCw, color: "#4285f4", description: "Connect Google Analytics and YouTube." },
    { id: "x", name: "X (Twitter)", icon: Globe, color: "#000000", description: "Post updates to X with modern OAuth 2.0 PKCE." },
    { id: "tiktok", name: "TikTok", icon: RefreshCw, color: "#000000", description: "Connect your TikTok account for video sharing." },
    { id: "pinterest", name: "Pinterest", icon: Globe, color: "#bd081c", description: "Pin your latest content to boards." },
    { id: "wordpress", name: "WordPress", icon: Globe, color: "#21759b", description: "Publish articles directly to your blog." },
    { id: "canva", name: "Canva", icon: RefreshCw, color: "#00c4cc", description: "Design graphics and import them directly into your posts." }
  ];

  return (
    <>
      <div className="integrations-manager">
        <header className="integrations-header">
          <div className="header-left">
            <h2>Platform Integrations</h2>
            <p>Connect your social media and CMS accounts to enable automated publishing.</p>
          </div>
          <div className="header-actions">
            <PilotButton type="outline" icon={RefreshCw} onClick={fetchIntegrations}>Refresh Status</PilotButton>
          </div>
        </header>

        <div className="integrations-grid">
          {providers.map(p => {
            const connected = integrations.find(i => i.platform === p.id);
            return (
              <WorkspaceCard key={p.id} className={`integration-card ${connected ? 'connected' : ''}`}>
                <div className="card-top">
                  <div className="platform-icon" style={{ backgroundColor: p.color }}>
                    <p.icon size={24} color="white" />
                  </div>
                  <div className="platform-status">
                    {connected ? (
                      connected.status === 'active' ? (
                        <span className="status-badge active"><ShieldCheck size={12} /> Connected</span>
                      ) : (
                        <span className="status-badge inactive" style={{ background: '#fee2e2', color: '#991b1b' }}>
                           <AlertCircle size={12} /> {connected.status.toUpperCase()}
                        </span>
                      )
                    ) : (
                      <span className="status-badge inactive">Not Connected</span>
                    )}
                  </div>
                </div>
                
                <div className="card-middle">
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                </div>

                {connected && (
                  <div className="connection-info">
                    <div className="info-row">
                      <strong>Account:</strong>
                      <span>{connected.platform_username || "Linked Account"}</span>
                    </div>
                    {connected.status !== 'active' && (
                      <div className="status-warning-ui">
                        <AlertCircle size={14} />
                        Your token has {connected.status}. Please reconnect.
                      </div>
                    )}
                  </div>
                )}

                <div className="card-bottom">
                  {connected ? (
                    <div className="d-flex gap-2 w-100">
                      <PilotButton type="danger" size="sm" icon={Trash2} onClick={() => handleDisconnect(connected.id)}>
                        Disconnect
                      </PilotButton>
                      {connected.status !== 'active' && (
                        <PilotButton type="primary" size="sm" icon={RefreshCw} onClick={() => handleConnect(p.id)}>
                          Reconnect
                        </PilotButton>
                      )}
                    </div>
                  ) : (
                    <PilotButton type="primary" size="sm" icon={ExternalLink} onClick={() => handleConnect(p.id)}>
                      Connect {p.name}
                    </PilotButton>
                  )}
                </div>
              </WorkspaceCard>
            );
          })}
        </div>

        <div className="security-notice">
          <AlertCircle size={18} />
          <p>myPilotPost uses secure OAuth 2.0. We never store your passwords and only request the minimum permissions needed to publish on your behalf.</p>
        </div>
      </div>

      <style>{`
        .integrations-manager {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .integrations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .integrations-header h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-dark);
        }

        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .integration-card {
          height: 100%;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .platform-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-badge {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.inactive { background: #f1f5f9; color: var(--text-gray); }

        .card-middle h3 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .card-middle p {
          font-size: 0.85rem;
          color: var(--text-gray);
          line-height: 1.4;
          margin-bottom: 20px;
        }

        .connection-info {
          background: var(--bg-body);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          margin-bottom: 4px;
        }

        .info-row strong { color: var(--text-gray); }
        .info-row span { font-weight: 600; }
        .info-row span.expired { color: #ef4444; }

        .security-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 16px;
          border-radius: var(--radius-lg);
          color: var(--text-gray);
          font-size: 0.9rem;
        }
      `}</style>
    </>
  );
};

export default IntegrationsManager;
