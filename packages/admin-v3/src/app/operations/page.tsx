"use client";

import { useQuery } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGetOperationsHealth, apiGetDeliveryStats, apiGetOauthHealth } from "@/lib/api";
import { fmtNum } from "@/lib/utils";
import { Activity, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { SocialPlatformHealth } from "@/types";

function PlatformRow({ p }: { p: SocialPlatformHealth }) {
  const statusIcon = p.status === "ok"
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : p.status === "warn"
    ? <AlertTriangle className="h-4 w-4 text-amber-500" />
    : <XCircle className="h-4 w-4 text-red-500" />;

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-sm font-medium text-slate-900 capitalize">{p.display_name ?? p.platform}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{fmtNum(p.connected)}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{fmtNum(p.published_today)}</td>
      <td className="px-4 py-3 text-sm text-red-600">{fmtNum(p.failed)}</td>
      <td className="px-4 py-3 text-sm text-amber-600">{fmtNum(p.oauth_errors)}</td>
      <td className="px-4 py-3">
        {p.rate_limited
          ? <Badge variant="danger">Rate limited</Badge>
          : <Badge variant="success">OK</Badge>
        }
      </td>
    </tr>
  );
}

export default function OperationsPage() {
  const health = useQuery({ queryKey: ["ops-health"], queryFn: apiGetOperationsHealth });
  const delivery = useQuery({ queryKey: ["delivery-stats"], queryFn: apiGetDeliveryStats });
  const oauth = useQuery({ queryKey: ["oauth-health"], queryFn: apiGetOauthHealth });

  const h = health.data;
  const platforms = oauth.data?.platforms ?? [];
  const deliveryStats = delivery.data?.stats ?? [];
  const alerts = h?.alerts ?? [];

  return (
    <WorkspaceLayout workspace="operations" title="Platform Operations" subtitle="Jobs, delivery, integrations, and alerts">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Jobs queued" value={h ? fmtNum(h.jobs_queued ?? 0) : "—"} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Success (24h)" value={h ? fmtNum(h.jobs_success_24h ?? 0) : "—"} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard label="Failed (24h)" value={h ? fmtNum(h.jobs_failed_24h ?? 0) : "—"} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Delivery rate" value={h?.delivery_rate != null ? `${h.delivery_rate}%` : "—"} icon={<Activity className="h-4 w-4" />} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <Card padding="none">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Active Alerts ({alerts.length})
                </span>
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-50">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <Badge variant={a.severity === "error" ? "danger" : a.severity === "warn" ? "warning" : "info"} className="shrink-0 mt-0.5">
                    {a.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.type}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Platform health */}
        <div>
          <Card padding="none">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle>Social Platform Health</CardTitle>
            </CardHeader>
            {oauth.isLoading ? (
              <div className="flex justify-center py-8"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
            ) : platforms.length === 0 ? (
              <EmptyState title="No platforms" description="No OAuth platform data available." />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Platform", "Connected", "Published", "Failed", "OAuth errors", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {platforms.map((p) => <PlatformRow key={p.platform} p={p} />)}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Delivery history */}
        <div>
          <Card padding="none">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle>Delivery History (last 14d)</CardTitle>
            </CardHeader>
            {delivery.isLoading ? (
              <div className="flex justify-center py-8"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
            ) : deliveryStats.length === 0 ? (
              <EmptyState title="No delivery data" />
            ) : (
              <div className="overflow-y-auto max-h-80">
                <table className="w-full text-left">
                  <thead className="sticky top-0">
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Date", "Success", "Failed", "Pending", "Rate"].map((h) => (
                        <th key={h} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveryStats.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-xs text-slate-700">{d.date}</td>
                        <td className="px-4 py-2.5 text-xs text-green-700">{fmtNum(d.success)}</td>
                        <td className="px-4 py-2.5 text-xs text-red-600">{fmtNum(d.failed)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{fmtNum(d.pending)}</td>
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-900">{d.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
