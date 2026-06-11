"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListCustomers, apiGetCustomer, apiToggleUser, apiVerifyUser, apiExtendTrial,
  apiSendSupportMessage, apiListSupportRequests, apiUpdateSupportRequest,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import {
  UserCheck, UserX, CheckCircle, RefreshCw,
  Building2, Clock, Mail, Send, MessageSquare,
  User, Headphones, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, SupportRequest } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Customer Drawer ──────────────────────────────────────────────────────────

function CustomerDrawer({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [trialDays, setTrialDays] = useState("7");
  const [confirmAction, setConfirmAction] = useState<"toggle" | "verify" | "extend" | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");

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

  const messageMut = useMutation({
    mutationFn: () => apiSendSupportMessage(userId, composeMsg),
    onSuccess: () => {
      toast.success("Message sent");
      setComposeMsg(""); setShowCompose(false);
    },
    onError: () => toast.error("Failed to send message"),
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
      {/* Identity */}
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

      {/* Stats */}
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

      {/* Account details */}
      <Card padding="none" className="mb-4">
        <div className="divide-y divide-os-border">
          {[
            { label: "User ID", value: c.id, mono: true },
            { label: "Role", value: c.role ?? "user" },
            { label: "Plan", value: c.plan_name ?? "—" },
            { label: "Subscription", value: c.subscription_status ?? "—" },
            { label: "Joined", value: fmt(c.created_at) },
            { label: "Verified", value: fmt(c.verified_at) },
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

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button
          variant={isActive ? "danger" : "secondary"}
          icon={isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          onClick={() => setConfirmAction("toggle")}
          loading={toggleMut.isPending}
        >
          {isActive ? "Disable" : "Enable"}
        </Button>
        {!isVerified ? (
          <Button variant="secondary" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setConfirmAction("verify")} loading={verifyMut.isPending}>
            Force verify
          </Button>
        ) : null}
        <Button variant="ghost" icon={<Mail className="h-4 w-4" />} onClick={() => setShowCompose(v => !v)} className={!isVerified ? "col-span-2" : ""}>
          Message
        </Button>
      </div>

      {/* Compose message */}
      {showCompose && (
        <Card className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-3.5 w-3.5 text-ink-3" />
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Send Message</p>
          </div>
          <textarea
            value={composeMsg}
            onChange={e => setComposeMsg(e.target.value)}
            placeholder="Message to customer..."
            rows={3}
            className="os-input w-full resize-none mb-2"
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => messageMut.mutate()} loading={messageMut.isPending} disabled={!composeMsg.trim()}>
              Send
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowCompose(false); setComposeMsg(""); }}>Cancel</Button>
          </div>
        </Card>
      )}

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

// ─── Accounts tab ─────────────────────────────────────────────────────────────

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

function AccountsTab() {
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
    <>
      <div className="mb-1 text-xs text-ink-3">{total.toLocaleString()} total accounts</div>
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
    </>
  );
}

// ─── Support tab ──────────────────────────────────────────────────────────────

function SupportRequestRow({ req, active, onClick }: { req: SupportRequest; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-os-border/50 transition-colors",
        active ? "bg-brand-500/10 border-l-2 border-l-brand-500" : "hover:bg-os-raised/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-1 truncate">{req.subject ?? req.category}</p>
        <Badge variant={req.priority === "urgent" ? "danger" : req.priority === "high" ? "warning" : "neutral"}>
          {req.priority ?? "normal"}
        </Badge>
      </div>
      <p className="text-xs text-ink-3 mt-1 truncate">{req.user_email ?? req.user_id}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <Badge variant={statusBadge(req.status)}>{req.status}</Badge>
        <span className="text-2xs text-ink-4">{timeAgo(req.created_at)}</span>
      </div>
    </button>
  );
}

function SupportThreadView({ req, onUpdate }: { req: SupportRequest; onUpdate: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [req.id]);

  const sendMut = useMutation({
    mutationFn: () => apiSendSupportMessage(req.user_id, message),
    onSuccess: () => { toast.success("Message sent"); setMessage(""); onUpdate(); },
    onError: () => toast.error("Failed to send"),
  });

  const updateMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiUpdateSupportRequest(req.id, body),
    onSuccess: () => { toast.success("Updated"); onUpdate(); },
    onError: () => toast.error("Failed to update"),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-os-border shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink-1 truncate">{req.subject ?? req.category}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={statusBadge(req.status)}>{req.status}</Badge>
              {req.priority && <Badge variant={req.priority === "urgent" ? "danger" : req.priority === "high" ? "warning" : "neutral"}>{req.priority}</Badge>}
              <span className="text-xs text-ink-3">{req.user_email ?? req.user_id}</span>
              <span className="text-xs text-ink-3">{timeAgo(req.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="secondary" size="sm"
              onClick={() => updateMut.mutate({ status: "in_progress" })}
              disabled={req.status === "in_progress" || req.status === "resolved"}
              loading={updateMut.isPending}>
              In progress
            </Button>
            <Button variant="primary" size="sm" icon={<CheckCircle className="h-3.5 w-3.5" />}
              onClick={() => updateMut.mutate({ status: "resolved" })}
              disabled={req.status === "resolved"}
              loading={updateMut.isPending}>
              Resolve
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full bg-os-raised border border-os-border flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-ink-3" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-ink-1">{req.user_email ?? req.user_id}</span>
              <span className="text-2xs text-ink-4">{timeAgo(req.created_at)}</span>
            </div>
            <div className="bg-os-raised border border-os-border rounded-lg px-4 py-3">
              <p className="text-sm text-ink-1 whitespace-pre-wrap">{req.message}</p>
            </div>
          </div>
        </div>

        {req.resolution && (
          <div className="flex items-start gap-3 justify-end">
            <div className="flex-1 max-w-[80%]">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <span className="text-2xs text-ink-4">{req.updated_at ? timeAgo(req.updated_at) : ""}</span>
                <span className="text-xs font-medium text-brand-300">Admin</span>
              </div>
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg px-4 py-3">
                <p className="text-sm text-ink-1 whitespace-pre-wrap">{req.resolution}</p>
              </div>
            </div>
            <div className="h-7 w-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-300">A</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-5 py-3 border-t border-os-border bg-os-raised/30 shrink-0">
        <div className="flex gap-2 mb-3">
          <Select
            options={[
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ]}
            value={req.status}
            onChange={v => updateMut.mutate({ status: v })}
            className="h-8 text-xs flex-1"
          />
          <Select
            options={[
              { value: "low", label: "Low" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ]}
            value={req.priority ?? "normal"}
            onChange={v => updateMut.mutate({ priority: v })}
            className="h-8 text-xs flex-1"
          />
        </div>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && message.trim()) {
                e.preventDefault(); sendMut.mutate();
              }
            }}
            placeholder="Reply to customer... (⌘+Enter to send)"
            rows={2}
            className="os-input flex-1 resize-none"
          />
          <Button variant="primary" icon={<Send className="h-4 w-4" />}
            onClick={() => sendMut.mutate()} disabled={!message.trim()} loading={sendMut.isPending}
            className="self-end">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function SupportTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["support-requests", status],
    queryFn: () => apiListSupportRequests({ status }),
    staleTime: 30_000,
  });

  const requests = data?.data ?? [];
  const selected = requests.find(r => r.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-220px)] overflow-hidden border border-os-border rounded-lg">
      <div className="w-[320px] shrink-0 border-r border-os-border flex flex-col h-full">
        <div className="px-3 py-2 border-b border-os-border shrink-0">
          <Tabs
            tabs={[
              { id: "open", label: "Open", count: status === "open" ? requests.length : undefined },
              { id: "in_progress", label: "Active" },
              { id: "resolved", label: "Resolved" },
              { id: "closed", label: "Closed" },
            ]}
            active={status}
            onChange={id => { setStatus(id); setSelectedId(null); }}
            size="sm"
            variant="pills"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-os-raised rounded" />)}
            </div>
          ) : error ? (
            <EmptyState icon={<AlertCircle className="h-8 w-8" />} title="Failed to load" description="Check connectivity." />
          ) : requests.length === 0 ? (
            <EmptyState icon={<Headphones className="h-8 w-8" />} title={`No ${status} tickets`} />
          ) : (
            requests.map(r => (
              <SupportRequestRow key={r.id} req={r} active={r.id === selectedId} onClick={() => setSelectedId(r.id)} />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <SupportThreadView
            req={selected}
            onUpdate={() => qc.invalidateQueries({ queryKey: ["support-requests", status] })}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title="Select a ticket"
              description="Click a request on the left to view the conversation."
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("accounts");

  return (
    <WorkspaceLayout
      workspace="customers"
      title="Customers"
      subtitle="Accounts, support, lifecycle management"
      onRefresh={() => {
        ["customers", "support-requests"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "accounts", label: "Accounts", icon: <User className="h-3.5 w-3.5" /> },
            { id: "support", label: "Support", icon: <Headphones className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "accounts" && <AccountsTab />}
      {tab === "support" && <SupportTab />}
    </WorkspaceLayout>
  );
}
