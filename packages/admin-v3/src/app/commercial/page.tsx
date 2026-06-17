"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListPlans, apiCreatePlan, apiUpdatePlan, apiClonePlan, apiGetPlanVersions, apiArchivePlan,
  apiListFeatures, apiCreateFeature, apiUpdateFeature,
  apiListEntitlements, apiUpdateEntitlement,
  apiListPromotions, apiCreatePromotion, apiDeletePromotion,
  apiGetCommercialMetrics,
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
  Package, TrendingUp, Tag, History, Plus, Copy, Archive,
  DollarSign, Users, Zap, List, Trash,
} from "lucide-react";
import type { Plan, PlanFeature, PlanEntitlement, PlanVersion, Promotion } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
function money(cents?: number | null, currency = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
}

// ─── Plans tab ────────────────────────────────────────────────────────────────

const PLAN_COLS: Column<Plan>[] = [
  { key: "name", header: "Name", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{r.name}</span> },
  { key: "slug", header: "Slug", render: r => <span className="font-mono text-xs text-ink-3">{r.slug}</span> },
  { key: "price_monthly", header: "Monthly", sortable: true, render: r => <span className="text-sm text-ink-1">{money(r.price_cents ?? (r.price_monthly ?? 0) * 100, r.currency ?? "USD")}</span> },
  { key: "currency", header: "Currency", render: r => <span className="text-xs text-ink-3">{r.currency ?? "USD"}</span> },
  { key: "is_active", header: "Status", render: r => <Badge variant={r.is_active ? "success" : "neutral"}>{r.is_active ? "Active" : "Inactive"}</Badge> },
  { key: "created_at", header: "Created", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

type PlanFormState = {
  name: string; slug: string; description: string;
  price_monthly: string; price_yearly: string; billing_interval: string; currency: string;
  brand_limit: string; posts_per_month_limit: string; user_limit: string;
  is_active: boolean;
  visible: boolean;
};

const EMPTY_PLAN: PlanFormState = {
  name: "", slug: "", description: "",
  price_monthly: "", price_yearly: "", billing_interval: "monthly", currency: "USD",
  brand_limit: "", posts_per_month_limit: "", user_limit: "",
  is_active: true,
  visible: true,
};

function planToForm(p: Plan): PlanFormState {
  // Canonical price source is price_cents (cents). price_monthly/price_yearly are MAJOR units (dollars).
  return {
    name: p.name ?? "", slug: p.slug ?? "", description: p.description ?? "",
    price_monthly: p.price_cents != null ? String(p.price_cents / 100) : (p.price_monthly != null ? String(p.price_monthly) : ""),
    price_yearly: p.price_yearly != null ? String(p.price_yearly) : "",
    billing_interval: p.billing_interval ?? "monthly", currency: p.currency ?? "USD",
    brand_limit: p.brand_limit != null ? String(p.brand_limit) : "",
    posts_per_month_limit: p.posts_per_month_limit != null ? String(p.posts_per_month_limit) : "",
    user_limit: p.user_limit != null ? String(p.user_limit) : "",
    is_active: !!p.is_active,
    visible: (p as any).visible ?? true,
  };
}

function PlanDrawer({ plan, onClose }: { plan: Plan | "new"; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = plan === "new";
  const planId = isNew ? "" : (plan as Plan).id;

  const [form, setForm] = useState<PlanFormState>(isNew ? EMPTY_PLAN : planToForm(plan as Plan));
  const [dirty, setDirty] = useState(false);
  const [confirmClone, setConfirmClone] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [applyTo, setApplyTo] = useState<"new" | "migrate">("new");

  // Did the monthly price change vs the stored plan? (drives the grandfather/migrate choice)
  const originalMonthly = isNew ? null : (((plan as Plan).price_cents ?? 0) / 100);
  const priceChanged = !isNew && form.price_monthly !== "" && parseFloat(form.price_monthly) !== originalMonthly;

  const { data: versions } = useQuery({
    queryKey: ["plan-versions", planId],
    queryFn: () => apiGetPlanVersions(planId),
    enabled: !isNew,
  });

  const f = (k: keyof PlanFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value })); setDirty(true);
  };

  const saveMut = useMutation<Record<string, unknown>, Error>({
    mutationFn: async () => {
      // price_monthly/price_yearly are sent in MAJOR units (dollars); backend converts to cents.
      const payload: Record<string, unknown> = {
        name: form.name, slug: form.slug, description: form.description,
        price_monthly: form.price_monthly ? parseFloat(form.price_monthly) : 0,
        price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : null,
        billing_interval: form.billing_interval, currency: form.currency,
        brand_limit: form.brand_limit ? parseInt(form.brand_limit, 10) : null,
        posts_per_month_limit: form.posts_per_month_limit ? parseInt(form.posts_per_month_limit, 10) : null,
        user_limit: form.user_limit ? parseInt(form.user_limit, 10) : null,
        is_active: form.is_active ? 1 : 0,
        visible: form.visible ? 1 : 0,
      };
      if (!isNew) payload.apply_to = applyTo;
      return isNew ? apiCreatePlan(payload) : apiUpdatePlan(planId, payload);
    },
    onSuccess: (res) => {
      const r = res as { impact_count?: number; migrated?: number };
      if (!isNew && priceChanged && applyTo === "migrate") {
        toast.success("Plan updated", `${r.migrated ?? 0} of ${r.impact_count ?? 0} subscribers migrated to the new price`);
      } else if (!isNew && priceChanged) {
        toast.success("Plan updated", `${r.impact_count ?? 0} existing subscribers grandfathered (kept old price)`);
      } else {
        toast.success(isNew ? "Plan created" : "Plan updated");
      }
      qc.invalidateQueries({ queryKey: ["plans"] }); setDirty(false);
      if (isNew) onClose();
    },
    onError: () => toast.error("Failed to save plan"),
  });

  const cloneMut = useMutation({
    mutationFn: () => apiClonePlan(planId),
    onSuccess: () => { toast.success("Plan cloned"); qc.invalidateQueries({ queryKey: ["plans"] }); setConfirmClone(false); onClose(); },
    onError: () => toast.error("Failed to clone"),
  });

  const archiveMut = useMutation({
    mutationFn: () => apiArchivePlan(planId),
    onSuccess: () => { toast.success("Plan archived successfully"); qc.invalidateQueries({ queryKey: ["plans"] }); setConfirmArchive(false); onClose(); },
    onError: (err: any) => toast.error(err.message || "Failed to archive plan"),
  });

  return (
    <>
      <Drawer open onClose={onClose} title={isNew ? "New Plan" : "Edit Plan"} dirty={dirty} width="md"
        footer={
          <div className="flex gap-2 flex-wrap">
            <Button loading={saveMut.isPending} disabled={!form.name} onClick={() => saveMut.mutate()}>Save</Button>
            {!isNew && <Button variant="secondary" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => setConfirmClone(true)}>Clone</Button>}
            {!isNew && <Button variant="danger" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => setConfirmArchive(true)}>Archive</Button>}
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={f("name")} />
          <Input label="Slug" value={form.slug} onChange={f("slug")} hint="Auto-generated if blank" />
          <Input label="Description" value={form.description} onChange={f("description")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Monthly price (${form.currency})`} type="number" step="0.01" value={form.price_monthly} onChange={f("price_monthly")} hint="In whole units (e.g. 79 = $79)" />
            <Input label={`Yearly price (${form.currency})`} type="number" step="0.01" value={form.price_yearly} onChange={f("price_yearly")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Billing interval"
              options={[{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"},{value:"both",label:"Both"}]}
              value={form.billing_interval}
              onChange={v => { setForm(p => ({...p, billing_interval: v})); setDirty(true); }} />
            <Select label="Currency"
              options={[{value:"USD",label:"USD ($) — Worldwide"},{value:"ZAR",label:"ZAR (R) — South Africa"}]}
              value={form.currency}
              onChange={v => { setForm(p => ({...p, currency: v})); setDirty(true); }} />
          </div>

          {priceChanged && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-300 mb-2">Price changed — apply to:</p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="apply_to" checked={applyTo === "new"} onChange={() => setApplyTo("new")} className="mt-0.5" />
                  <span className="text-xs text-ink-2"><strong className="text-ink-1">New customers only</strong> (default) — existing subscribers keep their locked price (grandfathered).</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="apply_to" checked={applyTo === "migrate"} onChange={() => setApplyTo("migrate")} className="mt-0.5" />
                  <span className="text-xs text-ink-2"><strong className="text-ink-1">Migrate existing subscribers</strong> — re-price all active subscribers on this plan to the new price.</span>
                </label>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Brand limit" type="number" value={form.brand_limit} onChange={f("brand_limit")} />
            <Input label="Posts/mo limit" type="number" value={form.posts_per_month_limit} onChange={f("posts_per_month_limit")} />
            <Input label="User limit" type="number" value={form.user_limit} onChange={f("user_limit")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Active on website" checked={form.is_active} onChange={v => { setForm(p => ({...p, is_active: v})); setDirty(true); }} />
            <Toggle label="Show on Public Pricing Page" checked={form.visible} onChange={v => { setForm(p => ({...p, visible: v})); setDirty(true); }} />
          </div>

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
        <>
          <ConfirmDialog open={confirmClone} onClose={() => setConfirmClone(false)}
            onConfirm={() => cloneMut.mutate()} loading={cloneMut.isPending}
            title="Clone plan" description={`Create a copy of "${(plan as Plan).name}"?`}
            confirmLabel="Clone" />
          <ConfirmDialog open={confirmArchive} onClose={() => setConfirmArchive(false)}
            onConfirm={() => archiveMut.mutate()} loading={archiveMut.isPending}
            title="Archive plan" description={`Are you sure you want to archive "${(plan as Plan).name}"?`}
            type="danger" confirmLabel="Archive" confirmVariant="danger" />
        </>
      )}
    </>
  );
}

function PlansTab() {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: ["plans"], queryFn: apiListPlans });
  const plans: Plan[] = (data as { plans?: Plan[] } | undefined)?.plans ?? [];

  return (
    <>
      <DataTable
        data={plans} columns={PLAN_COLS} keyField="id" searchable
        searchPlaceholder="Search plans..." loading={isLoading}
        error={error ? "Failed to load plans" : undefined}
        emptyTitle="No plans" exportFilename="plans"
        onRowClick={r => setSelected(r)} selectedId={selected?.id}
        toolbar={
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowNew(true)}>New plan</Button>
        }
      />
      {selected && <PlanDrawer plan={selected} onClose={() => setSelected(null)} />}
      {showNew && <PlanDrawer plan="new" onClose={() => setShowNew(false)} />}
    </>
  );
}

// ─── Features tab ─────────────────────────────────────────────────────────────

const FEAT_COLS: Column<PlanFeature>[] = [
  { key: "key", header: "Key", render: r => <span className="font-mono text-xs text-brand-300">{r.key}</span> },
  { key: "name", header: "Name", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{r.name}</span> },
  { key: "category", header: "Category", render: r => <Badge variant="brand">{r.category}</Badge> },
  { key: "visible", header: "Visible", render: r => <Badge variant={r.visible ? "success" : "neutral"}>{r.visible ? "Yes" : "No"}</Badge> },
  { key: "description", header: "Description", render: r => <span className="text-xs text-ink-3 truncate max-w-xs">{r.description ?? "—"}</span> },
];

function FeatureDrawer({ feature, onClose }: { feature: PlanFeature | "new"; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = feature === "new";
  const [form, setForm] = useState(
    isNew
      ? { key: "", name: "", description: "", category: "core", visible: true }
      : { key: (feature as PlanFeature).key, name: (feature as PlanFeature).name, description: (feature as PlanFeature).description ?? "", category: (feature as PlanFeature).category ?? "core", visible: !!(feature as PlanFeature).visible }
  );

  const saveMut = useMutation<{ key: string } | { success: boolean }, Error>({
    mutationFn: () =>
      isNew
        ? apiCreateFeature({ ...form, visible: form.visible ? 1 : 0 })
        : apiUpdateFeature((feature as PlanFeature).key, { name: form.name, description: form.description, category: form.category, visible: form.visible ? 1 : 0 }),
    onSuccess: () => {
      toast.success(isNew ? "Feature created" : "Feature updated");
      qc.invalidateQueries({ queryKey: ["features"] });
      onClose();
    },
    onError: () => toast.error("Failed to save feature"),
  });

  return (
    <Drawer open onClose={onClose} title={isNew ? "New Feature" : "Edit Feature"} width="sm"
      footer={
        <div className="flex gap-2">
          <Button loading={saveMut.isPending} disabled={!form.name || !form.key} onClick={() => saveMut.mutate()}>Save</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Key" required value={form.key} onChange={e => setForm(f => ({...f, key: e.target.value}))} disabled={!isNew} hint="Immutable after creation" />
        <Input label="Name" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
        <Input label="Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
        <Select label="Category"
          options={[{value:"core",label:"Core"},{value:"ai",label:"AI"},{value:"publishing",label:"Publishing"},{value:"analytics",label:"Analytics"},{value:"collaboration",label:"Collaboration"},{value:"advanced",label:"Advanced"}]}
          value={form.category}
          onChange={v => setForm(f => ({...f, category: v}))} />
        <Toggle label="Visible on pricing page" checked={form.visible} onChange={v => setForm(f => ({...f, visible: v}))} />
      </div>
    </Drawer>
  );
}

function FeaturesTab() {
  const [selected, setSelected] = useState<PlanFeature | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: ["features"], queryFn: apiListFeatures });
  const features: PlanFeature[] = (data as { features?: PlanFeature[] } | undefined)?.features ?? [];

  return (
    <>
      <DataTable
        data={features} columns={FEAT_COLS} keyField="key" searchable
        searchPlaceholder="Search features..." loading={isLoading}
        error={error ? "Failed to load features" : undefined}
        emptyTitle="No features" exportFilename="features"
        onRowClick={r => setSelected(r)} selectedId={selected?.key}
        toolbar={
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowNew(true)}>New feature</Button>
        }
      />
      {selected && <FeatureDrawer feature={selected} onClose={() => setSelected(null)} />}
      {showNew && <FeatureDrawer feature="new" onClose={() => setShowNew(false)} />}
    </>
  );
}

// ─── Entitlements tab ─────────────────────────────────────────────────────────

function EntitlementsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const { data: plansData } = useQuery({ queryKey: ["plans"], queryFn: apiListPlans });
  const plans: Plan[] = (plansData as { plans?: Plan[] } | undefined)?.plans ?? [];

  const { data: entData, isLoading } = useQuery({
    queryKey: ["entitlements", selectedPlanId],
    queryFn: () => apiListEntitlements(selectedPlanId),
    enabled: !!selectedPlanId,
  });
  const entitlements: PlanEntitlement[] = (entData as { entitlements?: PlanEntitlement[] } | undefined)?.entitlements ?? [];

  const updateMut = useMutation({
    mutationFn: ({ featureKey, body }: { featureKey: string; body: Record<string, unknown> }) =>
      apiUpdateEntitlement(selectedPlanId, featureKey, body),
    onSuccess: () => {
      toast.success("Entitlement updated");
      qc.invalidateQueries({ queryKey: ["entitlements", selectedPlanId] });
    },
    onError: () => toast.error("Failed to update"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <select
            className="os-input w-full h-9 text-sm"
            value={selectedPlanId}
            onChange={e => setSelectedPlanId(e.target.value)}
          >
            <option value="">Select a plan…</option>
            {plans.filter(p => p.is_active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {selectedPlanId && <Badge variant="brand">{plans.find(p => p.id === selectedPlanId)?.name}</Badge>}
      </div>

      {!selectedPlanId && (
        <div className="py-16 text-center text-sm text-ink-3">Select a plan to view and edit entitlements</div>
      )}

      {selectedPlanId && isLoading && (
        <div className="space-y-2 animate-pulse">{Array.from({length:8}).map((_,i) => <div key={i} className="h-12 bg-os-raised rounded" />)}</div>
      )}

      {selectedPlanId && !isLoading && entitlements.length === 0 && (
        <div className="py-16 text-center text-sm text-ink-3">No entitlements found for this plan</div>
      )}

      {entitlements.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border">
            <h2 className="text-sm font-semibold text-ink-1">Feature Entitlements — {plans.find(p => p.id === selectedPlanId)?.name}</h2>
          </div>
          <div className="divide-y divide-os-border/50">
            {entitlements.map(e => (
              <div key={e.key ?? e.feature_key} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-1">{e.feature_name ?? e.feature_key ?? e.key}</p>
                  {e.feature_category && <p className="text-xs text-ink-3">{e.feature_category}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {e.limit_value != null && (
                    <span className="text-xs text-ink-3">Limit: {e.limit_value}</span>
                  )}
                  <button
                    onClick={() => updateMut.mutate({
                      featureKey: e.key ?? e.feature_key ?? "",
                      body: { enabled: e.enabled ? 0 : 1 },
                    })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${e.enabled ? "bg-brand-500" : "bg-os-raised border border-os-border"}`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${e.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Promotions tab ───────────────────────────────────────────────────────────

function PromotionsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", max_uses: "", expires_at: "" });

  const { data, isLoading, error } = useQuery({ queryKey: ["promotions"], queryFn: apiListPromotions });

  const createMut = useMutation({
    mutationFn: () => apiCreatePromotion({
      ...form, value: parseFloat(form.value),
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

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDeletePromotion(id),
    onSuccess: () => {
      toast.success("Promotion deleted");
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete promotion");
    }
  });

  const columns: Column<Promotion>[] = [
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
    {
      key: "actions",
      header: "Actions",
      render: r => {
        const isExpired = r.expires_at && new Date(r.expires_at) < new Date();
        const isEmpty = (r.used_count ?? 0) === 0;
        const canDelete = isExpired && isEmpty;
        
        return (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (confirm(`Are you sure you want to delete promo code ${r.code}?`)) {
                deleteMut.mutate(r.id);
              }
            }}
            disabled={!canDelete}
            title={!canDelete ? "Can only delete expired promotions with 0 uses" : "Delete promotion"}
          >
            <Trash className="h-4 w-4 text-error-500" />
          </Button>
        );
      }
    }
  ];

  return (
    <>
      <DataTable
        data={data?.promotions ?? []} columns={columns} keyField="id"
        loading={isLoading} error={error ? "Failed to load promotions" : undefined}
        emptyTitle="No promotions" emptyMessage="Create your first coupon or promotion code."
        exportFilename="promotions" searchable searchPlaceholder="Search codes..."
        toolbar={
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
            New promotion
          </Button>
        }
      />

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Create Promotion" width="sm"
        footer={
          <div className="flex gap-2">
            <Button loading={createMut.isPending} disabled={!form.code || !form.value} onClick={() => createMut.mutate()}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Code" required value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="SAVE20" />
          <Select label="Type" required
            options={[{value:"percent",label:"Percent discount"},{value:"fixed",label:"Fixed amount (R)"},{value:"trial_days",label:"Trial extension (days)"}]}
            value={form.type} onChange={v => setForm(f => ({...f, type: v}))} />
          <Input label={form.type === "percent" ? "Percent (%)" : form.type === "fixed" ? "Amount (R)" : "Days"} required type="number" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} />
          <Input label="Max uses" type="number" value={form.max_uses} onChange={e => setForm(f => ({...f, max_uses: e.target.value}))} hint="Leave blank for unlimited" />
          <Input label="Expires at" type="date" value={form.expires_at} onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} />
        </div>
      </Drawer>
    </>
  );
}

// ─── Metrics tab ──────────────────────────────────────────────────────────────

function MetricsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["commercial-metrics"], queryFn: apiGetCommercialMetrics });
  const plans = (data as { plans?: { id: string; name: string; user_count: number; mrr: number }[] } | undefined)?.plans ?? [];
  const total = plans.reduce((s, p) => s + (p.mrr ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total plans" value={String((data as { total_plans?: number } | undefined)?.total_plans ?? 0)} icon={<Package className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Active plans" value={String((data as { active_plans?: number } | undefined)?.active_plans ?? 0)} icon={<Package className="h-4 w-4" />} accent="success" loading={isLoading} />
        <StatCard label="Total features" value={String((data as { total_features?: number } | undefined)?.total_features ?? 0)} icon={<Zap className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Catalog MRR (operational)" value={total ? money(total, "USD") : "—"} icon={<TrendingUp className="h-4 w-4" />} loading={isLoading} sub="catalog × subs — not revenue" />
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
              <th className="os-table-th text-right">Catalog MRR</th>
            </tr></thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className="border-b border-os-border/40">
                  <td className="os-table-td font-medium text-ink-1">{p.name}</td>
                  <td className="os-table-td text-right text-ink-2 tabular-nums">{p.user_count ?? 0}</td>
                  <td className="os-table-td text-right text-ink-1 tabular-nums">{money(p.mrr ?? 0, "USD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommercialPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("plans");

  return (
    <WorkspaceLayout
      workspace="commercial"
      title="Commercial"
      subtitle="Plans, features, entitlements, promotions"
      onRefresh={() => {
        ["plans","features","promotions","commercial-metrics"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "plans", label: "Plans", icon: <Package className="h-3.5 w-3.5" /> },
            { id: "features", label: "Features", icon: <Zap className="h-3.5 w-3.5" /> },
            { id: "entitlements", label: "Entitlements", icon: <List className="h-3.5 w-3.5" /> },
            { id: "promotions", label: "Promotions", icon: <Tag className="h-3.5 w-3.5" /> },
            { id: "metrics", label: "Metrics", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "plans" && <PlansTab />}
      {tab === "features" && <FeaturesTab />}
      {tab === "entitlements" && <EntitlementsTab />}
      {tab === "promotions" && <PromotionsTab />}
      {tab === "metrics" && <MetricsTab />}
    </WorkspaceLayout>
  );
}
