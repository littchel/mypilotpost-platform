import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, TrendingUp, Activity, CheckCircle2,
  ArrowUpCircle, Calendar, Zap,
  BarChart3, AlertCircle, ExternalLink,
} from 'lucide-react';
import { apiSafeFetch } from "../lib/api/client";

// ── Shared UI States ──────────────────────────────────────────────────────────

const LoadingIndicator = ({ message = "Loading..." }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-muted animate__animated animate__fadeIn">
    <div className="spinner-border spinner-border-sm mb-2 text-primary" role="status"></div>
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const EmptyState = ({ message = "No data available" }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-muted text-center">
    <Calendar size={24} strokeWidth={1} className="mb-2 opacity-20" />
    <span className="extra-small fw-medium">{message}</span>
  </div>
);

const ErrorState = ({ message = "Unable to load data", onRetry }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-4 text-danger text-center">
    <AlertCircle size={24} strokeWidth={1} className="mb-2 opacity-50" />
    <span className="extra-small fw-bold mb-2">{message}</span>
    {onRetry && (
      <button className="btn btn-sm btn-outline-danger px-3 py-1 rounded-pill fw-bold" style={{ fontSize: '0.6rem' }} onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents, currency = "ZAR") {
  if (!cents && cents !== 0) return "—";
  const symbol = currency === "ZAR" ? "R" : currency + " ";
  return `${symbol}${(cents / 100).toLocaleString("en-ZA")}`;
}

// ─────────────────────────────────────────────────────────────────────────────

const BillingTab = () => {
  const [history, setHistory]       = useState({ status: 'loading', data: [] });
  const [usage, setUsage]           = useState({ status: 'loading', data: [] });
  const [currentPlan, setCurrentPlan] = useState(null);
  const [plans, setPlans]           = useState({ status: 'loading', data: [] });
  const [growthStats, setGrowthStats] = useState({ level: '—', points: '—', streak: '—', progress: 0, next_reward: null });
  const [checkoutState, setCheckoutState] = useState({ loading: false, planId: null });
  const [checkoutResult, setCheckoutResult] = useState(null); // 'success' | 'pending' | 'cancelled' | null

  // Fetch plans from API — no hardcoded prices
  const fetchPlans = useCallback(async () => {
    setPlans(p => ({ ...p, status: 'loading' }));
    const res = await apiSafeFetch('/api/v1/pricing');
    if (res.status === 'success' && res.data?.plans) {
      setPlans({ status: 'success', data: res.data.plans.filter(p => p.visible !== 0 && p.status !== 'archived') });
    } else {
      setPlans({ status: 'error', data: [] });
    }
  }, []);

  const fetchBillingData = useCallback(async () => {
    setHistory(p => ({ ...p, status: 'loading' }));
    setUsage(p => ({ ...p, status: 'loading' }));

    const [planRes, histRes, usageRes, growthRes] = await Promise.all([
      apiSafeFetch('/api/customer/billing/plan'),
      apiSafeFetch('/api/customer/billing/history'),
      apiSafeFetch('/api/customer/billing/usage'),
      apiSafeFetch('/api/customer/growth/summary'),
    ]);

    if (planRes.status === 'success' && planRes.data?.plan) setCurrentPlan(planRes.data.plan);
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

  // Detect ?checkout_result= from Yoco redirect (via API 302) — clear param after reading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout_result");
    if (result) {
      setCheckoutResult(result);
      params.delete("checkout_result");
      params.delete("checkout_id");
      params.delete("plan_id");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
    fetchPlans();
  }, [fetchBillingData, fetchPlans]);

  // Initiate real Yoco checkout — no direct upgrade call
  const handleUpgrade = useCallback(async (planId) => {
    if (checkoutState.loading) return;

    // Determine current brand_id from plan response (plan carries subscription context)
    const brandId = currentPlan?.brand_id;
    if (!brandId) {
      alert("Unable to identify active brand. Please refresh and try again.");
      return;
    }

    setCheckoutState({ loading: true, planId });
    try {
      const res = await apiSafeFetch('/api/customer/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, plan_id: planId, billing_interval: 'monthly' }),
      });

      if (res.status === 'success' && res.data?.redirect_url) {
        // Redirect to Yoco hosted checkout
        window.location.href = res.data.redirect_url;
      } else if (res.data?.code === 'CHECKOUT_EXISTS' && res.data?.checkout_id) {
        // Resume existing checkout — re-fetch its redirect URL
        const existing = await apiSafeFetch(`/api/customer/checkouts/${res.data.checkout_id}`);
        if (existing.status === 'success' && existing.data?.checkout?.redirect_url) {
          window.location.href = existing.data.checkout.redirect_url;
        } else {
          alert("An active checkout exists. Please complete or cancel it first.");
        }
      } else {
        alert(res.data?.error || "Could not initiate checkout. Please try again.");
      }
    } finally {
      setCheckoutState({ loading: false, planId: null });
    }
  }, [checkoutState.loading, currentPlan]);

  return (
    <div className="container-fluid p-4 animate__animated animate__fadeIn">
      {/* Checkout result banner — only shows after Yoco redirect */}
      {checkoutResult === 'success' && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-4 rounded-4 border-0 shadow-sm" role="alert">
          <CheckCircle2 size={18} className="text-success flex-shrink-0" />
          <span className="small fw-bold">Payment successful! Your plan has been activated.</span>
          <button className="btn-close btn-close-sm ms-auto" style={{ fontSize: '0.65rem' }} onClick={() => setCheckoutResult(null)} />
        </div>
      )}
      {checkoutResult === 'pending' && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-4 rounded-4 border-0 shadow-sm" role="alert">
          <div className="spinner-border spinner-border-sm text-info flex-shrink-0" role="status" />
          <span className="small fw-bold">Payment is processing — this page will update automatically.</span>
        </div>
      )}
      {checkoutResult === 'cancelled' && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-4 rounded-4 border-0 shadow-sm" role="alert">
          <AlertCircle size={18} className="text-warning flex-shrink-0" />
          <span className="small fw-bold">Checkout was cancelled. Your plan was not changed.</span>
          <button className="btn-close btn-close-sm ms-auto" style={{ fontSize: '0.65rem' }} onClick={() => setCheckoutResult(null)} />
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0 text-main" style={{ letterSpacing: '-0.02em' }}>Billing & Plans</h3>
        <div className="badge bg-primary px-3 py-2 rounded-pill" style={{ fontSize: '0.65rem' }}>
          {currentPlan?.name ?? '—'} Plan Active
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">

          {/* Current Plan */}
          <div className="card-workspace mb-4">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                <CreditCard size={24} />
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-main">{currentPlan?.name ?? '—'} Plan</h5>
                <p className="extra-small text-muted mb-0" style={{ fontSize: '0.65rem' }}>
                  {currentPlan?.billing_interval === 'yearly' ? 'Annual' : 'Monthly'} Billing
                  {currentPlan?.price_cents ? ` • ${formatPrice(currentPlan.price_cents, currentPlan.currency)}/mo` : ''}
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
                  <div className="fw-bold text-main" style={{ fontSize: '0.85rem' }}>
                    {currentPlan?.billing_interval === 'yearly' ? 'Annual' : 'Monthly'}
                  </div>
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

          {/* Usage */}
          <div className="card-workspace mb-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2 text-main">
              <BarChart3 size={18} className="text-primary" /> Usage & Limits
            </h6>
            {usage.status === 'loading' ? <LoadingIndicator message="Fetching usage..." /> :
             usage.status === 'error'   ? <ErrorState onRetry={fetchBillingData} /> : (
              <div className="row g-4">
                {(usage.data || []).length === 0
                  ? <div className="col-12"><EmptyState message="No usage data yet" /></div>
                  : (usage.data || []).map((limit, idx) => (
                    <div className="col-md-4" key={idx}>
                      <div className="mb-2 d-flex justify-content-between align-items-center">
                        <span className="small fw-bold text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.75rem' }}>
                          <Activity size={14} className="text-primary" /> {limit.label}
                        </span>
                        <span className="extra-small fw-bold text-main" style={{ fontSize: '0.65rem' }}>{limit.used} / {limit.limit ?? '∞'}</span>
                      </div>
                      <div className="progress rounded-pill bg-border-subtle" style={{ height: '6px' }}>
                        <div
                          className="progress-bar bg-pilot-blue"
                          style={{ width: limit.limit ? `${Math.min((limit.used / limit.limit) * 100, 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Plans — driven entirely from /api/v1/pricing */}
          <div className="card-workspace mb-4">
            <h6 className="fw-bold mb-4 d-flex align-items-center gap-2 text-main">
              <ArrowUpCircle size={18} className="text-primary" /> Available Plans
            </h6>
            {plans.status === 'loading' ? <LoadingIndicator message="Loading plans..." /> :
             plans.status === 'error'   ? <ErrorState message="Could not load plans" onRetry={fetchPlans} /> : (
              <div className="row g-3">
                {(plans.data || []).map((plan) => {
                  const isActive = currentPlan?.id === plan.id;
                  const isLoading = checkoutState.loading && checkoutState.planId === plan.id;
                  return (
                    <div className="col" key={plan.id}>
                      <div className={`p-3 rounded-4 border h-100 ${isActive ? 'border-primary bg-pilot-blue-light' : 'bg-surface-primary border-subtle'}`}>
                        {plan.badge && (
                          <div className="badge bg-warning text-dark mb-2" style={{ fontSize: '0.6rem' }}>{plan.badge}</div>
                        )}
                        <div className="fw-bold text-main mb-1" style={{ fontSize: '0.85rem' }}>{plan.name}</div>
                        <div className="fw-bold text-primary mb-1" style={{ fontSize: '1rem' }}>
                          {formatPrice(plan.price_cents, plan.currency)}
                          <span className="text-muted fw-normal" style={{ fontSize: '0.65rem' }}>/mo</span>
                        </div>
                        {plan.description && (
                          <p className="extra-small text-muted mb-3 leading-tight" style={{ fontSize: '0.65rem' }}>{plan.description}</p>
                        )}
                        <button
                          className={`btn w-100 extra-small fw-bold py-2 ${isActive ? 'btn-primary' : 'btn-grey border'}`}
                          style={{ fontSize: '0.75rem' }}
                          disabled={isActive || checkoutState.loading}
                          onClick={() => handleUpgrade(plan.id)}
                        >
                          {isActive ? 'Current Plan' : isLoading ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : plan.id === 'starter' ? 'Downgrade' : 'Upgrade'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Billing History */}
          <div className="card-workspace">
            <h6 className="fw-bold mb-4 text-main">Billing History</h6>
            {history.status === 'loading' ? <LoadingIndicator /> :
             history.status === 'empty'   ? <EmptyState message="No billing history yet" /> :
             history.status === 'error'   ? <ErrorState onRetry={fetchBillingData} /> : (
              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead>
                    <tr className="border-bottom border-subtle">
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>DATE</th>
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>AMOUNT</th>
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>PROVIDER</th>
                      <th className="extra-small text-muted fw-bold py-3 bg-surface-secondary" style={{ fontSize: '0.75rem' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history.data || []).map((item, idx) => (
                      <tr key={idx} className="border-bottom border-subtle">
                        <td className="small text-main fw-medium py-3" style={{ fontSize: '0.85rem' }}>
                          {item.occurred_at ? new Date(item.occurred_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="small text-main fw-medium" style={{ fontSize: '0.85rem' }}>
                          {formatPrice(item.amount, item.currency)}
                        </td>
                        <td className="small text-muted" style={{ fontSize: '0.85rem' }}>
                          {item.provider || '—'}
                        </td>
                        <td>
                          <span className={`badge rounded-pill px-3 ${
                            item.status === 'succeeded' ? 'bg-success bg-opacity-10 text-success'
                            : item.status === 'failed'  ? 'bg-danger bg-opacity-10 text-danger'
                            : 'bg-warning bg-opacity-10 text-warning'
                          }`} style={{ fontSize: '0.65rem' }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
          {/* Rewards */}
          <div className="card-workspace mb-4 text-white shadow-lg border-0" style={{
            background: 'linear-gradient(135deg, var(--pilot-blue) 0%, #1e40af 100%)',
            padding: '1.5rem',
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
                <div className="progress-bar bg-white shadow-sm" style={{ width: `${growthStats.progress}%` }} />
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
                <span className="small fw-bold" style={{ fontSize: '0.75rem' }}>Streak: {growthStats.streak} days</span>
              </div>
            </div>
          </div>

          {/* Payment Methods — no hardcoded card data */}
          <div className="card-workspace">
            <h6 className="fw-bold mb-4 text-main">Payment</h6>
            <div className="p-3 rounded-4 border border-subtle bg-surface-secondary d-flex align-items-center gap-3">
              <div className="p-2 rounded-3 bg-surface-primary">
                <CreditCard size={18} className="text-muted" />
              </div>
              <div className="flex-1">
                <div className="small fw-bold text-main" style={{ fontSize: '0.75rem' }}>Managed via Yoco</div>
                <div className="extra-small text-muted" style={{ fontSize: '0.65rem' }}>Payments processed securely</div>
              </div>
              <ExternalLink size={14} className="text-muted" />
            </div>
            <p className="extra-small text-muted mt-3 mb-0" style={{ fontSize: '0.65rem' }}>
              To update your payment method, start a new checkout. Card details are managed directly by Yoco and are never stored here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingTab;
