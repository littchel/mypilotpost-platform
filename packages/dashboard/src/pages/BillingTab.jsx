import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, TrendingUp, Activity, CheckCircle2, 
  ArrowUpCircle, Download, Calendar, Zap, 
  BarChart3, AlertCircle
} from 'lucide-react';
import { apiSafeFetch } from "../lib/api/client";

/**
 * Production-Hardened Billing & Rewards Tab
 * Implements strict status modeling: loading | empty | error | success
 */

// ── Shared UI States ──────────────────────────────────────────────────────

const LoadingIndicator = ({ message = "Synchronizing billing data..." }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-muted animate__animated animate__fadeIn">
    <div className="spinner-border spinner-border-sm mb-2 text-primary" role="status"></div>
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const EmptyState = ({ message = "No billing history available" }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-muted animate__animated animate__fadeIn text-center">
    <Calendar size={24} strokeWidth={1} className="mb-2 opacity-20" />
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const ErrorState = ({ message = "Unable to load data", onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-danger animate__animated animate__fadeIn text-center">
    <AlertCircle size={24} strokeWidth={1} className="mb-2 opacity-50" />
    <span className="extra-small fw-bold mb-2">{message}</span>
    {onRetry && (
      <button 
        className="btn btn-sm btn-outline-danger px-3 py-1 rounded-pill fw-bold" 
        style={{ fontSize: '0.6rem' }}
        onClick={onRetry}
      >
        Retry
      </button>
    )}
  </div>
);

const BillingTab = () => {
  const [history, setHistory] = useState({ status: 'loading', data: [] });
  const [usage, setUsage] = useState({ status: 'loading', data: [] });
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [growthStats, setGrowthStats] = useState({ level: '—', points: '—', streak: '—', progress: 0, next_reward: null });

  const PLANS = [
    { id: "starter", name: "Starter", price: "R0", desc: "Free forever" },
    { id: "growth",  name: "Growth",  price: "R499", desc: "Scale your reach" },
    { id: "pro",     name: "Pro",     price: "R999", desc: "Full agency power" },
  ];

  const handleUpgrade = useCallback(async (planId) => {
    if (isUpgrading || currentPlan?.id === planId) return;
    setIsUpgrading(true);
    try {
      const res = await apiSafeFetch('/api/customer/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (res.status === 'success' && res.data?.plan) {
        setCurrentPlan(res.data.plan);
      }
    } finally {
      setIsUpgrading(false);
    }
  }, [isUpgrading, currentPlan]);

  const fetchBillingData = useCallback(async () => {
    setHistory(prev => ({ ...prev, status: 'loading' }));
    setUsage(prev => ({ ...prev, status: 'loading' }));

    const [planRes, histRes, usageRes, growthRes] = await Promise.all([
      apiSafeFetch('/api/customer/billing/plan'),
      apiSafeFetch('/api/customer/billing/history'),
      apiSafeFetch('/api/customer/billing/usage'),
      apiSafeFetch('/api/customer/growth/summary'),
    ]);

    if (planRes.status === 'success' && planRes.data?.plan) {
      setCurrentPlan(planRes.data.plan);
    }
    setHistory(histRes);
    setUsage(usageRes);

    if (growthRes.status === 'success' && growthRes.data) {
      const g = growthRes.data;
      setGrowthStats({
        level: g.level || '—',
        points: g.points ?? '—',
        streak: g.streak_days ?? '—',
        progress: g.progress_percentage ?? 0,
        next_reward: g.next_reward || null,
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchBillingData(), 0);
    return () => clearTimeout(timer);
  }, [fetchBillingData]);

  return (
    <div className="container-fluid p-4 animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0 text-main" style={{ letterSpacing: '-0.02em' }}>Billing & Plans</h3>
        <div className="badge bg-primary px-3 py-2 rounded-pill" style={{ fontSize: '0.65rem' }}>
          {currentPlan?.name ?? '—'} Plan Active
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Current Plan & Usage */}
        <div className="col-lg-8">
          {/* Section A: Current Plan */}
          <div className="card-workspace mb-4">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                <CreditCard size={24} />
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-main">{currentPlan?.name ?? '—'} Plan</h5>
                <p className="extra-small text-muted mb-0" style={{ fontSize: '0.65rem' }}>
                  Monthly Billing • R{currentPlan ? Math.round((currentPlan.price_monthly || 0) / 100) : '—'}/month
                </p>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-4">
                <div className="p-3 rounded-4 border bg-surface-secondary border-subtle">
                  <div className="extra-small text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Period End</div>
                  <div className="fw-bold text-main d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                    <Calendar size={14} className="text-primary" />
                    {currentPlan?.current_period_end
                      ? new Date(currentPlan.current_period_end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 rounded-4 border bg-surface-secondary border-subtle">
                  <div className="extra-small text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Billing Cycle</div>
                  <div className="fw-bold text-main" style={{ fontSize: '0.85rem' }}>Monthly</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 rounded-4 border bg-surface-secondary border-subtle">
                  <div className="extra-small text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Status</div>
                  <div className={`fw-bold d-flex align-items-center gap-2 ${currentPlan?.status === 'active' ? 'text-success' : 'text-warning'}`} style={{ fontSize: '0.85rem' }}>
                    <CheckCircle2 size={14} /> {currentPlan?.status ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Usage & Limits */}
          <div className="card-workspace mb-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2 text-main">
              <BarChart3 size={18} className="text-primary" /> Usage & Limits
            </h6>
            
            {usage.status === 'loading' ? <LoadingIndicator message="Fetching resource usage..." /> :
             usage.status === 'error' ? <ErrorState onRetry={fetchBillingData} /> : (
              <div className="row g-4">
                {(usage.data || []).length === 0 ? <div className="col-12"><EmptyState message="No usage data reported yet" /></div> : 
                 usage.data.map((limit, idx) => (
                  <div className="col-md-4" key={idx}>
                    <div className="mb-2 d-flex justify-content-between align-items-center">
                      <span className="small fw-bold text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.75rem' }}>
                        <Activity size={14} className="text-primary" /> {limit.label}
                      </span>
                      <span className="extra-small fw-bold text-main" style={{ fontSize: '0.65rem' }}>{limit.used} / {limit.limit}</span>
                    </div>
                    <div className="progress rounded-pill bg-border-subtle" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-pilot-blue" 
                        style={{ width: `${(limit.used / limit.limit) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section D: Upgrade Options */}
          <div className="card-workspace mb-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2 text-main">
              <ArrowUpCircle size={18} className="text-primary" /> Upgrade Plans
            </h6>
            <div className="row g-3">
              {PLANS.map((plan) => {
                const isActive = currentPlan?.id === plan.id;
                return (
                  <div className="col" key={plan.id}>
                    <div className={`p-3 rounded-4 border h-100 transition-all ${isActive ? 'border-primary bg-pilot-blue-light' : 'bg-surface-primary border-subtle'}`}>
                      <div className="fw-bold text-main mb-1" style={{ fontSize: '0.85rem' }}>{plan.name}</div>
                      <div className="fw-bold text-primary mb-2" style={{ fontSize: '1rem' }}>{plan.price}</div>
                      <p className="extra-small text-muted mb-3 leading-tight" style={{ fontSize: '0.65rem' }}>{plan.desc}</p>
                      <button
                        className={`btn w-100 extra-small fw-bold py-2 ${isActive ? 'btn-primary' : 'btn-grey border'}`}
                        style={{ fontSize: '0.75rem' }}
                        disabled={isActive || isUpgrading}
                        onClick={() => handleUpgrade(plan.id)}
                      >
                        {isActive ? 'Current Plan' : isUpgrading ? '…' : 'Upgrade'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section F: Billing History */}
          <div className="card-workspace">
            <h6 className="fw-bold mb-4 text-main">Billing History</h6>
            {history.status === 'loading' ? <LoadingIndicator /> :
             history.status === 'empty' ? <EmptyState /> :
             history.status === 'error' ? <ErrorState onRetry={fetchBillingData} /> : (
              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead>
                    <tr className="border-bottom border-subtle">
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>DATE</th>
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>AMOUNT</th>
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>STATUS</th>
                      <th className="extra-small text-muted fw-bold py-3 text-end bg-surface-secondary" style={{ fontSize: '0.75rem' }}>INVOICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.map((item, idx) => (
                      <tr key={idx} className="border-bottom border-subtle">
                        <td className="small text-main fw-medium py-3" style={{ fontSize: '0.85rem' }}>{item.date}</td>
                        <td className="small text-main fw-medium" style={{ fontSize: '0.85rem' }}>{item.amount}</td>
                        <td>
                          <span className={`badge rounded-pill px-3 ${item.status === 'Paid' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ fontSize: '0.65rem' }}>
                            {item.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-link text-muted p-0">
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rewards & Payment Methods */}
        <div className="col-lg-4">
          {/* Section C: Rewards Panel */}
          <div className="card-workspace mb-4 text-white shadow-lg border-0" style={{ 
            background: 'linear-gradient(135deg, var(--pilot-blue) 0%, #1e40af 100%)',
            padding: '1.5rem'
          }}>
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <Zap size={18} fill="currentColor" /> Rewards
            </h6>
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <div>
                  <div className="extra-small opacity-75 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Current Level</div>
                  <div className="h4 fw-bold mb-0">{growthStats.level}</div>
                </div>
                <div className="text-end">
                  <div className="h4 fw-bold mb-0">{growthStats.points}</div>
                  <div className="extra-small opacity-75 fw-bold" style={{ fontSize: '0.65rem' }}>POINTS</div>
                </div>
              </div>
              <div className="progress bg-white bg-opacity-20 rounded-pill" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-white shadow-sm" 
                  style={{ width: `${growthStats.progress}%` }}
                />
              </div>
              <div className="extra-small text-center mt-3 opacity-90 fw-medium bg-white bg-opacity-10 py-1 rounded" style={{ fontSize: '0.6rem' }}>
                {growthStats.next_reward
                  ? `${growthStats.next_reward.points_required - (growthStats.points === '—' ? 0 : growthStats.points)} pts to unlock ${growthStats.next_reward.title}`
                  : 'Start publishing to earn rewards'}
              </div>
            </div>

            <div className="p-3 bg-white bg-opacity-10 rounded-4 border border-white border-opacity-10">
              <div className="d-flex align-items-center gap-2">
                <TrendingUp size={16} />
                <span className="small fw-bold" style={{ fontSize: '0.75rem' }}>Streak: {growthStats.streak}</span>
              </div>
            </div>
          </div>

          {/* Section E: Payment Methods */}
          <div className="card-workspace">
            <h6 className="fw-bold mb-4 text-main">Payment Methods</h6>
            <div className="p-3 rounded-4 border mb-3 d-flex align-items-center justify-content-between border-subtle">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-surface-secondary">
                  <CreditCard size={18} className="text-muted" />
                </div>
                <div>
                  <div className="small fw-bold text-main" style={{ fontSize: '0.75rem' }}>Visa ending 1234</div>
                  <div className="extra-small text-muted" style={{ fontSize: '0.65rem' }}>Expires 12/28</div>
                </div>
              </div>
              <div className="badge bg-light text-muted border extra-small bg-surface-secondary border-subtle" style={{ fontSize: '0.65rem' }}>Default</div>
            </div>
            <button className="btn btn-grey border border-subtle w-100 fw-bold small py-2 text-main" style={{ fontSize: '0.75rem' }}>
              Add New Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingTab;
