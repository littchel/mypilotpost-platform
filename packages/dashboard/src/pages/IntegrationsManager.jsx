import React, { useState, useEffect, useCallback } from "react";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import { RefreshCw, Trash2, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";

/* ── Platform SVG Icons ── */
const PlatformIcon = ({ id }) => {
  const icons = {
    instagram: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324A4.162 4.162 0 0112 16zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    facebook: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    linkedin: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
    x: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.486 3.24H4.298l13.309 17.41z"/>
      </svg>
    ),
    tiktok: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.27 8.27 0 004.84 1.55V7a4.84 4.84 0 01-1.07-.31z"/>
      </svg>
    ),
    threads: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c0-3.516.85-6.374 2.495-8.416C5.845 1.203 8.6.022 12.18 0h.01c2.71.018 5.075.786 7.03 2.28 1.792 1.373 3.054 3.29 3.69 5.58l-3.4.744c-.888-3.227-3.15-4.84-7.325-4.84-2.39.016-4.22.712-5.44 2.066C5.548 6.9 4.94 8.96 4.94 11.96v.04c0 3.04.608 5.102 1.8 6.127 1.22 1.35 3.05 2.046 5.44 2.046 2.078-.008 3.657-.445 4.85-1.328.98-.73 1.73-1.838 2.097-3.104l-3.26-1.157c-.39 1.208-.98 2.055-1.756 2.524-.695.427-1.559.64-2.578.64h-.004c-.806 0-1.492-.146-2.044-.436-.567-.3-.98-.738-1.23-1.304-.25-.564-.377-1.245-.377-2.03 0-1.596.442-2.762 1.337-3.47.902-.712 2.247-1.072 4.02-1.072h.003c.734 0 1.34.068 1.8.2.466.133.878.37 1.226.702.35.334.643.784.87 1.34l3.238-1.145c-.464-1.176-1.133-2.162-1.99-2.932-.855-.768-1.883-1.338-3.057-1.694C14.847 5.73 13.6 5.54 12.186 5.54h-.004c-1.41 0-2.643.213-3.667.636-1.02.42-1.866 1.025-2.516 1.8C5.34 8.726 4.9 9.67 4.672 10.756c-.226 1.088-.34 2.308-.34 3.634 0 1.326.114 2.546.34 3.634.228 1.085.67 2.03 1.327 2.78.65.775 1.496 1.38 2.516 1.8 1.024.423 2.257.636 3.667.636h.004c1.414 0 2.66-.19 3.704-.568 1.046-.378 1.9-.95 2.543-1.7.645-.75 1.077-1.66 1.283-2.71l-3.27-.81c-.107.574-.307 1.06-.597 1.45-.29.39-.67.696-1.135.91-.465.216-1.025.325-1.667.325z"/>
      </svg>
    ),
    youtube: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    pinterest: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
    wordpress: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM1.895 12c0-1.677.365-3.27 1.018-4.707L7.762 20.9A10.12 10.12 0 011.895 12zM12 22.105c-1.135 0-2.228-.168-3.26-.476l3.463-10.063 3.548 9.716c.023.056.05.107.08.155A10.134 10.134 0 0112 22.105zm1.43-15.266c.626-.033 1.19-.099 1.19-.099.56-.066.494-.891-.066-.858 0 0-1.684.132-2.772.132-1.022 0-2.74-.132-2.74-.132-.561-.033-.627.825-.066.858 0 0 .528.066 1.09.099l1.62 4.44-2.277 6.826-3.786-11.266c.626-.033 1.19-.099 1.19-.099.56-.066.494-.891-.066-.858 0 0-1.684.132-2.772.132-.195 0-.424-.005-.67-.012C4.53 4.29 8.063 1.895 12 1.895c2.91 0 5.558 1.114 7.546 2.932-.048-.003-.094-.009-.144-.009-1.022 0-1.747.89-1.747 1.847 0 .857.495 1.583 1.022 2.44.396.693.858 1.583.858 2.869 0 .89-.34 1.923-.793 3.374L17.29 17.6l-3.861-11.76zM17.16 20.53l3.528-10.197c.659-1.649.879-2.967.879-4.14 0-.426-.028-.82-.08-1.186A10.1 10.1 0 0122.105 12c0 3.944-2.127 7.394-5.295 9.34l.35-.81z"/>
      </svg>
    ),
    canva: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M11.998 0C5.371 0 0 5.372 0 12s5.371 12 11.998 12C18.629 24 24 18.628 24 12S18.629 0 11.998 0zm-.053 4.53c1.738 0 3.277.834 4.22 2.124.018.026.015.063-.01.087a2.656 2.656 0 01-.31.229c-.026.017-.065.011-.085-.017C14.96 5.8 13.58 5.11 12.05 5.11c-2.762 0-5.008 2.22-5.008 4.956 0 1.82.999 3.427 2.497 4.302.022.013.029.042.015.065a2.76 2.76 0 01-.325.427c-.017.019-.048.022-.069.007a5.987 5.987 0 01-2.668-4.97c0-3.334 2.727-6.367 6.453-6.367zm3.648 12.29c-1.03 1.102-2.5 1.786-4.13 1.786-2.996 0-5.436-2.376-5.436-5.296 0-1.34.497-2.56 1.315-3.49.021-.025.058-.027.082-.007.108.096.219.2.323.314a.055.055 0 01-.004.077 4.32 4.32 0 00-1.18 2.966c0 2.431 2.01 4.405 4.49 4.405 1.334 0 2.53-.57 3.369-1.472.02-.022.054-.025.077-.005l.01.008.318.327c.024.025.022.064-.003.09l-.231.297z"/>
      </svg>
    ),
    dropbox: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M6 1.5L0 5.25 6 9l6-3.75L6 1.5zm12 0l-6 3.75L18 9l6-3.75L18 1.5zm-12 11.25L0 16.5l6 3.75 6-3.75-6-3.75zm12 0l-6 3.75 6 3.75 6-3.75-6-3.75zM6 14.25l6 3.75 6-3.75L12 10.5l-6 3.75z"/>
      </svg>
    ),
    google: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    google_analytics: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M22.84 2.998C22.84 1.344 21.496 0 19.842 0a3 3 0 00-3 3v18a3 3 0 006 0V2.998zM13.958 9a3 3 0 00-3 3v9a3 3 0 006 0v-9a3 3 0 00-3-3zM5 15.5a3 3 0 10.001 6.001A3 3 0 005 15.5z"/>
      </svg>
    ),
    google_business: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    ),
    google_search_console: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        <path d="M9 7v2H7v1h2v2h1v-2h2V9h-2V7z"/>
      </svg>
    ),
  };

  return icons[id] || (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4zm-1 9h2v2h-2z"/>
    </svg>
  );
};

const PROVIDERS = [
  { id: "instagram",       name: "Instagram",              color: "#E4405F", bgColor: "#E4405F",         description: "Schedule visual content, stories, and reels." },
  { id: "facebook",        name: "Facebook",               color: "#1877F2", bgColor: "#1877F2",         description: "Publish to Facebook Pages and manage engagement." },
  { id: "linkedin",        name: "LinkedIn",               color: "#0A66C2", bgColor: "#0A66C2",         description: "Publish posts and track company page engagement." },
  { id: "x",              name: "X (Twitter)",            color: "#000000", bgColor: "#14171A",         description: "Post updates to X with secure OAuth 2.0 PKCE." },
  { id: "tiktok",         name: "TikTok",                 color: "#010101", bgColor: "#010101",         description: "Connect your TikTok account for video sharing." },
  { id: "threads",        name: "Threads",                color: "#1C1C1C", bgColor: "#1C1C1C",         description: "Publish to your Threads audience directly." },
  { id: "youtube",        name: "YouTube",                color: "#FF0000", bgColor: "#FF0000",         description: "Schedule and publish video content to your channel." },
  { id: "pinterest",      name: "Pinterest",              color: "#BD081C", bgColor: "#BD081C",         description: "Pin your latest content to boards automatically." },
  { id: "wordpress",      name: "WordPress",              color: "#21759B", bgColor: "#21759B",         description: "Publish blog articles directly to your WordPress site." },
  { id: "canva",          name: "Canva",                  color: "#00C4CC", bgColor: "#00C4CC",         description: "Design graphics and import them directly into posts." },
  { id: "dropbox",        name: "Dropbox",                color: "#0061FF", bgColor: "#0061FF",         description: "Import and sync media assets from your Dropbox." },
  { id: "google",         name: "Google Drive",           color: "#4285F4", bgColor: "#4285F4",         description: "Import images and documents from Google Drive." },
  { id: "google_analytics",      name: "Google Analytics",      color: "#E37400", bgColor: "#E37400", description: "Connect GA4 to see content performance insights." },
  { id: "google_business",       name: "Google Business",       color: "#34A853", bgColor: "#34A853", description: "Manage your Google Business Profile posts." },
  { id: "google_search_console", name: "Google Search Console", color: "#4285F4", bgColor: "#4285F4", description: "Track search queries, clicks, impressions, and page rankings." },
];

const IntegrationsManager = () => {
  const { token } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/customer/social-connections");
      setIntegrations(data?.connections || []);
    } catch (e) {
      console.error("Failed to fetch integrations", e);
      setError("Unable to load integration status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchIntegrations();
  }, [token, fetchIntegrations]);

  const handleConnect = async (provider) => {
    try {
      const data = await apiRequest(`/api/oauth/${provider}/connect`);
      if (data?.url) window.location.assign(data.url);
      else throw new Error("No OAuth URL returned");
    } catch (e) {
      alert(`Failed to start ${provider} OAuth: ${e.message || 'Unknown error'}`);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm("Disconnect this platform? Scheduled posts will no longer be delivered to it.")) return;
    try {
      await apiRequest(`/api/customer/social-connections/${id}`, { method: "DELETE" });
      setIntegrations(prev => prev.filter(i => i.id !== id));
    } catch {
      alert("Disconnect failed. Please try again.");
    }
  };

  return (
    <>
      <div className="integrations-manager">
        <header className="integrations-header">
          <div>
            <h2>Platform Integrations</h2>
            <p>Connect your social media, publishing, and storage accounts.</p>
          </div>
          <PilotButton type="outline" icon={RefreshCw} onClick={fetchIntegrations} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh Status'}
          </PilotButton>
        </header>

        {error && (
          <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-2" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.875rem' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading && (
          <div className="d-flex align-items-center gap-3 p-4 text-muted">
            <div className="spinner-border spinner-border-sm text-primary"></div>
            <span className="small">Loading integrations…</span>
          </div>
        )}

        {!loading && (
          <div className="integrations-grid">
            {PROVIDERS.map(p => {
              const connected = integrations.find(i => i.platform === p.id);
              const isActive  = connected?.status === 'active';
              const isExpired = connected && !isActive;

              return (
                <WorkspaceCard key={p.id} className={`integration-card${connected ? ' integration-card--connected' : ''}`}>
                  <div className="card-top">
                    <div className="platform-icon" style={{ background: p.bgColor }}>
                      <PlatformIcon id={p.id} />
                    </div>
                    <div className="platform-status">
                      {connected ? (
                        isActive ? (
                          <span className="status-badge status-badge--active">
                            <ShieldCheck size={11} /> Connected
                          </span>
                        ) : (
                          <span className="status-badge status-badge--error">
                            <AlertCircle size={11} /> {connected.status?.toUpperCase() || 'ERROR'}
                          </span>
                        )
                      ) : (
                        <span className="status-badge status-badge--inactive">Not Connected</span>
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
                        <strong>Account</strong>
                        <span>{connected.platform_username || connected.account_name || 'Linked'}</span>
                      </div>
                      {isExpired && (
                        <div className="status-warning-ui">
                          <AlertCircle size={13} />
                          Token {connected.status}. Please reconnect.
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
                        {isExpired && (
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
        )}

        <div className="security-notice">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p>myPilotPost uses secure OAuth 2.0. We never store your passwords and only request the minimum permissions needed to publish on your behalf.</p>
        </div>
      </div>

      <style>{`
        .integrations-manager { display: flex; flex-direction: column; gap: 28px; }
        .integrations-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .integrations-header h2 { font-size: 1.4rem; font-weight: 800; color: var(--text-dark); margin-bottom: 4px; }
        .integrations-header p { font-size: 0.875rem; color: var(--text-gray); margin: 0; }
        .integrations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 20px; }
        .integration-card { display: flex; flex-direction: column; height: 100%; }
        .integration-card--connected { border-color: #bbf7d0 !important; }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .platform-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .status-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: flex; align-items: center; gap: 3px; }
        .status-badge--active   { background: #dcfce7; color: #166534; }
        .status-badge--inactive { background: #f1f5f9; color: var(--text-gray); }
        .status-badge--error    { background: #fee2e2; color: #991b1b; }
        .card-middle h3 { font-size: 1rem; font-weight: 800; margin-bottom: 6px; color: var(--text-dark); }
        .card-middle p { font-size: 0.82rem; color: var(--text-gray); line-height: 1.4; margin-bottom: 16px; }
        .card-bottom { margin-top: auto; }
        .connection-info { background: var(--bg-body); padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; }
        .info-row { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 2px; }
        .info-row strong { color: var(--text-gray); }
        .info-row span { font-weight: 600; color: var(--text-dark); }
        .status-warning-ui { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #b45309; margin-top: 6px; background: #fef3c7; padding: 5px 8px; border-radius: 6px; }
        .security-notice { display: flex; align-items: flex-start; gap: 12px; background: #f8fafc; border: 1px solid var(--border-subtle); padding: 16px; border-radius: var(--radius-lg); color: var(--text-gray); font-size: 0.875rem; }
        .security-notice p { margin: 0; line-height: 1.5; }
      `}</style>
    </>
  );
};

export default IntegrationsManager;
