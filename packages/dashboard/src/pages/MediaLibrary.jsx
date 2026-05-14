import React, { useState, useEffect, useCallback } from "react";
import { 
  Upload, Cloud, Database, Search, FileIcon, 
  ImageIcon, VideoIcon, FileTextIcon, AlertCircle, Plus 
} from "lucide-react";
import { apiSafeFetch } from "../lib/api/client";

/**
 * Production-Hardened Media Library
 * Implements strict status modeling: loading | empty | error | success
 */

// ── Shared UI States ──────────────────────────────────────────────────────

const LoadingIndicator = ({ message = "Accessing media assets..." }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn">
    <div className="spinner-border spinner-border-sm mb-3 text-primary" role="status"></div>
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const EmptyState = ({ onUpload }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center animate__animated animate__fadeIn">
    <div className="bg-light p-4 rounded-circle mb-3">
      <Cloud size={48} strokeWidth={1} className="text-muted opacity-50" />
    </div>
    <h6 className="fw-bold text-main">Your library is empty</h6>
    <p className="extra-small text-muted mb-4 max-w-280 mx-auto">
      Start building your brand asset collection by uploading or connecting your cloud storage.
    </p>
    <div className="d-flex flex-column gap-2 w-100 max-w-200">
      <button className="btn-pilot btn-sm w-100 d-flex align-items-center justify-content-center gap-2" onClick={onUpload}>
        <Upload size={14} /> Upload Media
      </button>
      <button className="btn-grey btn-sm w-100 d-flex align-items-center justify-content-center gap-2">
        <Database size={14} /> Connect Google Drive
      </button>
      <button className="btn-grey btn-sm w-100 d-flex align-items-center justify-content-center gap-2">
        <Cloud size={14} /> Connect Dropbox
      </button>
    </div>
  </div>
);

const ErrorState = ({ message = "Unable to access media library", onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-danger animate__animated animate__fadeIn">
    <AlertCircle size={32} strokeWidth={1} className="mb-3 opacity-50" />
    <span className="extra-small fw-bold mb-3">{message}</span>
    {onRetry && (
      <button 
        className="btn btn-sm btn-outline-danger px-4 py-2 rounded-pill fw-bold" 
        style={{ fontSize: '0.65rem' }}
        onClick={onRetry}
      >
        Retry
      </button>
    )}
  </div>
);

// ── Main Page Component ──────────────────────────────────────────────────────

export default function MediaLibrary({ onSelectAsset }) {
  const [selectedAssetIdx, setSelectedAssetIdx] = useState(null);
  const [media, setMedia] = useState({ status: 'loading', data: [] });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchMedia = useCallback(async () => {
    setMedia(prev => ({ ...prev, status: 'loading' }));
    const res = await apiSafeFetch(`/api/customer/media?type=${filter}`);
    setMedia(res);
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMedia(), 0);
    return () => clearTimeout(timer);
  }, [fetchMedia]);

  const getIcon = (type) => {
    switch(type) {
      case 'image': return <ImageIcon size={24} />;
      case 'video': return <VideoIcon size={24} />;
      case 'pdf': return <FileTextIcon size={24} />;
      default: return <FileIcon size={24} />;
    }
  };

  const handleSelect = (idx, item) => {
    setSelectedAssetIdx(idx);
    if (onSelectAsset) {
      onSelectAsset(item);
    }
  };

  const filteredData = (media.data || []).filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="tab-media" className="animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">Media Library</h5>
        <button className="btn-pilot btn-sm d-flex align-items-center gap-2">
          <Upload size={14} /> Upload
        </button>
      </div>

      <div className="card-workspace p-3">
        <div className="d-flex justify-content-between mb-4 align-items-center flex-wrap gap-2">
          <div className="d-flex gap-1">
            {['all', 'image', 'video'].map(f => (
              <button 
                key={f}
                className={`btn-grey btn-sm px-3 text-capitalize ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="d-flex align-items-center gap-2 bg-light px-2 rounded-pill">
            <Search size={14} className="text-muted" />
            <input 
              className="form-control form-control-sm border-0 bg-transparent py-1" 
              placeholder="Search assets..." 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {media.status === 'loading' ? <LoadingIndicator /> :
         media.status === 'empty' ? <EmptyState onUpload={() => {}} /> :
         media.status === 'error' ? <ErrorState onRetry={fetchMedia} /> : (
          <>
            <div className="media-grid">
              {filteredData.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`card-workspace p-1 text-center mb-0 cursor-pointer hover-lift transition-all ${selectedAssetIdx === idx ? 'border-primary shadow-sm' : ''}`}
                  onClick={() => handleSelect(idx, item)}
                >
                  <div 
                    className="rounded mb-2 d-flex align-items-center justify-content-center text-white min-h-90 shadow-inner"
                    style={{ background: item.gradient || 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', color: '#64748b' }}
                  >
                    {getIcon(item.type)}
                  </div>
                  <div className="extra-small fw-bold text-truncate px-2 text-main" title={item.name}>{item.name}</div>
                  <div className="extra-small text-muted mb-1">{item.size}</div>
                </div>
              ))}
            </div>

            <div className="text-center mt-5">
              <button className="btn-grey btn-sm d-flex align-items-center gap-2 mx-auto">
                <Plus size={14} /> Load More Assets
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }
        .min-h-90 { min-height: 90px; }
        .hover-lift:hover { transform: translateY(-2px); }
        .max-w-280 { max-width: 280px; }
        .max-w-200 { max-width: 200px; }
        .btn-grey.active { background: var(--pilot-blue); color: white; border-color: var(--pilot-blue); }
      `}</style>
    </div>
  );
}
