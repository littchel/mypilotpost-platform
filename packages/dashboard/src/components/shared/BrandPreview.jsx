import React from 'react';

/**
 * BrandPreview Component
 * Standardized preview for social content, articles, and approval cards.
 * Follows the V1.2.2 design spec for global brand alignment.
 */
const BrandPreview = ({ 
  platform = 'facebook', 
  content = '', 
  variant = '', 
  image = null, 
  video = null, 
  blog = null, 
  brand = null, 
  isEditable = false, 
  onVariantChange = () => {} 
}) => {
  const initials = brand?.name?.[0] || 'B';
  const name = brand?.name || 'My Brand';
  const handle = brand?.name ? `@${brand.name.toLowerCase().replace(/\s+/g, '')}` : '@mybrand';
  
  // Use the variant if provided and non-empty, otherwise fallback to base content
  const previewText = variant?.trim() ? variant : content;

  const renderContent = () => {
    return (
      <div className="preview-realistic-content">
        {previewText || <span className="text-muted italic">No content yet...</span>}
      </div>
    );
  };

  const renderHeader = () => {
    const plat = platform.toLowerCase();
    switch(plat) {
      case 'instagram':
        return (
          <div className="preview-realistic-header py-2" style={{ borderBottom: 'none' }}>
             <div className="preview-realistic-avatar" style={{ width: '32px', height: '32px', border: '2px solid #e1306c', padding: '1px' }}>
                <div className="bg-white rounded-circle w-100 h-100 d-flex align-items-center justify-content-center" style={{ fontSize: '12px' }}>{initials}</div>
             </div>
             <div className="preview-realistic-meta ms-2">
                <div className="preview-realistic-name" style={{ fontSize: '0.85rem' }}>{name}</div>
             </div>
             <i className="fas fa-ellipsis-h ms-auto text-muted" style={{ fontSize: '12px' }}></i>
          </div>
        );
      case 'x':
      case 'twitter':
        return (
          <div className="preview-realistic-header pb-0 border-0">
             <div className="preview-realistic-avatar">{initials}</div>
             <div className="preview-realistic-meta">
                <div className="preview-realistic-name d-flex align-items-center">
                    {name} <i className="fas fa-check-circle text-primary ms-1" style={{ fontSize: '10px' }}></i>
                    <span className="ms-1 fw-normal text-muted">{handle} · Just now</span>
                </div>
             </div>
          </div>
        );
      case 'linkedin':
        return (
          <div className="preview-realistic-header align-items-start border-0 pb-1">
             <div className="preview-realistic-avatar" style={{ borderRadius: '4px' }}>{initials}</div>
             <div className="preview-realistic-meta">
                <div className="preview-realistic-name" style={{ fontSize: '0.9rem' }}>{name} <span className="fw-normal text-muted">· 1st</span></div>
                <div className="preview-realistic-sub">Visionary Leader in {brand?.industry || 'Innovation'}</div>
                <div className="preview-realistic-sub">Just now · <i className="fas fa-globe-americas"></i></div>
             </div>
          </div>
        );
      default: // Facebook
        return (
          <div className="preview-realistic-header border-0">
             <div className="preview-realistic-avatar">{initials}</div>
             <div className="preview-realistic-meta">
                <div className="preview-realistic-name">{name}</div>
                <div className="preview-realistic-sub">Just now · <i className="fas fa-users"></i></div>
             </div>
             <i className="fas fa-ellipsis-h ms-auto text-muted"></i>
          </div>
        );
    }
  };

  const renderFooter = () => {
    const plat = platform.toLowerCase();
    switch(plat) {
      case 'instagram':
        return (
          <div className="px-3 pb-3">
             <div className="d-flex gap-3 mb-2" style={{ fontSize: '1.2rem' }}>
                <i className="far fa-heart"></i>
                <i className="far fa-comment"></i>
                <i className="far fa-paper-plane"></i>
                <i className="far fa-bookmark ms-auto"></i>
             </div>
             <div className="small fw-bold mb-1">1,234 likes</div>
          </div>
        );
      case 'x':
      case 'twitter':
        return (
           <div className="preview-realistic-footer border-0 pt-0 opacity-75" style={{ justifyContent: 'space-between', paddingLeft: '64px' }}>
              <span><i className="far fa-comment me-1"></i> 0</span>
              <span><i className="fas fa-retweet me-1"></i> 0</span>
              <span><i className="far fa-heart me-1"></i> 0</span>
              <span><i className="far fa-chart-bar me-1"></i> 0</span>
           </div>
        );
      case 'linkedin':
        return (
           <div className="preview-realistic-footer border-top-0 pt-0 justify-content-start gap-4 px-3 opacity-75">
              <span><i className="far fa-thumbs-up me-1"></i> Like</span>
              <span><i className="far fa-comment-alt me-1"></i> Comment</span>
              <span><i className="fas fa-retweet me-1"></i> Repost</span>
              <span><i className="far fa-paper-plane me-1"></i> Send</span>
           </div>
        );
      default:
        return (
          <div className="preview-realistic-footer border-top pt-2">
             <span><i className="far fa-thumbs-up me-1"></i> Like</span>
             <span><i className="far fa-comment me-1"></i> Comment</span>
             <span><i className="far fa-share-square me-1"></i> Share</span>
          </div>
        );
    }
  };

  const platClass = platform.toLowerCase() === 'x' ? 'x' : platform.toLowerCase().substring(0, 2);

  return (
    <div className={`preview-window-realistic preview-${platClass}`}>
       {renderHeader()}
       
       <div className="preview-realistic-body-container">
          {isEditable ? (
            <textarea 
               className="preview-realistic-body w-100 border-0 bg-transparent"
               rows="4"
               value={previewText}
               onChange={(e) => onVariantChange(e.target.value)}
               placeholder={`Write ${platform} variant...`}
               style={{ outline: 'none', resize: 'none' }}
            />
          ) : (
            renderContent()
          )}
          
          {platform.toLowerCase() === 'x' && previewText.length > 280 && (
             <div className="px-3 pb-2 text-danger small fw-bold">
                <i className="fas fa-exclamation-triangle me-1"></i> Content exceeds X limit (280)
             </div>
          )}
       </div>

       {(image || video) && (
          <div className="preview-realistic-media">
             {image && <img src={image} alt="Simulation" style={{ aspectRatio: platform.toLowerCase() === 'instagram' ? '1/1' : 'auto', objectFit: 'cover' }} />}
             {video && <video src={video} controls className="w-100" style={{ maxHeight: '300px' }} />}
          </div>
       )}

       {blog && platform.toLowerCase() !== 'instagram' && (
          <div className="px-3 pb-3">
             <div className="preview-blog-card p-2 bg-light rounded-3 border d-flex align-items-center gap-3">
                <div className="bg-white p-2 rounded shadow-sm"><i className="fas fa-link text-primary"></i></div>
                <div className="overflow-hidden">
                   <div className="small fw-bold text-dark text-truncate">{blog.title}</div>
                   <div className="text-muted" style={{ fontSize: '9px' }}>{blog.url}</div>
                </div>
             </div>
          </div>
       )}

       {renderFooter()}
    </div>
  );
};

export default BrandPreview;
