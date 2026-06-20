import React, { useState, useEffect, useCallback } from "react";
import WorkspaceCard from "../components/shared/WorkspaceCard";
import PilotButton from "../components/shared/PilotButton";
import { RefreshCw, Trash2, ExternalLink, ShieldCheck, AlertCircle, ChevronRight, X, Check, Loader } from "lucide-react";
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
    adobe: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M13.9 2h7.8L15 22h-6.2L13.9 2zm-3.8 0L2 22h6.1l1.8-6.1h6l.5 1.7L13.1 8.8l-3 6.8zm.5-6.8l1.4 3h-2.8l1.4-3z"/>
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

  if (id === "linkedin_personal" || id === "linkedin_pages") return icons.linkedin;
  if (id === "wordpress_ecommerce") return icons.wordpress;

  return icons[id] || (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4zm-1 9h2v2h-2z"/>
    </svg>
  );
};

const PROVIDERS = [
  { id: "instagram",             name: "Instagram",              color: "#E4405F", bgColor: "#E4405F",   description: "Schedule visual content, stories, and reels." },
  { id: "facebook",              name: "Facebook",               color: "#1877F2", bgColor: "#1877F2",   description: "Publish to Facebook Pages and manage engagement." },
  // LinkedIn — personal live now; pages awaiting Community Management API approval
  { id: "linkedin_personal",     name: "LinkedIn",               color: "#0A66C2", bgColor: "#0A66C2",   description: "Publish posts to your personal LinkedIn profile.", linkedinSplit: true },
  { id: "x",                    name: "X (Twitter)",            color: "#000000", bgColor: "#14171A",   description: "Post updates to X with secure OAuth 2.0 PKCE." },
  { id: "tiktok",               name: "TikTok",                 color: "#010101", bgColor: "#010101",   description: "Connect your TikTok account for video sharing." },
  { id: "threads",              name: "Threads",                color: "#1C1C1C", bgColor: "#1C1C1C",   description: "Publish to your Threads audience directly." },
  { id: "youtube",              name: "YouTube",                color: "#FF0000", bgColor: "#FF0000",   description: "Schedule and publish video content to your channel." },
  { id: "pinterest",            name: "Pinterest",              color: "#BD081C", bgColor: "#BD081C",   description: "Pin your latest content to boards automatically.", requiresResource: true, resourceLabel: "Board" },
  { id: "wordpress",            name: "WordPress Blog",         color: "#21759B", bgColor: "#21759B",   description: "Publish blog articles directly to your WordPress site." },
  { id: "wordpress_ecommerce",  name: "WooCommerce Store",      color: "#96588A", bgColor: "#96588A",   description: "Publish your product catalog directly to your WooCommerce store." },
  { id: "adobe",                name: "Adobe",                  color: "#FF0000", bgColor: "#FA0F00",   description: "Access and import your assets directly from Adobe Creative Cloud." },
  { id: "canva",                name: "Canva",                  color: "#00C4CC", bgColor: "#00C4CC",   description: "Design graphics and import them directly into posts." },
  { id: "dropbox",              name: "Dropbox",                color: "#0061FF", bgColor: "#0061FF",   description: "Import and sync media assets from your Dropbox." },
  { id: "google",               name: "Google Drive",           color: "#4285F4", bgColor: "#4285F4",   description: "Import images and documents from Google Drive." },
  { id: "google_analytics",     name: "Google Analytics",       color: "#E37400", bgColor: "#E37400",   description: "Connect GA4 to see content performance insights.", requiresResource: true, resourceLabel: "Property" },
  { id: "google_business",      name: "Google Business",        color: "#34A853", bgColor: "#34A853",   description: "Manage your Google Business Profile posts.", requiresResource: true, resourceLabel: "Location" },
  { id: "google_search_console",name: "Google Search Console",  color: "#4285F4", bgColor: "#4285F4",   description: "Track search queries, clicks, impressions, and page rankings.", requiresResource: true, resourceLabel: "Site" },
];

const NEEDS_RESOURCE = ["google_analytics", "google_search_console", "google_business", "linkedin_pages", "pinterest"];

/* ── Resource Picker Modal ── */
function ResourcePickerModal({ platform, connId, onConfirm, onCancel, onReconnect }) {
  const [resources,     setResources]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [saving,        setSaving]        = useState(false);

  // For Google Business: two-step (account → location)
  const [gbmStep,       setGbmStep]       = useState("account"); // "account" | "location"
  const [gbmAccountId,  setGbmAccountId]  = useState(null);
  const [gbmAccountName,setGbmAccountName]= useState(null);

  const fetchResources = useCallback(async (accountId) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const qs = accountId ? `?conn_id=${connId}&account_id=${encodeURIComponent(accountId)}` : `?conn_id=${connId}`;
      const url = platform === "google_business" && accountId
        ? `/api/oauth/google_business/locations${qs}`
        : `/api/oauth/${platform}/accounts${qs}`;
      const data = await apiRequest(url);
      setResources(data?.resources || data?.locations || []);
    } catch (e) {
      setError(e.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [platform, connId]);

  useEffect(() => { fetchResources(null); }, [fetchResources]);

  const handleSelect = (resource) => {
    if (platform === "google_business" && gbmStep === "account") {
      setGbmAccountId(resource.id);
      setGbmAccountName(resource.name);
      setGbmStep("location");
      fetchResources(resource.id);
      return;
    }
    setSelected(resource);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(`/api/oauth/${platform}/select`, {
        method: "POST",
        body: JSON.stringify({
          conn_id:       connId,
          resource_id:   selected.id,
          resource_name: selected.name,
          resource_type: selected.resource_type
        })
      });
      onConfirm(selected);
    } catch (e) {
      setError(e.message || "Failed to save selection");
      setSaving(false);
    }
  };

  const stepLabel = platform === "google_business"
    ? (gbmStep === "account" ? "Select Business Account" : `Select Location — ${gbmAccountName}`)
    : platform === "linkedin"     ? "Select Publishing Destination"
    : platform === "google_analytics" ? "Select GA4 Property"
    : platform === "google_search_console" ? "Select Site"
    : "Select Resource";

  return (
    <div className="rp-overlay">
      <div className="rp-modal">
        <div className="rp-header">
          <h3>{stepLabel}</h3>
          <button className="rp-close" onClick={onCancel}><X size={18} /></button>
        </div>

        {loading && (
          <div className="rp-state">
            <Loader size={20} className="spin" />
            <span>Loading…</span>
          </div>
        )}

        {error && (
          <div className="rp-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && resources.length === 0 && (
          <div className="rp-state rp-empty">
            <AlertCircle size={20} />
            {platform === "pinterest" ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                <span style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '1.05rem' }}>Pinterest Setup Required</span>
                <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>Create a board on Pinterest to enable publishing.</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <PilotButton type="outline" size="sm" onClick={() => fetchResources(null)}>Refresh Boards</PilotButton>
                  <PilotButton type="primary" size="sm" onClick={() => { onCancel(); onReconnect(); }}>Reconnect Account</PilotButton>
                  <PilotButton type="outline" size="sm" disabled>Set Default Board</PilotButton>
                </div>
              </div>
            ) : (
              <span>No resources found. Make sure you have the right permissions.</span>
            )}
          </div>
        )}

        {!loading && resources.length > 0 && (
          <ul className="rp-list">
            {resources.map(r => (
              <li
                key={r.id}
                className={`rp-item${selected?.id === r.id ? " rp-item--selected" : ""}`}
                onClick={() => handleSelect(r)}
              >
                <div className="rp-item-body">
                  <div className="rp-item-name">{r.name}</div>
                  {r.extra && <div className="rp-item-extra">{r.extra}</div>}
                </div>
                <div className="rp-item-right">
                  {(platform === "google_business" && gbmStep === "account")
                    ? <ChevronRight size={16} className="rp-chevron" />
                    : selected?.id === r.id
                      ? <Check size={16} className="rp-check" />
                      : null
                  }
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rp-footer">
          <PilotButton type="outline" size="sm" onClick={onCancel}>Cancel</PilotButton>
          {!(platform === "google_business" && gbmStep === "account") && (
            <PilotButton
              type="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={!selected || saving}
            >
              {saving ? "Saving…" : "Confirm"}
            </PilotButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── WordPress Custom Connection Modal ── */
function WpConnectModal({ onCancel, onSuccess }) {
  const [blogUrl, setBlogUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blogUrl || !username || !appPassword) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest("/api/oauth/wordpress/custom-connect", {
        method: "POST",
        body: JSON.stringify({
          blog_url: blogUrl,
          username: username,
          application_password: appPassword
        })
      });
      if (response.success) {
        onSuccess();
      } else {
        throw new Error(response.error || "WordPress connection failed");
      }
    } catch (err) {
      setError(err.message || "Failed to connect. Please verify your WordPress URL and credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-overlay">
      <div className="rp-modal" style={{ maxWidth: "520px" }}>
        <div className="rp-header">
          <h3>Connect WordPress Blog</h3>
          <button className="rp-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="wp-connect-form">
          <div className="wp-connect-body">
            <div className="instructions-section">
              <h4>How to connect your WordPress site:</h4>
              <ol>
                <li>Log in to your self-hosted WordPress Admin panel.</li>
                <li>Go to <strong>Users</strong> &rarr; <strong>Profile</strong>.</li>
                <li>Scroll down to the <strong>Application Passwords</strong> section.</li>
                <li>Enter a name (e.g., <code>myPilotPost</code>) and click <strong>Add New Application Password</strong>.</li>
                <li>Copy the 24-character password generated and paste it below.</li>
              </ol>
            </div>

            {error && (
              <div className="rp-error" style={{ margin: "0 0 16px" }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>WordPress Site / Blog URL</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Enter your homepage URL (e.g. https://myblog.com)</span>
            </div>

            <div className="form-group">
              <label>Username or Email Address</label>
              <input
                type="text"
                placeholder="Enter WordPress username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Application Password</label>
              <input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="rp-footer">
            <button className="pilot-btn btn-outline btn-sm" type="button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button className="pilot-btn btn-primary btn-sm" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Connect Site"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── WooCommerce Custom Connection Modal ── */
function WcConnectModal({ onCancel, onSuccess }) {
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeUrl || !consumerKey || !consumerSecret) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest("/api/oauth/wordpress_ecommerce/custom-connect", {
        method: "POST",
        body: JSON.stringify({
          store_url: storeUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret
        })
      });
      if (response.success) {
        onSuccess();
      } else {
        throw new Error(response.error || "WooCommerce connection failed");
      }
    } catch (err) {
      setError(err.message || "Failed to connect. Please verify your WooCommerce URL and API Keys.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-overlay">
      <div className="rp-modal" style={{ maxWidth: "520px" }}>
        <div className="rp-header">
          <h3>Connect WooCommerce Store</h3>
          <button className="rp-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="wp-connect-form">
          <div className="wp-connect-body">
            <div className="instructions-section">
              <h4>How to connect your WooCommerce store:</h4>
              <ol>
                <li>Log in to your self-hosted WooCommerce Admin panel.</li>
                <li>Go to <strong>WooCommerce</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Advanced</strong> &rarr; <strong>REST API</strong>.</li>
                <li>Click <strong>Add Key</strong>.</li>
                <li>Set Description (e.g., <code>myPilotPost</code>), select user, and set Permissions to <strong>Read/Write</strong>.</li>
                <li>Click <strong>Generate API Key</strong>.</li>
                <li>Copy the Consumer Key (starts with <code>ck_</code>) and Consumer Secret (starts with <code>cs_</code>) and paste them below.</li>
              </ol>
            </div>

            {error && (
              <div className="rp-error" style={{ margin: "0 0 16px" }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>WooCommerce Store URL</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Enter your homepage/store URL (e.g. https://mystore.com)</span>
            </div>

            <div className="form-group">
              <label>Consumer Key</label>
              <input
                type="text"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Consumer Secret</label>
              <input
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="rp-footer">
            <button className="pilot-btn btn-outline btn-sm" type="button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button className="pilot-btn btn-primary btn-sm" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Connect Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const IntegrationsManager = () => {
  const { token } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState(null);
  const [picker, setPicker]             = useState(null); // { platform, connId }
  const [wpModalOpen, setWpModalOpen]   = useState(false);
  const [wcModalOpen, setWcModalOpen]   = useState(false);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiRequest("/api/customer/social-connections");
      setIntegrations(data?.connections || []);
    } catch (e) {
      console.error("Failed to fetch integrations", e);
      setFetchError("Unable to load integration status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchIntegrations();
  }, [token, fetchIntegrations]);

  // Auto-open picker if redirected back from OAuth with needs_selection=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const needsSel = params.get("needs_selection");
    const connId   = params.get("conn_id");
    const platform = params.get("oauth_success");
    if (needsSel === "1" && connId && platform) {
      // Clean URL
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
      // Small delay so integrations list has loaded
      setTimeout(() => setPicker({ platform, connId }), 800);
    }
  }, []);

  const handleConnect = async (provider) => {
    if (provider === "wordpress") {
      setWpModalOpen(true);
      return;
    }
    if (provider === "wordpress_ecommerce") {
      setWcModalOpen(true);
      return;
    }
    try {
      const data = await apiRequest(`/api/oauth/${provider}/connect`);
      if (data?.url) window.location.assign(data.url);
      else throw new Error("No OAuth URL returned");
    } catch (e) {
      alert(`Failed to start ${provider} OAuth: ${e.message || "Unknown error"}`);
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

  const openPicker = (platform, connId) => setPicker({ platform, connId });
  const closePicker = () => setPicker(null);

  const handlePickerConfirm = (resource) => {
    // Update local state with selected resource
    setIntegrations(prev => prev.map(c =>
      c.id === picker.connId
        ? { ...c, status: "active", selected_resource_id: resource.id, selected_resource_name: resource.name, resource_type: resource.resource_type }
        : c
    ));
    setPicker(null);
  };

  return (
    <>
      {picker && (
        <ResourcePickerModal
          platform={picker.platform}
          connId={picker.connId}
          onConfirm={handlePickerConfirm}
          onCancel={closePicker}
          onReconnect={() => handleConnect(picker.platform)}
        />
      )}

      {wpModalOpen && (
        <WpConnectModal
          onCancel={() => setWpModalOpen(false)}
          onSuccess={() => {
            setWpModalOpen(false);
            fetchIntegrations();
          }}
        />
      )}

      {wcModalOpen && (
        <WcConnectModal
          onCancel={() => setWcModalOpen(false)}
          onSuccess={() => {
            setWcModalOpen(false);
            fetchIntegrations();
          }}
        />
      )}

      <div className="integrations-manager">
        <header className="integrations-header">
          <div>
            <h2>Platform Integrations</h2>
            <p>Connect your social media, publishing, and storage accounts.</p>
          </div>
          <PilotButton type="outline" icon={RefreshCw} onClick={fetchIntegrations} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh Status"}
          </PilotButton>
        </header>

        {fetchError && (
          <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-2" style={{ background: "#fee2e2", color: "#991b1b", fontSize: "0.875rem" }}>
            <AlertCircle size={16} />
            {fetchError}
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
              // linkedin_personal also shows existing legacy linkedin connections
              const connected      = integrations.find(i =>
                i.platform === p.id || (p.id === "linkedin_personal" && i.platform === "linkedin")
              );
              const isActive       = connected?.status === "active";
              const needsResource  = connected && (connected.status === "pending" || connected.status === "CONNECTED_NEEDS_RESOURCE");
              const isExpired      = connected && !isActive && !needsResource;
              const hasResource    = connected?.selected_resource_name;
              const providerMeta   = PROVIDERS.find(x => x.id === p.id);

              return (
                <WorkspaceCard key={p.id} className={`integration-card${connected ? " integration-card--connected" : ""}${needsResource ? (p.id === 'pinterest' ? " integration-card--error" : " integration-card--needs-resource") : ""}`}>
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
                        ) : needsResource ? (
                          <span className={`status-badge status-badge--${p.id === 'pinterest' ? 'error' : 'warn'}`}>
                            <AlertCircle size={11} /> {p.id === 'pinterest' ? 'Pinterest Setup Required' : 'Select Resource'}
                          </span>
                        ) : (
                          <span className="status-badge status-badge--error">
                            <AlertCircle size={11} /> {connected.status?.toUpperCase() || "ERROR"}
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
                        <span>{connected.platform_username || "Linked"}</span>
                      </div>
                      {isActive && hasResource && (
                        <div className="info-row">
                          <strong>{providerMeta?.resourceLabel || "Resource"}</strong>
                          <span className="resource-name">{connected.selected_resource_name}</span>
                        </div>
                      )}
                      {needsResource && (
                        <div className="needs-resource-banner" style={p.id === 'pinterest' ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' } : undefined}>
                          <AlertCircle size={13} />
                          {p.id === 'pinterest'
                            ? "Pinterest Setup Required: Create a board on Pinterest to enable publishing."
                            : `Select a ${providerMeta?.resourceLabel?.toLowerCase() || "resource"} to activate`
                          }
                        </div>
                      )}
                      {isExpired && (
                        <div className="status-warning-ui">
                          <AlertCircle size={13} />
                          Token {connected.status}. Please reconnect.
                        </div>
                      )}
                    </div>
                  )}

                  {p.linkedinSplit && (
                    <div className="linkedin-pages-notice">
                      <span className="status-badge status-badge--warn" style={{ fontSize: "0.68rem" }}>
                        <AlertCircle size={10} /> Company Pages — Awaiting Approval
                      </span>
                    </div>
                  )}

                  <div className="card-bottom">
                    {p.linkedinSplit ? (
                      <div className="d-flex flex-column gap-2 w-100">
                        {connected ? (
                          <div className="d-flex gap-2 w-100 flex-wrap">
                            {isExpired && (
                              <PilotButton type="primary" size="sm" icon={RefreshCw} onClick={() => handleConnect(p.id)}>
                                Reconnect Personal
                              </PilotButton>
                            )}
                            <PilotButton type="danger" size="sm" icon={Trash2} onClick={() => handleDisconnect(connected.id)}>
                              Disconnect
                            </PilotButton>
                          </div>
                        ) : (
                          <PilotButton type="primary" size="sm" icon={ExternalLink} onClick={() => handleConnect(p.id)}>
                            Connect Personal Profile
                          </PilotButton>
                        )}
                        <button className="btn-linkedin-pages-disabled" disabled>
                          Company Pages — Awaiting Approval
                        </button>
                      </div>
                    ) : connected ? (
                      <div className="d-flex gap-2 w-100 flex-wrap">
                        {needsResource && (
                          <PilotButton
                            type="primary"
                            size="sm"
                            icon={ChevronRight}
                            onClick={() => openPicker(p.id, connected.id)}
                          >
                            Select {providerMeta?.resourceLabel || "Resource"}
                          </PilotButton>
                        )}
                        {isActive && hasResource && (
                          <PilotButton
                            type="outline"
                            size="sm"
                            onClick={() => openPicker(p.id, connected.id)}
                          >
                            Change
                          </PilotButton>
                        )}
                        {isExpired && (
                          <PilotButton type="primary" size="sm" icon={RefreshCw} onClick={() => handleConnect(p.id)}>
                            Reconnect
                          </PilotButton>
                        )}
                        <PilotButton type="danger" size="sm" icon={Trash2} onClick={() => handleDisconnect(connected.id)}>
                          Disconnect
                        </PilotButton>
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
        /* ── Layout ── */
        .integrations-manager { display: flex; flex-direction: column; gap: 28px; }
        .integrations-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .integrations-header h2 { font-size: 1.4rem; font-weight: 800; color: var(--text-dark); margin-bottom: 4px; }
        .integrations-header p { font-size: 0.875rem; color: var(--text-gray); margin: 0; }
        .integrations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 20px; }
        .integration-card { display: flex; flex-direction: column; height: 100%; }
        .integration-card--connected { border-color: #bbf7d0 !important; }
        .integration-card--needs-resource { border-color: #fde68a !important; }
        .integration-card--error { border-color: #fca5a5 !important; }
        /* ── Card parts ── */
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .platform-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .status-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: flex; align-items: center; gap: 3px; }
        .status-badge--active   { background: #dcfce7; color: #166534; }
        .status-badge--inactive { background: #f1f5f9; color: var(--text-gray); }
        .status-badge--error    { background: #fee2e2; color: #991b1b; }
        .status-badge--warn     { background: #fef3c7; color: #92400e; }
        .card-middle h3 { font-size: 1rem; font-weight: 800; margin-bottom: 6px; color: var(--text-dark); }
        .card-middle p { font-size: 0.82rem; color: var(--text-gray); line-height: 1.4; margin-bottom: 16px; }
        .card-bottom { margin-top: auto; }
        .connection-info { background: var(--bg-body); padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; }
        .info-row { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 2px; }
        .info-row strong { color: var(--text-gray); }
        .info-row span { font-weight: 600; color: var(--text-dark); max-width: 160px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .resource-name { color: #1d4ed8 !important; }
        .needs-resource-banner { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #92400e; margin-top: 6px; background: #fef3c7; padding: 5px 8px; border-radius: 6px; }
        .status-warning-ui { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #b45309; margin-top: 6px; background: #fef3c7; padding: 5px 8px; border-radius: 6px; }
        .linkedin-pages-notice { margin-bottom: 10px; }
        .btn-linkedin-pages-disabled { width: 100%; padding: 6px 12px; border-radius: 8px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #94a3b8; font-size: 0.78rem; font-weight: 600; cursor: not-allowed; text-align: center; }
        .security-notice { display: flex; align-items: flex-start; gap: 12px; background: #f8fafc; border: 1px solid var(--border-subtle); padding: 16px; border-radius: var(--radius-lg); color: var(--text-gray); font-size: 0.875rem; }
        .security-notice p { margin: 0; line-height: 1.5; }

        /* ── Resource Picker Modal ── */
        .rp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .rp-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .rp-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid #e5e7eb; }
        .rp-header h3 { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-dark); }
        .rp-close { background: none; border: none; cursor: pointer; color: var(--text-gray); padding: 4px; border-radius: 6px; display: flex; }
        .rp-close:hover { background: #f1f5f9; }
        .rp-state { display: flex; align-items: center; gap: 10px; padding: 32px 24px; color: var(--text-gray); font-size: 0.875rem; }
        .rp-empty { flex-direction: column; text-align: center; }
        .rp-error { display: flex; align-items: center; gap: 8px; margin: 16px 24px 0; padding: 10px 14px; background: #fee2e2; color: #991b1b; font-size: 0.8rem; border-radius: 8px; }
        .rp-list { list-style: none; margin: 0; padding: 8px 0; overflow-y: auto; flex: 1; }
        .rp-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; cursor: pointer; transition: background 0.1s; }
        .rp-item:hover { background: #f8fafc; }
        .rp-item--selected { background: #eff6ff; }
        .rp-item-body { flex: 1; min-width: 0; }
        .rp-item-name { font-size: 0.875rem; font-weight: 600; color: var(--text-dark); }
        .rp-item-extra { font-size: 0.75rem; color: var(--text-gray); margin-top: 2px; }
        .rp-item-right { flex-shrink: 0; margin-left: 12px; }
        .rp-chevron { color: #9ca3af; }
        .rp-check { color: #1d4ed8; }
        .rp-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e5e7eb; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── WordPress Custom Connect Styles ── */
        .wp-connect-form { display: flex; flex-direction: column; overflow: hidden; }
        .wp-connect-body { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; max-height: 50vh; }
        .instructions-section { background: #f8fafc; border: 1px solid var(--border-subtle); padding: 14px 16px; border-radius: 8px; }
        .instructions-section h4 { margin: 0 0 8px 0; font-size: 0.82rem; font-weight: 700; color: var(--text-dark); }
        .instructions-section ol { margin: 0; padding-left: 18px; font-size: 0.78rem; color: var(--text-gray); line-height: 1.5; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.78rem; font-weight: 700; color: var(--text-dark); }
        .form-group input { padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: 6px; font-size: 0.85rem; color: var(--text-dark); }
        .form-group input:focus { outline: none; border-color: var(--pilot-blue); }
        .input-hint { font-size: 0.7rem; color: var(--text-gray); }
      `}</style>
    </>
  );
};

export default IntegrationsManager;
