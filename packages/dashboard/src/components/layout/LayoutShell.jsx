import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import FloatingChat from "../specialized/FloatingChat";
import { getCategoryMeta } from "../../lib/intelligence";

/* ── Brand Intelligence Feed ── */

const FeedCard = ({ msg, onAction }) => {
  const meta = getCategoryMeta(msg.category);
  const urgencyColors = {
    critical: '#ef4444',
    high:     '#f59e0b',
    medium:   '#2563EB',
    low:      '#64748b',
  };
  const urgencyDot = urgencyColors[msg.urgency] || '#64748b';

  return (
    <div
      style={{
        background: meta.bg,
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: onAction ? 'pointer' : 'default',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        animation: 'biFadeIn 0.4s ease forwards',
      }}
      onClick={() => onAction?.(msg)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{meta.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: urgencyDot, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{msg.confidence}</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 5, lineHeight: 1.4 }}>
        {msg.title}
      </div>

      {/* Body */}
      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.55, marginBottom: msg.cta ? 8 : 0 }}>
        {msg.body}
      </div>

      {/* CTA */}
      {msg.cta && (
        <button
          style={{
            background: meta.color,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.3,
          }}
        >
          {msg.cta} →
        </button>
      )}
    </div>
  );
};

const BrandIntelligenceFeed = ({ feed = [], onAction, switchTab }) => {
  const [visibleStart, setVisibleStart] = useState(0);
  const [fading, setFading] = useState(false);
  const MAX_VISIBLE = 5;

  const rotate = useCallback(() => {
    if (feed.length <= MAX_VISIBLE) return;
    setFading(true);
    setTimeout(() => {
      setVisibleStart(prev => (prev + 1) % feed.length);
      setFading(false);
    }, 350);
  }, [feed.length]);

  useEffect(() => {
    const interval = setInterval(rotate, 9000);
    return () => clearInterval(interval);
  }, [rotate]);

  const visible = [];
  for (let i = 0; i < Math.min(MAX_VISIBLE, feed.length); i++) {
    visible.push(feed[(visibleStart + i) % feed.length]);
  }

  const handleCardAction = (msg) => {
    if (msg.tab) switchTab?.(msg.tab);
    onAction?.(msg);
  };

  return (
    <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.35s ease' }}>
      {visible.map(msg => (
        <FeedCard key={msg.id} msg={msg} onAction={handleCardAction} />
      ))}
      {feed.length > MAX_VISIBLE && (
        <button
          onClick={() => switchTab?.('insights')}
          style={{
            display: 'block',
            width: '100%',
            background: 'none',
            border: '1px dashed #cbd5e1',
            borderRadius: 8,
            padding: '7px 0',
            fontSize: 11,
            fontWeight: 700,
            color: '#64748b',
            cursor: 'pointer',
            marginTop: 4,
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#2563EB'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        >
          View Full Intelligence Feed →
        </button>
      )}
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
  onInsightClick,
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

              {/* Brand Intelligence Feed */}
              <div className="nav-group-title mt-3 mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Brand Intelligence</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#2563EB', letterSpacing: 0.5 }}>LIVE</span>
              </div>

              <BrandIntelligenceFeed
                feed={feed}
                onAction={onInsightClick}
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

      <style>{`
        @keyframes biFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default LayoutShell;
