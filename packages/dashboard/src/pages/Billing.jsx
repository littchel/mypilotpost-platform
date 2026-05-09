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
  const [usage, setUsage] = useState({ brands: 0, users: 0 });
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/api/customer/billing/plan");
      setPlan(res.plan);
      // In a real app, usage would come from here too
      // For MVP, we'll simulate based on plan limits
      setUsage({ 
        brands: res.plan.id === 'starter' ? 1 : 4, 
        users: res.plan.id === 'starter' ? 1 : 2 
      });
    } catch (err) {
      console.error("Failed to fetch billing", err);
    } finally {
      setLoading(false);
    }
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
      id: "pro",
      name: "Professional",
      price: "49",
      description: "For growing brands and power users.",
      features: [
        { text: "5 Brand Accounts", included: true },
        { text: "3 User Seats", included: true },
        { text: "Campaign Strategy Engine", included: true },
        { text: "SEO Discovery Analysis", included: true },
        { text: "The Brain™ Intelligence", included: true },
        { text: "Agency Reporting", included: true }
      ],
      cta: "Upgrade to Pro",
      featured: true
    },
    {
      id: "agency",
      name: "Agency",
      price: "199",
      description: "Full white-label control for agencies.",
      features: [
        { text: "25 Brand Accounts", included: true },
        { text: "5 User Seats", included: true },
        { text: "White-label Reporting", included: true },
        { text: "Custom Branding & Logos", included: true },
        { text: "Priority Strategic Support", included: true },
        { text: "Full Intelligence Suite", included: true }
      ],
      cta: "Go Agency",
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
        <div className="col-md-6 col-lg-4">
          <div className="glass-card p-4 h-100 border-0 shadow-sm">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="icon-box bg-blue-light text-blue rounded-3 p-3">
                <Layout size={24} />
              </div>
              <div>
                <h4 className="mb-0 fw-bold">Brand Slots</h4>
                <p className="text-muted small mb-0">Consumed organization slots</p>
              </div>
            </div>
            <div className="usage-stat mb-2">
              <span className="fs-2 fw-bold">{usage.brands}</span>
              <span className="text-muted fs-5"> / {plan.social_accounts_limit ?? 1}</span>
            </div>
            <div className="progress rounded-pill mb-2" style={{ height: '8px' }}>
              <div 
                className={`progress-bar rounded-pill ${usage.brands / (plan.social_accounts_limit ?? 1) > 0.8 ? 'bg-warning' : 'bg-primary'}`} 
                style={{ width: `${Math.min((usage.brands / (plan.social_accounts_limit ?? 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-muted x-small mb-0">
              {(plan.social_accounts_limit ?? 1) - usage.brands} account slot(s) remaining.
            </p>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="glass-card p-4 h-100 border-0 shadow-sm">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="icon-box bg-purple-light text-purple rounded-3 p-3">
                <FileText size={24} />
              </div>
              <div>
                <h4 className="mb-0 fw-bold">Monthly Posts</h4>
                <p className="text-muted small mb-0">Scheduled posts this month</p>
              </div>
            </div>
            <div className="usage-stat mb-2">
              <span className="fs-2 fw-bold">{usage.users}</span>
              <span className="text-muted fs-5"> / {plan.posts_per_month_limit ?? 10}</span>
            </div>
            <div className="progress rounded-pill mb-2" style={{ height: '8px' }}>
              <div 
                className="progress-bar bg-purple rounded-pill" 
                style={{ width: `${Math.min((usage.users / (plan.posts_per_month_limit ?? 10)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-muted x-small mb-0">
              Based on your {plan.name} plan allowance.
            </p>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="glass-card p-4 h-100 border-0 shadow-sm position-relative overflow-hidden bg-gradient-premium text-white">
            <div className="position-relative z-1">
              <h4 className="fw-bold mb-3">Trial Status</h4>
              {plan.status === 'trial' ? (
                <>
                  <p className="mb-4 opacity-75">Your agency trial ends in <b>12 days</b>. Unlock full production mode today.</p>
                  <button className="btn btn-white w-100 fw-bold">Unlock Enterprise Features</button>
                </>
              ) : (
                <>
                  <p className="mb-4 opacity-75">Your subscription is <b>Active</b>. Payments are synced through Yoco.</p>
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
