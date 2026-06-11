"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  apiGetOverview, apiGetSystemStatus, apiGetSystemEvents,
  apiGetOperationsHealth, apiListApprovals, apiListSupportRequests,
  apiGetDeliveryStats,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card } from "@/components/ui/Card";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertTriangle, CheckCircle, XCircle,
  Users, DollarSign, Activity, Headphones,
  ExternalLink, ChevronRight, Zap, FileCheck, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemEvent, ContentApproval, SupportRequest } from "@/types";

function fmtRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SEV_ICON: Record<string, React.ElementType> = {
  info: CheckCircle, warning: AlertTriangle, error: XCircle, critical: XCircle,
};
const SEV_COLOR: Record<string, string> = {
  info: "text-blue-400", warning: "text-yellow-400", error: "text-red-400", critical: "text-red-500",
};

export default function TodayPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ["overview"], queryFn: apiGetOverview, refetchInterval: 60_000,
  });
  const { data: sysStatus } = useQuery({
    queryKey: ["system-status"], queryFn: apiGetSystemStatus, refetchInterval: 30_000,
  });
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["system-events"], queryFn: () => apiGetSystemEvents({ limit: 20 }), refetchInterval: 30_000,
  });
  const { data: opsHealth } = useQuery({
    queryKey: ["ops-health"], queryFn: apiGetOperationsHealth, refetchInterval: 60_000,
  });
  const { data: approvalsData } = useQuery({
    queryKey: ["approvals", "pending"], queryFn: () => apiListApprovals({ status: "pending" }),
  });
  const { data: supportData } = useQuery({
    queryKey: ["support-requests-today"], queryFn: () => apiListSupportRequests({ status: "open", limit: "8" }),
  });
  const { data: deliveryData } = useQuery({
    queryKey: ["delivery-stats"], queryFn: apiGetDeliveryStats, refetchInterval: 60_000,
  });

  const events: SystemEvent[] = (eventsData as { events?: SystemEvent[]; data?: SystemEvent[] } | undefined)?.events
    ?? (eventsData as { data?: SystemEvent[] } | undefined)?.data ?? [];
  const criticalEvents = events.filter(e => e.severity === "critical" || e.severity === "error");
  const approvals = ((approvalsData as { approvals?: ContentApproval[] } | undefined)?.approvals ?? []) as ContentApproval[];
  const supportRequests = ((supportData as { data?: SupportRequest[] } | undefined)?.data ?? []) as SupportRequest[];
  const deliveryStats = (
    (deliveryData as { stats?: unknown[] } | undefined)?.stats
    ?? (deliveryData as { data?: unknown[] } | undefined)?.data ?? []
  ) as { status?: string; failed?: number }[];
  const failedDeliveries = deliveryStats.reduce((s, d) => s + (d.failed ?? (d.status === "failed" ? 1 : 0)), 0);
  const systemOk = sysStatus?.status === "healthy";
  const mrr = overview?.mrr ? Math.round((overview.mrr as number) / 100) : 0;

  const refresh = () => {
    ["overview","system-events","ops-health","delivery-stats"].forEach(k =>
      qc.invalidateQueries({ queryKey: [k] })
    );
  };

  return (
    <WorkspaceLayout workspace="today" title="Today" subtitle="Platform command center" onRefresh={refresh}>
      {/* Critical banner */}
      {criticalEvents.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">{criticalEvents.length} critical event{criticalEvents.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-red-400 mt-0.5">{criticalEvents[0].message}</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => router.push("/config/")}>View events</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Active customers" value={(overview?.active_subscriptions as number | undefined)?.toLocaleString() ?? "—"} icon={<Users className="h-4 w-4" />} accent="info" loading={ovLoading} onClick={() => router.push("/customers/")} />
        <StatCard label="MRR" value={`R${mrr.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="success" loading={ovLoading} onClick={() => router.push("/billing/")} />
        <StatCard label="Open support" value={supportRequests.length.toString()} icon={<Headphones className="h-4 w-4" />} accent={supportRequests.length > 10 ? "warning" : undefined} loading={ovLoading} onClick={() => router.push("/support/")} />
        <StatCard label="Failed deliveries" value={failedDeliveries.toString()} icon={<Activity className="h-4 w-4" />} accent={failedDeliveries > 0 ? "danger" : "success"} loading={ovLoading} onClick={() => router.push("/operations/")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — events + health */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-os-border">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-ink-3" />
                <h2 className="text-sm font-semibold text-ink-1">System Events</h2>
                {events.length > 0 && <Badge variant={criticalEvents.length > 0 ? "danger" : "neutral"}>{events.length}</Badge>}
              </div>
              <Button variant="ghost" size="sm" iconRight={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => router.push("/config/")}>All events</Button>
            </div>
            {eventsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-4 w-4 bg-os-raised rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-os-raised rounded w-3/4" />
                      <div className="h-2.5 bg-os-raised rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState icon={<CheckCircle className="h-8 w-8" />} title="No events" description="All systems operating normally." />
            ) : (
              <div>
                {events.slice(0, 12).map(ev => {
                  const Icon = SEV_ICON[ev.severity] ?? Radio;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3 border-b border-os-border/40 hover:bg-os-raised/30 transition-colors">
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", SEV_COLOR[ev.severity])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-ink-1">{ev.message}</p>
                          <span className="text-2xs text-ink-3 shrink-0 mt-0.5">{fmtRelative(ev.created_at)}</span>
                        </div>
                        <p className="text-2xs text-ink-3 mt-0.5 uppercase tracking-wider">{ev.source}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card padding="none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-os-border">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-ink-3" />
                <h2 className="text-sm font-semibold text-ink-1">Platform Health</h2>
              </div>
              <Badge variant={systemOk ? "success" : "danger"} dot>{systemOk ? "Healthy" : "Degraded"}</Badge>
            </div>
            {sysStatus ? (
              <div className="divide-y divide-os-border/50">
                {Object.entries({ Database: sysStatus.db_ok, Queue: sysStatus.queue_ok, AI: sysStatus.ai_ok, Worker: sysStatus.worker_ok }).map(([label, ok]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-ink-2">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-green-400" : "bg-red-400")} />
                      <span className={cn("text-xs font-medium", ok ? "text-green-400" : "text-red-400")}>{ok ? "OK" : "Down"}</span>
                    </div>
                  </div>
                ))}
                {(opsHealth?.platforms ?? []).map((p: { platform: string; status: string }) => (
                  <div key={p.platform} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-ink-2 capitalize">{p.platform}</span>
                    <Badge variant={statusBadge(p.status)} dot>{p.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-2 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3.5 w-20 bg-os-raised rounded" />
                    <div className="h-3.5 w-12 bg-os-raised rounded" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <Card padding="none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-os-border">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-ink-3" />
                <h2 className="text-sm font-semibold text-ink-1">Pending Approvals</h2>
                {approvals.length > 0 && <Badge variant="warning">{approvals.length}</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/content/")}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {approvals.length === 0
              ? <EmptyState title="No pending approvals" className="py-8" />
              : <div>{approvals.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-start justify-between gap-2 px-4 py-3 border-b border-os-border/40 hover:bg-os-raised/30 cursor-pointer transition-colors" onClick={() => router.push("/content/")}>
                    <div className="min-w-0">
                      <p className="text-sm text-ink-1 truncate">{a.content_title ?? "Untitled"}</p>
                      <p className="text-xs text-ink-3 mt-0.5">{a.brand_name}</p>
                    </div>
                    <Badge variant="warning">{a.status}</Badge>
                  </div>
                ))}</div>
            }
          </Card>

          <Card padding="none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-os-border">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-ink-3" />
                <h2 className="text-sm font-semibold text-ink-1">Open Support</h2>
                {supportRequests.length > 0 && <Badge variant={supportRequests.length > 5 ? "warning" : undefined}>{supportRequests.length}</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/support/")}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {supportRequests.length === 0
              ? <EmptyState title="No open tickets" className="py-8" />
              : <div>{supportRequests.slice(0, 5).map(r => (
                  <div key={r.id} className="px-4 py-3 border-b border-os-border/40 hover:bg-os-raised/30 cursor-pointer transition-colors" onClick={() => router.push("/support/")}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-ink-1 truncate">{r.subject ?? r.category}</p>
                      <Badge variant={r.priority === "urgent" ? "danger" : r.priority === "high" ? "warning" : undefined}>{r.priority ?? "normal"}</Badge>
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5">{r.user_email ?? r.user_id} · {fmtRelative(r.created_at)}</p>
                  </div>
                ))}</div>
            }
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-1 mb-3">Quick Actions</h2>
            <div className="space-y-1">
              {[
                { label: "Customers", icon: Users, path: "/customers/" },
                { label: "Billing overview", icon: DollarSign, path: "/billing/" },
                { label: "Platform diagnostics", icon: Activity, path: "/operations/" },
                { label: "Kill switches", icon: Zap, path: "/config/" },
              ].map(a => (
                <button key={a.path} onClick={() => router.push(a.path)}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded hover:bg-os-raised text-sm text-ink-2 hover:text-ink-1 transition-colors">
                  <a.icon className="h-3.5 w-3.5 text-ink-3" />
                  {a.label}
                  <ChevronRight className="h-3 w-3 ml-auto text-ink-4" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
