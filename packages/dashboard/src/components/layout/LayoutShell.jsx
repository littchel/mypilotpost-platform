import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import FloatingChat from "../specialized/FloatingChat";
import EmailVerificationBanner from "../shared/EmailVerificationBanner";

/* ── Brand Intelligence Snapshot ── */

const SnapshotRow = ({ label, value, accent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #f8fafc", gap: 8 }}>
    <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 11, fontWeight: 700, color: accent || "#0f172a", textAlign: "right", lineHeight: 1.4, maxWidth: "62%" }}>{value || "—"}</span>
  </div>
);

const BrandIntelligenceSnapshot = ({ feed = [], switchTab }) => {
  const topItem    = feed[0] || null;
  const opportunity = feed.find(i => ["opportunity", "growth", "visibility"].includes(i.category));
  const risk        = feed.find(i => i.category === "risk");
  const competitor  = feed.find(i => i.category === "competitor");

  const nextAction  = topItem?.cta || topItem?.title || "Connect platforms to unlock";
  const oppLabel    = opportunity?.title || "No opportunity detected";
  const riskLabel   = risk?.title        || "No active risks";
  const compLabel   = competitor?.title  || "No competitive alerts";
  const confidence  = topItem?.confidence || "—";
  const generatedAt = feed.length > 0 ? "Live" : "Not yet generated";

  const isEmpty = feed.length === 0;

  return (
    <div>
      {isEmpty ? (
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "12px 0", lineHeight: 1.6 }}>
          Connect platforms to generate<br />Brand Intelligence.
        </div>
      ) : (
        <div>
          <SnapshotRow label="Next Best Action"  value={nextAction} accent="#2563eb" />
          <SnapshotRow label="Growth Opportunity" value={oppLabel}   accent="#059669" />
          <SnapshotRow label="Growth Risk"        value={riskLabel}  accent="#dc2626" />
          <SnapshotRow label="Competitive Alert"  value={compLabel}  accent="#d97706" />
          <SnapshotRow label="Confidence"         value={confidence} />
          <SnapshotRow label="Last Generated"     value={generatedAt} />
        </div>
      )}
      <button
        onClick={() => switchTab?.("brand-intelligence")}
        style={{
          display: "block", width: "100%", marginTop: 10,
          background: "linear-gradient(135deg, #2563EB, #1d4ed8)",
          border: "none", borderRadius: 8, padding: "8px 0",
          fontSize: 11, fontWeight: 700, color: "#fff",
          cursor: "pointer", letterSpacing: 0.3, transition: "opacity 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        View Full Brand Intelligence →
      </button>
    </div>
  );
};

/* ── Layout Shell ── */

const LayoutShell = ({
  children,
  activeTab,
  switchTab,
  brands,
  activeBrand,
  onSwitchBrand,
  user,
  logout,
  onAssistantOpen,
  brandIntelligence = { executive: [], advisory: [], feed: [] },
  notifications = [],
  growth = { points: 0, level: 1, streak_days: 0 },
  stats,
}) => {
  const feed = brandIntelligence.feed || [
    ...(brandIntelligence.executive || []),
    ...(brandIntelligence.advisory  || []),
  ];

  return (
    <>
      <Sidebar
        activeTab={activeTab}
        switchTab={switchTab}
        brands={brands}
        activeBrand={activeBrand}
        onSwitchBrand={onSwitchBrand}
        onAssistantOpen={onAssistantOpen}
      />
      <div className="wrapper">
        <Header
          activeBrand={activeBrand}
          user={user}
          logout={logout}
          onAssistantOpen={onAssistantOpen}
          switchTab={switchTab}
          notifications={notifications}
          growth={growth}
        />
        <EmailVerificationBanner onVerified={() => {}} />
        <main>
          <div id="workspace-area">
            {children}
          </div>

          <aside className="intel-sidebar d-flex flex-column">
            <div className="flex-1">
              {/* Fleet Stats */}
              <div className="nav-group-title mb-1">Fleet Stats</div>
              <div className="stat-card">
                <span className="stat-val">{stats?.socials ?? 0}</span>
                <span className="stat-label">Socials</span>
              </div>
              <div className="stat-card">
                <span className="stat-val">{stats?.blogs ?? 0}</span>
                <span className="stat-label">Articles</span>
              </div>
              <div className="stat-card">
                <span className="stat-val">{stats?.campaigns ?? 0}</span>
                <span className="stat-label">Campaigns</span>
              </div>

              {/* Brand Intelligence Snapshot */}
              <div className="nav-group-title mt-3 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Brand Intelligence</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#2563EB", letterSpacing: 0.5 }}>LIVE</span>
              </div>

              <BrandIntelligenceSnapshot
                feed={feed}
                switchTab={switchTab}
              />
            </div>

            {/* Float Chat */}
            <div className="chat-integration-area mt-auto pt-4">
              <FloatingChat />
            </div>
          </aside>
        </main>
      </div>

    </>
  );
};

export default LayoutShell;
