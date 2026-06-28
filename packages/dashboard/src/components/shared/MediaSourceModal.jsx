import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const MediaSourceModal = ({ isOpen, onClose, onSelect, activeBrand, socialContent }) => {
  const { apiUrl } = useAuth();
  const [activeSource, setActiveSource] = useState('library'); // library, suggestions, upload, drive, dropbox
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (activeSource === 'library') {
        fetchLibrary();
      } else if (activeSource === 'suggestions') {
        fetchSuggestions();
      } else if (activeSource === 'drive' || activeSource === 'dropbox') {
        fetchCloudFiles(activeSource === 'drive' ? 'google-drive' : 'dropbox');
      }
    }
  }, [isOpen, activeSource]);

  const fetchLibrary = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch(`${apiUrl}/api/customer/media/library`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      console.error("Failed to fetch media library", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    setErrorStatus(null);
    setResults([]);
    try {
      const res = await fetch(`${apiUrl}/api/customer/media/suggestions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          platform: activeBrand?.primary_platform || 'instagram',
          contentType: 'blog',
          title: socialContent || '',
          brand: activeBrand?.name || '',
          industry: activeBrand?.industry || '',
        })
      });
      const data = await res.json();
      const all = [
        ...(data.featured || []),
        ...(data.recommended || []),
        ...(data.more || [])
      ];
      setResults(all);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCloudFiles = async (provider) => {
    setLoading(true);
    setErrorStatus(null);
    setResults([]);
    try {
      const res = await fetch(`${apiUrl}/api/customer/media/${provider}/list`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      
      if (data.error === "RECONNECT_REQUIRED") {
        setErrorStatus("RECONNECT_REQUIRED");
      } else if (!res.ok) {
        throw new Error(data.error || "Failed to fetch cloud files");
      } else {
        setResults(data.items || []);
      }
    } catch (err) {
      console.error(`Failed to fetch ${provider} files`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/customer/media/upload`, {
        method: 'POST',
        headers: { 
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      
      onSelect({
        id: data.id,
        preview_url: data.preview_url,
        provider: 'direct'
      });
      onClose();
    } catch (err) {
      console.error("Failed to upload image", err);
      alert("Failed to upload image: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = async (item) => {
    if (activeSource === 'library') {
      onSelect(item);
      onClose();
      return;
    }

    setLoading(true);
    const provider = activeSource === 'suggestions' ? 'pexels' : (activeSource === 'drive' ? 'google-drive' : (activeSource === 'dropbox' ? 'dropbox' : activeSource));
    const endpoint = `/api/customer/media/from-${provider}`;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          external_id: item.external_id || item.id,
          file_id: item.external_id || item.id,
          path: item.external_id || item.id,
          preview_url: item.preview_url || item.url,
          type: item.mime_type?.startsWith('video') ? 'video' : 'image'
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Import failed");

      onSelect({ 
        id: data.media_id, 
        preview_url: item.preview_url || item.url,
        provider: item.provider || activeSource 
      });
      onClose();
    } catch (err) {
      console.error("Failed to import media", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
          <div className="modal-header border-0 pb-0 pe-4 pt-4">
            <h5 className="modal-title fw-bold">Select Media Source</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4 pt-2">
            <div className="d-flex gap-2 mb-4 border-bottom pb-3 mt-3 overflow-auto">
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'library' ? 'active' : ''}`}
                onClick={() => { setActiveSource('library'); setResults([]); }}
              >
                <i className="fas fa-images me-2 text-primary"></i> Brand Library
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'suggestions' ? 'active' : ''}`}
                onClick={() => { setActiveSource('suggestions'); setResults([]); }}
              >
                <i className="fas fa-magic me-2 text-info"></i> AI Suggestions
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'upload' ? 'active' : ''}`}
                onClick={() => { setActiveSource('upload'); setResults([]); }}
              >
                <i className="fas fa-cloud-upload-alt me-2 text-success"></i> Upload Image
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'drive' ? 'active' : ''}`}
                onClick={() => { setActiveSource('drive'); setResults([]); }}
              >
                <i className="fab fa-google-drive me-2 text-success"></i> Google Drive
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'dropbox' ? 'active' : ''}`}
                onClick={() => { setActiveSource('dropbox'); setResults([]); }}
              >
                <i className="fab fa-dropbox me-2 text-info"></i> Dropbox
              </button>
            </div>

            {activeSource === 'upload' && !loading && (
              <div 
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('media-modal-upload-input').click()}
              >
                <i className="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                <h5 className="fw-bold">Drag & Drop Image Here</h5>
                <p className="small text-muted mb-3">Or click to browse files from your computer</p>
                <input 
                  id="media-modal-upload-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
              </div>
            )}

            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <div className="mt-2 text-muted small">Loading media...</div>
              </div>
            )}

            {!loading && errorStatus === 'RECONNECT_REQUIRED' && (
              <div className="text-center py-5">
                <i className="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                <h6 className="fw-bold">Connection Expired</h6>
                <p className="small text-muted mb-4">Please reconnect your {activeSource} account in Settings to browse files.</p>
                <a href="/settings/integrations" className="btn-pilot px-4">Go to Settings</a>
              </div>
            )}

            {!loading && !errorStatus && results.length === 0 && (activeSource === 'drive' || activeSource === 'dropbox' || activeSource === 'library' || activeSource === 'suggestions') && (
              <div className="text-center py-5 text-muted small">
                {activeSource === 'library' ? (
                   <p>Your library is empty. Import media from suggestions or cloud sources.</p>
                ) : activeSource === 'suggestions' ? (
                   <p>No automatic suggestions found matching your article topic.</p>
                ) : (
                   <p>No compatible images found in your {activeSource} folder.</p>
                )}
              </div>
            )}

            {!loading && !errorStatus && results.length > 0 && (
              <div className="row g-3 overflow-auto" style={{ maxHeight: '380px' }}>
                {results.map((item) => (
                  <div key={item.id || item.external_id} className="col-md-3">
                    <div className="position-relative hover-lift" onClick={() => handleSelectResult(item)}>
                      <img 
                        src={item.thumbnail_url || item.preview_url || item.url} 
                        className="img-fluid rounded-3 border" 
                        style={{ height: '100px', width: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                        alt="Asset" 
                      />
                      <div className="position-absolute top-0 start-0 p-1">
                        <span className="badge bg-dark opacity-75 x-small uppercase" style={{ fontSize: '9px' }}>
                          {item.provider || activeSource}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaSourceModal;
