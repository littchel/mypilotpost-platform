"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetBillingOverview, apiGetMrrHistory,
  apiGetCommsDelivery, apiListDeletions, apiListExports,
  apiListCustomers, apiIssueRefund,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import {
  DollarSign, TrendingUp, Users, BarChart2,
  Shield, Download, RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { ComplianceDeletion, Customer } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ["billing-overview"], queryFn: apiGetBillingOverview,
  });
  const { data: mrrData } = useQuery({
    queryKey: ["mrr-history"], queryFn: apiGetMrrHistory,
  });

  const mrr = (overview?.mrr ?? 0) / 100;
  const arr = mrr * 12;
  const history = mrrData?.history ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="MRR (ZAR)" value={`R${mrr.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="success" loading={ovLoading} sub="South Africa" />
        <StatCard label="ARR (est.)" value={`R${arr.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} loading={ovLoading} />
        <StatCard label="Active subscriptions" value={(overview?.active_subscriptions ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} loading={ovLoading} />
        <StatCard label="Trial subscriptions" value={(overview?.trial_subscriptions ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} accent="warning" loading={ovLoading} />
      </div>

      {history.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">MRR History (ZAR)</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={history.slice().reverse()}>
              <XAxis dataKey="month" tick={{ fill: "#4A5275", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4A5275", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R${v}`} />
              <Tooltip
                contentStyle={{ background: "#1A2035", border: "1px solid #252D42", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v) => [`R${Number(v).toLocaleString()}`, "MRR"]}
                labelStyle={{ color: "#8892B0" }}
              />
              <Bar dataKey="mrr" fill="#6068E8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(overview?.distribution ?? []).length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-ink-1 mb-3">Plan Distribution</h2>
          <div className="space-y-2">
            {(overview?.distribution ?? []).map((d: { name: string; count: number }) => {
              const total = overview?.total_customers ?? 1;
              const pct = Math.round((d.count / total) * 100);
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-sm text-ink-2 w-24 shrink-0 truncate">{d.name}</span>
                  <div className="flex-1 h-2 bg-os-raised rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-ink-3 w-8 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Subscriptions tab ────────────────────────────────────────────────────────

const SUB_COLS: Column<Customer>[] = [
  {
    key: "email", header: "Customer", sortable: true,
    render: r => (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-300">{r.email[0].toUpperCase()}</span>
        </div>
        <span className="text-sm text-ink-1">{r.email}</span>
      </div>
    ),
  },
  {
    key: "subscription_status", header: "Status", sortable: true,
    render: r => (
      <Badge variant={r.is_active ? statusBadge(r.subscription_status ?? "inactive") : "danger"} dot>
        {r.is_active ? (r.subscription_status ?? "inactive") : "disabled"}
      </Badge>
    ),
  },
  { key: "plan_name", header: "Plan", sortable: true, render: r => r.plan_name ? <Badge variant="brand">{r.plan_name}</Badge> : <span className="text-ink-3">Free</span> },
  {
    key: "price_monthly", header: "MRR", sortable: true,
    render: r => r.price_monthly && r.subscription_status === "active"
      ? <span className="text-sm font-medium text-green-400">R{(r.price_monthly / 100).toLocaleString()}</span>
      : <span className="text-ink-3">—</span>,
  },
  { key: "created_at", header: "Since", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
  { key: "trial_extended_until", header: "Trial until", render: r => <span className="text-sm text-ink-2">{fmt(r.trial_extended_until)}</span> },
];

function SubscriptionsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers-subscriptions"],
    queryFn: () => apiListCustomers({ limit: 1000 }),
    staleTime: 60_000,
  });

  const customers = data?.data ?? [];

  return (
    <DataTable
      data={customers}
      columns={SUB_COLS}
      keyField="id"
      searchable
      searchPlaceholder="Search customer or plan..."
      searchFields={["email", "plan_name", "subscription_status"]}
      loading={isLoading}
      error={error ? "Failed to load subscriptions" : undefined}
      emptyTitle="No subscriptions"
      exportFilename="subscriptions"
      filters={
        <select className="os-input h-8 text-xs w-36" defaultValue="">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
        </select>
      }
    />
  );
}

// ─── Refunds tab ──────────────────────────────────────────────────────────────

function RefundsTab() {
  const toast = useToast();
  const { data: customersData } = useQuery({
    queryKey: ["customers-refund"],
    queryFn: () => apiListCustomers({ limit: 500 }),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", amount: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const customers = (customersData?.data ?? []).filter(c => c.subscription_status === "active");

  const handleSubmit = async () => {
    if (!form.customer_id || !form.amount || !form.reason) {
      toast.error("All fields required");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiIssueRefund(form.customer_id, parseFloat(form.amount) * 100, form.reason);
      if (result.success) {
        toast.success("Refund issued");
        setForm({ customer_id: "", amount: "", reason: "" });
        setShowForm(false);
      } else {
        toast.error("Refund failed");
      }
    } catch {
      toast.error("Refund request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-1">Issue Refund</h2>
          <Button variant="primary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setShowForm(v => !v)}>
            {showForm ? "Cancel" : "New refund"}
          </Button>
        </div>
        {showForm && (
          <div className="space-y-3 pt-3 border-t border-os-border">
            <div>
              <label className="block text-xs text-ink-3 mb-1 font-medium">Customer (active subscriptions)</label>
              <select
                className="os-input w-full h-9 text-sm"
                value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">Select customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.email} — {c.plan_name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Amount (R)"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              hint="Enter amount in Rand (ZAR)"
            />
            <Input
              label="Reason"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              hint="Required for audit trail"
            />
            <div className="flex gap-2 pt-1">
              <Button variant="danger" onClick={handleSubmit} loading={submitting} disabled={!form.customer_id || !form.amount || !form.reason}>
                Issue refund
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {!showForm && (
          <p className="text-sm text-ink-3">Use this form to issue a manual refund to an active subscriber. All refunds are audited.</p>
        )}
      </Card>
    </div>
  );
}

// ─── Compliance tab ───────────────────────────────────────────────────────────

const DEL_COLS: Column<ComplianceDeletion>[] = [
  { key: "email", header: "Email", render: r => <span className="text-sm text-ink-1">{r.email ?? r.user_id}</span> },
  { key: "status", header: "Status", render: r => <Badge variant={statusBadge(r.status)}>{r.status}</Badge> },
  { key: "requested_at", header: "Requested", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.requested_at)}</span> },
  { key: "scheduled_for", header: "Scheduled", render: r => <span className="text-sm text-ink-2">{fmt(r.scheduled_for)}</span> },
  { key: "completed_at", header: "Completed", render: r => <span className="text-sm text-ink-2">{fmt(r.completed_at)}</span> },
];

function ComplianceTab() {
  const { data: delData, isLoading: delLoading } = useQuery({ queryKey: ["deletions"], queryFn: apiListDeletions });
  const { data: expData, isLoading: expLoading } = useQuery({ queryKey: ["exports"], queryFn: apiListExports });

  return (
    <div className="space-y-5">
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-ink-3" />
          <h2 className="text-sm font-semibold text-ink-1">Deletion Requests</h2>
          <Badge variant="neutral">{(delData?.data ?? []).length}</Badge>
        </div>
        <DataTable
          data={delData?.data ?? []}
          columns={DEL_COLS}
          keyField="id"
          loading={delLoading}
          emptyTitle="No deletion requests"
          exportFilename="deletions"
          searchable
        />
      </Card>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
          <Download className="h-4 w-4 text-ink-3" />
          <h2 className="text-sm font-semibold text-ink-1">Data Export Requests</h2>
          <Badge variant="neutral">{(expData?.data ?? []).length}</Badge>
        </div>
        <DataTable
          data={expData?.data ?? []}
          columns={[
            { key: "email", header: "Email", render: r => <span className="text-sm text-ink-1">{(r as {email?:string;user_id?:string}).email ?? (r as {user_id?:string}).user_id}</span> },
            { key: "status", header: "Status", render: r => <Badge variant={statusBadge((r as {status:string}).status)}>{(r as {status:string}).status}</Badge> },
            { key: "requested_at", header: "Requested", render: r => <span className="text-sm text-ink-2">{fmt((r as {requested_at?:string}).requested_at)}</span> },
            { key: "completed_at", header: "Completed", render: r => <span className="text-sm text-ink-2">{fmt((r as {completed_at?:string}).completed_at)}</span> },
          ]}
          keyField="id"
          loading={expLoading}
          emptyTitle="No export requests"
          exportFilename="exports"
          searchable
        />
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  return (
    <WorkspaceLayout
      workspace="billing"
      title="Billing"
      subtitle="Revenue, subscriptions, refunds, compliance"
      onRefresh={() => {
        ["billing-overview","mrr-history","customers-subscriptions","deletions","exports"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", icon: <BarChart2 className="h-3.5 w-3.5" /> },
            { id: "subscriptions", label: "Subscriptions", icon: <Users className="h-3.5 w-3.5" /> },
            { id: "refunds", label: "Refunds", icon: <RefreshCw className="h-3.5 w-3.5" /> },
            { id: "compliance", label: "Compliance", icon: <Shield className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "refunds" && <RefundsTab />}
      {tab === "compliance" && <ComplianceTab />}
    </WorkspaceLayout>
  );
}
