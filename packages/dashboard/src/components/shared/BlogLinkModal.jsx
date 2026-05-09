import React, { useState } from 'react';

const BlogLinkModal = ({ isOpen, onClose, onConfirm, initialData }) => {
  const [url, setUrl] = useState(initialData?.url || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (!url.startsWith('http')) {
      alert("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setLoading(true);
    // Simulate metadata scraping
    setTimeout(() => {
      setLoading(false);
      onConfirm({ url, title: title || "Blog Post" });
      onClose();
    }, 800);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">Add Blog Link</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-3">
              <label className="form-label small fw-bold">URL</label>
              <input 
                type="text" 
                className="input-pill" 
                placeholder="https://example.com/blog-post" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-bold">Link Title (Optional)</label>
              <input 
                type="text" 
                className="input-pill" 
                placeholder="Enter a custom title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="alert alert-info small border-0 mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Adding a blog link will generate a preview card in your social posts.
            </div>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button className="btn-grey" onClick={onClose}>Cancel</button>
            <button className="btn-pilot px-4" onClick={handleValidate} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check me-2"></i>}
              Attach Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogLinkModal;
