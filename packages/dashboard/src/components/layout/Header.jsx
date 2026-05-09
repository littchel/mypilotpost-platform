import React, { useState } from "react";
import { Bell, Mail, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { apiRequest } from "../../lib/api/client";

const Header = ({ activeBrand, user, logout, switchTab, notifications = [], growth = { points: 0, level: 1 } }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/api/customer/notifications/read-all', { method: 'POST' });
      // Force refresh of notification data via event
      window.dispatchEvent(new CustomEvent('refresh-data'));
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  return (
    <header>
      <div className="d-flex align-items-center gap-3">
        <h5 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>
          {activeBrand?.name || "No Brand Selected"}
        </h5>
        <span className="badge bg-pilot-light text-pilot" style={{ background: 'var(--pilot-blue-light)', color: 'var(--pilot-blue)' }}>
          Pro Plan
        </span>
      </div>

      <div className="d-flex align-items-center gap-4">
        
        {/* Notifications Dropdown */}
        <div className="dropdown position-relative">
          <div 
            className="p-2 rounded-3 hover-bg-light cursor-pointer position-relative transition-all"
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
          >
            <Mail size={20} className="text-muted" />
            {unreadCount > 0 && (
              <span 
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
                style={{ fontSize: '0.6rem', padding: '0.35em 0.5em', marginTop: '6px', marginLeft: '-4px' }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          {showNotifMenu && (
            <div 
              className="position-absolute end-0 mt-2 bg-white border rounded-4 shadow-lg p-0 overflow-hidden animate__animated animate__fadeInUp" 
              style={{ width: '320px', zIndex: 1000, border: '1px solid var(--border-subtle)' }}
            >
              <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">Notifications</h6>
                <span 
                  className="extra-small text-primary fw-bold cursor-pointer hover-underline"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </span>
              </div>
              <div className="max-h-300 overflow-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3 border-bottom hover-bg-light cursor-pointer transition-all ${!n.read ? 'bg-pilot-light' : ''}`}>
                      <div className="d-flex gap-3">
                        <div className={`p-2 rounded-3 h-fit ${
                          n.type === 'success' ? 'bg-success bg-opacity-10 text-success' :
                          n.type === 'warning' ? 'bg-warning bg-opacity-10 text-warning' :
                          'bg-primary bg-opacity-10 text-primary'
                        }`}>
                          {n.type === 'success' ? <CheckCircle size={16} /> : n.type === 'warning' ? <AlertCircle size={16} /> : <Bell size={16} />}
                        </div>
                        <div>
                          <div className={`small mb-1 ${!n.read ? 'fw-bold text-main' : 'text-muted'}`}>{n.message}</div>
                          <div className="extra-small text-muted">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div 
                className="p-2 text-center bg-white border-top cursor-pointer hover-text-primary transition-all"
                onClick={() => {
                  switchTab('notifications');
                  setShowNotifMenu(false);
                }}
              >
                <span className="extra-small fw-bold">View all notifications</span>
              </div>
            </div>
          )}
        </div>

        <div className="dropdown">
          <div 
            className="d-flex align-items-center gap-2 cursor-pointer"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '32px', height: '32px', background: 'var(--pilot-blue)', color: 'white', fontSize: '0.8rem' }}
            >
              {user?.email?.[0].toUpperCase() || "U"}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-bold small line-height-1" style={{ fontSize: '0.8rem' }}>
                {user?.email?.split('@')[0]}
                <span className="ms-2 badge rounded-pill bg-pilot-blue text-white" style={{ fontSize: '0.6rem', verticalAlign: 'middle' }}>
                  Lvl {growth.level} • {growth.points} pts
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Account Owner</div>
            </div>
            <i className={`fas fa-chevron-${showUserMenu ? 'up' : 'down'} text-muted small`}></i>
          </div>

          {showUserMenu && (
            <div 
              className="position-absolute end-0 mt-2 bg-white border rounded shadow-sm p-2" 
              style={{ minWidth: '200px', zIndex: 1000, border: '1px solid var(--border-subtle)' }}
            >
              <div className="px-2 py-1 mb-1 border-bottom">
                <div className="fw-bold small">{user?.email}</div>
                <div className="text-muted extra-small" style={{ fontSize: '0.6rem' }}>Organization Admin</div>
              </div>
              <a href="#" className="nav-link py-1 px-2 small">
                <i className="fas fa-user-circle me-2"></i> Profile Settings
              </a>
              <a href="#" className="nav-link py-1 px-2 small">
                <i className="fas fa-shield-alt me-2"></i> Security
              </a>
              <hr className="my-1" />
              <button 
                className="btn btn-link nav-link py-1 px-2 small text-danger text-decoration-none w-100 text-start"
                onClick={logout}
              >
                <i className="fas fa-sign-out-alt me-2"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
