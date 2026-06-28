import React, { useState, useRef, useEffect } from "react";
import { Bell, Mail, CheckCircle, AlertCircle, ChevronDown, Settings, CreditCard, Trophy, Shield, Lock, LogOut } from "lucide-react";
import { apiRequest } from "../../lib/api/client";

const Header = ({ activeBrand, user, logout, switchTab, notifications = [], unreadCount = 0, growth = { points: 0, level: 1 } }) => {
  const [showUserMenu, setShowUserMenu]   = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const userMenuRef  = useRef(null);
  const notifMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current  && !userMenuRef.current.contains(e.target))  setShowUserMenu(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) setShowNotifMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/api/customer/notifications/read-all', { method: 'POST' });
      window.dispatchEvent(new CustomEvent('refresh-data'));
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  const goTo = (tab, subtab) => {
    setShowUserMenu(false);
    if (subtab) {
      switchTab(tab);
      setTimeout(() => window.dispatchEvent(new CustomEvent('settings-subtab', { detail: subtab })), 50);
    } else {
      switchTab(tab);
    }
  };

  const initials = (user?.email?.[0] || 'U').toUpperCase();
  const displayName = user?.first_name || user?.email?.split('@')[0] || 'Account';

  return (
    <header>
      <div className="d-flex align-items-center gap-3">
        <h5 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>
          {activeBrand?.name || "No Brand Selected"}
        </h5>
        {activeBrand && (
          <span className="badge" style={{ background: 'var(--pilot-blue-light)', color: 'var(--pilot-blue)', fontSize: '0.65rem', fontWeight: 700 }}>
            {growth?.plan || 'Pro Plan'}
          </span>
        )}
      </div>

      <div className="d-flex align-items-center gap-3">

        {/* Notifications */}
        <div className="position-relative" ref={notifMenuRef}>
          <button
            className="btn p-2 rounded-3 position-relative"
            style={{ background: 'none', border: 'none' }}
            onClick={() => { setShowNotifMenu(v => !v); setShowUserMenu(false); }}
          >
            <Mail size={20} className="text-muted" />
            {unreadCount > 0 && (
              <span
                className="position-absolute badge rounded-pill bg-danger border border-white"
                style={{ fontSize: '0.6rem', padding: '0.35em 0.5em', top: 4, right: 4 }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-4 shadow-lg overflow-hidden animate__animated animate__fadeInUp"
              style={{ width: 320, zIndex: 1000, border: '1px solid var(--border-subtle)', top: '100%' }}
            >
              <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">Notifications</h6>
                <button className="btn btn-link btn-sm text-primary p-0 fw-bold text-decoration-none" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3 border-bottom ${!n.read ? 'bg-pilot-light' : ''}`} style={{ cursor: 'default' }}>
                      <div className="d-flex gap-3">
                        <div className={`p-2 rounded-3 h-fit ${n.type === 'success' ? 'bg-success bg-opacity-10 text-success' : n.type === 'warning' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-primary bg-opacity-10 text-primary'}`}>
                          {n.type === 'success' ? <CheckCircle size={16} /> : n.type === 'warning' ? <AlertCircle size={16} /> : <Bell size={16} />}
                        </div>
                        <div>
                          <div className={`small mb-0 ${!n.read ? 'fw-bold' : 'text-muted'}`} style={{ color: 'var(--text-main)' }}>{n.title || "System Message"}</div>
                          <div className="extra-small text-muted mb-1">{n.message}</div>
                          <div className="extra-small text-muted" style={{ fontSize: '0.65rem' }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                className="d-block w-100 p-2 text-center bg-white border-top extra-small fw-bold text-primary"
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={() => { switchTab('notifications'); setShowNotifMenu(false); }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        {/* Account Dropdown */}
        <div className="position-relative" ref={userMenuRef}>
          <button
            className="d-flex align-items-center gap-2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
            onClick={() => { setShowUserMenu(v => !v); setShowNotifMenu(false); }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
              style={{ width: 32, height: 32, background: 'var(--pilot-blue)', color: 'white', fontSize: '0.8rem' }}
            >
              {initials}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-bold" style={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                Lvl {growth?.level || 1} · {growth?.points || 0} pts
              </div>
            </div>
            <ChevronDown size={14} className="text-muted d-none d-md-block" />
          </button>

          {showUserMenu && (
            <div
              className="position-absolute end-0 mt-2 bg-white rounded-4 shadow-lg overflow-hidden animate__animated animate__fadeInUp"
              style={{ minWidth: 220, zIndex: 1000, border: '1px solid var(--border-subtle)', top: '100%' }}
            >
              {/* Account identity */}
              <div className="px-4 py-3 border-bottom bg-light">
                <div className="fw-bold small">{user?.email}</div>
                <div className="text-muted" style={{ fontSize: '0.65rem' }}>Account Owner</div>
              </div>

              {/* Account nav items */}
              <div className="py-1">
                <button className="account-menu-item" onClick={() => goTo('settings', 'Branding')}>
                  <Settings size={15} />
                  <span>Settings</span>
                </button>
                <button className="account-menu-item" onClick={() => goTo('settings', 'Security')}>
                  <Lock size={15} />
                  <span>Security</span>
                </button>
                <button className="account-menu-item" onClick={() => goTo('settings', 'Privacy & Data')}>
                  <Shield size={15} />
                  <span>Privacy &amp; Data</span>
                </button>
              </div>

              <div className="border-top border-bottom py-1">
                <button className="account-menu-item" onClick={() => goTo('billing')}>
                  <CreditCard size={15} />
                  <span>Billing &amp; Plan</span>
                </button>
                <button className="account-menu-item" onClick={() => goTo('growth')}>
                  <Trophy size={15} />
                  <span>Rewards</span>
                </button>
              </div>

              <div className="py-1">
                <button className="account-menu-item account-menu-item--danger" onClick={logout}>
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .account-menu-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 8px 16px;
          background: none; border: none; cursor: pointer;
          font-size: 0.85rem; font-weight: 500; color: var(--text-main, #0f172a);
          text-align: left; transition: background 0.12s;
        }
        .account-menu-item:hover { background: var(--bg-body, #f8fafc); }
        .account-menu-item--danger { color: #dc2626; }
        .account-menu-item--danger:hover { background: #fff1f2; }
      `}</style>
    </header>
  );
};

export default Header;
