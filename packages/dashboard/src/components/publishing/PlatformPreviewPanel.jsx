import React, { useState } from "react";
import { PLATFORM_LIMITS, validateContent } from "../../lib/platformRequirements";

const PREVIEW_STYLES = {
  container: {
    background: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  device: {
    margin: 'auto',
    background: '#fff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  // Mobile vertical formats (9:16) - roughly 300x533 or similar relative
  verticalDevice: {
    width: 300,
    height: 533,
    borderRadius: 12,
    overflow: 'hidden'
  },
  // Desktop/feed formats
  feedDevice: {
    width: 400,
    minHeight: 200,
    borderRadius: 8
  }
};

const SafeZoneOverlay = ({ platform }) => {
  if (platform === 'tiktok' || platform === 'shorts' || platform === 'instagram_story') {
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {/* Top UI overlap */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '15%', background: 'rgba(239, 68, 68, 0.2)', borderBottom: '1px dashed #ef4444' }}>
          <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 'bold', padding: 4 }}>TOP UI OVERLAP</span>
        </div>
        {/* Right UI overlap (icons) */}
        <div style={{ position: 'absolute', top: '40%', right: 0, width: '15%', height: '40%', background: 'rgba(239, 68, 68, 0.2)', borderLeft: '1px dashed #ef4444' }}>
          <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 'bold', padding: 2, writingMode: 'vertical-rl' }}>ICONS OVERLAP</span>
        </div>
        {/* Bottom UI overlap (caption, music) */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', background: 'rgba(239, 68, 68, 0.2)', borderTop: '1px dashed #ef4444' }}>
          <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 'bold', padding: 4 }}>CAPTION & UI OVERLAP</span>
        </div>
      </div>
    );
  }
  return null;
};

// Platform specific renderer map
const PlatformRenderers = {
  shorts: ({ content, media }) => (
    <div style={{ ...PREVIEW_STYLES.device, ...PREVIEW_STYLES.verticalDevice, background: '#0f0f0f', color: '#fff' }}>
      <SafeZoneOverlay platform="shorts" />
      {/* Mock Video BG */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#1a1a1a', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {media?.image ? <img src={media.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#444' }}>Video Media</span>}
      </div>
      {/* Mock UI */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, zIndex: 5, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#ccc' }}></div>
          <span style={{ fontSize: 12, fontWeight: 600 }}>@YourBrand</span>
          <button style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 4, fontSize: 10, padding: '2px 8px', fontWeight: 'bold' }}>Subscribe</button>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.3, textOverflow: 'ellipsis', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {content || "Shorts Title goes here"}
        </div>
      </div>
      {/* Side Icons */}
      <div style={{ position: 'absolute', bottom: 60, right: 8, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
         <div style={{ width: 24, height: 24, background: '#fff', borderRadius: '50%', opacity: 0.8 }}></div>
         <div style={{ width: 24, height: 24, background: '#fff', borderRadius: '50%', opacity: 0.8 }}></div>
         <div style={{ width: 24, height: 24, background: '#fff', borderRadius: '50%', opacity: 0.8 }}></div>
      </div>
    </div>
  ),
  tiktok: ({ content, media }) => (
    <div style={{ ...PREVIEW_STYLES.device, ...PREVIEW_STYLES.verticalDevice, background: '#000', color: '#fff' }}>
      <SafeZoneOverlay platform="tiktok" />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#111', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {media?.image ? <img src={media.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#333' }}>TikTok Media</span>}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, zIndex: 5, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>@YourBrand</div>
        <div style={{ fontSize: 12, lineHeight: 1.3 }}>
          {content ? content.slice(0, 100) + (content.length > 100 ? '... see more' : '') : "TikTok caption..."}
        </div>
        <div style={{ fontSize: 11, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-music"></i> Original Audio
        </div>
      </div>
    </div>
  ),
  instagram: ({ content, media }) => (
    <div style={{ ...PREVIEW_STYLES.device, ...PREVIEW_STYLES.feedDevice }}>
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #efefef' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ccc' }}></div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>yourbrand</span>
      </div>
      <div style={{ width: '100%', height: 400, background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {media?.image ? <img src={media.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#999' }}>1:1 or 4:5 Media</span>}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, color: '#262626', fontSize: 18 }}>
          <i className="far fa-heart"></i>
          <i className="far fa-comment"></i>
          <i className="far fa-paper-plane"></i>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600, marginRight: 6 }}>yourbrand</span>
          {content || "Instagram caption goes here..."}
        </div>
      </div>
    </div>
  ),
  linkedin: ({ content, media }) => (
    <div style={{ ...PREVIEW_STYLES.device, ...PREVIEW_STYLES.feedDevice }}>
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 4, background: '#ccc' }}></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Your Brand</div>
          <div style={{ fontSize: 12, color: '#666' }}>1M followers</div>
        </div>
      </div>
      <div style={{ padding: '0 12px 8px 12px', fontSize: 13, lineHeight: 1.5, color: '#000' }}>
        {content ? content.slice(0, 140) + (content.length > 140 ? '... see more' : '') : "Professional update goes here."}
      </div>
      <div style={{ width: '100%', height: 210, background: '#f3f2ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {media?.image ? <img src={media.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#999' }}>1.91:1 Media</span>}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-around', color: '#666', fontSize: 13, fontWeight: 600 }}>
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
      </div>
    </div>
  )
};

const DefaultRenderer = ({ platform, content }) => (
  <div style={{ ...PREVIEW_STYLES.device, ...PREVIEW_STYLES.feedDevice, padding: 16 }}>
    <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, textTransform: 'capitalize' }}>{platform} Preview</div>
    <div style={{ fontSize: 13, color: '#444' }}>{content || "No content"}</div>
  </div>
);

export default function PlatformPreviewPanel({ platforms = [], content = "", overrides = {}, media = null }) {
  const [activeTab, setActiveTab] = useState(platforms[0] || 'facebook');
  const [showSafeZones, setShowSafeZones] = useState(true);

  // If active tab isn't in selected platforms, adjust
  if (platforms.length > 0 && !platforms.includes(activeTab)) {
    setActiveTab(platforms[0]);
  }

  const currentContent = overrides[activeTab] || content;
  const validation = validateContent(activeTab, currentContent, media ? 'image' : null, null);

  const Renderer = PlatformRenderers[activeTab] || DefaultRenderer;

  return (
    <div style={PREVIEW_STYLES.container} className="card-workspace">
      {/* Header Tabs */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="extra-small fw-bold text-muted text-uppercase">Live Platform Rendering Engine</span>
          {['tiktok', 'shorts', 'instagram_story'].includes(activeTab) && (
            <button 
              className={`btn btn-sm ${showSafeZones ? 'btn-danger' : 'btn-outline-danger'}`} 
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => setShowSafeZones(!showSafeZones)}
            >
              <i className="fas fa-border-style me-1"></i> Safe Zones
            </button>
          )}
        </div>
        
        <div className="d-flex gap-2 overflow-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {platforms.map(p => (
            <button
              key={p}
              className={`btn btn-sm ${activeTab === p ? 'btn-dark' : 'btn-light border-subtle'}`}
              style={{ fontSize: 11, borderRadius: 20, whiteSpace: 'nowrap' }}
              onClick={() => setActiveTab(p)}
            >
              <i className={`fab fa-${p === 'shorts' ? 'youtube' : p} me-1`}></i> 
              {p === 'shorts' ? 'Shorts' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Validation Ribbon */}
      {validation.state !== 'SAFE' && (
        <div style={{ 
          background: validation.state === 'BLOCKED' ? '#fee2e2' : '#fef3c7', 
          color: validation.state === 'BLOCKED' ? '#dc2626' : '#d97706',
          padding: '8px 16px',
          fontSize: 11,
          fontWeight: 600,
          borderBottom: '1px solid ' + (validation.state === 'BLOCKED' ? '#fecaca' : '#fde68a')
        }}>
          <i className={`fas fa-${validation.state === 'BLOCKED' ? 'ban' : 'exclamation-triangle'} me-2`}></i>
          {validation.messages.join(" ")}
        </div>
      )}

      {/* Render Area */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex' }}>
        <div style={{ width: '100%', margin: 'auto' }}>
           <Renderer platform={activeTab} content={currentContent} media={media} showSafeZones={showSafeZones} />
        </div>
      </div>

    </div>
  );
}
