import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const MediaSourceModal = ({ isOpen, onClose, onSelect, activeBrand, socialContent }) => {
  const { apiUrl } = useAuth();
  const [activeSource, setActiveSource] = useState('library'); // library, freepik, drive, dropbox
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (activeSource === 'library') {
        fetchLibrary();
      } else if (activeSource === 'freepik') {
        const query = socialContent ? socialContent.split(' ').slice(0, 3).join(' ') : (activeBrand?.name || '');
        setSearchQuery(query);
      } else if (activeSource === 'drive' || activeSource === 'dropbox') {
        fetchCloudFiles(activeSource === 'drive' ? 'google-drive' : 'dropbox');
      }
    }
  }, [isOpen, activeSource]);

  const [errorStatus, setErrorStatus] = useState(null);

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

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch(`${apiUrl}/api/customer/media/suggestions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      console.error("Failed to search media", err);
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

    // If result is from search or cloud, import it first
    setLoading(true);
    const provider = activeSource === 'drive' ? 'google-drive' : (activeSource === 'dropbox' ? 'dropbox' : 'freepik');
    const endpoint = `/api/customer/media/from-${provider}`;

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          external_id: item.external_id,
          file_id: item.external_id, // For Drive backward compat
          path: item.external_id,    // For Dropbox backward compat
          preview_url: item.preview_url,
          type: item.mime_type?.startsWith('video') ? 'video' : 'image'
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Import failed");

      // Return the full media asset metadata
      onSelect({ 
        id: data.media_id, 
        preview_url: item.preview_url,
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
                onClick={() => setActiveSource('library')}
              >
                <i className="fas fa-images me-2 text-primary"></i> Brand Library
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'freepik' ? 'active' : ''}`}
                onClick={() => setActiveSource('freepik')}
              >
                <i className="fas fa-search me-2 text-warning"></i> Freepik Search
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'drive' ? 'active' : ''}`}
                onClick={() => setActiveSource('drive')}
              >
                <i className="fab fa-google-drive me-2 text-success"></i> Google Drive
              </button>
              <button 
                className={`btn-grey px-3 whitespace-nowrap ${activeSource === 'dropbox' ? 'active' : ''}`}
                onClick={() => setActiveSource('dropbox')}
              >
                <i className="fab fa-dropbox me-2 text-info"></i> Dropbox
              </button>
            </div>

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

            {!loading && !errorStatus && results.length === 0 && (activeSource === 'drive' || activeSource === 'dropbox' || activeSource === 'library') && (
              <div className="text-center py-5 text-muted small">
                {activeSource === 'library' ? (
                   <p>Your library is empty. Import media from search or cloud sources.</p>
                ) : (
                   <p>No compatible images found in your {activeSource} folder.</p>
                )}
              </div>
            )}

            {!loading && !errorStatus && results.length > 0 && (
              <div className="row g-3">
                {results.map((item) => (
                  <div key={item.id || item.external_id} className="col-md-3">
                    <div className="position-relative hover-lift" onClick={() => handleSelectResult(item)}>
                      <img src={item.preview_url} className="img-fluid rounded-3 border" style={{ height: '100px', width: '100%', objectFit: 'cover', cursor: 'pointer' }} alt="Asset" />
                      <div className="position-absolute top-0 start-0 p-1">
                          <span className="badge bg-dark opacity-75 x-small uppercase">{item.provider || activeSource}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !errorStatus && activeSource === 'freepik' && results.length === 0 && (
              <div>
                <div className="d-flex gap-2 mb-4">
                  <input 
                    type="text" 
                    className="input-pill flex-grow-1" 
                    placeholder="Search smart images..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button className="btn-pilot px-4" onClick={handleSearch}>
                    <i className="fas fa-search"></i>
                  </button>
                </div>
                <div className="text-center py-5 text-muted small">
                  <p>Search for millions of high-quality stock images from Freepik.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaSourceModal;
