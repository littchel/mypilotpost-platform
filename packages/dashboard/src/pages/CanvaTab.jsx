import React, { useState, useEffect } from "react";
import { ExternalLink, Palette, Layout, Clock, Zap, AlertCircle } from "lucide-react";
import { apiRequest } from "../lib/api/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";

export default function CanvaTab() {
  const [connected, setConnected]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    apiRequest("/api/customer/social-connections")
      .then(res => {
        const canvaConn = (res?.connections || []).find(i => i.platform === 'canva');
        setConnected(!!(canvaConn && canvaConn.status === 'active'));
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await apiRequest("/api/oauth/canva/connect");
      if (data?.url) window.location.assign(data.url);
      else throw new Error("No OAuth URL returned from server");
    } catch (e) {
      alert(`Unable to start Canva connection: ${e.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Canva? You can reconnect at any time.")) return;
    try {
      const res = await apiRequest("/api/customer/social-connections");
      const canvaConn = (res?.connections || []).find(i => i.platform === 'canva');
      if (canvaConn) {
        await apiRequest(`/api/customer/social-connections/${canvaConn.id}`, { method: "DELETE" });
        setConnected(false);
      }
    } catch {
      alert("Disconnect failed. Please try again.");
    }
  };

  const openCanvaEditor = () => {
    if (!window.Canva || !window.Canva.DesignButton) {
      window.open("https://www.canva.com", "_blank", "noopener,noreferrer");
      return;
    }
    window.Canva.DesignButton.initialize({
      apiKey: import.meta.env.VITE_CANVA_CLIENT_ID || "mpp-test-client-id"
    }).then(api => {
      api.createDesign({
        type: "InstagramPost",
        onDesignPublish: (data) => {
          if (data.exportUrl) {
            window.dispatchEvent(new CustomEvent("canva-design-ready", { detail: data.exportUrl }));
            alert("Design exported and ready to use in your next post!");
          }
        }
      });
    }).catch(err => {
      console.error("Canva editor error:", err);
      window.open("https://www.canva.com", "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div id="tab-canva" style={{ maxWidth: 900, margin: "0 auto", padding: "8px 0" }}>

      {/* Hero Section */}
      <div style={{
        background: "linear-gradient(135deg, #06b6d4 0%, #00c4cc 50%, #7c3aed 100%)",
        borderRadius: 24, padding: "48px 56px", marginBottom: 28,
        position: "relative", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0, 196, 204, 0.25)",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 200, height: 200, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }} />
        <div style={{
          position: "absolute", bottom: -60, right: 80,
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Palette size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                Design Studio
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", margin: 0, lineHeight: 1.1 }}>
                Canva Design Studio
              </h2>
            </div>
          </div>

          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 520, lineHeight: 1.65, marginBottom: 32 }}>
            {connected
              ? "Your Canva account is connected. Create professional designs and publish them directly to your brand's content pipeline."
              : "Connect Canva to design stunning social media graphics, thumbnails, and brand assets — then publish them directly from myPilotPost."}
          </p>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="spinner-border spinner-border-sm" style={{ color: "white" }}></div>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Checking connection…</span>
            </div>
          ) : connected ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={openCanvaEditor}
                style={{
                  background: "white", color: "#00c4cc",
                  border: "none", borderRadius: 12, padding: "14px 28px",
                  fontWeight: 800, fontSize: 15, cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
              >
                <Zap size={16} />
                Open Canva Editor
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  background: "rgba(255,255,255,0.15)", color: "white",
                  border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12,
                  padding: "14px 24px", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", backdropFilter: "blur(8px)",
                }}
              >
                Disconnect Canva
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                background: "white", color: "#00c4cc",
                border: "none", borderRadius: 12, padding: "16px 32px",
                fontWeight: 800, fontSize: 16, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                display: "flex", alignItems: "center", gap: 10,
                transition: "transform 0.15s, box-shadow 0.15s",
                opacity: connecting ? 0.8 : 1,
              }}
              onMouseEnter={e => { if (!connecting) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.2)"; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)"; }}
            >
              {connecting
                ? <><span className="spinner-border spinner-border-sm" style={{ color: "#00c4cc" }}></span> Connecting…</>
                : <><ExternalLink size={18} /> Connect Canva Account</>}
            </button>
          )}
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Recent Designs */}
        <div className="card-workspace" style={{ borderRadius: 18, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Clock size={22} style={{ color: "#2563EB" }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>Recent Designs</h3>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Your latest Canva creations</p>
            </div>
          </div>

          {connected ? (
            <div style={{
              border: "2px dashed #e2e8f0", borderRadius: 12, padding: "32px 24px",
              textAlign: "center", color: "#94a3b8",
            }}>
              <Palette size={28} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ fontSize: 13, margin: 0 }}>
                Create your first design using the Canva Editor above to see it here.
              </p>
            </div>
          ) : (
            <div style={{
              border: "2px dashed #e2e8f0", borderRadius: 12, padding: "32px 24px",
              textAlign: "center", color: "#94a3b8",
            }}>
              <AlertCircle size={24} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ fontSize: 13, margin: 0 }}>
                Connect your Canva account to access your designs here.
              </p>
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="card-workspace" style={{ borderRadius: 18, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Layout size={22} style={{ color: "#7c3aed" }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>Design Templates</h3>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Platform-ready templates</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Instagram Post",     size: "1080 × 1080 px" },
              { label: "Instagram Story",    size: "1080 × 1920 px" },
              { label: "LinkedIn Banner",    size: "1584 × 396 px" },
              { label: "YouTube Thumbnail",  size: "1280 × 720 px" },
              { label: "Facebook Cover",     size: "820 × 312 px" },
            ].map(t => (
              <button
                key={t.label}
                onClick={connected ? openCanvaEditor : handleConnect}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 10, cursor: "pointer", transition: "background 0.15s",
                  textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{t.label}</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{t.size}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      {!connected && (
        <div className="card-workspace" style={{ borderRadius: 18, padding: "28px 32px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 20 }}>How the Canva Integration Works</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              { step: "1", icon: "🔗", title: "Connect", desc: "Link your Canva account with one click using secure OAuth." },
              { step: "2", icon: "🎨", title: "Design",  desc: "Open the Canva editor directly inside myPilotPost and build your creative." },
              { step: "3", icon: "🚀", title: "Publish", desc: "Export your design and it's automatically added to your post composer." },
            ].map(s => (
              <div key={s.step} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Step {s.step}: {s.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
