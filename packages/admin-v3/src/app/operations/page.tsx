"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetSystemStatus, apiGetSystemEvents, apiGetOperationsHealth,
  apiGetDeliveryStats, apiGetIntegrationsDiagnostics,
  apiGetAttributionDiagnostics, apiGetBackfillStatus, apiTriggerBackfill,
  apiRunPlatformTest, apiGetCertificationMatrix,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  Activity, Radio, CheckCircle, XCircle, AlertTriangle,
  Cpu, Link, RefreshCw, Play, ShieldCheck, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemEvent, IntegrationDiagnostic, AttributionDiagnostic, BackfillRun } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
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

function StatusTab() {
  const { data: sysStatus } = useQuery({ queryKey: ["system-status-ops"], queryFn: apiGetSystemStatus, refetchInterval: 30_000 });
  const { data: opsHealth } = useQuery({ queryKey: ["ops-health-ops"], queryFn: apiGetOperationsHealth, refetchInterval: 60_000 });
  const { data: eventsData, isLoading: evLoading } = useQuery({
    queryKey: ["system-events-ops"], queryFn: () => apiGetSystemEvents({ limit: 50 }), refetchInterval: 30_000,
  });
  const { data: deliveryData } = useQuery({ queryKey: ["delivery-stats-ops"], queryFn: apiGetDeliveryStats });

  const events: SystemEvent[] = (eventsData as { events?: SystemEvent[] } | undefined)?.events
    ?? (eventsData as { data?: SystemEvent[] } | undefined)?.data ?? [];
  const deliveryRows = (
    (deliveryData as { stats?: unknown[] } | undefined)?.stats
    ?? (deliveryData as { data?: unknown[] } | undefined)?.data ?? []
  ) as { channel?: string; status?: string; count?: number }[];
  const total = deliveryRows.reduce((s, d) => s + (d.count ?? 1), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Database", ok: sysStatus?.db_ok },
          { label: "Queue", ok: sysStatus?.queue_ok },
          { label: "AI service", ok: sysStatus?.ai_ok },
          { label: "Worker", ok: sysStatus?.worker_ok },
        ].map(item => (
          <StatCard key={item.label} label={item.label}
            value={item.ok == null ? "—" : item.ok ? "Healthy" : "Down"}
            accent={item.ok == null ? undefined : item.ok ? "success" : "danger"}
            icon={item.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} />
        ))}
      </div>

      {(opsHealth?.platforms ?? []).length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <Link className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">Platform Connections</h2>
          </div>
          <div className="divide-y divide-os-border/50">
            {(opsHealth?.platforms ?? []).map(p => (
              <div key={p.platform} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="text-sm text-ink-1 capitalize">{p.platform}</span>
                  {p.last_error && <p className="text-xs text-red-400 mt-0.5">{p.last_error}</p>}
                </div>
                <Badge variant={statusBadge(p.status)} dot>{p.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {deliveryRows.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border">
            <h2 className="text-sm font-semibold text-ink-1">Delivery Stats</h2>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-os-border">
              <th className="os-table-th">Channel</th>
              <th className="os-table-th">Status</th>
              <th className="os-table-th text-right">Count</th>
            </tr></thead>
            <tbody>
              {deliveryRows.map((d, i) => (
                <tr key={i} className="border-b border-os-border/40">
                  <td className="os-table-td capitalize">{d.channel ?? "—"}</td>
                  <td className="os-table-td"><Badge variant={statusBadge(d.status ?? "")}>{d.status ?? "—"}</Badge></td>
                  <td className="os-table-td text-right tabular-nums">{d.count ?? 1}</td>
                </tr>
              ))}
              <tr className="bg-os-raised/30">
                <td className="os-table-td font-semibold text-ink-1" colSpan={2}>Total</td>
                <td className="os-table-td text-right font-semibold text-ink-1 tabular-nums">{total}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
          <Radio className="h-4 w-4 text-ink-3" />
          <h2 className="text-sm font-semibold text-ink-1">System Events</h2>
          <Badge variant="neutral">{events.length}</Badge>
        </div>
        {evLoading ? (
          <div className="p-4 space-y-3 animate-pulse">{Array.from({length:5}).map((_,i) => <div key={i} className="h-10 bg-os-raised rounded" />)}</div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">No events recorded</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {events.map(ev => {
              const Icon = SEV_ICON[ev.severity] ?? Radio;
              return (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-3 border-b border-os-border/40 hover:bg-os-raised/30">
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", SEV_COLOR[ev.severity])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-ink-1">{ev.message}</p>
                      <span className="text-2xs text-ink-3 shrink-0 mt-0.5">{fmtRel(ev.created_at)}</span>
                    </div>
                    <p className="text-2xs text-ink-3 mt-0.5 uppercase tracking-wider">{ev.source}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

const INT_COLS: Column<IntegrationDiagnostic>[] = [
  { key: "platform", header: "Platform", sortable: true, render: r => <span className="text-sm font-medium text-ink-1 capitalize">{r.platform}</span> },
  { key: "brand_name", header: "Brand", render: r => <span className="text-sm text-ink-2">{r.brand_name ?? "—"}</span> },
  { key: "status", header: "Status", render: r => <Badge variant={statusBadge(r.status)}>{r.status}</Badge> },
  { key: "last_used", header: "Last used", render: r => <span className="text-sm text-ink-2">{fmt(r.last_used)}</span> },
  { key: "error", header: "Error", render: r => r.error ? <span className="text-xs text-red-400 truncate max-w-xs">{r.error}</span> : <span className="text-ink-3">—</span> },
];

const ATTR_COLS: Column<AttributionDiagnostic>[] = [
  { key: "brand_id", header: "Brand ID", render: r => <span className="font-mono text-xs text-ink-2">{r.brand_id}</span> },
  { key: "brand_name", header: "Brand", render: r => <span className="text-sm text-ink-1">{r.brand_name ?? "—"}</span> },
  { key: "post_count", header: "Posts", sortable: true, render: r => <span className="text-sm text-ink-2 tabular-nums">{r.post_count ?? 0}</span> },
  { key: "attribution_count", header: "Attributed", sortable: true, render: r => <span className="text-sm text-ink-2 tabular-nums">{r.attribution_count ?? 0}</span> },
  { key: "coverage", header: "Coverage", sortable: true, render: r => r.coverage != null ? <span className="text-sm text-ink-1">{r.coverage.toFixed(1)}%</span> : <span className="text-ink-3">—</span> },
];

const BACKFILL_COLS: Column<BackfillRun>[] = [
  { key: "platform", header: "Platform", sortable: true, render: r => <span className="font-mono text-xs text-ink-1">{r.platform ?? "—"}</span> },
  { key: "status", header: "Status", render: r => <Badge variant={statusBadge(r.status)}>{r.status}</Badge> },
  { key: "records_processed", header: "Records", sortable: true, render: r => <span className="text-sm text-ink-2 tabular-nums">{r.records_processed ?? 0}</span> },
  { key: "created_at", header: "Started", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
  { key: "completed_at", header: "Completed", render: r => <span className="text-sm text-ink-2">{fmt(r.completed_at)}</span> },
];

function DiagnosticsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmBackfill, setConfirmBackfill] = useState<string | null>(null);

  const { data: intData, isLoading: intLoading } = useQuery({ queryKey: ["integrations-diag"], queryFn: apiGetIntegrationsDiagnostics });
  const { data: attrData, isLoading: attrLoading } = useQuery({ queryKey: ["attribution-diag"], queryFn: apiGetAttributionDiagnostics });
  const { data: backfillData, isLoading: bfLoading } = useQuery({ queryKey: ["backfill-runs"], queryFn: () => apiGetBackfillStatus() });

  const intDiags: IntegrationDiagnostic[] = (intData as { data?: IntegrationDiagnostic[] } | undefined)?.data
    ?? (Array.isArray(intData) ? intData as IntegrationDiagnostic[] : []);
  const attrDiags: AttributionDiagnostic[] = (attrData as { data?: AttributionDiagnostic[] } | undefined)?.data
    ?? (Array.isArray(attrData) ? attrData as AttributionDiagnostic[] : []);
  const backfills: BackfillRun[] = (backfillData as { data?: BackfillRun[] } | undefined)?.data
    ?? (Array.isArray(backfillData) ? backfillData as BackfillRun[] : []);

  const backfillMut = useMutation({
    mutationFn: () => apiTriggerBackfill({ job_type: confirmBackfill }),
    onSuccess: () => { toast.success("Backfill triggered"); qc.invalidateQueries({ queryKey: ["backfill-runs"] }); setConfirmBackfill(null); },
    onError: () => toast.error("Failed to trigger backfill"),
  });

  return (
    <div className="space-y-5">
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
          <Link className="h-4 w-4 text-ink-3" />
          <h2 className="text-sm font-semibold text-ink-1">Integration Diagnostics</h2>
        </div>
        <DataTable data={intDiags} columns={INT_COLS} keyField="platform" loading={intLoading} emptyTitle="No diagnostics" exportFilename="integrations" searchable />
      </Card>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
          <Activity className="h-4 w-4 text-ink-3" />
          <h2 className="text-sm font-semibold text-ink-1">Attribution Diagnostics</h2>
        </div>
        <DataTable data={attrDiags} columns={ATTR_COLS} keyField="brand_id" loading={attrLoading} emptyTitle="No attribution data" exportFilename="attribution" searchable />
      </Card>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">Backfill Runs</h2>
          </div>
          <div className="flex gap-2">
            {["posts","brands","memory"].map(job => (
              <Button key={job} variant="secondary" size="sm" onClick={() => setConfirmBackfill(job)}>
                Backfill {job}
              </Button>
            ))}
          </div>
        </div>
        <DataTable data={backfills} columns={BACKFILL_COLS} keyField="brand_id" loading={bfLoading} emptyTitle="No backfill runs" exportFilename="backfills" />
      </Card>

      <ConfirmDialog open={!!confirmBackfill} onClose={() => setConfirmBackfill(null)}
        onConfirm={() => backfillMut.mutate()} loading={backfillMut.isPending}
        title={`Trigger ${confirmBackfill} backfill`}
        description="This will reprocess historical data. It may take several minutes." type="info" />
    </div>
  );
}

function TestsTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: certData, isLoading: certLoading } = useQuery({
    queryKey: ["certification-matrix"],
    queryFn: () => apiGetCertificationMatrix(""),
  });
  const [lastResult, setLastResult] = useState<{ passed?: number; failed?: number; results?: {name:string;passed:boolean;error?:string}[] } | null>(null);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    try {
      const result = await apiRunPlatformTest({}) as { passed?: number; failed?: number; results?: {name:string;passed:boolean;error?:string}[] };
      setLastResult(result);
      toast.success(`Tests complete: ${result.passed ?? 0}/${(result.passed ?? 0) + (result.failed ?? 0)} passed`);
    } catch {
      toast.error("Failed to run tests");
    } finally {
      setRunning(false);
    }
  };

  const certEngines = certData
    ? Object.entries(certData as Record<string, { status: string; checks: number; passed: number; issues?: string[] }>).map(
        ([name, v]) => ({ name, ...v })
      )
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-1">Platform Test Suite</h2>
        <Button variant="primary" icon={<Play className="h-3.5 w-3.5" />} loading={running} onClick={runTests}>
          Run tests
        </Button>
      </div>

      {lastResult && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-1">Latest Run</h3>
            <div className="flex gap-2">
              <Badge variant="success">{lastResult.passed ?? 0} passed</Badge>
              {(lastResult.failed ?? 0) > 0 && <Badge variant="danger">{lastResult.failed} failed</Badge>}
            </div>
          </div>
          <div className="divide-y divide-os-border/40 max-h-80 overflow-y-auto">
            {(lastResult.results ?? []).map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                {r.passed ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm text-ink-1">{r.name}</p>
                  {r.error && <p className="text-xs text-red-400 mt-0.5">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {certEngines.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">Certification Matrix</h2>
          </div>
          {certLoading ? (
            <div className="p-4 animate-pulse space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-8 bg-os-raised rounded" />)}</div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-os-border">
                <th className="os-table-th">Engine</th>
                <th className="os-table-th text-right">Checks</th>
                <th className="os-table-th">Status</th>
              </tr></thead>
              <tbody>
                {certEngines.map(e => (
                  <tr key={e.name} className="border-b border-os-border/40">
                    <td className="os-table-td font-medium text-ink-1">{e.name}</td>
                    <td className="os-table-td text-right tabular-nums text-ink-2">{e.passed}/{e.checks}</td>
                    <td className="os-table-td"><Badge variant={statusBadge(e.status)}>{e.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}

function OAuthTab() {
  const { data: intData, isLoading } = useQuery({ queryKey: ["integrations-diag-oauth"], queryFn: apiGetIntegrationsDiagnostics });
  const { data: eventsData } = useQuery({
    queryKey: ["system-events-oauth"],
    queryFn: () => apiGetSystemEvents({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const allIntegrations = (
    (intData as { platforms?: unknown[] } | undefined)?.platforms
    ?? (Array.isArray(intData) ? intData : [])
  ) as { platform: string; brand_name?: string; status: string; error?: string; last_used?: string }[];

  const expired = allIntegrations.filter(i => i.status === "expired" || i.status === "error");
  const healthy = allIntegrations.filter(i => i.status === "connected" || i.status === "healthy");

  type EvRow = { id: string; source?: string; severity: string; message: string; created_at: string };
  const allEvents = (eventsData as { events?: EvRow[] } | undefined)?.events
    ?? (eventsData as { data?: EvRow[] } | undefined)?.data ?? [] as EvRow[];
  const oauthEvents = (allEvents as EvRow[])
    .filter(e => e.source === "oauth" || e.source?.includes("oauth") || e.message?.toLowerCase().includes("oauth") || e.message?.toLowerCase().includes("token"));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total connections" value={allIntegrations.length.toString()} icon={<Link className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Connected" value={healthy.length.toString()} icon={<CheckCircle className="h-4 w-4" />} accent="success" loading={isLoading} />
        <StatCard label="Expired / Error" value={expired.length.toString()} icon={<XCircle className="h-4 w-4" />} accent={expired.length > 0 ? "danger" : undefined} loading={isLoading} />
      </div>

      {expired.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-ink-1">Expired / Broken Connections</h2>
            <Badge variant="danger">{expired.length}</Badge>
          </div>
          <div className="divide-y divide-os-border/50">
            {expired.map((i, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-1 capitalize">{i.platform}</p>
                  {i.brand_name && <p className="text-xs text-ink-3">{i.brand_name}</p>}
                  {i.error && <p className="text-xs text-red-400 mt-0.5">{i.error}</p>}
                </div>
                <Badge variant={statusBadge(i.status)} dot>{i.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {healthy.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-ink-1">Active Connections</h2>
            <Badge variant="success">{healthy.length}</Badge>
          </div>
          <div className="divide-y divide-os-border/50">
            {healthy.map((i, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm text-ink-1 capitalize">{i.platform}</p>
                  {i.brand_name && <p className="text-xs text-ink-3">{i.brand_name}</p>}
                </div>
                <Badge variant="success" dot>Connected</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {oauthEvents.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <Radio className="h-4 w-4 text-ink-3" />
            <h2 className="text-sm font-semibold text-ink-1">OAuth Events</h2>
            <Badge variant="neutral">{oauthEvents.length}</Badge>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-os-border/40">
            {oauthEvents.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                {ev.severity === "error" || ev.severity === "critical"
                  ? <XCircle className="h-4 w-4 mt-0.5 text-red-400 shrink-0" />
                  : ev.severity === "warning"
                  ? <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-400 shrink-0" />
                  : <CheckCircle className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-1">{ev.message}</p>
                  <p className="text-2xs text-ink-3 mt-0.5">{new Date(ev.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {allIntegrations.length === 0 && !isLoading && (
        <div className="py-16 text-center text-sm text-ink-3">No OAuth connection data available</div>
      )}
    </div>
  );
}

export default function OperationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("status");

  return (
    <WorkspaceLayout
      workspace="operations"
      title="Platform Ops"
      subtitle="System health, diagnostics, tests, OAuth"
      onRefresh={() => {
        ["system-status-ops","ops-health-ops","system-events-ops","delivery-stats-ops",
          "integrations-diag","attribution-diag","backfill-runs","integrations-diag-oauth","system-events-oauth"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "status", label: "Health", icon: <Activity className="h-3.5 w-3.5" /> },
            { id: "diagnostics", label: "Diagnostics", icon: <Cpu className="h-3.5 w-3.5" /> },
            { id: "tests", label: "Tests", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
            { id: "oauth", label: "OAuth", icon: <KeyRound className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "status" && <StatusTab />}
      {tab === "diagnostics" && <DiagnosticsTab />}
      {tab === "tests" && <TestsTab />}
      {tab === "oauth" && <OAuthTab />}
    </WorkspaceLayout>
  );
}
