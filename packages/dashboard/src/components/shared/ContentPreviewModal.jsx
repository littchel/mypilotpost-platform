import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../lib/api/client';
import SocialPreview from '../specialized/SocialPreview';
import { 
  X, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Share2, 
  Send,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  FileText
} from 'lucide-react';

const ContentPreviewModal = ({ 
  isOpen, 
  draft, 
  brand, 
  onClose, 
  onApprove, 
  onRequestChanges, 
  onAddComment 
}) => {
  const [activePlatform, setActivePlatform] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!draft?.id) return;
    setLoadingComments(true);
    try {
       const resp = await apiRequest(`/api/customer/content/${draft.id}/comments`);
       setComments(resp.data || []);
    } catch (err) {
       console.error("Failed to fetch comments", err);
    } finally {
       setLoadingComments(false);
    }
  }, [draft?.id]);

  useEffect(() => {
    if (isOpen && draft?.id) {
       fetchComments();
       // Set initial platform
       const platforms = Object.keys(draft.variants || {});
       setActivePlatform(draft.platform || platforms[0] || 'facebook');
    }
  }, [isOpen, draft?.id, fetchComments]);

  if (!isOpen || !draft) return null;

  const isArticle = draft.type === 'article' || draft.content_type === 'blog';
  const platforms = Object.keys(draft.variants || {});

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await onAddComment?.(draft.id, newComment.trim());
      setNewComment('');
      fetchComments();
    } catch (e) {
      alert("Failed to add comment.");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action, status) => {
    setSaving(true);
    try {
      if (action === 'approve') {
        await onApprove?.(draft.id);
      } else {
        const comment = prompt(`Reason for ${action === 'reject' ? 'rejection' : 'change request'}:`);
        if (comment === null) return; // Cancelled
        await onRequestChanges?.(draft.id, comment);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" 
      style={{ 
        position: 'fixed', inset: 0, zIndex: 9999, 
        background: 'rgba(15, 23, 42, 0.8)', 
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-container-custom shadow-2xl" 
        style={{ 
          background: 'white', borderRadius: '24px', 
          width: '100%', maxWidth: '1100px', height: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
        
        {/* Header */}
        <header className="p-4 border-bottom d-flex align-items-center justify-content-between" style={{ background: '#f8fafc' }}>
          <div className="d-flex align-items-center gap-3">
             <div className="icon-badge bg-white shadow-sm rounded-3 p-2">
                {isArticle ? <FileText size={20} className="text-primary" /> : <Share2 size={20} className="text-primary" />}
             </div>
             <div>
                <h4 className="mb-0 fw-bold">{isArticle ? 'Article Review' : 'Social Content Review'}</h4>
                <div className="text-muted small">Control Center • Agency Workflow</div>
             </div>
          </div>
          <button className="btn btn-light rounded-circle p-2" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-content-grid d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
          
          {/* Main Area (Content) */}
          <main className="flex-grow-1 p-0 d-flex flex-column" style={{ background: '#f1f5f9', overflowY: 'auto' }}>
            
            {/* Social Variant Switcher */}
            {!isArticle && platforms.length > 1 && (
              <div className="px-4 py-3 bg-white border-bottom d-flex gap-2 sticky-top" style={{ zIndex: 5 }}>
                {platforms.map(p => (
                  <button 
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={`btn btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 ${activePlatform === p ? 'btn-primary' : 'btn-light'}`}
                  >
                    {p === 'facebook' && <Facebook size={14} />}
                    {p === 'instagram' && <Instagram size={14} />}
                    {p === 'linkedin' && <Linkedin size={14} />}
                    {(p === 'twitter' || p === 'x') && <Twitter size={14} />}
                    <span className="text-capitalize">{p}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 d-flex justify-content-center">
              {isArticle ? (
                /* Article Reading Mode */
                <div className="card-workspace p-5 bg-white shadow-sm border-0 w-100" style={{ maxWidth: '800px', borderRadius: '0', minHeight: '100%' }}>
                  <h1 className="fw-extrabold mb-4" style={{ fontSize: '32px', lineHeight: '1.2' }}>{draft.title || 'Untitled Article'}</h1>
                  <div className="user-info d-flex align-items-center gap-3 mb-5 pb-4 border-bottom">
                    <div className="avatar rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold" style={{ width: '48px', height: '48px' }}>
                      {brand?.name?.[0] || 'B'}
                    </div>
                    <div>
                      <div className="fw-bold">{brand?.name || 'Publisher'}</div>
                      <div className="text-muted small">Draft Content • {new Date(draft.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="article-body-reading" 
                    style={{ fontSize: '18px', lineHeight: '1.8', color: '#334155' }}
                    dangerouslySetInnerHTML={{ __html: draft.body || draft.content }}
                  />
                </div>
              ) : (
                /* Social High-Fidelity Preview */
                <div style={{ maxWidth: '500px', width: '100%', marginTop: '40px' }}>
                  <SocialPreview 
                    platform={activePlatform}
                    brand={brand}
                    socialContent={draft.variants?.[activePlatform] || draft.content}
                    platformVariants={draft.variants}
                    image={draft.image_url}
                  />
                </div>
              )}
            </div>
          </main>

          {/* Sidebar Area (Comments) */}
          <aside className="border-left bg-white d-flex flex-column" style={{ width: '360px' }}>
            <div className="p-4 border-bottom d-flex align-items-center gap-2">
               <MessageSquare size={18} className="text-muted" />
               <h6 className="mb-0 fw-bold">Discussion</h6>
               <span className="badge bg-light text-muted ms-auto border">{comments.length}</span>
            </div>

            <div className="flex-grow-1 p-3 d-flex flex-column gap-3" style={{ overflowY: 'auto' }}>
              {loadingComments ? (
                 <div className="text-center py-5 opacity-50"><i className="fas fa-spinner fa-spin me-2" /> Loading thread...</div>
              ) : comments.length === 0 ? (
                 <div className="text-center py-5">
                    <div className="mb-2 opacity-20"><MessageSquare size={48} className="mx-auto" /></div>
                    <p className="text-muted small px-4">No comments yet. Start the conversation with your team or client.</p>
                 </div>
              ) : (
                comments.map((c, i) => (
                  <div key={c.id || i} className="comment-bubble p-3 rounded-4 bg-light border-0">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-extrabold text-dark" style={{ fontSize: '12px' }}>{c.author_name || 'Team Member'}</span>
                      <span className="text-muted" style={{ fontSize: '10px' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="comment-text text-main" style={{ fontSize: '13px', lineHeight: '1.5' }}>{c.message || c.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-top bg-light">
              <div className="d-flex gap-2 bg-white rounded-pill border p-1 pr-2 shadow-sm">
                <input 
                  className="form-control border-0 bg-transparent flex-grow-1 shadow-none" 
                  placeholder="Ask a question or leave feedback..." 
                  style={{ fontSize: '13px' }}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button 
                  className="btn btn-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
                  style={{ width: '32px', height: '32px' }}
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || saving}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Action Bar */}
        <footer className="p-4 border-top bg-white d-flex align-items-center justify-content-between">
          <div className="d-flex gap-2">
            <button className="btn btn-outline-danger rounded-pill px-4 fw-bold d-flex align-items-center gap-2" 
              onClick={() => handleAction('reject')} disabled={saving}>
              <X size={16} /> Reject
            </button>
            <button className="btn btn-light border rounded-pill px-4 fw-bold d-flex align-items-center gap-2" 
              onClick={() => handleAction('request_changes')} disabled={saving}>
              <AlertCircle size={16} /> Request Changes
            </button>
          </div>
          <button className="btn btn-success rounded-pill px-5 fw-extrabold d-flex align-items-center gap-2 shadow-lg" 
            style={{ padding: '12px 40px', fontSize: '16px' }}
            onClick={() => handleAction('approve')} disabled={saving}>
            <CheckCircle size={20} /> APPROVED
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ContentPreviewModal;
