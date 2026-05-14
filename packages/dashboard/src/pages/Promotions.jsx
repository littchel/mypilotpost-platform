import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  Gift, 
  Copy, 
  Share2, 
  CheckCircle, 
  Clock, 
  Zap, 
  ExternalLink,
  Mail,
  MessageCircle,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "../lib/api/client";

const Promotions = () => {
  const [loading, setLoading] = useState(true);
  const [promoStatus, setPromoStatus] = useState(null);
  const [copying, setCopying] = useState(false);

  const fetchPromoData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiRequest("/api/customer/promotions");
      setPromoStatus(resp.status);
    } catch (err) {
      console.error("Failed to load promotion data", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchPromoData(), 0);
    return () => clearTimeout(timer);
  }, [fetchPromoData]);

  const handleCopy = () => {
    const link = `https://mypilotpost.com/signup?ref=${promoStatus?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const msg = encodeURIComponent(`I’m using MyPilotPost to manage content and grow faster. Try it free: https://mypilotpost.com/signup?ref=${promoStatus?.referral_code}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  const hasReferrals = promoStatus?.funnel?.sent > 0;
  const monthlyCount = promoStatus?.monthly?.count || 0;
  const monthlyLimit = promoStatus?.monthly?.limit || 10;
  const progressPercent = (monthlyCount / monthlyLimit) * 100;

  return (
    <div className="promotions-container py-4">
      <div className="promo-header mb-5 text-center">
        <div className="zap-badge mb-3">
          <Zap size={24} fill="currentColor" />
          <span>Growth Loop</span>
        </div>
        <h1 className="fw-900 mb-2">Invite & Earn PRO Access</h1>
        <p className="text-muted mx-auto" style={{ maxWidth: '600px' }}>
          Growing a brand is better together. Invite your network to MyPilotPost, and when they start posting, you both get 7 days of Professional features for free.
        </p>
      </div>

      <div className="row g-4">
        {/* Referral Card */}
        <div className="col-lg-7">
          <div className="glass-card p-4 h-100">
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <Share2 size={20} className="text-primary" />
              Your Referral Link
            </h5>
            
            <div className="referral-input-wrapper p-3 rounded-4 mb-4 border d-flex align-items-center gap-3">
               <div className="ref-link-text flex-grow-1 text-truncate fw-bold text-dark">
                  mypilotpost.com/signup?ref={promoStatus?.referral_code}
               </div>
               <button 
                className={`btn btn-sm ${copying ? 'btn-success' : 'btn-primary'} rounded-pill px-4 fw-bold`} 
                onClick={handleCopy}
               >
                {copying ? <><CheckCircle size={14} className="me-2" /> Copied</> : <><Copy size={14} className="me-2" /> Copy Link</>}
               </button>
            </div>

            <div className="share-actions d-grid grid-template-columns-3 gap-3">
               <button className="social-share-btn whatsapp" onClick={shareViaWhatsApp}>
                  <MessageCircle size={20} />
                  <span>WhatsApp</span>
               </button>
               <button className="social-share-btn email">
                  <Mail size={20} />
                  <span>Email</span>
               </button>
               <button className="social-share-btn telegram">
                  <ExternalLink size={20} />
                  <span>Twitter / X</span>
               </button>
            </div>

            <div className="p-3 bg-light rounded-4 mt-4">
               <div className="d-flex align-items-center gap-3">
                  <div className="shield-icon text-success">
                     <ShieldCheck size={24} />
                  </div>
                  <div className="shield-text">
                     <div className="fw-bold small">Verified Referral Program</div>
                     <div className="x-small text-muted">Rewards are granted automatically once your friend schedules their first post.</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="col-lg-5">
           <div className="row g-4 h-100">
              <div className="col-12">
                 <div className="glass-card p-4 gradient-bg-blue text-white h-100">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                       <div className="gift-icon-big">
                          <Gift size={48} opacity={0.3} />
                       </div>
                       <TrendingUp size={24} opacity={0.5} />
                    </div>
                    <div className="stat-unit mb-3">
                       <div className="stat-label x-small text-uppercase fw-bold opacity-75">Rewards Earned</div>
                       <div className="stat-value fw-900 display-5">+{promoStatus?.rewards_earned || 0} Days</div>
                    </div>
                    <p className="small mb-0 opacity-75">
                       You've unlocked {Math.floor(promoStatus?.rewards_earned / 7)} premium weeks through referrals.
                    </p>
                 </div>
              </div>
              <div className="col-12">
                 <div className="glass-card p-4 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                       <div className="stat-label x-small text-uppercase fw-bold text-muted">Monthly Progress</div>
                       <div className="fw-bold text-primary small">{monthlyCount} / {monthlyLimit}</div>
                    </div>
                    <div className="progress rounded-pill mb-3" style={{ height: '10px' }}>
                       <div className="progress-bar bg-primary rounded-pill transition-all" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="d-flex align-items-center gap-2 p-2 rounded-3 bg-light border x-small">
                        <AlertCircle size={14} className="text-primary" />
                        <span className="text-muted">You have <b>{monthlyLimit - monthlyCount}</b> reward slots remaining this month.</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Funnel Analytics (Optional Detail) */}
        {!hasReferrals ? (
          <div className="col-12">
             <div className="glass-card p-5 text-center bg-light border-dashed">
                <div className="mb-4 d-inline-flex p-4 rounded-circle bg-white shadow-sm text-primary">
                    <Users size={48} />
                </div>
                <h3 className="fw-bold">No Referrals Yet</h3>
                <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px' }}>
                    Share your link with colleagues or friends to start earning free Professional features.
                </p>
                <div className="d-flex justify-content-center gap-3">
                    <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={handleCopy}>
                        <Copy size={16} className="me-2" /> Copy Referral Link
                    </button>
                    <button className="btn btn-outline-primary rounded-pill px-4 fw-bold" onClick={shareViaWhatsApp}>
                        <MessageCircle size={16} className="me-2" /> Share on WhatsApp
                    </button>
                </div>
             </div>
          </div>
        ) : (
          <div className="col-12">
            <div className="glass-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold m-0">Referral Activity</h5>
                  <div className="d-flex gap-4 x-small text-uppercase fw-bold text-muted">
                      <div>Sent: <span className="text-dark">{promoStatus?.funnel?.sent}</span></div>
                      <div>Joined: <span className="text-dark">{promoStatus?.funnel?.signed_up}</span></div>
                      <div>Active: <span className="text-dark">{promoStatus?.funnel?.completed}</span></div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-borderless align-middle m-0">
                      <thead className="text-muted small text-uppercase">
                        <tr>
                            <th>User (Masked)</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th className="text-end">Reward</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promoStatus?.list?.map((ref, idx) => {
                            const maskedEmail = ref.email.split('@')[0].slice(0, 1) + "***@" + ref.email.split('@')[1];
                            return (
                              <tr key={idx} className="border-bottom-light">
                                <td className="fw-bold text-dark p-3">
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="avatar-circle-sm bg-primary bg-opacity-10 text-primary fw-bold">
                                          {ref.email[0].toUpperCase()}
                                      </div>
                                      {maskedEmail}
                                    </div>
                                </td>
                                <td>
                                    <div className="d-flex flex-column">
                                        <span className={`status-badge ${ref.status}`}>
                                          {ref.status === 'rewarded' && <CheckCircle size={12} className="me-1" />}
                                          {(ref.status === 'pending' || ref.status === 'completed') && <Clock size={12} className="me-1" />}
                                          {ref.status}
                                        </span>
                                        {ref.status === 'pending' && (
                                            <span className="x-small text-muted mt-1 opacity-75">
                                                Reward unlocks when they post
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="text-muted small">
                                    {new Date(ref.joined).toLocaleDateString()}
                                </td>
                                <td className="text-end fw-bold text-success">
                                    {ref.status === 'rewarded' ? '+7 Days' : '--'}
                                </td>
                              </tr>
                            );
                        })}
                      </tbody>
                  </table>
                </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .promotions-container {
          animation: fadeIn 0.5s ease-out;
        }

        .fw-900 { font-weight: 900; }
        
        .zap-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #eff6ff;
          color: #2563eb;
          padding: 6px 16px;
          border-radius: 100px;
          font-weight: 800;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 24px;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        }

        .gradient-bg-blue {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
        }

        .social-share-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          background: white;
          transition: all 0.2s;
          cursor: pointer;
        }

        .social-share-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -5px rgba(0, 0, 0, 0.1);
          border-color: #2563eb;
          color: #2563eb;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          width: fit-content;
        }

        .status-badge.rewarded { background: #dcfce7; color: #15803d; }
        .status-badge.completed { background: #dcfce7; color: #15803d; }
        .status-badge.pending { background: #fef9c3; color: #a16207; }

        .border-bottom-light { border-bottom: 1px solid #f1f5f9; }
        .border-dashed { border: 2px dashed #cbd5e1; }

        .avatar-circle-sm {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .transition-all { transition: all 0.4s ease; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Promotions;
