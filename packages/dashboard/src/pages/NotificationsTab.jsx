import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, Settings, Search, CheckCircle, AlertCircle, 
  Info, CreditCard, Zap, MoreVertical, Trash2, MailOpen
} from 'lucide-react';
import { apiSafeFetch } from "../lib/api/client";

/**
 * Production-Hardened Notifications Tab
 * Implements strict status modeling: loading | empty | error | success
 */

// ── Shared UI States ──────────────────────────────────────────────────────

const LoadingIndicator = () => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn h-100">
    <div className="spinner-border spinner-border-sm mb-3 text-primary" role="status"></div>
    <span className="extra-small fw-medium">Syncing notifications...</span>
  </div>
);

const EmptyState = () => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-muted animate__animated animate__fadeIn h-100 text-center">
    <Bell size={48} strokeWidth={1} className="mb-3 opacity-20" />
    <h6 className="fw-bold text-main">All caught up!</h6>
    <p className="extra-small mb-0">No new notifications at this time.</p>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-5 text-danger animate__animated animate__fadeIn h-100 text-center">
    <AlertCircle size={32} strokeWidth={1} className="mb-3 opacity-50" />
    <span className="extra-small fw-bold mb-3">Unable to load notifications</span>
    <button 
      className="btn btn-sm btn-outline-danger px-4 py-2 rounded-pill fw-bold" 
      style={{ fontSize: '0.65rem' }}
      onClick={onRetry}
    >
      Retry
    </button>
  </div>
);

const NotificationsTab = () => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [notifications, setNotifications] = useState({ status: 'loading', data: [] });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchNotifications = useCallback(async () => {
    setNotifications(prev => ({ ...prev, status: 'loading' }));
    const res = await apiSafeFetch(`/api/customer/notifications?category=${filter}`);
    setNotifications(res);
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const categories = [
    { id: 'all', label: 'All', icon: <Bell size={14} /> },
    { id: 'system', label: 'System', icon: <Settings size={14} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={14} /> },
    { id: 'intelligence', label: 'Intelligence', icon: <Zap size={14} /> },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle size={14} /> }
  ];

  const filteredData = (notifications.data || []).filter(msg => 
    msg.title?.toLowerCase().includes(search.toLowerCase()) ||
    msg.preview?.toLowerCase().includes(search.toLowerCase())
  );

  const activeMessage = selectedMessage || (filteredData.length > 0 ? filteredData[0] : null);

  return (
    <div className="container-fluid p-0 animate__animated animate__fadeIn" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="d-flex h-100">
        
        {/* Left Panel: List View */}
        <div className="col-md-5 col-lg-4 border-right d-flex flex-column bg-white border-subtle">
          <div className="p-4 border-bottom border-subtle">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0 text-main" style={{ fontSize: '1rem' }}>Notifications</h4>
              <button className="btn btn-grey border extra-small fw-bold px-3 py-2 rounded-pill" style={{ fontSize: '0.65rem' }}>
                Mark all as read
              </button>
            </div>

            <div className="input-group bg-surface-secondary rounded-pill border-0 px-3 py-1 mb-3">
              <span className="input-group-text bg-transparent border-0 text-muted p-0 pe-2">
                <Search size={16} />
              </span>
              <input 
                type="text" 
                className="form-control bg-transparent border-0 extra-small ps-0" 
                placeholder="Search notifications..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: '0.75rem' }}
              />
            </div>

            <div className="d-flex gap-2 overflow-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setFilter(cat.id)}
                  className={`btn extra-small fw-bold px-3 py-2 rounded-pill whitespace-nowrap transition-all ${filter === cat.id ? 'btn-primary' : 'btn-grey border'}`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {notifications.status === 'loading' ? <LoadingIndicator /> :
             notifications.status === 'empty' || filteredData.length === 0 ? <EmptyState /> :
             notifications.status === 'error' ? <ErrorState onRetry={fetchNotifications} /> : 
             filteredData.map(msg => (
              <div 
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-4 border-bottom cursor-pointer transition-all ${activeMessage?.id === msg.id ? 'bg-primary-light' : 'hover-bg-light'}`}
                style={{ 
                  borderBottom: '1px solid var(--border-subtle)',
                  borderLeft: msg.unread ? '4px solid var(--pilot-blue)' : '4px solid transparent'
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <span className={`extra-small fw-bold text-uppercase ${msg.type === 'success' ? 'text-success' : msg.type === 'warning' ? 'text-warning' : 'text-primary'}`} style={{ fontSize: '0.65rem' }}>
                    {msg.category}
                  </span>
                  <span className="extra-small text-muted" style={{ fontSize: '0.65rem' }}>{msg.time}</span>
                </div>
                <h6 className={`small mb-1 ${msg.unread ? 'fw-bold text-main' : 'text-muted'}`} style={{ fontSize: '0.85rem' }}>{msg.title}</h6>
                <p className="extra-small text-muted mb-0 text-truncate" style={{ fontSize: '0.75rem' }}>{msg.preview}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Detail View */}
        <div className="flex-1 bg-surface-secondary d-flex flex-column">
          {activeMessage ? (
            <>
              <div className="p-4 bg-white border-bottom d-flex justify-content-between align-items-center border-subtle">
                <div className="d-flex align-items-center gap-3">
                  <div className={`p-3 rounded-4 ${
                    activeMessage.type === 'success' ? 'bg-success bg-opacity-10 text-success' : 
                    activeMessage.type === 'warning' ? 'bg-warning bg-opacity-10 text-warning' : 
                    'bg-primary bg-opacity-10 text-primary'
                  }`}>
                    {activeMessage.type === 'success' ? <CheckCircle size={24} /> : 
                     activeMessage.type === 'warning' ? <AlertCircle size={24} /> : 
                     <Info size={24} />}
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-main" style={{ fontSize: '1rem' }}>{activeMessage.title}</h5>
                    <p className="extra-small text-muted mb-0" style={{ fontSize: '0.65rem' }}>{activeMessage.time} • {activeMessage.category?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-grey border p-2 rounded-3 text-muted shadow-sm"><MailOpen size={18} /></button>
                  <button className="btn btn-grey border p-2 rounded-3 text-muted shadow-sm"><Trash2 size={18} /></button>
                  <button className="btn btn-grey border p-2 rounded-3 text-muted shadow-sm"><MoreVertical size={18} /></button>
                </div>
              </div>

              <div className="p-5 flex-1 overflow-auto">
                <div className="card-workspace p-5 mx-auto shadow-sm animate__animated animate__fadeInUp" style={{ maxWidth: '700px' }}>
                  <div className="mb-4 d-flex justify-content-between align-items-center">
                    <div className="badge bg-surface-secondary text-muted border border-subtle px-3 py-2 rounded-pill extra-small" style={{ fontSize: '0.65rem' }}>
                      Official System Message
                    </div>
                    <div className="extra-small text-muted" style={{ fontSize: '0.65rem' }}>ID: #MSG-{activeMessage.id}</div>
                  </div>
                  
                  <h3 className="fw-bold text-main mb-4" style={{ letterSpacing: '-0.03em', fontSize: '1.5rem' }}>{activeMessage.title}</h3>
                  
                  <div className="text-main leading-relaxed mb-5" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {activeMessage.fullText || activeMessage.preview}
                  </div>

                  {activeMessage.category === 'billing' && (
                    <div className="p-4 bg-pilot-blue-light bg-opacity-10 rounded-4 border border-pilot-blue border-opacity-20 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="small fw-bold text-primary mb-1" style={{ fontSize: '0.85rem' }}>Upgrade your account</div>
                        <div className="extra-small text-muted" style={{ fontSize: '0.75rem' }}>Keep your brand automation running 24/7.</div>
                      </div>
                      <button className="btn btn-primary extra-small fw-bold px-4 py-2">Go to Billing</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
              <Bell size={48} strokeWidth={1} className="mb-3" />
              <p className="small" style={{ fontSize: '0.85rem' }}>Select a notification to view details</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .bg-primary-light { background: #eff6ff; }
        .border-subtle { border-color: var(--border-subtle) !important; }
      `}</style>
    </div>
  );
};

export default NotificationsTab;
