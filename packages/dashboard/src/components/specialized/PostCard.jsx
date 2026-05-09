import React from 'react';

const PLATFORM_SVG = {
  facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#ig-grad)">
      <defs>
        <radialGradient id="ig-grad" cx="0" cy="0" r="1.4" gradientTransform="translate(4 20) scale(20)">
          <stop offset="0" stopColor="#f09433"/>
          <stop offset="0.25" stopColor="#e6683c"/>
          <stop offset="0.5" stopColor="#dc2743"/>
          <stop offset="0.75" stopColor="#cc2366"/>
          <stop offset="1" stopColor="#bc1888"/>
        </radialGradient>
      </defs>
      <path d="M12 0c3.263 0 3.67.013 4.947.072 1.276.06 2.146.262 2.91.56.79.307 1.46.717 2.13 1.39.673.67 1.083 1.34 1.39 2.13.297.764.5 1.634.56 2.91.058 1.277.072 1.684.072 4.947s-.014 3.67-.072 4.947c-.06 1.276-.263 2.146-.56 2.91-.307.79-.717 1.46-1.39 2.13-.67.67-1.34 1.083-2.13 1.39-.764.297-1.634.5-2.91.56-1.277.058-1.684.072-4.947.072s-3.67-.014-4.947-.072c-1.276-.06-2.146-.263-2.91-.56-.79-.307-1.46-.717-2.13-1.39-.67-.67-1.083-1.34-1.39-2.13-.297-.764-.5-1.634-.56-2.91C.012 15.67 0 15.263 0 12s.013-3.67.072-4.947c.06-1.276.262-2.146.56-2.91.307-.79.717-1.46 1.39-2.13.67-.67 1.34-1.083 2.13-1.39.764-.297 1.634-.5 2.91-.56C8.33.012 8.737 0 12 0zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162S8.597 18.162 12 18.162s6.162-2.759 6.162-6.162S15.403 5.838 12 5.838zm0 10.162c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  linkedin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003zM7.12 20.452H3.558V8.995H7.12v11.457zM5.339 7.433a2.063 2.063 0 110-4.126 2.063 2.063 0 010 4.126zm15.113 13.019h-3.562v-5.579c0-1.33-.024-3.041-1.854-3.041-1.855 0-2.14 1.45-2.14 2.944v5.676h-3.558V8.995h3.415v1.561h.046c.477-.9 1.637-1.85 3.367-1.85 3.601 0 4.267 2.37 4.267 5.455v6.291z"/>
    </svg>
  ),
  twitter: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  youtube: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  tiktok: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
      <path d="M12.525.02c1.31.036 2.512.333 3.534.821a7.48 7.48 0 0 1 1.737 1.054 7.214 7.214 0 0 1-1.07 1.109 4.397 4.397 0 0 1-1.579-.047 3.987 3.987 0 0 1-1.127-.478 3.82 3.82 0 0 1-.84-.66c-.363-.404-.668-.868-.87-1.365zM12.525.02H9.362v16.142c0 2.103-1.705 3.808-3.808 3.808-2.103 0-3.808-1.705-3.808-3.808 0-2.103 1.705-3.808 3.808-3.808.572 0 1.11.126 1.583.35v-3.23a6.83 6.83 0 0 0-1.583-.186c-3.774 0-6.84 3.066-6.84 6.84 0 3.774 3.066 6.84 6.84 6.84 3.774 0 6.84-3.066 6.84-6.84V6.444a7.126 7.126 0 0 0 5.4 1.488V4.704a4.135 4.135 0 0 1-5.267-4.684z"/>
    </svg>
  )
};

const STATUS_COLORS = {
  draft: 'var(--text-muted)',
  approval: 'var(--status-warning)',
  approved: 'var(--pilot-blue)',
  scheduled: '#8b5cf6',
  published: 'var(--status-success)'
};

const PostCard = ({ item, isCompact = false, onDragStart, onClick }) => {
  const { title, content, scheduled_at, status, platforms = [], media = [] } = item;
  
  const timeStr = scheduled_at 
    ? new Date(scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  const draggerProps = onDragStart ? {
    draggable: true,
    onDragStart: (e) => onDragStart(e, item)
  } : {};

  // Find preview image
  const previewImage = media && media.length > 0 ? media[0].preview_url : null;

  return (
    <>
      <div 
        {...draggerProps}
        onClick={() => onClick?.(item)}
        style={{
          background: 'var(--surface-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: isCompact ? '8px' : '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
          cursor: onDragStart ? 'grab' : 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '8px',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="post-card-premium"
      >
        {/* Status Stripe */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '4px', 
          height: '100%', 
          background: STATUS_COLORS[status] || '#cbd5e1' 
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {platforms.map(p => (
              <span key={p} title={p} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                {PLATFORM_SVG[p.toLowerCase()] || <span style={{fontSize: '8px', fontWeight: 900}}>{p.toUpperCase()}</span>}
              </span>
            ))}
          </div>
          {!isCompact && timeStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-secondary)', padding: '2px 8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{timeStr}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {previewImage && (
            <div style={{ 
              width: isCompact ? '32px' : '48px', 
              height: isCompact ? '32px' : '48px', 
              borderRadius: 'var(--radius-md)', 
              overflow: 'hidden', 
              flexShrink: 0,
              background: 'var(--surface-secondary)',
              border: '1px solid var(--border-subtle)'
            }}>
              <img src={previewImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Content" />
            </div>
          )}
          <div style={{ 
            fontSize: isCompact ? '0.75rem' : '0.85rem', 
            color: 'var(--text-main)', 
            lineHeight: 1.4,
            fontWeight: 600,
            display: '-webkit-box',
            WebkitLineClamp: isCompact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1
          }}>
            {content || title || "Untitled Content"}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
           <div style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '4px',
             background: (STATUS_COLORS[status] || 'var(--text-muted)') + '15',
             padding: '2px 8px',
             borderRadius: '6px',
             border: `1px solid ${(STATUS_COLORS[status] || 'var(--text-muted)') + '30'}`
           }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[status] || 'var(--text-muted)' }} />
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                color: STATUS_COLORS[status] || 'var(--text-muted)',
                letterSpacing: '0.04em'
              }}>
                {status}
              </span>
           </div>
           
           {item.jobs && item.jobs.some(j => j.delivery_attempts > 0) && (
             <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b' }}>
               Retry {item.jobs[0].delivery_attempts}
             </span>
           )}
        </div>
      </div>

      <style>{`
        .post-card-premium:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
          border-color: var(--pilot-blue);
        }
      `}</style>
    </>
  );
};

export default PostCard;
