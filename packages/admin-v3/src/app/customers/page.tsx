"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiListCustomers, apiGetCustomer, apiToggleUser, apiVerifyUser, apiExtendTrial } from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  UserCheck, UserX, CheckCircle, RefreshCw,
  Building2, Clock, Mail,
} from "lucide-react";
import type { Customer } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function CustomerDrawer({ userId, email }: { userId: string; email?: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [trialDays, setTrialDays] = useState("7");
  const [confirmAction, setConfirmAction] = useState<"toggle" | "verify" | "extend" | null>(null);

  const { data: c, isLoading, error, refetch } = useQuery({
    queryKey: ["customer", userId],
    queryFn: () => apiGetCustomer(userId),
  });

  const toggleMut = useMutation({
    mutationFn: () => apiToggleUser(userId),
    onSuccess: (res) => {
      toast.success("Status updated", res.data?.is_active ? "Account enabled" : "Account disabled");
      refetch(); qc.invalidateQueries({ queryKey: ["customers"] }); setConfirmAction(null);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const verifyMut = useMutation({
    mutationFn: () => apiVerifyUser(userId),
    onSuccess: () => { toast.success("User verified"); refetch(); setConfirmAction(null); },
    onError: () => toast.error("Failed to verify"),
  });

  const trialMut = useMutation({
    mutationFn: () => apiExtendTrial(userId, parseInt(trialDays, 10)),
    onSuccess: () => {
      toast.success("Trial extended", `+${trialDays} days`);
      refetch(); qc.invalidateQueries({ queryKey: ["customers"] }); setConfirmAction(null);
    },
    onError: () => toast.error("Failed to extend trial"),
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 bg-os-raised rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-os-raised rounded" />)}
    </div>
  );

  if (error || !c) return (
    <div className="flex flex-col items-center py-16">
      <p className="text-sm text-red-400">Failed to load customer</p>
      <Button variant="secondary" size="sm" className="mt-3" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refetch()}>Retry</Button>
    </div>
  );

  const isActive = c.is_active === 1;
  const isVerified = !!c.verified_at;

  return (
    <>
      {/* Identity header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-brand-300">{c.email[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-1 truncate">{c.email}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant={isActive ? "success" : "danger"} dot>{isActive ? "Active" : "Disabled"}</Badge>
            {isVerified && <Badge variant="success" dot>Verified</Badge>}
            {c.plan_name && <Badge variant="brand">{c.plan_name}</Badge>}
            {c.subscription_status && <Badge variant={statusBadge(c.subscription_status)}>{c.subscription_status}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Brands", value: c.brands?.length ?? 0 },
          { label: "AI calls", value: c.ai_generations ?? 0 },
          { label: "Messages", value: c.support_messages ?? 0 },
        ].map(s => (
          <div key={s.label} className="os-card-raised p-3 text-center">
            <p className="text-2xs text-ink-3 uppercase tracking-wider">{s.label}</p>
            <p className="text-xl font-bold text-ink-1 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <Card padding="none" className="mb-4">
        <div className="divide-y divide-os-border">
          {[
            { label: "User ID", value: c.id, mono: true },
            { label: "Role", value: c.role ?? "user" },
            { label: "Joined", value: fmt(c.created_at) },
            { label: "Verified at", value: fmt(c.verified_at) },
            { label: "Trial until", value: fmt(c.trial_extended_until) },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-ink-3">{row.label}</span>
              <span className={`text-xs text-ink-1 max-w-[200px] truncate ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Brands */}
      {c.brands && c.brands.length > 0 && (
        <Card padding="none" className="mb-4">
          <div className="px-4 py-2.5 border-b border-os-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Brands ({c.brands.length})</p>
          </div>
          {c.brands.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-os-border/50">
              <div className="h-6 w-6 rounded bg-os-raised border border-os-border flex items-center justify-center shrink-0">
                <Building2 className="h-3 w-3 text-ink-3" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink-1 truncate">{b.name}</p>
                {b.industry && <p className="text-xs text-ink-3">{b.industry}</p>}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Extend trial */}
      {c.subscription_status === "trial" && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3.5 w-3.5 text-ink-3" />
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Extend Trial</p>
          </div>
          <div className="flex gap-2 items-end">
            <Input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} min="1" max="90" hint="Days to add" className="w-24" />
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction("extend")} loading={trialMut.isPending}>Extend</Button>
          </div>
        </Card>
      )}

      {/* Action row */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={isActive ? "danger" : "secondary"}
          icon={isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          onClick={() => setConfirmAction("toggle")}
          loading={toggleMut.isPending}
        >
          {isActive ? "Disable" : "Enable"}
        </Button>
        {!isVerified && (
          <Button variant="secondary" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setConfirmAction("verify")} loading={verifyMut.isPending}>
            Force verify
          </Button>
        )}
        <Button variant="ghost" icon={<Mail className="h-4 w-4" />}>Message</Button>
      </div>

      <ConfirmDialog open={confirmAction === "toggle"} onClose={() => setConfirmAction(null)}
        onConfirm={() => toggleMut.mutate()} title={isActive ? "Disable account" : "Enable account"}
        description={`${isActive ? "Disable" : "Enable"} access for ${c.email}?`}
        confirmLabel={isActive ? "Disable" : "Enable"} confirmVariant={isActive ? "danger" : "primary"}
        loading={toggleMut.isPending} type={isActive ? "danger" : "info"} />
      <ConfirmDialog open={confirmAction === "verify"} onClose={() => setConfirmAction(null)}
        onConfirm={() => verifyMut.mutate()} title="Force verify email"
        description={`Mark ${c.email} as verified.`} loading={verifyMut.isPending} />
      <ConfirmDialog open={confirmAction === "extend"} onClose={() => setConfirmAction(null)}
        onConfirm={() => trialMut.mutate()} title="Extend trial"
        description={`Add ${trialDays} days for ${c.email}.`} loading={trialMut.isPending} />
    </>
  );
}

const COLS: Column<Customer>[] = [
  {
    key: "email", header: "Email", sortable: true,
    render: r => (
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
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
  { key: "plan_name", header: "Plan", sortable: true, render: r => r.plan_name ? <Badge variant="brand">{r.plan_name}</Badge> : <span className="text-ink-3">—</span> },
  {
    key: "brand_count", header: "Brands", sortable: true,
    render: r => <span className="flex items-center gap-1 text-sm text-ink-2"><Building2 className="h-3.5 w-3.5 text-ink-3" />{r.brand_count ?? 0}</span>,
  },
  { key: "created_at", header: "Joined", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

export default function CustomersPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiListCustomers({ limit: 500 }),
    staleTime: 30_000,
  });

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <WorkspaceLayout
      workspace="customers"
      title="Customers"
      subtitle={`${total.toLocaleString()} total accounts`}
      onRefresh={() => qc.invalidateQueries({ queryKey: ["customers"] })}
    >
      <DataTable
        data={customers}
        columns={COLS}
        keyField="id"
        searchable
        searchPlaceholder="Search by email or plan..."
        searchFields={["email", "plan_name", "subscription_status"]}
        onRowClick={r => setSelectedId(r.id)}
        selectedId={selectedId}
        loading={isLoading}
        error={error ? "Failed to load customers" : undefined}
        emptyTitle="No customers"
        emptyMessage="No accounts match your search."
        exportFilename="customers"
        bulkActions={[
          { label: "Disable selected", variant: "danger", action: () => {} },
        ]}
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

      <Drawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Customer Profile"
        subtitle={customers.find(c => c.id === selectedId)?.email}
        width="md"
      >
        {selectedId && <CustomerDrawer userId={selectedId} />}
      </Drawer>
    </WorkspaceLayout>
  );
}
