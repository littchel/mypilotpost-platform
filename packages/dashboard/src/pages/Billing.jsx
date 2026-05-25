import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Zap, 
  Shield, 
  Check, 
  ArrowRight, 
  AlertCircle,
  Activity,
  Award,
  Users,
  Layout,
  Gift,
  FileText
} from "lucide-react";
import { apiRequest } from "../lib/api/client";

const Billing = () => {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [usage, setUsage] = useState([]);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [planRes, usageRes] = await Promise.all([
        apiRequest("/api/customer/billing/plan"),
        apiRequest("/api/customer/billing/usage").catch(() => ({ usage: [] })),
      ]);
      setPlan(planRes.plan);
      setUsage(usageRes.usage || []);
    } catch (err) {
      console.error("Failed to fetch billing", err);
    } finally {
      setLoading(false);
    }
  };

  const trialDaysRemaining = (plan) => {
    if (!plan?.trial_ends_at) return null;
    const diff = new Date(plan.trial_ends_at) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleUpgrade = async (targetPlanId) => {
    if (targetPlanId === plan.id) return;
    setIsUpgrading(true);
    try {
      await apiRequest("/api/customer/billing/upgrade", {
        method: "POST",
        body: JSON.stringify({ plan_id: targetPlanId })
      });
      await fetchBillingData();
      alert(`Successfully switched to ${targetPlanId.toUpperCase()} plan!`);
    } catch (err) {
      alert(err.message || "Upgrade failed");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  if (!plan) return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <AlertCircle size={40} className="text-danger mb-3" />
      <h5 className="fw-bold">Unable to load billing data</h5>
      <p className="text-muted small">Please refresh the page or contact support.</p>
      <button className="btn btn-outline-primary mt-2" onClick={fetchBillingData}>Retry</button>
    </div>
  );

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: "0",
      description: "Ideal for individual brand managers.",
      features: [
        { text: "1 Brand Account", included: true },
        { text: "1 User Seat", included: true },
        { text: "Smart Social Scheduling", included: true },
        { text: "Campaign Containers", included: false },
        { text: "SEO Analysis Engine", included: false },
        { text: "Advanced Intelligence", included: false }
      ],
      cta: "Current Plan",
      featured: false
    },
    {
      id: "growth",
      name: "Growth",
      price: "499",
      description: "For growing brands and power users.",
      features: [
        { text: "5 Brand Accounts", included: true },
        { text: "3 User Seats", included: true },
        { text: "Campaign Strategy Engine", included: true },
        { text: "SEO Discovery Analysis", included: true },
        { text: "The Brain™ Intelligence", included: true },
        { text: "Agency Reporting", included: true }
      ],
      cta: "Upgrade to Growth",
      featured: true
    },
    {
      id: "pro",
      name: "Pro",
      price: "999",
      description: "Full power for serious agencies.",
      features: [
        { text: "25 Brand Accounts", included: true },
        { text: "5 User Seats", included: true },
        { text: "White-label Reporting", included: true },
        { text: "Custom Branding & Logos", included: true },
        { text: "Priority Strategic Support", included: true },
        { text: "Full Intelligence Suite", included: true }
      ],
      cta: "Go Pro",
      featured: false
    }
  ];

  return (
    <div className="billing-page p-4 p-lg-5 animate-fade-in">
      <div className="d-flex justify-content-between align-items-end mb-5">
        <div>
          <h1 className="display-5 fw-bold mb-2">Subscription & Usage</h1>
          <p className="text-muted lead">Manage your plan, see usage stats, and unlock strategic features.</p>
        </div>
        <div className="plan-badge">
           <span className={`badge rounded-pill px-4 py-2 fs-6 ${plan.id === 'starter' ? 'bg-light text-dark border' : 'bg-primary-light text-primary'}`}>
             <Zap size={14} className="me-2" />
             {plan.name} Plan
           </span>
        </div>
      </div>

      {/* Usage Gauges */}
      <div className="row g-4 mb-5">
        {usage.length > 0 ? usage.map((u, i) => (
          <div key={i} className="col-md-6 col-lg-4">
            <div className="glass-card p-4 h-100 border-0 shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="icon-box bg-blue-light text-blue rounded-3 p-3">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="mb-0 fw-bold">{u.label}</h4>
                  <p className="text-muted small mb-0">This billing period</p>
                </div>
              </div>
              <div className="usage-stat mb-2">
                <span className="fs-2 fw-bold">{u.used}</span>
                <span className="text-muted fs-5"> / {u.limit}</span>
              </div>
              <div className="progress rounded-pill mb-2" style={{ height: '8px' }}>
                <div
                  className={`progress-bar rounded-pill ${u.used / u.limit > 0.8 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${Math.min((u.used / u.limit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-muted x-small mb-0">{u.limit - u.used} remaining</p>
            </div>
          </div>
        )) : (
          <div className="col-12">
            <div className="glass-card p-4 text-muted text-center small">No usage data yet — start publishing to see your stats.</div>
          </div>
        )}

        <div className="col-lg-4">
          <div className="glass-card p-4 h-100 border-0 shadow-sm position-relative overflow-hidden bg-gradient-premium text-white">
            <div className="position-relative z-1">
              <h4 className="fw-bold mb-3">Subscription Status</h4>
              {plan.status === 'trial' ? (
                <>
                  <p className="mb-4 opacity-75">
                    Your trial ends in <b>{trialDaysRemaining(plan) ?? '—'} days</b>. Unlock full production mode today.
                  </p>
                  <button className="btn btn-white w-100 fw-bold" onClick={() => handleUpgrade('growth')}>Upgrade to Growth</button>
                </>
              ) : plan.status === 'trial_expired' ? (
                <>
                  <p className="mb-4 opacity-75">Your trial has expired. Choose a plan to continue.</p>
                  <button className="btn btn-white w-100 fw-bold" onClick={() => handleUpgrade('growth')}>Choose a Plan</button>
                </>
              ) : (
                <>
                  <p className="mb-4 opacity-75">Your <b>{plan.name}</b> subscription is active. Payments via Yoco.</p>
                  <button className="btn btn-outline-white w-100">View Invoices</button>
                </>
              )}
            </div>
            <Activity size={120} className="position-absolute opacity-10" style={{ right: -20, bottom: -20 }} />
          </div>
        </div>
      </div>

      {/* Referral Bridge (Added) */}
      <div className="row mb-5">
        <div className="col-12">
           <div className="glass-card p-4 d-flex align-items-center justify-content-between bg-primary-light border-primary border-opacity-10">
              <div className="d-flex align-items-center gap-4">
                 <div className="icon-box bg-white text-primary rounded-circle shadow-sm">
                    <Gift size={24} />
                 </div>
                 <div>
                    <h5 className="fw-bold mb-1">Earn Free Pro Time</h5>
                    <p className="text-muted small mb-0">Don't want to upgrade yet? Invite a friend and you both get +7 days of Pro for free.</p>
                 </div>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'promotions' }))}
                className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
              >
                 Open Promotions <ArrowRight size={16} className="ms-2" />
              </button>
           </div>
        </div>
      </div>

      {/* Plan Grid */}
      <div className="row g-4 align-items-stretch">
        {plans.map((p) => (
          <div key={p.id} className="col-lg-4">
            <div className={`plan-card glass-card p-4 h-100 d-flex flex-column ${p.featured ? 'border-primary border-2 shadow-lg' : 'border-0'}`}>
              {p.featured && (
                <div className="featured-label bg-primary text-white x-small fw-bold px-3 py-1 rounded-pill mb-3 w-fit-content">
                  MOST POPULAR
                </div>
              )}
              <h3 className="fw-bold">{p.name}</h3>
              <div className="price-display my-3 d-flex align-items-baseline">
                <span className="fs-1 fw-black">${p.price}</span>
                <span className="text-muted ms-2">/ month</span>
              </div>
              <p className="text-muted small mb-4">{p.description}</p>
              
              <div className="feature-list flex-grow-1 mb-4">
                {p.features.map((f, i) => (
                  <div key={i} className={`feature-item d-flex gap-2 mb-3 ${f.included ? '' : 'opacity-40'}`}>
                    {f.included ? (
                      <Check size={18} className="text-success flex-shrink-0" />
                    ) : (
                      <Check size={18} className="text-muted flex-shrink-0" />
                    )}
                    <span className="small">{f.text}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => handleUpgrade(p.id)}
                disabled={isUpgrading || plan.id === p.id}
                className={`btn w-100 py-3 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 ${p.featured ? 'btn-primary' : 'btn-outline-primary'}`}
              >
                {isUpgrading && plan.id !== p.id && <span className="spinner-border spinner-border-sm"></span>}
                {plan.id === p.id ? 'Current Plan' : p.cta}
                {plan.id !== p.id && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-5 p-4 rounded-4 bg-light d-flex align-items-start gap-3">
        <Shield size={24} className="text-primary mt-1" />
        <div>
          <h6 className="fw-bold mb-1">Secure Billing via Yoco</h6>
          <p className="text-muted small mb-0">
            All transactions are handled securely by Yoco. We do not store your credit card details on our servers. 
            Subscriptions can be canceled any time from this dashboard.
          </p>
        </div>
      </div>

      <style>{`
        .bg-gradient-premium {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        }
        .btn-white {
          background: white;
          color: #4f46e5;
          border: none;
        }
        .btn-white:hover {
          background: #f8fafc;
          color: #4338ca;
        }
        .btn-outline-white {
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.4);
        }
        .btn-outline-white:hover {
          background: rgba(255,255,255,0.1);
        }
        .w-fit-content {
          width: fit-content;
        }
        .plan-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .plan-card:hover {
          transform: translateY(-5px);
        }
        .icon-box {
          height: 48px;
          width: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bg-blue-light { background: rgba(99, 102, 241, 0.1); }
        .text-blue { color: #6366f1; }
        .bg-purple-light { background: rgba(168, 85, 247, 0.1); }
        .text-purple { color: #a855f7; }
        .bg-primary-light { background: rgba(37, 99, 235, 0.1); }
        .bg-purple { background: #a855f7; }
      `}</style>
    </div>
  );
};

export default Billing;
