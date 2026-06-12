"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetSystemEvents,
  apiListKillSwitches, apiUpdateKillSwitch,
  apiListAuditLog,
  apiGetRoles, apiGetSystemExtended, apiGetEmailTemplates, apiGetAdminUsage,
} from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  Radio, Zap, FileText, Shield,
  CheckCircle, XCircle, AlertTriangle, Power, PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemEvent, KillSwitch, AuditLogEntry } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtRel(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEV_COLOR: Record<string, string> = {
  info: "text-blue-400", warning: "text-yellow-400", error: "text-red-400", critical: "text-red-500",
};
const SEV_ICON: Record<string, React.ElementType> = {
  info: CheckCircle, warning: AlertTriangle, error: XCircle, critical: XCircle,
};

function EventsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["system-events-config"],
    queryFn: () => apiGetSystemEvents({ limit: 200 }),
    refetchInterval: 30_000,
  });

  const events: SystemEvent[] = (data as { events?: SystemEvent[] } | undefined)?.events
    ?? (data as { data?: SystemEvent[] } | undefined)?.data ?? [];

  const COLS: Column<SystemEvent>[] = [
    { key: "severity", header: "Severity", render: r => <Badge variant={statusBadge(r.severity)}>{r.severity}</Badge> },
    { key: "source", header: "Source", render: r => <span className="font-mono text-xs text-ink-2">{r.source}</span> },
    { key: "message", header: "Message", render: r => <span className="text-sm text-ink-1">{r.message}</span> },
    { key: "created_at", header: "When", sortable: true, render: r => <span className="text-sm text-ink-2">{fmtRel(r.created_at)}</span> },
  ];

  return (
    <DataTable
      data={events}
      columns={COLS}
      keyField="id"
      searchable
      searchPlaceholder="Search events..."
      searchFields={["message", "source", "severity"]}
      loading={isLoading}
      error={error ? "Failed to load events" : undefined}
      emptyTitle="No events"
      emptyMessage="All systems operating normally."
      exportFilename="system-events"
    />
  );
}

function KillSwitchesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<KillSwitch | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["kill-switches"], queryFn: apiListKillSwitches });
  const switches: KillSwitch[] = (data as { switches?: KillSwitch[]; controls?: KillSwitch[]; data?: KillSwitch[] } | undefined)?.switches
    ?? (data as { controls?: KillSwitch[] } | undefined)?.controls
    ?? (data as { data?: KillSwitch[] } | undefined)?.data ?? [];
  const enabledCount = switches.filter(s => !!s.enabled).length;

  const toggleMut = useMutation({
    mutationFn: (s: KillSwitch) => apiUpdateKillSwitch(s.key, !s.enabled, s.reason),
    onSuccess: (_, s) => {
      toast.success(`Kill switch ${s.enabled ? "disabled" : "enabled"}`, s.key);
      qc.invalidateQueries({ queryKey: ["kill-switches"] });
      setConfirm(null);
    },
    onError: () => toast.error("Failed to toggle kill switch"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-os-raised border border-os-border rounded text-sm text-ink-2">
          <Zap className="h-3.5 w-3.5 text-brand-500" />
          <span>{enabledCount} active</span>
          <span className="text-ink-4">·</span>
          <span>{switches.length - enabledCount} inactive</span>
        </div>
        {enabledCount > 0 && <Badge variant="warning">{enabledCount} enabled</Badge>}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">{Array.from({length:8}).map((_,i) => <div key={i} className="h-14 bg-os-raised rounded-lg" />)}</div>
      ) : switches.length === 0 ? (
        <div className="py-16 text-center text-sm text-ink-3">No kill switches configured</div>
      ) : (
        <div className="space-y-2">
          {switches.map(s => {
            const isEnabled = !!s.enabled;
            return (
              <div key={s.key} className={cn(
                "flex items-center justify-between gap-3 px-4 py-3.5 rounded-lg border transition-colors",
                isEnabled ? "bg-red-500/5 border-red-500/20" : "bg-os-surface border-os-border"
              )}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-ink-1">{s.key}</span>
                    {isEnabled && <Badge variant="danger" dot>ENABLED</Badge>}
                  </div>
                  {s.reason && <p className="text-xs text-ink-3 mt-0.5">{s.reason}</p>}
                  {s.updated_at && <p className="text-2xs text-ink-4 mt-0.5">Updated {fmtRel(s.updated_at)}{s.updated_by ? ` by ${s.updated_by}` : ""}</p>}
                </div>
                <Button
                  variant={isEnabled ? "danger" : "secondary"}
                  size="sm"
                  icon={isEnabled ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  onClick={() => setConfirm(s)}
                >
                  {isEnabled ? "Disable" : "Enable"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          open onClose={() => setConfirm(null)}
          onConfirm={() => toggleMut.mutate(confirm)}
          loading={toggleMut.isPending}
          title={confirm.enabled ? `Disable kill switch` : `Enable kill switch`}
          description={`${confirm.enabled ? "Restore" : "Halt"} the "${confirm.key}" feature gate?`}
          type={confirm.enabled ? "info" : "danger"}
          confirmLabel={confirm.enabled ? "Disable" : "Enable"}
          confirmVariant={confirm.enabled ? "primary" : "danger"}
        />
      )}
    </div>
  );
}

const AUDIT_COLS: Column<AuditLogEntry>[] = [
  { key: "action", header: "Action", sortable: true, render: r => <span className="font-mono text-xs text-ink-1">{r.action}</span> },
  { key: "admin_email", header: "Admin", render: r => <span className="text-sm text-ink-2">{r.admin_email ?? r.admin_id ?? "—"}</span> },
  { key: "resource_type", header: "Resource", render: r => <span className="text-sm text-ink-2">{r.resource_type ?? "—"}{r.resource_id ? ` #${r.resource_id}` : ""}</span> },
  { key: "ip", header: "IP", render: r => <span className="font-mono text-xs text-ink-3">{r.ip ?? "—"}</span> },
  { key: "created_at", header: "When", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

function AuditTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-log"], queryFn: () => apiListAuditLog({}),
  });

  const logs: AuditLogEntry[] = (data as { logs?: AuditLogEntry[]; data?: AuditLogEntry[] } | undefined)?.logs
    ?? (data as { data?: AuditLogEntry[] } | undefined)?.data ?? [];

  return (
    <DataTable
      data={logs}
      columns={AUDIT_COLS}
      keyField="id"
      searchable
      searchPlaceholder="Search audit log..."
      searchFields={["action", "admin_email"]}
      loading={isLoading}
      error={error ? "Failed to load audit log" : undefined}
      emptyTitle="No audit log entries"
      exportFilename="audit-log"
    />
  );
}

type RoleRow = { role: string; wildcard: boolean; permissions: string[]; permission_count: number | string; workspace_access: string[] };
function RolesTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-roles"], queryFn: apiGetRoles });
  const roles = (data?.roles ?? []) as RoleRow[];
  const exportCsv = () => {
    const rows = [["role", "permissions", "workspace_access"], ...roles.map(r => [r.role, r.permissions.join(" "), r.workspace_access.join(" ")])];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "roles.csv"; a.click();
  };
  if (isLoading) return <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-os-raised rounded" />)}</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3">Read-only RBAC from <code className="font-mono">permissions.js</code>. Editing requires a code deployment.</p>
        <Button variant="secondary" size="sm" icon={<FileText className="h-3.5 w-3.5" />} onClick={exportCsv}>Export CSV</Button>
      </div>
      {roles.map(r => (
        <Card key={r.role} padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <Badge variant={r.wildcard ? "brand" : "neutral"}>{r.role}</Badge>
            <span className="text-2xs text-ink-3">{r.permission_count} permission{r.permission_count === 1 ? "" : "s"}</span>
            <div className="ml-auto flex gap-1 flex-wrap">{r.workspace_access.map(w => <Badge key={w} variant="success">{w}</Badge>)}</div>
          </div>
          <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
            {r.permissions.map(p => <span key={p} className="text-2xs font-mono px-1.5 py-0.5 rounded bg-os-raised text-ink-2">{p}</span>)}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── System (extended status) ──────────────────────────────────────────────────────
function SystemTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-system-ext"], queryFn: apiGetSystemExtended, refetchInterval: 60_000 });
  const d = (data ?? {}) as Record<string, any>;
  const sBadge = (s?: string) => s === "operational" || s === "configured" ? "success" : s === "degraded" ? "warning" : "neutral";
  if (isLoading) return <div className="space-y-3 animate-pulse">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-os-raised rounded-lg" />)}</div>;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Workers</h2></div>
        {(d.workers ?? []).map((w: any, i: number) => <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-os-border/40 last:border-0"><span className="text-sm text-ink-1">{w.name}</span><Badge variant={sBadge(w.status)}>{w.status}</Badge></div>)}
      </Card>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Domains</h2></div>
        {(d.domains ?? []).map((x: any, i: number) => <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-os-border/40 last:border-0"><div><p className="text-sm text-ink-1">{x.name}</p><p className="text-2xs text-ink-3">{x.role}</p></div><Badge variant={x.configured ? "success" : "warning"}>{x.configured ? "configured" : "missing"}</Badge></div>)}
      </Card>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Webhooks</h2></div>
        <div className="flex items-center justify-between px-4 py-2.5"><div><p className="text-sm text-ink-1">Yoco</p><p className="text-2xs text-ink-3">last: {d.webhooks?.yoco?.last_event_at ? fmt(d.webhooks.yoco.last_event_at) : "—"}</p></div><Badge variant={sBadge(d.webhooks?.yoco?.status)}>{d.webhooks?.yoco?.status}</Badge></div>
      </Card>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Provider status</h2></div>
        <div className="max-h-64 overflow-y-auto">{(d.providers ?? []).map((p: any, i: number) => <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-os-border/40 last:border-0"><span className="text-sm text-ink-1 capitalize">{p.platform}</span><div className="flex items-center gap-2">{p.active != null && <span className="text-2xs text-ink-3">{p.active}/{p.total} active{p.expiring ? ` · ${p.expiring} expiring` : ""}</span>}<Badge variant={sBadge(p.status)}>{p.status}</Badge></div></div>)}</div>
      </Card>
    </div>
  );
}

// ─── Templates ──────────────────────────────────────────────────────────────────────
function TemplatesTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-email-templates"], queryFn: apiGetEmailTemplates });
  const templates = ((data as { templates?: unknown[]; data?: unknown[] })?.templates ?? (data as { data?: unknown[] })?.data ?? []) as { key?: string; name?: string; subject?: string; category?: string }[];
  const legal = [
    { name: "Privacy Policy", url: "https://mypilotpost.com/privacy" },
    { name: "Terms of Service", url: "https://mypilotpost.com/terms" },
  ];
  return (
    <div className="space-y-4">
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2"><FileText className="h-4 w-4 text-ink-3" /><h2 className="text-sm font-semibold text-ink-1">Email & Notification Templates</h2><Badge variant="neutral">{templates.length}</Badge></div>
        {isLoading ? <div className="p-4 space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-os-raised rounded" />)}</div>
          : templates.length === 0 ? <p className="px-4 py-8 text-center text-sm text-ink-3">No templates</p>
          : <div className="divide-y divide-os-border/40">{templates.map((t, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5"><div className="min-w-0"><p className="text-sm text-ink-1">{t.name ?? t.key}</p>{t.subject && <p className="text-2xs text-ink-3 truncate">{t.subject}</p>}</div>{t.category && <Badge variant="brand">{t.category}</Badge>}</div>)}</div>}
      </Card>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Legal Documents</h2></div>
        {legal.map(l => <div key={l.name} className="flex items-center justify-between px-4 py-2.5 border-b border-os-border/40 last:border-0"><span className="text-sm text-ink-1">{l.name}</span><a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-brand-300 hover:underline">View →</a></div>)}
      </Card>
    </div>
  );
}

// ─── Limits (usage + cost) ────────────────────────────────────────────────────────
function LimitsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-usage"], queryFn: () => apiGetAdminUsage(30) });
  const d = (data ?? {}) as Record<string, any>;
  const ai = d.ai ?? {};
  if (isLoading) return <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-os-raised rounded-lg" />)}</div>;
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-3">Financial & operational usage — last {d.window_days ?? 30} days. Estimated cost where provider rate is known (no projections).</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="AI tokens" value={(ai.total_tokens ?? 0).toLocaleString()} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Est. AI cost" value={`$${(ai.total_cost_usd ?? 0).toFixed(4)}`} icon={<Zap className="h-4 w-4" />} accent="brand" />
        <StatCard label="X deliveries" value={`${d.x?.published ?? 0}/${d.x?.total ?? 0}`} icon={<Radio className="h-4 w-4" />} />
        <StatCard label="Storage assets" value={String(d.storage?.total_assets ?? 0)} icon={<FileText className="h-4 w-4" />} />
      </div>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">AI usage by provider</h2></div>
        <table className="w-full"><thead><tr className="border-b border-os-border"><th className="os-table-th">Provider</th><th className="os-table-th text-right">Generations</th><th className="os-table-th text-right">Tokens</th><th className="os-table-th text-right">Cost</th><th className="os-table-th text-right">Avg latency</th><th className="os-table-th text-right">Failures</th></tr></thead>
        <tbody>{(ai.by_provider ?? []).map((p: any, i: number) => <tr key={i} className="border-b border-os-border/40"><td className="os-table-td font-medium text-ink-1">{p.provider}</td><td className="os-table-td text-right tabular-nums text-ink-2">{p.generations}</td><td className="os-table-td text-right tabular-nums text-ink-2">{(p.tokens ?? 0).toLocaleString()}</td><td className="os-table-td text-right tabular-nums text-ink-1">${(p.cost_usd ?? 0).toFixed(4)} <span className="text-2xs text-ink-4">({p.cost_source})</span></td><td className="os-table-td text-right tabular-nums text-ink-2">{p.avg_latency_ms ?? "—"}ms</td><td className="os-table-td text-right tabular-nums text-red-400">{p.failures}</td></tr>)}</tbody></table>
      </Card>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Media provider usage</h2></div>
        <div className="divide-y divide-os-border/40">{(d.media_providers ?? []).map((m: any, i: number) => <div key={i} className="flex items-center justify-between px-4 py-2.5"><span className="text-sm text-ink-1 capitalize">{m.provider}</span><span className="text-sm tabular-nums text-ink-2">{m.imports} imports</span></div>)}
          {(d.media_providers ?? []).length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-3">No media imports in window</p>}</div>
      </Card>
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-brand-500/5 border border-brand-500/20">
        <span className="text-sm font-medium text-ink-1">Estimated monthly cost</span>
        <span className="text-lg font-bold text-brand-300">${(d.estimated_monthly_cost_usd ?? 0).toFixed(4)}</span>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("roles");

  return (
    <WorkspaceLayout
      workspace="config"
      title="Config"
      subtitle="Governance — events, kill switches, audit, roles"
      onRefresh={() => {
        ["system-events-config","kill-switches","audit-log"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "roles", label: "Roles", icon: <Shield className="h-3.5 w-3.5" /> },
            { id: "flags", label: "Feature Flags", icon: <Zap className="h-3.5 w-3.5" /> },
            { id: "system", label: "System", icon: <Power className="h-3.5 w-3.5" /> },
            { id: "templates", label: "Templates", icon: <FileText className="h-3.5 w-3.5" /> },
            { id: "limits", label: "Limits", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
            { id: "audit", label: "Audit", icon: <Radio className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "roles" && <RolesTab />}
      {tab === "flags" && <KillSwitchesTab />}
      {tab === "system" && <SystemTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "limits" && <LimitsTab />}
      {tab === "audit" && <AuditTab />}
    </WorkspaceLayout>
  );
}
