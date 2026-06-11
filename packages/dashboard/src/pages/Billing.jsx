import React, { useState, useEffect } from "react";
import {
  CreditCard, Zap, Shield, Check, ArrowRight,
  AlertCircle, Activity, Gift, FileText,
} from "lucide-react";
import { apiRequest } from "../lib/api/client";

function formatPrice(cents, currency = "ZAR") {
  if (!cents && cents !== 0) return "Free";
  const sym = currency === "ZAR" ? "R" : `${currency} `;
  return `${sym}${(cents / 100).toLocaleString("en-ZA")}`;
}

const Billing = () => {
  const [loading, setLoading]         = useState(true);
  const [plan, setPlan]               = useState(null);
  const [usage, setUsage]             = useState([]);
  const [plans, setPlans]             = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // planId being checked out

  useEffect(() => { fetchBillingData(); }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [planRes, usageRes, pricingRes] = await Promise.all([
        apiRequest("/api/customer/billing/plan"),
        apiRequest("/api/customer/billing/usage").catch(() => ({ usage: [] })),
        // Plans from commercial — no hardcoded prices allowed in frontend
        fetch("/api/v1/pricing").then(r => r.json()).catch(() => ({ plans: [] })),
      ]);
      setPlan(planRes.plan);
      setUsage(usageRes.usage || []);
      setPlans((pricingRes.plans || []).filter(p => p.visible !== 0 && p.status !== "archived"));
    } catch (err) {
      console.error("Failed to fetch billing", err);
    } finally {
      setLoading(false);
    }
  };

  const trialDaysRemaining = (p) => {
    if (!p?.trial_ends_at) return null;
    const diff = new Date(p.trial_ends_at) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Initiate real Yoco checkout
  const handleUpgrade = async (targetPlanId) => {
    if (checkoutLoading || plan?.id === targetPlanId) return;
    const brandId = plan?.brand_id;
    if (!brandId) { alert("Unable to identify active brand. Please refresh."); return; }

    setCheckoutLoading(targetPlanId);
    try {
      const res = await apiRequest("/api/customer/checkout/create", {
        method: "POST",
        body: JSON.stringify({ brand_id: brandId, plan_id: targetPlanId, billing_interval: "monthly" }),
      });
      if (res.redirect_url) {
        window.location.href = res.redirect_url;
      } else if (res.code === "CHECKOUT_EXISTS" && res.checkout_id) {
        // Resume existing pending checkout
        const existingRes = await apiRequest(`/api/customer/checkouts/${res.checkout_id}`);
        if (existingRes.checkout?.redirect_url) {
          window.location.href = existingRes.checkout.redirect_url;
        } else {
          alert("An active checkout already exists. Cancel it first or wait for it to expire.");
        }
      } else {
        alert(res.error || "Could not start checkout. Please try again.");
      }
    } catch (err) {
      alert(err.message || "Checkout failed");
    } finally {
      setCheckoutLoading(null);
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

  return (
    <div className="billing-page p-4 p-lg-5 animate-fade-in">
      <div className="d-flex justify-content-between align-items-end mb-5">
        <div>
          <h1 className="display-5 fw-bold mb-2">Subscription & Usage</h1>
          <p className="text-muted lead">Manage your plan, see usage stats, and unlock strategic features.</p>
        </div>
        <div>
          <span className={`badge rounded-pill px-4 py-2 fs-6 ${plan.id === "starter" ? "bg-light text-dark border" : "bg-primary-light text-primary"}`}>
            <Zap size={14} className="me-2" />
            {plan.name} Plan
          </span>
        </div>
      </div>

      {/* Usage */}
      <div className="row g-4 mb-5">
        {usage.length > 0 ? usage.map((u, i) => (
          <div key={i} className="col-md-6 col-lg-4">
            <div className="glass-card p-4 h-100 border-0 shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="icon-box bg-blue-light text-blue rounded-3 p-3"><Activity size={24} /></div>
                <div>
                  <h4 className="mb-0 fw-bold">{u.label}</h4>
                  <p className="text-muted small mb-0">This billing period</p>
                </div>
              </div>
              <div className="mb-2">
                <span className="fs-2 fw-bold">{u.used}</span>
                <span className="text-muted fs-5"> / {u.limit ?? "∞"}</span>
              </div>
              {u.limit && (
                <div className="progress rounded-pill mb-2" style={{ height: "8px" }}>
                  <div
                    className={`progress-bar rounded-pill ${u.used / u.limit > 0.8 ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.min((u.used / u.limit) * 100, 100)}%` }}
                  />
                </div>
              )}
              {u.limit && <p className="text-muted small mb-0">{u.limit - u.used} remaining</p>}
            </div>
          </div>
        )) : (
          <div className="col-12">
            <div className="glass-card p-4 text-muted text-center small">
              No usage data yet — start publishing to see your stats.
            </div>
          </div>
        )}

        {/* Subscription status card */}
        <div className="col-lg-4">
          <div className="glass-card p-4 h-100 border-0 shadow-sm position-relative overflow-hidden bg-gradient-premium text-white">
            <div className="position-relative z-1">
              <h4 className="fw-bold mb-3">Subscription Status</h4>
              {plan.status === "trial" ? (
                <>
                  <p className="mb-4 opacity-75">
                    Trial ends in <b>{trialDaysRemaining(plan) ?? "—"} days</b>. Unlock full features today.
                  </p>
                  <button className="btn btn-white w-100 fw-bold" onClick={() => handleUpgrade("growth")} disabled={!!checkoutLoading}>
                    {checkoutLoading === "growth" ? <span className="spinner-border spinner-border-sm" /> : "Upgrade Now"}
                  </button>
                </>
              ) : plan.status === "trial_expired" ? (
                <>
                  <p className="mb-4 opacity-75">Your trial has expired. Choose a plan to continue.</p>
                  <button className="btn btn-white w-100 fw-bold" onClick={() => handleUpgrade("growth")} disabled={!!checkoutLoading}>
                    {checkoutLoading === "growth" ? <span className="spinner-border spinner-border-sm" /> : "Choose a Plan"}
                  </button>
                </>
              ) : (
                <p className="mb-4 opacity-75">
                  <b>{plan.name}</b> subscription is active.
                  {plan.current_period_end && ` Renews ${new Date(plan.current_period_end).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}.`}
                </p>
              )}
            </div>
            <Activity size={120} className="position-absolute opacity-10" style={{ right: -20, bottom: -20 }} />
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="glass-card p-4 d-flex align-items-center justify-content-between bg-primary-light border-primary border-opacity-10">
            <div className="d-flex align-items-center gap-4">
              <div className="icon-box bg-white text-primary rounded-circle shadow-sm"><Gift size={24} /></div>
              <div>
                <h5 className="fw-bold mb-1">Earn Free Pro Time</h5>
                <p className="text-muted small mb-0">Invite a friend and you both get +7 days of Pro for free.</p>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("switch-tab", { detail: "promotions" }))}
              className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
            >
              Open Promotions <ArrowRight size={16} className="ms-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Plans — driven entirely from /api/v1/pricing */}
      <div className="row g-4 align-items-stretch">
        {plans.length === 0 ? (
          <div className="col-12 text-muted text-center py-4">Loading plans…</div>
        ) : plans.map((p) => {
          const isCurrent = plan.id === p.id;
          const isLoading = checkoutLoading === p.id;
          return (
            <div key={p.id} className="col-lg-4">
              <div className={`glass-card p-4 h-100 d-flex flex-column ${p.badge ? "border-primary border-2 shadow-lg" : "border-0"}`}
                style={{ transition: "transform 0.2s ease", cursor: "default" }}
              >
                {p.badge && (
                  <div className="badge bg-primary text-white small fw-bold px-3 py-1 rounded-pill mb-3 w-fit-content">
                    {p.badge.toUpperCase()}
                  </div>
                )}
                <h3 className="fw-bold">{p.name}</h3>
                <div className="my-3 d-flex align-items-baseline">
                  <span className="fs-1 fw-bold">{formatPrice(p.price_cents, p.currency)}</span>
                  {p.price_cents > 0 && <span className="text-muted ms-2">/ month</span>}
                </div>
                {p.description && <p className="text-muted small mb-4">{p.description}</p>}

                {/* Feature list from entitlements if available */}
                {Array.isArray(p.entitlements) && p.entitlements.length > 0 && (
                  <div className="flex-grow-1 mb-4">
                    {p.entitlements.filter(e => e.visible !== 0).slice(0, 6).map((e, i) => (
                      <div key={i} className={`d-flex gap-2 mb-3 ${e.enabled ? "" : "opacity-40"}`}>
                        <Check size={18} className={e.enabled ? "text-success flex-shrink-0" : "text-muted flex-shrink-0"} />
                        <span className="small">{e.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleUpgrade(p.id)}
                  disabled={!!checkoutLoading || isCurrent}
                  className={`btn w-100 py-3 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2 ${
                    p.badge ? "btn-primary" : "btn-outline-primary"
                  }`}
                >
                  {isLoading ? <span className="spinner-border spinner-border-sm" /> : null}
                  {isCurrent ? "Current Plan" : isLoading ? "Redirecting…" : p.badge ? "Upgrade Now" : "Select Plan"}
                  {!isCurrent && !isLoading && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security footer */}
      <div className="mt-5 p-4 rounded-4 bg-light d-flex align-items-start gap-3">
        <Shield size={24} className="text-primary mt-1" />
        <div>
          <h6 className="fw-bold mb-1">Secure Billing via Yoco</h6>
          <p className="text-muted small mb-0">
            All transactions are processed securely by Yoco. Card details are never stored on our servers.
            You will be redirected to Yoco's hosted payment page to complete your subscription.
          </p>
        </div>
      </div>

      <style>{`
        .bg-gradient-premium { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
        .btn-white { background: white; color: #4f46e5; border: none; }
        .btn-white:hover { background: #f8fafc; color: #4338ca; }
        .w-fit-content { width: fit-content; }
        .icon-box { height: 48px; width: 48px; display: flex; align-items: center; justify-content: center; }
        .bg-blue-light { background: rgba(99,102,241,0.1); }
        .text-blue { color: #6366f1; }
        .bg-primary-light { background: rgba(37,99,235,0.1); }
      `}</style>
    </div>
  );
};

export default Billing;
