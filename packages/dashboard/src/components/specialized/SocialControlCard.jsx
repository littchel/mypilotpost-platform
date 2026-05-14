import React, { useState, useEffect, useCallback } from 'react';
import SocialPreview from './SocialPreview';
import PilotButton from '../shared/PilotButton';
import MediaSourceModal from '../shared/MediaSourceModal';
import { 
  Eye, Edit2, Send, Calendar, CheckCircle, Trash2, 
  Image as ImageIcon, Plus, X, AlertCircle, RefreshCw, 
  Sparkles, ChevronRight, Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SocialControlCard Component
 */
const SocialControlCard = ({ 
  draft, 
  brand, 
  onPreview,
  onEdit,
  onApprove,
  onReject,
  onSchedule,
  onPostNow,
  onCancel,
  onRetry
}) => {
  const { apiUrl } = useAuth();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [_loadingMedia, setLoadingMedia] = useState(false);
  const [showSmartHelper, setShowSmartHelper] = useState(false);
  const [smartTips, setSmartTips] = useState([]);

  // Logic: draft.content || first variant
  const contentFallback = draft.content || Object.values(draft.variants || {})[0] || "";

  const fetchStrategicGuidance = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/customer/intelligence`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();

      // HYBRID LOGIC: Platform Specific + Brand Fallback
      // If draft has specific platforms, filter for them
      const platforms = Object.keys(draft.variants || {});
      const relevant = (data.insights || []).filter(ins => {
        if (ins.type === 'opportunity' || ins.type === 'performance') {
           return platforms.some(p => ins.title.toLowerCase().includes(p.toLowerCase())) || ins.priority === 'high';
        }
        return ins.priority === 'high' || ins.type === 'warning';
      });

      setSmartTips(relevant.length > 0 ? relevant : (data.insights || []).slice(0, 2));
    } catch (e) {
      console.error("Failed to load strategic guidance", e);
    }
  }, [apiUrl, draft.variants]);

  const fetchAttachedMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch(`${apiUrl}/api/customer/media/attached/social/${draft.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAttachedMedia(data.items || []);
    } catch (err) {
      console.error("Failed to fetch attached media", err);
    } finally {
      setLoadingMedia(false);
    }
  }, [apiUrl, draft.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttachedMedia();
      fetchStrategicGuidance();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAttachedMedia, fetchStrategicGuidance]);

  const handleMediaSelect = async (media) => {
    try {
      await fetch(`${apiUrl}/api/customer/media/attach`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          content_type: 'social',
          content_id: draft.id,
          media_id: media.id
        })
      });
      fetchAttachedMedia();
    } catch (err) {
      console.error("Failed to attach media", err);
    }
  };

  const handleMediaDetach = async (mediaId) => {
    try {
      await fetch(`${apiUrl}/api/customer/media/detach`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          content_id: draft.id,
          media_id: mediaId
        })
      });
      fetchAttachedMedia();
    } catch (err) {
      console.error("Failed to detach media", err);
    }
  };

  const getStatusColor = (s) => {
    switch(s) {
      case 'approval': return '#f59e0b';
      case 'approved': return '#3b82f6';
      case 'scheduled': return '#8b5cf6';
      case 'published': return '#10b981';
      case 'failed': return '#ef4444';
      case 'partial_failure': return '#f59e0b'; // Amber
      default: return '#94a3b8';
    }
  };

  const deliveryResults = draft.delivery_results ? (typeof draft.delivery_results === 'string' ? JSON.parse(draft.delivery_results) : draft.delivery_results) : null;

  return (
    <div className="social-control-card card-workspace shadow-sm p-0 overflow-hidden d-flex flex-column" 
      style={{ 
        border: `1px solid ${draft.status === 'partial_failure' ? '#fde68a' : '#e2e8f0'}`, 
        borderRadius: '20px', 
        transition: 'all 0.2s ease', 
        background: draft.status === 'partial_failure' ? '#fffbeb' : 'white',
        minHeight: '400px',
        boxShadow: draft.status === 'partial_failure' ? '0 4px 12px rgba(245, 158, 11, 0.1)' : 'none'
      }}>
      
      {/* 1. Header (Brand) */}
      <div className="card-header-brand d-flex align-items-center justify-content-between" 
        style={{ padding: '16px 20px', background: draft.status === 'partial_failure' ? '#fef3c7' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <div className="d-flex align-items-center gap-2">
          {smartTips.length > 0 && (
            <button 
              className="btn btn-sm p-1 rounded-circle border-0 me-2 pulse-insight"
              style={{ color: '#8b5cf6', background: '#8b5cf615' }}
              onClick={() => setShowSmartHelper(!showSmartHelper)}
              title="View Smart Insight"
            >
              <Sparkles size={16} />
            </button>
          )}
          <div className="brand-avatar-sm rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm" 
            style={{ width: '32px', height: '32px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, color: '#2563eb' }}>
            {brand?.name?.[0] || 'B'}
          </div>
          <div className="brand-name-sm fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{brand?.name || 'My Brand'}</div>
        </div>
        <span className="badge-status text-uppercase" 
          style={{ 
            fontSize: '10px', 
            fontWeight: 800, 
            padding: '4px 10px', 
            borderRadius: '8px', 
            background: `${getStatusColor(draft.status)}15`, 
            color: getStatusColor(draft.status), 
            letterSpacing: '0.05em' 
          }}>
          {draft.status === 'partial_failure' ? 'PARTIAL FAILURE' : (draft.status || 'DRAFT')}
        </span>
      </div>

      {/* 2. Body (High-Fidelity Preview) */}
      <div className="card-body-preview p-0" style={{ flex: 1, background: '#fff', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
        
        {/* Smart Helper Overlay */}
        {showSmartHelper && (
          <div className="smart-helper-overlay" style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(255,255,255,0.95)', zIndex: 100,
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
            backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease'
          }}>
            <div className="d-flex justify-content-between align-items-center">
               <div className="d-flex align-items-center gap-2" style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '0.75rem' }}>
                  <Sparkles size={16} /> SMART GUIDANCE
               </div>
               <button className="btn btn-link p-0 text-muted" onClick={() => setShowSmartHelper(false)}>
                  <X size={18} />
               </button>
            </div>
            
            <div className="tips-list d-flex flex-column gap-3 overflow-auto">
               {smartTips.map((tip, i) => (
                 <div key={i} className={`tip-item p-3 rounded-4 border-start border-4 ${tip.priority === 'high' ? 'border-danger bg-danger-subtle' : 'border-primary bg-primary-subtle'}`}>
                    <div className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                       {tip.type === 'warning' ? <AlertCircle size={14} /> : <Info size={14} />}
                       {tip.title}
                    </div>
                    <p className="m-0 text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>{tip.message}</p>
                 </div>
               ))}
               <button className="btn btn-sm btn-link text-primary fw-bold p-0 text-decoration-none mt-2 text-start" 
                 onClick={() => window.location.hash = '#analytics'}>
                 View full brand report <ChevronRight size={12} />
               </button>
            </div>
          </div>
        )}

        {draft.status === 'partial_failure' && (
          <div style={{ padding: '10px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
             <AlertCircle size={14} className="me-1" style={{ marginTop: '-2px' }} /> Posted on some platforms, failed on others
          </div>
        )}
        
        {/* Media Overlay / Button */}
        {['draft', 'approval'].includes(draft.status) && (
          <div className="position-absolute" style={{ top: '10px', right: '10px', zIndex: 10 }}>
            {attachedMedia.length > 0 ? (
              <div className="d-flex gap-1 bg-white p-1 rounded-pill shadow-sm border">
                {attachedMedia.map(m => (
                  <div key={m.id} className="position-relative">
                    <img src={m.preview_url} className="rounded-circle" style={{ width: '24px', height: '24px', objectFit: 'cover' }} alt="Media" />
                    <button 
                      className="btn p-0 position-absolute top-0 start-100 translate-middle bg-danger rounded-circle text-white border-white"
                      style={{ width: '12px', height: '12px', fontSize: '8px' }}
                      onClick={() => handleMediaDetach(m.id)}
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                <button 
                  className="btn btn-sm btn-light p-0 rounded-circle border ms-1"
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => setIsMediaModalOpen(true)}
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-sm bg-white shadow-sm border rounded-pill px-2 fw-bold"
                style={{ fontSize: '11px', color: '#2563eb' }}
                onClick={() => setIsMediaModalOpen(true)}
              >
                <ImageIcon size={12} className="me-1" /> Add Media
              </button>
            )}
          </div>
        )}

        <div className="preview-scaler" style={{ transform: 'scale(1)', transformOrigin: 'top center', padding: '16px' }}>
          <SocialPreview 
            platform={draft.platform || 'facebook'}
            brand={brand}
            socialContent={contentFallback}
            platformVariants={draft.variants}
            image={attachedMedia[0]?.preview_url || draft.image_url}
          />
        </div>
      </div>

      {/* 3. Footer (Actions) */}
      <div className="card-footer-actions bg-white" style={{ padding: '20px' }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
           <div className="post-meta text-muted" style={{ fontSize: '11px' }}>
              <Calendar size={12} className="me-1" />
              {draft.scheduled_at ? new Date(draft.scheduled_at).toLocaleString() : `Updated ${new Date(draft.updated_at || draft.created_at).toLocaleDateString()}`}
           </div>
           <div className="platform-badges d-flex gap-1">
              {deliveryResults ? (
                Object.entries(deliveryResults).map(([p, res]) => (
                  <span key={p} className="badge border" 
                    style={{ 
                      fontSize: '9px', 
                      background: res.status === 'success' ? '#dcfce7' : '#fee2e2',
                      color: res.status === 'success' ? '#166534' : '#991b1b',
                      borderColor: res.status === 'success' ? '#bbf7d0' : '#fecaca'
                    }}>
                    {p}: {res.status}
                  </span>
                ))
              ) : (
                Object.keys(draft.variants || {}).map(p => (
                  <span key={p} className="badge bg-light text-muted border" style={{ fontSize: '9px' }}>{p}</span>
                ))
              )}
           </div>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-light border-subtle text-dark flex-grow-1 rounded-pill fw-bold" 
            style={{ fontSize: '0.75rem', padding: '8px 12px' }}
            onClick={() => onPreview(draft)}>
            <Eye size={14} className="me-1" /> Preview
          </button>
          
          {onEdit && (['draft', 'approval', 'approved', 'scheduled'].includes(draft.status)) && (
            <button className="btn btn-light border-subtle flex-grow-1 rounded-pill fw-bold" 
              style={{ fontSize: '0.75rem', padding: '8px 12px' }}
              onClick={() => onEdit(draft)}>
              <Edit2 size={14} className="me-1" /> Edit
            </button>
          )}

          {draft.status === 'draft' && onApprove && (
            <button className="btn btn-primary flex-grow-1 rounded-pill fw-bold" 
              style={{ fontSize: '0.75rem', padding: '8px 12px' }}
              onClick={() => onApprove(draft)}>
              <Send size={14} className="me-1" /> Submit
            </button>
          )}

          {draft.status === 'approval' && (
            <>
              <button className="btn btn-success flex-grow-1 rounded-pill fw-bold" 
                style={{ fontSize: '0.75rem', padding: '8px 12px' }}
                onClick={() => onApprove(draft)}>
                Approve
              </button>
              <button className="btn btn-outline-danger flex-grow-1 rounded-pill fw-bold" 
                style={{ fontSize: '0.75rem', padding: '8px 12px' }}
                onClick={() => onReject && onReject(draft)}>
                Reject
              </button>
            </>
          )}

          {(draft.status === 'approved' || draft.status === 'scheduled') && (
            <>
              {onPostNow && (
                <button className="btn btn-success flex-grow-1 rounded-pill fw-bold" 
                  style={{ fontSize: '0.75rem', padding: '8px 12px' }}
                  onClick={() => onPostNow(draft)}>
                  <Send size={14} className="me-1" /> Post Now
                </button>
              )}
              {onSchedule && (
                <button className="btn btn-primary flex-grow-1 rounded-pill fw-bold" 
                  style={{ fontSize: '0.75rem', padding: '8px 12px' }}
                  onClick={() => onSchedule(draft)}>
                  <Calendar size={14} className="me-1" /> Schedule
                </button>
              )}
            </>
          )}

          {(draft.status === 'failed' || draft.status === 'partial_failure') && onRetry && (
            <button className="btn btn-warning flex-grow-1 rounded-pill fw-bold" 
              style={{ fontSize: '0.75rem', padding: '8px 12px', color: '#92400e' }}
              onClick={() => onRetry(draft)}>
              <RefreshCw size={14} className="me-1" /> Retry Failed
            </button>
          )}

          {draft.status === 'scheduled' && onCancel && (
            <button className="btn btn-outline-danger flex-grow-1 rounded-pill fw-bold" 
              style={{ fontSize: '0.75rem', padding: '8px 12px' }}
              onClick={() => onCancel(draft)}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <MediaSourceModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleMediaSelect}
        activeBrand={brand}
        socialContent={contentFallback}
      />
    </div>
  );
};

export default SocialControlCard;
