"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetBillingOverviewV2, apiGetBillingSubscriptions, apiGetBillingPayments,
  apiGetBillingCheckouts, apiGetBillingCompliance, apiListRefunds,
  apiRequestRefund, apiApproveRefund, apiRejectRefund,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  DollarSign, TrendingUp, Users, BarChart2, Shield, RefreshCw,
  CreditCard, ShoppingCart, Percent, CheckCircle, Lock, Globe, AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
function money(cents?: number | null, currency = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
}
function pctStr(n?: number | null) { return n == null ? "—" : `${(n * 100).toFixed(1)}%`; }

// ─── Overview (payment-derived) ─────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ["billing-overview-v2"], queryFn: apiGetBillingOverviewV2 });
  const cur = data?.currency ?? "USD";
  const trend = data?.revenue_trend ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net Revenue" value={money(data?.revenue_net_cents, cur)} icon={<DollarSign className="h-4 w-4" />} accent="success" loading={isLoading} sub="payments − refunds" />
        <StatCard label="MRR" value={money(data?.mrr_cents, cur)} icon={<TrendingUp className="h-4 w-4" />} accent="brand" loading={isLoading} sub="payment-derived" />
        <StatCard label="ARR" value={money(data?.arr_cents, cur)} icon={<TrendingUp className="h-4 w-4" />} loading={isLoading} sub="MRR × 12" />
        <StatCard label="ARPU" value={money(data?.arpu_cents, cur)} icon={<Users className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Active Revenue" value={money(data?.active_revenue_cents, cur)} icon={<DollarSign className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Refund Rate" value={pctStr(data?.refund_rate)} icon={<Percent className="h-4 w-4" />} accent={(data?.refund_rate ?? 0) > 0.1 ? "warning" : undefined} loading={isLoading} />
        <StatCard label="Payment Success" value={pctStr(data?.payment_success_rate)} icon={<CheckCircle className="h-4 w-4" />} loading={isLoading} sub={`${data?.payment_counts?.succeeded ?? 0} ok / ${data?.payment_counts?.failed ?? 0} failed`} />
        <StatCard label="Gross Revenue" value={money(data?.revenue_gross_cents, cur)} icon={<DollarSign className="h-4 w-4" />} loading={isLoading} sub={`refunded ${money(data?.revenue_refunded_cents, cur)}`} />
      </div>

      {trend.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">Net Revenue Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend}>
              <XAxis dataKey="month" tick={{ fill: "#4A5275", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4A5275", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => money(v as number, cur)} />
              <Tooltip contentStyle={{ background: "#1A2035", border: "1px solid #252D42", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v) => [money(Number(v), cur), "Net"]} labelStyle={{ color: "#8892B0" }} />
              <Bar dataKey="net_cents" fill="#6068E8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-ink-1 mb-3">Operational (not revenue)</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total customers", value: data?.operational?.total_customers ?? 0 },
            { label: "Active subscriptions", value: data?.operational?.active_subscriptions ?? 0 },
            { label: "Trial subscriptions", value: data?.operational?.trial_subscriptions ?? 0 },
          ].map(s => (
            <div key={s.label} className="os-card-raised p-3 text-center">
              <p className="text-2xs text-ink-3 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-ink-1 mt-0.5">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <p className="text-2xs text-ink-4 mt-2">Counts are operational metrics — revenue is derived from payments only.</p>
      </Card>
    </div>
  );
}

// ─── Subscriptions (read-only, shows locked price) ──────────────────────────────

interface SubRow {
  brand_id: string; brand_name?: string; owner_email?: string; status?: string;
  plan_id?: string; plan_name?: string; locked_price_cents?: number; locked_currency?: string;
  billing_interval?: string; grandfathered?: number; current_period_end?: string;
  catalog_price_cents?: number;
}

const SUB_COLS: Column<SubRow>[] = [
  { key: "owner_email", header: "Customer", sortable: true, render: r => <span className="text-sm text-ink-1">{r.owner_email ?? r.brand_name ?? r.brand_id}</span> },
  { key: "brand_name", header: "Brand", render: r => <span className="text-sm text-ink-2">{r.brand_name ?? "—"}</span> },
  { key: "plan_name", header: "Plan", sortable: true, render: r => r.plan_name ? <Badge variant="brand">{r.plan_name}</Badge> : <span className="text-ink-3">—</span> },
  { key: "status", header: "Status", sortable: true, render: r => <Badge variant={statusBadge(r.status ?? "inactive")} dot>{r.status ?? "—"}</Badge> },
  {
    key: "locked_price_cents", header: "Locked price", sortable: true,
    render: r => r.locked_price_cents != null
      ? <span className="flex items-center gap-1 text-sm font-medium text-green-400"><Lock className="h-3 w-3" />{money(r.locked_price_cents, r.locked_currency ?? "USD")}<span className="text-2xs text-ink-4">/{r.billing_interval === "annual" ? "yr" : "mo"}</span></span>
      : <span className="text-ink-3">—</span>,
  },
  {
    key: "grandfathered", header: "Catalog", render: r => {
      if (r.locked_price_cents == null || r.catalog_price_cents == null) return <span className="text-ink-3">—</span>;
      const diff = r.locked_price_cents !== r.catalog_price_cents;
      return diff
        ? <Badge variant="warning">grandfathered</Badge>
        : <span className="text-2xs text-ink-3">{money(r.catalog_price_cents, r.locked_currency ?? "USD")}</span>;
    },
  },
  { key: "current_period_end", header: "Renews", render: r => <span className="text-sm text-ink-2">{fmt(r.current_period_end)}</span> },
];

function SubscriptionsTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["billing-subscriptions"], queryFn: apiGetBillingSubscriptions, staleTime: 60_000 });
  const subs = (data?.subscriptions ?? []) as SubRow[];
  return (
    <DataTable
      data={subs} columns={SUB_COLS} keyField="brand_id"
      searchable searchPlaceholder="Search customer, brand, plan..." searchFields={["owner_email", "brand_name", "plan_name", "status"]}
      loading={isLoading} error={error ? "Failed to load subscriptions" : undefined}
      emptyTitle="No subscriptions" emptyMessage="No active subscriptions yet." exportFilename="subscriptions"
    />
  );
}

// ─── Payments ───────────────────────────────────────────────────────────────────

interface PayRow { id: string; brand_name?: string; owner_email?: string; provider?: string; provider_payment_id?: string; amount: number; currency: string; status: string; occurred_at?: string; checkout_id?: string; }
const PAY_COLS: Column<PayRow>[] = [
  { key: "occurred_at", header: "Date", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.occurred_at)}</span> },
  { key: "owner_email", header: "Customer", render: r => <span className="text-sm text-ink-1">{r.owner_email ?? r.brand_name ?? "—"}</span> },
  { key: "amount", header: "Amount", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{money(r.amount, r.currency)}</span> },
  { key: "status", header: "Status", sortable: true, render: r => <Badge variant={statusBadge(r.status)} dot>{r.status}</Badge> },
  { key: "provider", header: "Provider", render: r => <span className="text-xs text-ink-3 capitalize">{r.provider ?? "—"}</span> },
  { key: "provider_payment_id", header: "Provider ID", render: r => <span className="text-2xs font-mono text-ink-3">{r.provider_payment_id ?? "—"}</span> },
  { key: "checkout_id", header: "Checkout", render: r => <span className="text-2xs font-mono text-ink-3">{r.checkout_id ? r.checkout_id.slice(0, 8) : "—"}</span> },
];
function PaymentsTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["billing-payments"], queryFn: apiGetBillingPayments, staleTime: 60_000 });
  const payments = (data?.payments ?? []) as PayRow[];
  return (
    <DataTable data={payments} columns={PAY_COLS} keyField="id" searchable searchPlaceholder="Search customer, status..."
      searchFields={["owner_email", "brand_name", "status", "provider_payment_id"]} loading={isLoading}
      error={error ? "Failed to load payments" : undefined} emptyTitle="No payments" emptyMessage="No payments recorded yet." exportFilename="payments" />
  );
}

// ─── Checkouts ──────────────────────────────────────────────────────────────────

interface CheckoutRow { id: string; brand_name?: string; owner_email?: string; plan_id?: string; billing_interval?: string; currency?: string; localized_price?: number; status: string; pricing_region?: string; created_at?: string; completed_at?: string; }
const CHK_COLS: Column<CheckoutRow>[] = [
  { key: "created_at", header: "Created", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
  { key: "owner_email", header: "Customer", render: r => <span className="text-sm text-ink-1">{r.owner_email ?? r.brand_name ?? "—"}</span> },
  { key: "plan_id", header: "Plan", render: r => <Badge variant="brand">{r.plan_id ?? "—"}</Badge> },
  { key: "localized_price", header: "Price", sortable: true, render: r => <span className="text-sm text-ink-1">{money(r.localized_price, r.currency ?? "USD")}</span> },
  { key: "status", header: "Status", sortable: true, render: r => <Badge variant={statusBadge(r.status)} dot>{r.status}</Badge> },
  { key: "pricing_region", header: "Region", render: r => <span className="text-xs text-ink-3">{r.pricing_region ?? "—"}</span> },
  { key: "completed_at", header: "Completed", render: r => <span className="text-sm text-ink-2">{fmt(r.completed_at)}</span> },
];
function CheckoutsTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["billing-checkouts"], queryFn: apiGetBillingCheckouts, staleTime: 60_000 });
  const checkouts = (data?.checkouts ?? []) as CheckoutRow[];
  return (
    <DataTable data={checkouts} columns={CHK_COLS} keyField="id" searchable searchPlaceholder="Search customer, status, region..."
      searchFields={["owner_email", "brand_name", "status", "plan_id"]} loading={isLoading}
      error={error ? "Failed to load checkouts" : undefined} emptyTitle="No checkouts" emptyMessage="No checkout sessions yet." exportFilename="checkouts"
      filters={<select className="os-input h-8 text-xs w-36" defaultValue=""><option value="">All statuses</option><option value="created">Created</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select>} />
  );
}

// ─── Refunds (policy-gated; NO freeform amount) ─────────────────────────────────

interface RefundRow { id: string; payment_id: string; brand_id: string; brand_name?: string; owner_email?: string; reason: string; eligible: number; refund_percent: number; refund_amount: number; status: string; policy_version: string; statutory_override: number; created_at?: string; }

function RefundsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["billing-refunds"], queryFn: apiListRefunds, staleTime: 30_000 });
  const { data: payData } = useQuery({ queryKey: ["billing-payments"], queryFn: apiGetBillingPayments });
  const refunds = (data?.refund_requests ?? []) as RefundRow[];
  const payments = ((payData?.payments ?? []) as PayRow[]).filter(p => p.status === "succeeded");

  const [showForm, setShowForm] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const requestMut = useMutation({
    mutationFn: () => apiRequestRefund({ payment_id: paymentId, reason }),
    onSuccess: (res) => {
      toast.success(res.eligible ? `Eligible — ${res.refund_percent}% (${money(res.refund_amount, res.currency)})` : "Created — not eligible", res.policy_reason);
      setPaymentId(""); setReason(""); setShowForm(false);
      qc.invalidateQueries({ queryKey: ["billing-refunds"] });
    },
    onError: () => toast.error("Refund request failed"),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => apiApproveRefund(id),
    onSuccess: () => { toast.success("Refund approved & processed"); setConfirmApprove(null); qc.invalidateQueries({ queryKey: ["billing-refunds"] }); },
    onError: () => toast.error("Approve failed (provider or eligibility)"),
  });
  const rejectMut = useMutation({
    mutationFn: () => apiRejectRefund(rejectId as string, rejectReason),
    onSuccess: () => { toast.success("Refund rejected"); setRejectId(null); setRejectReason(""); qc.invalidateQueries({ queryKey: ["billing-refunds"] }); },
    onError: () => toast.error("Reject failed"),
  });

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-sm font-semibold text-ink-1">Request Refund</h2>
            <p className="text-2xs text-ink-3 mt-0.5 flex items-center gap-1"><Lock className="h-3 w-3" />Policy-gated · no manual amounts · eligibility computed by the locked policy engine</p>
          </div>
          <Button variant="primary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setShowForm(v => !v)}>{showForm ? "Cancel" : "New request"}</Button>
        </div>
        {showForm && (
          <div className="space-y-3 pt-3 border-t border-os-border mt-3">
            <div>
              <label className="block text-xs text-ink-3 mb-1 font-medium">Payment (succeeded only)</label>
              <select className="os-input w-full h-9 text-sm" value={paymentId} onChange={e => setPaymentId(e.target.value)}>
                <option value="">Select a payment…</option>
                {payments.map(p => <option key={p.id} value={p.id}>{(p.owner_email ?? p.brand_name)} — {money(p.amount, p.currency)} — {fmt(p.occurred_at)}</option>)}
              </select>
            </div>
            <Input label="Reason" value={reason} onChange={e => setReason(e.target.value)} hint="Required for audit trail" />
            <div className="flex gap-2 pt-1">
              <Button variant="primary" onClick={() => requestMut.mutate()} loading={requestMut.isPending} disabled={!paymentId || !reason.trim()}>Compute eligibility</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-ink-3" /><h2 className="text-sm font-semibold text-ink-1">Refund Requests</h2>
          <Badge variant="neutral">{refunds.length}</Badge>
        </div>
        {isLoading ? <div className="p-4 space-y-2 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-os-raised rounded" />)}</div>
          : refunds.length === 0 ? <p className="px-4 py-8 text-center text-sm text-ink-3">No refund requests.</p>
          : (
            <div className="divide-y divide-os-border">
              {refunds.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-1">{r.owner_email ?? r.brand_name ?? r.brand_id}</span>
                      <Badge variant={r.eligible ? "success" : "neutral"}>{r.eligible ? `eligible ${r.refund_percent}%` : "ineligible"}</Badge>
                      {!!r.statutory_override && <Badge variant="warning">statutory</Badge>}
                    </div>
                    <p className="text-2xs text-ink-3 mt-0.5">{r.reason} · {fmt(r.created_at)} · policy {r.policy_version}</p>
                  </div>
                  <span className="text-sm font-medium text-ink-1">{money(r.refund_amount)}</span>
                  <Badge variant={statusBadge(r.status)}>{r.status}</Badge>
                  {(r.status === "requested" || r.status === "processing") && (
                    <div className="flex gap-1.5">
                      <Button variant="primary" size="sm" icon={<CheckCircle className="h-3 w-3" />} disabled={!r.eligible} onClick={() => setConfirmApprove(r.id)} loading={approveMut.isPending && confirmApprove === r.id}>Approve</Button>
                      <Button variant="secondary" size="sm" onClick={() => setRejectId(r.id)}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </Card>

      <ConfirmDialog open={!!confirmApprove} onClose={() => setConfirmApprove(null)} onConfirm={() => confirmApprove && approveMut.mutate(confirmApprove)} title="Approve refund" description="This issues the refund via the payment provider and recognizes it against revenue. Cannot be undone." confirmLabel="Approve & process" confirmVariant="primary" loading={approveMut.isPending} type="info" />

      <Dialog
        open={!!rejectId}
        onClose={() => { setRejectId(null); setRejectReason(""); }}
        title="Reject refund"
        description="Provide a reason for rejecting this refund request."
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="danger" onClick={() => rejectMut.mutate()} loading={rejectMut.isPending} disabled={!rejectReason.trim()}>Reject</Button>
          </>
        }
      >
        <Input label="Rejection reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} hint="Required" />
      </Dialog>
    </div>
  );
}

// ─── Compliance ─────────────────────────────────────────────────────────────────

function ComplianceTab() {
  const { data: raw, isLoading } = useQuery({ queryKey: ["billing-compliance"], queryFn: apiGetBillingCompliance });
  const data = (raw ?? {}) as Record<string, any>;
  const provider = (data.provider ?? {}) as any;
  const activity = (data.activity_30d ?? {}) as any;
  const tax = (data.tax ?? {}) as any;
  const invoices = (data.invoices ?? {}) as any;
  const regional = (data.regional_pricing ?? {}) as any;

  const statusBadgeFor = (s?: string) => s === "operational" || s === "ready" ? "success" : s === "not_configured" || s === "not_available" ? "warning" : "neutral";

  if (isLoading) return <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-os-raised rounded-lg" />)}</div>;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-ink-3" /><h2 className="text-sm font-semibold text-ink-1">Provider Health</h2><Badge variant={statusBadgeFor(provider.status)} className="ml-auto">{provider.status}</Badge></div>
        <div className="divide-y divide-os-border">
          {[
            { label: "Provider", value: provider.name ?? "—" },
            { label: "API key", value: provider.api_key_configured ? "configured" : "missing" },
            { label: "Webhook secret", value: provider.webhook_secret_configured ? "configured" : "missing" },
            { label: "Environment", value: provider.environment ?? "—" },
            { label: "Succeeded (30d)", value: activity.payments_succeeded ?? 0 },
            { label: "Failed (30d)", value: activity.payments_failed ?? 0 },
            { label: "Last payment", value: fmt(activity.last_payment_at) },
          ].map(row => (<div key={row.label} className="flex items-center justify-between py-2"><span className="text-xs text-ink-3">{row.label}</span><span className="text-xs text-ink-1">{String(row.value)}</span></div>))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-2"><Percent className="h-4 w-4 text-ink-3" /><h2 className="text-sm font-semibold text-ink-1">Tax</h2><Badge variant={statusBadgeFor(tax.status)} className="ml-auto">{tax.status}</Badge></div>
          <p className="text-xs text-ink-3">{tax.note}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2"><CreditCard className="h-4 w-4 text-ink-3" /><h2 className="text-sm font-semibold text-ink-1">Invoices</h2><Badge variant={statusBadgeFor(invoices.status)} className="ml-auto">{invoices.status}</Badge></div>
          <p className="text-xs text-ink-3 flex items-center gap-1">{!invoices.available && <AlertTriangle className="h-3 w-3 text-amber-400" />}{invoices.note ?? "Invoice generation available."}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2"><Globe className="h-4 w-4 text-ink-3" /><h2 className="text-sm font-semibold text-ink-1">Regional Pricing</h2><Badge variant="neutral" className="ml-auto">{regional.total_rows ?? 0} rows</Badge></div>
          {(regional.regions ?? []).length === 0 ? <p className="text-xs text-ink-3">No regional pricing configured.</p> : (
            <div className="space-y-1">
              {(regional.regions ?? []).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs"><span className="text-ink-2 capitalize">{r.region}</span><span className="text-ink-3">{r.currency} · {r.plans} plans</span></div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  return (
    <WorkspaceLayout
      workspace="billing" title="Billing" subtitle="Observe and operate money movement"
      onRefresh={() => ["billing-overview-v2","billing-subscriptions","billing-payments","billing-checkouts","billing-refunds","billing-compliance"].forEach(k => qc.invalidateQueries({ queryKey: [k] }))}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", icon: <BarChart2 className="h-3.5 w-3.5" /> },
            { id: "subscriptions", label: "Subscriptions", icon: <Users className="h-3.5 w-3.5" /> },
            { id: "payments", label: "Payments", icon: <CreditCard className="h-3.5 w-3.5" /> },
            { id: "checkouts", label: "Checkouts", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
            { id: "refunds", label: "Refunds", icon: <RefreshCw className="h-3.5 w-3.5" /> },
            { id: "compliance", label: "Compliance", icon: <Shield className="h-3.5 w-3.5" /> },
          ]}
          active={tab} onChange={setTab}
        />
      </div>
      {tab === "overview" && <OverviewTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "checkouts" && <CheckoutsTab />}
      {tab === "refunds" && <RefundsTab />}
      {tab === "compliance" && <ComplianceTab />}
    </WorkspaceLayout>
  );
}
