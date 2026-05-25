import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, Cloud, Database, Search, FileIcon,
  ImageIcon, VideoIcon, FileTextIcon, AlertCircle, Plus, X
} from "lucide-react";
import { apiRequest } from "../lib/api/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";

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
    <p className="extra-small text-muted mb-4 mx-auto" style={{ maxWidth: 280 }}>
      Start building your brand asset collection by uploading images, videos, or documents.
    </p>
    <div className="d-flex flex-column gap-2 w-100" style={{ maxWidth: 200 }}>
      <button className="btn-pilot btn-sm w-100 d-flex align-items-center justify-content-center gap-2" onClick={onUpload}>
        <Upload size={14} /> Upload Media
      </button>
    </div>
  </div>
);

const ErrorState = ({ message = "Unable to load media library", onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center animate__animated animate__fadeIn">
    <AlertCircle size={32} strokeWidth={1} className="mb-3 text-danger opacity-50" />
    <span className="extra-small fw-bold text-danger mb-3">{message}</span>
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

const NoBrandState = () => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center">
    <AlertCircle size={32} strokeWidth={1} className="mb-3 text-muted opacity-50" />
    <h6 className="fw-bold text-muted">No brand selected</h6>
    <p className="extra-small text-muted">Select or create a brand to access your media library.</p>
  </div>
);

const getIcon = (type) => {
  switch (type) {
    case 'image': return <ImageIcon size={24} />;
    case 'video': return <VideoIcon size={24} />;
    case 'pdf':   return <FileTextIcon size={24} />;
    default:      return <FileIcon size={24} />;
  }
};

const getPreviewUrl = (item) => {
  if (item.url) return item.url;
  if (item.r2_key) return `${API_BASE}/api/customer/media/${item.id}/preview`;
  return null;
};

export default function MediaLibrary({ brandId, onSelectAsset }) {
  const [status, setStatus] = useState('loading');
  const [items, setItems]   = useState([]);
  const [error, setError]   = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchMedia = useCallback(async () => {
    if (!brandId) {
      setStatus('no-brand');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const params = new URLSearchParams({ brandId });
      if (filter !== 'all') params.set('type', filter);
      const res = await apiRequest(`/api/customer/media?${params}`);
      const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (data.length === 0) {
        setStatus('empty');
        setItems([]);
      } else {
        setStatus('success');
        setItems(data);
      }
    } catch (err) {
      console.error('[MediaLibrary] fetch error:', err);
      setStatus('error');
      setError(err?.error || 'Failed to load media library');
    }
  }, [brandId, filter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('File too large. Maximum size is 50 MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const token = localStorage.getItem('mpp_token');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('brandId', brandId);

      const res = await fetch(`${API_BASE}/api/customer/media/upload`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: fd
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      await fetchMedia();
    } catch (err) {
      console.error('[MediaLibrary] upload error:', err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSelect = (item) => {
    setSelectedId(item.id);
    onSelectAsset?.(item);
  };

  const filteredItems = items.filter(item =>
    (item.name || item.filename || '').toLowerCase().includes(search.toLowerCase())
  );

  if (status === 'no-brand') return <NoBrandState />;

  return (
    <div id="tab-media" className="animate__animated animate__fadeIn">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-0">Media Library</h5>
          <p className="extra-small text-muted mb-0">Upload and manage brand assets</p>
        </div>
        <button
          className="btn-pilot btn-sm d-flex align-items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !brandId}
        >
          {uploading
            ? <><span className="spinner-border spinner-border-sm"></span> Uploading…</>
            : <><Upload size={14} /> Upload</>}
        </button>
      </div>

      {uploadError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 small">
          <AlertCircle size={14} />
          {uploadError}
          <button className="btn-close ms-auto btn-close-sm" onClick={() => setUploadError(null)} />
        </div>
      )}

      <div className="card-workspace p-3">
        <div className="d-flex justify-content-between mb-4 align-items-center flex-wrap gap-2">
          <div className="d-flex gap-1">
            {['all', 'image', 'video'].map(f => (
              <button
                key={f}
                className={`btn-grey btn-sm px-3 text-capitalize${filter === f ? ' media-filter-active' : ''}`}
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
              placeholder="Search assets…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn p-0 text-muted" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {status === 'loading' && <LoadingIndicator />}
        {status === 'error'   && <ErrorState message={error} onRetry={fetchMedia} />}
        {status === 'empty'   && <EmptyState onUpload={() => fileInputRef.current?.click()} />}

        {status === 'success' && (
          filteredItems.length === 0 ? (
            <div className="text-center py-5 text-muted extra-small">
              No assets match your search.
            </div>
          ) : (
            <>
              <div className="media-grid">
                {filteredItems.map(item => {
                  const previewUrl = getPreviewUrl(item);
                  const isSelected = selectedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`media-card cursor-pointer${isSelected ? ' media-card--selected' : ''}`}
                      onClick={() => handleSelect(item)}
                      title={item.name || item.filename}
                    >
                      <div className="media-card-thumb">
                        {previewUrl && item.type === 'image' ? (
                          <img src={previewUrl} alt={item.name} className="media-thumb-img" />
                        ) : (
                          <div className="media-thumb-icon">
                            {getIcon(item.type)}
                          </div>
                        )}
                      </div>
                      <div className="extra-small fw-bold text-truncate px-1 text-main mt-1" title={item.name || item.filename}>
                        {item.name || item.filename || 'Untitled'}
                      </div>
                      <div className="extra-small text-muted px-1 mb-1">
                        {item.size_label || (item.size ? `${Math.round(item.size / 1024)} KB` : '')}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-4">
                <p className="extra-small text-muted">
                  {filteredItems.length} asset{filteredItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )
        )}
      </div>

      <style>{`
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
        }
        .media-card {
          border-radius: 10px;
          border: 2px solid transparent;
          background: #f8fafc;
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
          overflow: hidden;
        }
        .media-card:hover { border-color: #bfdbfe; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.07); }
        .media-card--selected { border-color: var(--pilot-blue, #2563EB) !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .media-card-thumb {
          width: 100%; height: 90px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          overflow: hidden;
        }
        .media-thumb-img { width: 100%; height: 100%; object-fit: cover; }
        .media-thumb-icon { color: #94a3b8; }
        .media-filter-active { background: var(--pilot-blue, #2563EB) !important; color: white !important; border-color: var(--pilot-blue, #2563EB) !important; }
      `}</style>
    </div>
  );
}
