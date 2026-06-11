"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetSystemEvents,
  apiListKillSwitches, apiUpdateKillSwitch,
  apiListAuditLog,
} from "@/lib/api";
import { getWorkspacesForRole } from "@/lib/roles";
import type { AdminRole } from "@/types";
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

const ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "support", "commercial", "content", "developer", "analyst", "viewer"];

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  support: "Support",
  commercial: "Commercial",
  content: "Content",
  developer: "Developer",
  analyst: "Analyst",
  viewer: "Viewer",
};

function RolesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-ink-3 mb-4">Role → workspace access matrix. This is the platform access model. Changes require a code deployment.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-os-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-ink-3 uppercase tracking-wider w-36">Role</th>
                {["today","customers","billing","commercial","content","operations","config"].map(ws => (
                  <th key={ws} className="text-center py-2 px-2 text-xs font-semibold text-ink-3 uppercase tracking-wider capitalize">{ws}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_ROLES.map(role => {
                const workspaces = getWorkspacesForRole(role).map(w => w.id);
                return (
                  <tr key={role} className="border-b border-os-border/40 hover:bg-os-raised/30">
                    <td className="py-2.5 px-3">
                      <Badge variant={role === "super_admin" || role === "admin" ? "brand" : "neutral"}>{ROLE_LABELS[role]}</Badge>
                    </td>
                    {["today","customers","billing","commercial","content","operations","config"].map(ws => (
                      <td key={ws} className="py-2.5 px-2 text-center">
                        {(workspaces as string[]).includes(ws)
                          ? <CheckCircle className="h-4 w-4 text-green-400 mx-auto" />
                          : <span className="text-ink-4 text-xs">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("events");

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
            { id: "events", label: "Events", icon: <Radio className="h-3.5 w-3.5" /> },
            { id: "kill-switches", label: "Kill Switches", icon: <Zap className="h-3.5 w-3.5" /> },
            { id: "audit", label: "Audit Log", icon: <FileText className="h-3.5 w-3.5" /> },
            { id: "roles", label: "Roles", icon: <Shield className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "events" && <EventsTab />}
      {tab === "kill-switches" && <KillSwitchesTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "roles" && <RolesTab />}
    </WorkspaceLayout>
  );
}
