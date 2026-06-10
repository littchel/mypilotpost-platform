"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  apiGetBillingOverview, apiListSubscriptions, apiListPromotions,
  apiCreatePromotion, apiExtendTrial, apiIssueRefund,
} from "@/lib/api";
import { fmtDate, fmtNum } from "@/lib/utils";
import { DollarSign, Users, TrendingUp, AlertCircle, Plus } from "lucide-react";

type BillingTab = "overview" | "subscriptions" | "promotions";

export default function BillingPage() {
  const [tab, setTab] = useState<BillingTab>("overview");

  return (
    <WorkspaceLayout workspace="billing" title="Billing Operations" subtitle="Revenue, subscriptions, and promotions">
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(["overview", "subscriptions", "promotions"] as BillingTab[]).map((t) => (
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

      {tab === "overview" && <BillingOverview />}
      {tab === "subscriptions" && <Subscriptions />}
      {tab === "promotions" && <Promotions />}
    </WorkspaceLayout>
  );
}

function BillingOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: apiGetBillingOverview,
  });

  if (isLoading) return <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={`$${fmtNum(Math.round((data.mrr ?? 0) / 100))}`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="ARR" value={`$${fmtNum(Math.round((data.arr ?? 0) / 100))}`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Active Subscribers" value={fmtNum(data.active_subscribers ?? 0)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Past Due" value={fmtNum(data.past_due ?? 0)} icon={<AlertCircle className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Trial Users" value={fmtNum(data.trial_users ?? 0)} sub="conversion opportunity" />
        <StatCard label="Churned (month)" value={fmtNum(data.churned_this_month ?? 0)} />
        <StatCard label="Conversion Rate" value={`${((data.conversion_rate ?? 0) * 100).toFixed(1)}%`} />
      </div>
    </div>
  );
}

function Subscriptions() {
  const [filter, setFilter] = useState("active");
  const [extendUserId, setExtendUserId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState("7");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", filter],
    queryFn: () => apiListSubscriptions({ status: filter, per_page: 100 }),
  });

  const extendTrial = useMutation({
    mutationFn: ({ userId, days }: { userId: string; days: number }) => apiExtendTrial(userId, days),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); setExtendUserId(null); },
  });

  const subs = data?.data ?? [];

  return (
    <div>
      <div className="mb-4 flex gap-1 flex-wrap">
        {["active", "trial", "past_due", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
        ) : subs.length === 0 ? (
          <EmptyState title="No subscriptions" description="No subscriptions match this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Plan", "Status", "Period end", "Trial ends", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.plan_name ?? s.plan_id}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(s.status)} className="capitalize">{s.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.current_period_end ? fmtDate(s.current_period_end) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.trial_ends_at ? fmtDate(s.trial_ends_at) : "—"}</td>
                    <td className="px-4 py-3">
                      {s.status === "trial" && (
                        <Button size="sm" variant="ghost" onClick={() => setExtendUserId(s.plan_id)}>
                          Extend trial
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer open={!!extendUserId} onClose={() => setExtendUserId(null)} title="Extend Trial" width="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Select how many additional days to add to the trial.</p>
          <select
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
          <div className="flex gap-2">
            <Button
              loading={extendTrial.isPending}
              onClick={() => extendTrial.mutate({ userId: extendUserId!, days: parseInt(extendDays, 10) })}
            >
              Extend trial
            </Button>
            <Button variant="secondary" onClick={() => setExtendUserId(null)}>Cancel</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function Promotions() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent",
    discount_value: "",
    max_uses: "",
    expires_at: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: apiListPromotions,
  });

  const create = useMutation({
    mutationFn: () => apiCreatePromotion({
      ...form,
      discount_value: parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : undefined,
      expires_at: form.expires_at || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["promotions"] }); setShowForm(false); },
  });

  const promos = data?.promotions ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowForm(true)}>
          New promotion
        </Button>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
        ) : promos.length === 0 ? (
          <EmptyState title="No promotions" description="Create your first promotion code." action={<Button onClick={() => setShowForm(true)}>Create</Button>} />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Code", "Type", "Value", "Uses", "Expires", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promos.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-slate-900">{p.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 capitalize">{p.discount_type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{p.discount_type === "percent" ? `${p.discount_value}%` : p.discount_type === "trial_days" ? `${p.discount_value}d` : `$${p.discount_value}`}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.uses_count ?? 0}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.expires_at ? fmtDate(p.expires_at) : "Never"}</td>
                  <td className="px-4 py-3"><Badge variant={p.is_active ? "success" : "neutral"}>{p.is_active ? "Active" : "Inactive"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title="New Promotion" width="sm">
        <div className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount</option>
              <option value="trial_days">Trial days</option>
            </select>
          </div>
          <Input
            label="Value"
            type="number"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            placeholder={form.discount_type === "percent" ? "20" : "500"}
          />
          <Input label="Max uses (optional)" type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          <Input label="Expires at (optional)" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <div className="flex gap-2">
            <Button loading={create.isPending} disabled={!form.code || !form.discount_value} onClick={() => create.mutate()}>
              Create
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
