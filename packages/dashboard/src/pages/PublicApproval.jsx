import React, { useState, useEffect } from 'react';
import BrandPreview from '../components/shared/BrandPreview';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";

/**
 * PublicApproval — Phase 6: External Approval Portal
 * Route: /public/approval/:contentId?token=xxx
 * - Read-only content view using BrandPreview
 * - External comments
 * - Approve / Reject triggers (no auth required for this route)
 */
const PublicApproval = ({ contentId }) => {
  const [content, setContent] = useState(null);
  const [brand, setBrand] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState(null); // 'approved' | 'rejected'
  const [error, setError] = useState(null);

  // Extract contentId from URL if not passed as prop
  const resolvedId = contentId || window.location.pathname.split('/').pop();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch public content by ID (no auth)
        const res = await fetch(`${API_BASE}/api/public/approval/${resolvedId}`);
        if (!res.ok) throw new Error('Content not found or link expired.');
        const data = await res.json();
        setContent(data.content);
        setBrand(data.brand);
        setComments(data.comments || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (resolvedId) load();
  }, [resolvedId]);

  const submitDecision = async (status) => {
    if (!newComment.trim() && status === 'rejected') {
      alert('Please provide a rejection reason before rejecting.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/public/approval/${resolvedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          comment: newComment || (status === 'approved' ? '✅ Approved externally.' : null)
        })
      });
      setDecision(status);
    } catch {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/public/approval/${resolvedId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment, type: 'external' })
      });
      setComments(prev => [...prev, {
        id: Date.now(),
        message: newComment,
        type: 'external',
        created_at: new Date().toISOString(),
        author_name: 'You (Client)'
      }]);
      setNewComment('');
    } catch {
      alert('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" style={{ width: '2.5rem', height: '2.5rem' }}></div>
        <p className="text-muted">Loading content for review...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div className="text-center p-5">
        <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
        <h4 className="fw-bold">Content Unavailable</h4>
        <p className="text-muted">{error}</p>
        <p className="small text-muted">This link may have expired or the content may no longer be available for review.</p>
      </div>
    </div>
  );

  if (decision) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div className="text-center p-5">
        <div className={`rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center ${decision === 'approved' ? 'bg-success' : 'bg-danger'}`}
             style={{ width: '80px', height: '80px' }}>
          <i className={`fas ${decision === 'approved' ? 'fa-check' : 'fa-times'} fa-2x text-white`}></i>
        </div>
        <h3 className="fw-bold mb-2">{decision === 'approved' ? '✅ Content Approved!' : '❌ Content Rejected'}</h3>
        <p className="text-muted">Thank you for your review. The content team has been notified.</p>
      </div>
    </div>
  );

  const platform = content?.platform || 'facebook';
  const postContent = content?.content || content?.title || '';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', color: 'white', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="d-flex align-items-center gap-3">
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-paper-plane text-white" style={{ fontSize: '14px' }}></i>
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: '1rem' }}>myPilotPost</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Content Approval Portal</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(99,102,241,0.2)', borderRadius: '999px', color: '#a5b4fc' }}>
          🔒 Secure Review
        </span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="row g-4">

          {/* Preview Panel */}
          <div className="col-md-7">
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Content Preview</h5>
                  <p className="text-muted small mb-0">This is a read-only preview of the content submitted for your review.</p>
                </div>
                <span className="badge bg-warning-light text-warning" style={{ padding: '6px 12px' }}>PENDING REVIEW</span>
              </div>

              {brand && (
                <BrandPreview
                  brand={brand}
                  content={postContent}
                  platform={platform}
                  image={content?.image_url}
                />
              )}

              {!brand && (
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.5rem' }}>
                  <p style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.6' }}>{postContent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action + Comments Panel */}
          <div className="col-md-5">

            {/* Decision Actions */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: '1.25rem' }}>
              <h6 className="fw-bold mb-3">Your Decision</h6>

              <textarea
                className="form-control border-0 bg-light rounded-3 mb-3"
                rows="3"
                placeholder="Optional: Add a comment before deciding..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                style={{ resize: 'none' }}
              />

              <div className="d-flex gap-2">
                <button
                  className="btn btn-success flex-grow-1 fw-bold py-2"
                  style={{ borderRadius: '10px' }}
                  onClick={() => submitDecision('approved')}
                  disabled={submitting}
                >
                  <i className="fas fa-check-circle me-1"></i>
                  {submitting ? 'Submitting...' : 'Approve'}
                </button>
                <button
                  className="btn btn-danger flex-grow-1 fw-bold py-2"
                  style={{ borderRadius: '10px' }}
                  onClick={() => submitDecision('rejected')}
                  disabled={submitting}
                >
                  <i className="fas fa-times-circle me-1"></i>
                  Reject
                </button>
              </div>
            </div>

            {/* Comment Thread */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <h6 className="fw-bold mb-3">Comments ({comments.length})</h6>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }} className="mb-3">
                {comments.length === 0 ? (
                  <p className="text-muted small text-center py-4">No comments yet. Be the first to add feedback.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className={`d-flex gap-2 mb-3 ${c.type === 'external' ? 'justify-content-end' : ''}`}>
                      {c.type === 'internal' && (
                        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1,#8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>
                            {(c.author_name || 'T')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div style={{ maxWidth: '80%' }}>
                        <div style={{
                          background: c.type === 'external' ? '#eff6ff' : '#f8fafc',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          border: c.type === 'external' ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                        }}>
                          <div className="small fw-bold mb-1" style={{ color: c.type === 'external' ? '#3b82f6' : '#475569' }}>
                            {c.type === 'external' ? 'You (Client)' : (c.author_name || 'Team')}
                          </div>
                          <div className="small" style={{ color: '#334155' }}>{c.message}</div>
                        </div>
                        <div className="small text-muted mt-1" style={{ fontSize: '10px' }}>
                          {new Date(c.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control border-0 bg-light rounded-pill"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment()}
                />
                <button
                  className="btn btn-primary rounded-pill px-3"
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicApproval;
