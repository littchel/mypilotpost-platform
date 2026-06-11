"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetBillingOverview, apiGetMrrHistory,
  apiListPromotions, apiCreatePromotion,
  apiGetCommsDelivery, apiListDeletions, apiListExports,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import {
  DollarSign, TrendingUp, Users, Tag, BarChart2,
  Shield, Download, Plus,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Promotion, ComplianceDeletion } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function OverviewTab() {
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ["billing-overview"], queryFn: apiGetBillingOverview,
  });
  const { data: mrrData } = useQuery({
    queryKey: ["mrr-history"], queryFn: apiGetMrrHistory,
  });
  const { data: commsData } = useQuery({
    queryKey: ["comms-delivery"], queryFn: apiGetCommsDelivery,
  });

  const mrr = (overview?.mrr ?? 0) / 100;
  const arr = mrr * 12;
  const history = mrrData?.history ?? [];
  const comms = commsData?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="MRR" value={`R${mrr.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="success" loading={ovLoading} sub={overview?.currency} />
        <StatCard label="ARR (est.)" value={`R${arr.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} loading={ovLoading} />
        <StatCard label="Active subs" value={(overview?.active_subscriptions ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} loading={ovLoading} />
        <StatCard label="Trial subs" value={(overview?.trial_subscriptions ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} accent="warning" loading={ovLoading} />
      </div>

      {/* MRR chart */}
      {history.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">MRR History</h2>
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

      {/* Plan distribution */}
      {(overview?.distribution ?? []).length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-ink-1 mb-3">Plan Distribution</h2>
          <div className="space-y-2">
            {(overview?.distribution ?? []).map((d: { name: string; count: number }) => {
              const total = (overview?.total_customers ?? 1);
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

      {/* Comms delivery */}
      {comms.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border">
            <h2 className="text-sm font-semibold text-ink-1">Notification Delivery</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-os-border">
                <th className="os-table-th">Channel</th>
                <th className="os-table-th">Status</th>
                <th className="os-table-th text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {comms.map((row, i) => (
                <tr key={i} className="border-b border-os-border/40">
                  <td className="os-table-td capitalize">{row.channel}</td>
                  <td className="os-table-td"><Badge variant={statusBadge(row.status)}>{row.status}</Badge></td>
                  <td className="os-table-td text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

const PROMO_COLS: Column<Promotion>[] = [
  { key: "code", header: "Code", sortable: true, render: r => <span className="font-mono text-sm text-ink-1">{r.code}</span> },
  { key: "type", header: "Type", render: r => <Badge variant="brand">{r.type}</Badge> },
  { key: "value", header: "Value", sortable: true, render: r => (
    <span className="text-sm text-ink-1">{r.type === "percent" ? `${r.value}%` : r.type === "fixed" ? `R${r.value}` : `${r.value} days`}</span>
  )},
  { key: "used_count", header: "Used", sortable: true, render: r => (
    <span className="text-sm text-ink-2">{r.used_count ?? 0}{r.max_uses ? ` / ${r.max_uses}` : ""}</span>
  )},
  { key: "is_active", header: "Status", render: r => <Badge variant={r.is_active ? "success" : "neutral"}>{r.is_active ? "Active" : "Inactive"}</Badge> },
  { key: "expires_at", header: "Expires", render: r => <span className="text-sm text-ink-2">{fmt(r.expires_at)}</span> },
];

function PromotionsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", max_uses: "", expires_at: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["promotions"], queryFn: apiListPromotions,
  });

  const createMut = useMutation({
    mutationFn: () => apiCreatePromotion({
      ...form,
      value: parseFloat(form.value),
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
    }),
    onSuccess: () => {
      toast.success("Promotion created");
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setShowCreate(false);
      setForm({ code: "", type: "percent", value: "", max_uses: "", expires_at: "" });
    },
    onError: () => toast.error("Failed to create promotion"),
  });

  return (
    <>
      <DataTable
        data={data?.promotions ?? []}
        columns={PROMO_COLS}
        keyField="id"
        loading={isLoading}
        error={error ? "Failed to load promotions" : undefined}
        emptyTitle="No promotions"
        emptyMessage="Create your first coupon or promotion code."
        exportFilename="promotions"
        searchable
        searchPlaceholder="Search codes..."
        toolbar={
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
            New promotion
          </Button>
        }
      />

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Create Promotion" width="sm"
        footer={
          <div className="flex gap-2">
            <Button loading={createMut.isPending} disabled={!form.code || !form.value} onClick={() => createMut.mutate()}>
              Create
            </Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Code" required value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="SAVE20" />
          <Select label="Type" required
            options={[{ value: "percent", label: "Percent discount" }, { value: "fixed", label: "Fixed amount (R)" }, { value: "trial_days", label: "Trial extension (days)" }]}
            value={form.type}
            onChange={v => setForm(f => ({...f, type: v}))} />
          <Input label={form.type === "percent" ? "Percent (%)" : form.type === "fixed" ? "Amount (R)" : "Days"} required type="number" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} />
          <Input label="Max uses" type="number" value={form.max_uses} onChange={e => setForm(f => ({...f, max_uses: e.target.value}))} hint="Leave blank for unlimited" />
          <Input label="Expires at" type="date" value={form.expires_at} onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} />
        </div>
      </Drawer>
    </>
  );
}

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

export default function BillingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  return (
    <WorkspaceLayout
      workspace="billing"
      title="Billing Operations"
      subtitle="Revenue, subscriptions, promotions, compliance"
      onRefresh={() => {
        ["billing-overview","mrr-history","promotions","deletions","exports"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", icon: <BarChart2 className="h-3.5 w-3.5" /> },
            { id: "promotions", label: "Promotions", icon: <Tag className="h-3.5 w-3.5" /> },
            { id: "compliance", label: "Compliance", icon: <Shield className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "promotions" && <PromotionsTab />}
      {tab === "compliance" && <ComplianceTab />}
    </WorkspaceLayout>
  );
}
