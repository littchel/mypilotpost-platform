import React, { useState } from "react";
import { 
  FileText, Share2, Calendar, CheckCircle2, XCircle, 
  Clock, MoreVertical, MessageCircle, Link, Mail, 
  Trash2, Edit3, Eye, Copy, BarChart2, Filter, Search,
  Check, ChevronRight, Monitor, Smartphone, TrendingUp, Globe,
  Facebook, Instagram, Linkedin, Twitter, RefreshCw, AlertCircle
} from "lucide-react";

import { apiSafeFetch } from "../lib/api/client";

/**
 * Premium Content Management Cleanup
 * Focus: Simplicity, Hierarchy, Scannability.
 */

// ── Shared UI Tokens ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: { color: "bg-secondary text-white", label: "Draft" },
  pending: { color: "bg-warning text-dark", label: "Pending" },
  approved: { color: "bg-success text-white", label: "Approved" },
  scheduled: { color: "bg-primary text-white", label: "Scheduled" },
  published: { color: "bg-dark text-white", label: "Published" },
  rejected: { color: "bg-danger text-white", label: "Rejected" },
};

const PLATFORM_ICONS = {
  facebook: <Facebook size={14} className="text-primary" />,
  instagram: <Instagram size={14} className="text-danger" />,
  linkedin: <Linkedin size={14} className="text-info" />,
  x: <Twitter size={14} className="text-dark" />,
};

// ── Components ───────────────────────────────────────────────────────────────

const ActionButtons = ({ status }) => {
  const btnBase = "btn btn-sm fw-bold extra-small px-3 py-2";
  
  if (status === 'draft') return (
    <div className="d-flex gap-2">
      <button className={`${btnBase} btn-secondary`}>Edit</button>
      <button className={`${btnBase} btn-primary`}>Share for Approval</button>
    </div>
  );
  if (status === 'pending') return (
    <div className="d-flex gap-2">
      <button className={`${btnBase} btn-success`}>Approve</button>
      <button className={`${btnBase} btn-danger`}>Reject</button>
    </div>
  );
  if (status === 'approved' || status === 'scheduled') return (
    <div className="d-flex gap-2">
      <button className={`${btnBase} btn-secondary`}>View</button>
      <button className={`${btnBase} btn-secondary`}>Reschedule</button>
    </div>
  );
  if (status === 'published') return (
    <div className="d-flex gap-2">
      <button className={`${btnBase} btn-primary`}>View Performance</button>
    </div>
  );
  return null;
};

// ── Main Content Management UI ───────────────────────────────────────────────

const ContentManagement = ({ activeBrand }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [contentState, setContentState] = useState({
    status: 'loading',
    data: null
  });

  const fetchContent = async () => {
    if (!activeBrand?.id) {
      setContentState({ status: 'empty', data: [] });
      return;
    }
    setContentState({ status: 'loading', data: null });
    const result = await apiSafeFetch(`/api/customer/content?brandId=${activeBrand.id}`);
    setContentState(result);
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.length) return;
    setIsBulkProcessing(true);
    try {
      await apiSafeFetch('/api/customer/content/social/approve-bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds })
      });
      setSelectedIds([]);
      fetchContent();
      alert(`Successfully approved ${selectedIds.length} items!`);
    } catch (e) {
      console.error("Bulk approval failed", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  React.useEffect(() => {
    fetchContent();
  }, [activeBrand?.id]);

  if (contentState.status === 'loading') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '400px' }}>
        <RefreshCw className="text-primary animate-spin mb-3" size={32} />
        <div className="fw-bold text-muted">Loading Content...</div>
      </div>
    );
  }

  if (contentState.status === 'error') {
    return (
      <div className="card-workspace p-5 text-center border-danger border-opacity-25 bg-danger bg-opacity-10" style={{ borderRadius: '24px' }}>
        <AlertCircle className="text-danger mb-3 mx-auto" size={48} />
        <h5 className="fw-bold text-danger">Unable to load content</h5>
        <button className="btn btn-danger px-4 fw-bold rounded-pill mt-3" onClick={fetchContent}>
          <RefreshCw size={16} className="me-2" /> Retry
        </button>
      </div>
    );
  }

  const allContent = contentState.data || [];
  const filteredContent = activeTab === 'all' 
    ? allContent 
    : allContent.filter(c => c.status === activeTab);

  if (contentState.status === 'empty' || allContent.length === 0) {
    return (
      <div className="card-workspace p-5 text-center bg-light border-dashed" style={{ borderRadius: '24px' }}>
        <FileText className="text-muted mb-3 opacity-25 mx-auto" size={48} />
        <h5 className="fw-bold text-main">No content yet</h5>
        <p className="text-muted extra-small mb-4">You haven't created any content for this brand yet. Start your first draft!</p>
        <button className="btn btn-primary px-4 fw-bold rounded-pill shadow-sm">
          Create Content
        </button>
      </div>
    );
  }

  return (
    <div className="content-cleanup animate__animated animate__fadeIn p-1">
      
      {/* 1. Minimal Filter Bar */}
      <div className="d-flex align-items-center justify-content-between mb-4 gap-3 bg-white p-2 rounded-lg border shadow-sm">
        <div className="d-flex gap-1 overflow-auto no-scrollbar py-1 flex-1">
          {['all', 'draft', 'pending', 'approved', 'scheduled', 'published', 'rejected'].map(s => (
            <button 
              key={s} 
              className={`btn btn-sm border-0 px-3 py-1 extra-small fw-bold transition-all ${activeTab === s ? 'text-primary bg-primary-light' : 'text-muted'}`}
              onClick={() => setActiveTab(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {selectedIds.length > 0 && (
          <div className="d-flex align-items-center gap-2 px-3 border-start animate__animated animate__fadeIn">
            <span className="extra-small fw-bold text-primary">{selectedIds.length} selected</span>
            <button 
              className="btn btn-primary btn-sm extra-small fw-bold px-3 rounded-pill"
              onClick={handleBulkApprove}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? <RefreshCw size={12} className="animate-spin me-1" /> : <CheckCircle2 size={12} className="me-1" />}
              Approve Selected
            </button>
          </div>
        )}
        
        <div className="d-flex align-items-center gap-2 px-3 border-start" style={{ width: '200px' }}>
          <Search size={14} className="text-muted" />
          <input type="text" className="form-control form-control-sm border-0 bg-transparent shadow-none extra-small" placeholder="Search..." />
        </div>
      </div>

      {/* 2. Structured Content Grid */}
      <div className="row g-3">
        {filteredContent.map(item => (
          <div key={item.id} className="col-lg-6">
            <div className="card-minimal h-100 bg-white border rounded-lg shadow-sm transition-all overflow-hidden position-relative">
              
              {/* Checkbox (Floating) */}
              <input 
                type="checkbox" 
                className="position-absolute form-check-input" 
                style={{ top: '16px', left: '16px', zIndex: 10, cursor: 'pointer' }} 
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
              />

              {/* 🔝 TOP SECTION (HEADER) */}
              <div className="card-header-clean p-3 pb-2 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2 ms-4">
                  <span className="extra-small fw-bold text-muted text-uppercase tracking-wider">{item.platform}</span>
                  <span className="badge bg-primary-light text-primary border-0 extra-small">{item.campaign_name || "General"}</span>
                </div>
                <span className={`badge ${STATUS_CONFIG[item.status]?.color || 'bg-secondary'} extra-small fw-bold px-2 py-1`}>
                  {STATUS_CONFIG[item.status]?.label || item.status}
                </span>
              </div>

              {/* 🧩 MIDDLE SECTION (CONTENT) */}
              <div className="card-body-clean p-3 py-2">
                <div className="d-flex gap-3">
                   {item.media_url && (
                     <div className="bg-light rounded flex-shrink-0" style={{ width: '80px', height: '60px', backgroundImage: `url(${item.media_url})`, backgroundSize: 'cover' }}></div>
                   )}
                   <p className="extra-small text-main mb-0 fw-medium" style={{ lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                     {item.content || item.text_content}
                   </p>
                </div>
              </div>

              {/* 🔻 BOTTOM SECTION (FOOTER) */}
              <div className="card-footer-clean p-3 pt-2 border-top bg-light bg-opacity-30">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2 extra-small text-muted fw-bold">
                    <Clock size={12} /> Oct 24, 10:30 AM
                  </div>
                  <div className="d-flex gap-1">
                    {PLATFORM_ICONS[item.platform]}
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                   <ActionButtons status={item.status} />
                   <button className="btn btn-link btn-sm p-0 text-muted"><MoreVertical size={16} /></button>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      <style>{`
        .content-cleanup {
          max-width: 1200px;
          margin: 0 auto;
        }
        .bg-primary-light { background: #eff6ff; }
        .card-minimal {
          border-color: #e2e8f0;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card-minimal:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
          border-color: var(--pilot-blue);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .extra-small { font-size: 0.75rem; }
      `}</style>
    </div>
  );
};

export default ContentManagement;
