"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListPlans, apiCreatePlan, apiUpdatePlan, apiClonePlan,
  apiGetCommercialMetrics, apiGetPlanVersions, apiGetRewards,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input, Select, Toggle } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  Package, TrendingUp, Gift, History, Plus, Copy,
  DollarSign, Users,
} from "lucide-react";
import type { Plan, PlanVersion, RewardsOverview } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

const PLAN_COLS: Column<Plan>[] = [
  { key: "name", header: "Name", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{r.name}</span> },
  { key: "slug", header: "Slug", render: r => <span className="font-mono text-xs text-ink-3">{r.slug}</span> },
  { key: "price_monthly", header: "Monthly", sortable: true, render: r => <span className="text-sm text-ink-1">R{((r.price_monthly ?? 0) / 100).toFixed(2)}</span> },
  { key: "price_yearly", header: "Yearly", render: r => r.price_yearly ? <span className="text-sm text-ink-1">R{(r.price_yearly / 100).toFixed(2)}</span> : <span className="text-ink-3">—</span> },
  { key: "billing_interval", header: "Interval", render: r => <Badge variant="brand">{r.billing_interval ?? "monthly"}</Badge> },
  { key: "is_active", header: "Status", render: r => <Badge variant={r.is_active ? "success" : "neutral"}>{r.is_active ? "Active" : "Inactive"}</Badge> },
  { key: "created_at", header: "Created", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

type PlanFormState = {
  name: string; slug: string; description: string;
  price_monthly: string; price_yearly: string; billing_interval: string; currency: string;
  brand_limit: string; posts_per_month_limit: string; user_limit: string;
  is_active: boolean;
};

const EMPTY_FORM: PlanFormState = {
  name: "", slug: "", description: "",
  price_monthly: "", price_yearly: "", billing_interval: "monthly", currency: "ZAR",
  brand_limit: "", posts_per_month_limit: "", user_limit: "",
  is_active: true,
};

function planToForm(p: Plan): PlanFormState {
  return {
    name: p.name ?? "",
    slug: p.slug ?? "",
    description: p.description ?? "",
    price_monthly: p.price_monthly != null ? String(p.price_monthly / 100) : "",
    price_yearly: p.price_yearly != null ? String(p.price_yearly / 100) : "",
    billing_interval: p.billing_interval ?? "monthly",
    currency: p.currency ?? "ZAR",
    brand_limit: p.brand_limit != null ? String(p.brand_limit) : "",
    posts_per_month_limit: p.posts_per_month_limit != null ? String(p.posts_per_month_limit) : "",
    user_limit: p.user_limit != null ? String(p.user_limit) : "",
    is_active: !!p.is_active,
  };
}

function PlanDrawer({ plan, onClose }: { plan: Plan | "new"; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = plan === "new";
  const planId = isNew ? "" : (plan as Plan).id;

  const [form, setForm] = useState<PlanFormState>(isNew ? EMPTY_FORM : planToForm(plan as Plan));
  const [dirty, setDirty] = useState(false);
  const [confirmClone, setConfirmClone] = useState(false);

  const { data: versions } = useQuery({
    queryKey: ["plan-versions", planId],
    queryFn: () => apiGetPlanVersions(planId),
    enabled: !isNew,
  });

  const f = (k: keyof PlanFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, slug: form.slug, description: form.description,
        price_monthly: form.price_monthly ? Math.round(parseFloat(form.price_monthly) * 100) : 0,
        price_yearly: form.price_yearly ? Math.round(parseFloat(form.price_yearly) * 100) : null,
        billing_interval: form.billing_interval, currency: form.currency,
        brand_limit: form.brand_limit ? parseInt(form.brand_limit, 10) : null,
        posts_per_month_limit: form.posts_per_month_limit ? parseInt(form.posts_per_month_limit, 10) : null,
        user_limit: form.user_limit ? parseInt(form.user_limit, 10) : null,
        is_active: form.is_active ? 1 : 0,
      };
      return isNew ? apiCreatePlan(payload) : apiUpdatePlan(planId, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? "Plan created" : "Plan updated");
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDirty(false);
      if (isNew) onClose();
    },
    onError: () => toast.error("Failed to save plan"),
  });

  const cloneMut = useMutation({
    mutationFn: () => apiClonePlan(planId),
    onSuccess: () => { toast.success("Plan cloned"); qc.invalidateQueries({ queryKey: ["plans"] }); setConfirmClone(false); onClose(); },
    onError: () => toast.error("Failed to clone plan"),
  });

  return (
    <>
      <Drawer open onClose={onClose} title={isNew ? "New Plan" : "Edit Plan"} dirty={dirty} width="md"
        footer={
          <div className="flex gap-2 flex-wrap">
            <Button loading={saveMut.isPending} disabled={!form.name} onClick={() => saveMut.mutate()}>Save</Button>
            {!isNew && <Button variant="secondary" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => setConfirmClone(true)}>Clone</Button>}
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={f("name")} />
          <Input label="Slug" value={form.slug} onChange={f("slug")} hint="Auto-generated if blank" />
          <Input label="Description" value={form.description} onChange={f("description")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monthly price (R)" type="number" step="0.01" value={form.price_monthly} onChange={f("price_monthly")} />
            <Input label="Yearly price (R)" type="number" step="0.01" value={form.price_yearly} onChange={f("price_yearly")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Billing interval"
              options={[{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"},{value:"both",label:"Both"}]}
              value={form.billing_interval}
              onChange={v => { setForm(p => ({...p, billing_interval: v})); setDirty(true); }} />
            <Select label="Currency"
              options={[{value:"ZAR",label:"ZAR (R)"},{value:"USD",label:"USD ($)"}]}
              value={form.currency}
              onChange={v => { setForm(p => ({...p, currency: v})); setDirty(true); }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Brand limit" type="number" value={form.brand_limit} onChange={f("brand_limit")} />
            <Input label="Posts/mo limit" type="number" value={form.posts_per_month_limit} onChange={f("posts_per_month_limit")} />
            <Input label="User limit" type="number" value={form.user_limit} onChange={f("user_limit")} />
          </div>
          <Toggle label="Active" checked={form.is_active} onChange={v => { setForm(p => ({...p, is_active: v})); setDirty(true); }} />

          {/* Version history */}
          {((versions as { versions?: PlanVersion[] } | undefined)?.versions ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2 flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Version History</p>
              <div className="space-y-1.5">
                {((versions as { versions?: PlanVersion[] } | undefined)?.versions ?? []).slice(0, 5).map(v => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-os-raised rounded text-xs text-ink-2">
                    <span className="font-mono">{v.changed_by ?? "—"}</span>
                    <span className="text-ink-3">{fmt(v.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {!isNew && (
        <ConfirmDialog
          open={confirmClone} onClose={() => setConfirmClone(false)}
          onConfirm={() => cloneMut.mutate()} loading={cloneMut.isPending}
          title="Clone plan" description={`Create a copy of "${(plan as Plan).name}"?`} />
      )}
    </>
  );
}

function PlansTab() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["plans"], queryFn: apiListPlans,
  });

  const plans: Plan[] = (data as { plans?: Plan[]; data?: Plan[] } | undefined)?.plans
    ?? (data as { plans?: Plan[]; data?: Plan[] } | undefined)?.data ?? [];

  return (
    <>
      <DataTable
        data={plans}
        columns={PLAN_COLS}
        keyField="id"
        searchable
        searchPlaceholder="Search plans..."
        loading={isLoading}
        error={error ? "Failed to load plans" : undefined}
        emptyTitle="No plans"
        exportFilename="plans"
        onRowClick={r => setSelected(r)}
        selectedId={selected?.id}
        toolbar={
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowNew(true)}>
            New plan
          </Button>
        }
      />
      {selected && <PlanDrawer plan={selected} onClose={() => setSelected(null)} />}
      {showNew && <PlanDrawer plan="new" onClose={() => setShowNew(false)} />}
    </>
  );
}

function MetricsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["commercial-metrics"], queryFn: apiGetCommercialMetrics });

  const plans = (data as { plans?: { id: string; name: string; user_count: number; mrr: number }[] } | undefined)?.plans ?? [];
  const total = plans.reduce((s, p) => s + (p.mrr ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total plans" value={String((data as { total_plans?: number } | undefined)?.total_plans ?? 0)} icon={<Package className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Active plans" value={String((data as { active_plans?: number } | undefined)?.active_plans ?? 0)} icon={<Package className="h-4 w-4" />} accent="success" loading={isLoading} />
        <StatCard label="Total features" value={String((data as { total_features?: number } | undefined)?.total_features ?? 0)} icon={<DollarSign className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Est. MRR" value={total ? `R${(total / 100).toLocaleString()}` : "—"} icon={<TrendingUp className="h-4 w-4" />} loading={isLoading} />
      </div>

      {plans.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border">
            <h2 className="text-sm font-semibold text-ink-1">Revenue by Plan</h2>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-os-border">
              <th className="os-table-th">Plan</th>
              <th className="os-table-th text-right">Customers</th>
              <th className="os-table-th text-right">MRR</th>
            </tr></thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className="border-b border-os-border/40">
                  <td className="os-table-td font-medium text-ink-1">{p.name}</td>
                  <td className="os-table-td text-right text-ink-2 tabular-nums">{p.user_count ?? 0}</td>
                  <td className="os-table-td text-right text-ink-1 tabular-nums">R{((p.mrr ?? 0) / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function RewardsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["rewards-overview"], queryFn: apiGetRewards });
  const r = data as RewardsOverview | undefined;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Points issued" value={(r?.total_points_issued ?? 0).toLocaleString()} icon={<Gift className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Active earners" value={(r?.active_users ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} accent="success" loading={isLoading} />
      </div>
      {(r?.top_earners ?? []).length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Top Earners</h2></div>
          <table className="w-full">
            <thead><tr className="border-b border-os-border"><th className="os-table-th">User</th><th className="os-table-th text-right">Points</th></tr></thead>
            <tbody>
              {(r?.top_earners ?? []).map((e, i) => (
                <tr key={i} className="border-b border-os-border/40">
                  <td className="os-table-td text-ink-1">{e.email ?? e.user_id}</td>
                  <td className="os-table-td text-right tabular-nums text-brand-300">{e.points.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function CommercialPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("plans");

  return (
    <WorkspaceLayout
      workspace="commercial"
      title="Commercial Control"
      subtitle="Plans, pricing, metrics, rewards"
      onRefresh={() => {
        ["plans","commercial-metrics","rewards-overview"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "plans", label: "Plans", icon: <Package className="h-3.5 w-3.5" /> },
            { id: "metrics", label: "Metrics", icon: <TrendingUp className="h-3.5 w-3.5" /> },
            { id: "rewards", label: "Rewards", icon: <Gift className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "plans" && <PlansTab />}
      {tab === "metrics" && <MetricsTab />}
      {tab === "rewards" && <RewardsTab />}
    </WorkspaceLayout>
  );
}
