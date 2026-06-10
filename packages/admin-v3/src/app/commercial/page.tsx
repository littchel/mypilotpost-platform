"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  apiListPlans, apiCreatePlan, apiUpdatePlan, apiArchivePlan, apiClonePlan,
  apiListFeatures, apiListEntitlements, apiUpdateEntitlement,
  apiGetCommercialMetrics,
} from "@/lib/api";
import { fmtNum } from "@/lib/utils";
import type { Plan, PlanFeature, PlanEntitlement } from "@/types";
import { Package, Plus, Copy, Archive, ChevronRight, DollarSign, Users, TrendingUp } from "lucide-react";

type CommTab = "plans" | "features" | "metrics";

export default function CommercialPage() {
  const [tab, setTab] = useState<CommTab>("plans");

  return (
    <WorkspaceLayout workspace="commercial" title="Commercial Control" subtitle="Plans, features, and entitlements">
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(["plans", "features", "metrics"] as CommTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "plans"    && <PlansTab />}
      {tab === "features" && <FeaturesTab />}
      {tab === "metrics"  && <MetricsTab />}
    </WorkspaceLayout>
  );
}

// ── Plans ─────────────────────────────────────────────────────────────────────

function PlansTab() {
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", description: "", price_monthly: "", trial_days: "14",
    billing_interval: "monthly", currency: "ZAR",
  });

  const { data, isLoading } = useQuery({ queryKey: ["plans"], queryFn: apiListPlans });
  const plans = data?.plans ?? [];

  const create = useMutation({
    mutationFn: () => apiCreatePlan({
      ...createForm,
      price_monthly: parseFloat(createForm.price_monthly) || 0,
      trial_days: parseInt(createForm.trial_days, 10),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); setShowCreate(false); },
  });

  const archive = useMutation({
    mutationFn: (planId: string) => apiArchivePlan(planId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); setSelectedPlan(null); },
  });

  const clone = useMutation({
    mutationFn: (planId: string) => apiClonePlan(planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });

  return (
    <div className="flex gap-6">
      {/* Plan list */}
      <div className="w-72 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Plans ({plans.length})</h2>
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>New</Button>
        </div>
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
          ) : plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p)}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                selectedPlan?.id === p.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  {p.badge && <span className="text-xs text-brand-600 font-medium">{p.badge}</span>}
                </div>
                <Badge variant={p.status === "active" ? "success" : p.status === "archived" ? "neutral" : "warning"} className="capitalize">
                  {p.status}
                </Badge>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900">${p.price_monthly}<span className="text-xs font-normal text-slate-500">/mo</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Plan detail / entitlements */}
      <div className="flex-1">
        {selectedPlan ? (
          <PlanDetail
            plan={selectedPlan}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["plans"] })}
            onArchive={() => { if (confirm(`Archive "${selectedPlan.name}"?`)) archive.mutate(selectedPlan.id); }}
            onClone={() => clone.mutate(selectedPlan.id)}
            archiving={archive.isPending}
            cloning={clone.isPending}
          />
        ) : (
          <Card className="flex h-64 items-center justify-center">
            <EmptyState icon={<Package className="h-10 w-10" />} title="Select a plan" description="Click a plan to view and edit entitlements." />
          </Card>
        )}
      </div>

      {/* Create drawer */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Plan" width="sm">
        <div className="space-y-4">
          <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Growth" />
          <Input label="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          <Input label="Monthly price" type="number" value={createForm.price_monthly} onChange={(e) => setCreateForm({ ...createForm, price_monthly: e.target.value })} placeholder="49" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Billing interval</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={createForm.billing_interval}
                onChange={(e) => setCreateForm({ ...createForm, billing_interval: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Currency</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={createForm.currency}
                onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
              >
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <Input label="Trial days" type="number" value={createForm.trial_days} onChange={(e) => setCreateForm({ ...createForm, trial_days: e.target.value })} />
          <div className="flex gap-2">
            <Button loading={create.isPending} disabled={!createForm.name} onClick={() => create.mutate()}>Create plan</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function PlanDetail({
  plan, onRefresh, onArchive, onClone, archiving, cloning,
}: {
  plan: Plan;
  onRefresh: () => void;
  onArchive: () => void;
  onClone: () => void;
  archiving: boolean;
  cloning: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? "",
    price_monthly: String(plan.price_monthly),
    trial_days: String(plan.trial_days),
    badge: plan.badge ?? "",
    visible: plan.visible,
    billing_interval: plan.billing_interval ?? "monthly",
    currency: plan.currency ?? "ZAR",
  });

  const { data: entData } = useQuery({
    queryKey: ["entitlements", plan.id],
    queryFn: () => apiListEntitlements(plan.id),
  });

  const update = useMutation({
    mutationFn: () => apiUpdatePlan(plan.id, {
      ...form,
      price_monthly: parseFloat(form.price_monthly),
      trial_days: parseInt(form.trial_days, 10),
    }),
    onSuccess: () => { onRefresh(); setEditing(false); },
  });

  const updateEnt = useMutation({
    mutationFn: ({ key, body }: { key: string; body: Record<string, unknown> }) =>
      apiUpdateEntitlement(plan.id, key, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entitlements", plan.id] }),
  });

  const entitlements: PlanEntitlement[] = entData?.entitlements ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">{plan.name}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} loading={cloning} onClick={onClone}>Clone</Button>
            {plan.status === "active" && (
              <Button size="sm" variant="ghost" icon={<Archive className="h-3.5 w-3.5" />} loading={archiving} onClick={onArchive}>Archive</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Badge" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Popular" />
            <Input label="Monthly price" type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} />
            <Input label="Trial days" type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Billing interval</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={form.billing_interval}
                onChange={(e) => setForm({ ...form, billing_interval: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Currency</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="col-span-2">
              <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button loading={update.isPending} onClick={() => update.mutate()}>Save changes</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Price</span><p className="font-semibold text-slate-900">{plan.currency ?? "ZAR"} {plan.price_monthly}/mo</p></div>
            <div><span className="text-slate-500">Billing</span><p className="font-semibold capitalize">{plan.billing_interval ?? "monthly"}</p></div>
            <div><span className="text-slate-500">Trial</span><p className="font-semibold text-slate-900">{plan.trial_days} days</p></div>
            <div><span className="text-slate-500">Status</span><p className="font-semibold capitalize">{plan.status}</p></div>
            <div><span className="text-slate-500">Visible</span><p className="font-semibold">{plan.visible ? "Yes" : "No"}</p></div>
            {plan.description && <div className="col-span-2"><span className="text-slate-500">Description</span><p>{plan.description}</p></div>}
          </div>
        )}
      </Card>

      {/* Entitlements */}
      <Card padding="none">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle>Feature Entitlements ({entitlements.length})</CardTitle>
          <p className="text-xs text-slate-400">Toggle features on/off for this plan</p>
        </CardHeader>
        <div className="divide-y divide-slate-50">
          {entitlements.map((ent) => (
            <EntitlementRow
              key={ent.key}
              ent={ent}
              onToggle={(enabled) => updateEnt.mutate({ key: ent.key, body: { enabled: enabled ? 1 : 0 } })}
              onLimitChange={(limit) => updateEnt.mutate({ key: ent.key, body: { limit_value: limit } })}
              saving={updateEnt.isPending}
            />
          ))}
          {entitlements.length === 0 && (
            <p className="px-5 py-4 text-sm text-slate-400">No entitlements configured.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function EntitlementRow({
  ent, onToggle, onLimitChange, saving,
}: {
  ent: PlanEntitlement;
  onToggle: (v: boolean) => void;
  onLimitChange: (v: number | null) => void;
  saving: boolean;
}) {
  const [limitInput, setLimitInput] = useState(String(ent.limit_value ?? ""));

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{ent.name}</p>
        <p className="text-xs text-slate-400 capitalize">{ent.category ?? ent.limit_type}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {ent.limit_type !== "boolean" && ent.enabled ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onBlur={() => onLimitChange(limitInput ? parseInt(limitInput, 10) : null)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-xs text-center"
              placeholder="∞"
            />
            <span className="text-xs text-slate-400">/mo</span>
          </div>
        ) : null}
        {/* Toggle */}
        <button
          disabled={saving}
          onClick={() => onToggle(!ent.enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
            ent.enabled ? "bg-brand-600" : "bg-slate-300"
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${ent.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function FeaturesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", category: "core" });

  const { data, isLoading } = useQuery({ queryKey: ["features"], queryFn: apiListFeatures });
  const features = data?.features ?? [];

  const create = useMutation({
    mutationFn: () => apiListFeatures(), // placeholder — calls createFeature via api
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features"] }),
  });

  const grouped = features.reduce<Record<string, PlanFeature[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="h-3.5 w-3.5" />} size="sm" onClick={() => setShowCreate(true)}>Add feature</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, feats]) => (
            <Card key={cat} padding="none">
              <CardHeader className="border-b border-slate-100 px-5 py-3">
                <CardTitle className="capitalize">{cat} ({feats.length})</CardTitle>
              </CardHeader>
              <div className="divide-y divide-slate-50">
                {feats.map((f) => (
                  <div key={f.key} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{f.name}</p>
                      {f.description && <p className="text-xs text-slate-400">{f.description}</p>}
                    </div>
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{f.key}</code>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {features.length === 0 && (
            <EmptyState title="No features" description="Add your first feature to the catalog." />
          )}
        </div>
      )}
    </div>
  );
}

// ── Metrics ───────────────────────────────────────────────────────────────────

function MetricsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["commercial-metrics"],
    queryFn: apiGetCommercialMetrics,
  });

  if (isLoading) return <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;
  if (!data) return null;

  const { revenue, subscribers, growth, plans } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={`$${fmtNum(Math.round(revenue.mrr / 100))}`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="ARR" value={`$${fmtNum(Math.round(revenue.arr / 100))}`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="ARPU" value={`$${fmtNum(Math.round(revenue.arpu / 100))}`} />
        <StatCard label="LTV" value={`$${fmtNum(Math.round(revenue.ltv / 100))}`} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Active" value={fmtNum(subscribers.active)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Trial" value={fmtNum(subscribers.trial)} sub="conversion opportunity" />
        <StatCard label="Churn (month)" value={fmtNum(growth.churned_this_month)} />
      </div>

      {/* Plans breakdown */}
      <Card padding="none">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle>Plan Breakdown</CardTitle>
        </CardHeader>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Plan", "Active", "Trial", "MRR", "Conversion"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{fmtNum(p.active_subscribers ?? p.users ?? 0)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{fmtNum(p.trial_subscribers ?? 0)}</td>
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">${fmtNum(Math.round((p.plan_mrr ?? p.mrr ?? 0) / 100))}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.conversion_rate != null ? `${(p.conversion_rate * 100).toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
