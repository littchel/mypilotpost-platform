"use client";

import { useQuery } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { apiGetOverview, apiGetExecutionQueue } from "@/lib/api";
import { fmtDate, fmtNum } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import { Users, DollarSign, Activity, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ExecutionItem } from "@/types";

function ExecutionRow({ item }: { item: ExecutionItem }) {
  const sev = item.severity === "high" ? "danger" : item.severity === "medium" ? "warning" : "neutral";
  return (
    <Link href={item.href} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors">
      <Badge variant={sev} className="mt-0.5 shrink-0">{item.severity}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
        {item.description && <p className="text-xs text-slate-500 truncate">{item.description}</p>}
      </div>
      <span className="shrink-0 text-xs text-slate-400">{fmtDate(item.created_at)}</span>
    </Link>
  );
}

export default function TodayPage() {
  const { session } = useSession();
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: apiGetOverview,
    retry: 1,
  });
  const queue = useQuery({
    queryKey: ["execution-queue"],
    queryFn: apiGetExecutionQueue,
    retry: 1,
  });

  const d = (overview.data ?? {}) as Record<string, number | undefined>;
  const items: ExecutionItem[] = (queue.data?.items ?? []).slice(0, 20);
  const highPriority = items.filter((i) => i.severity === "high");
  const rest = items.filter((i) => i.severity !== "high");

  return (
    <WorkspaceLayout title="Today" subtitle={`Good morning${session ? `, ${session.email.split("@")[0]}` : ""} — here's what needs your attention`}>
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={d.users != null ? fmtNum(d.users) : "—"}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="MRR"
          value={d.mrr != null ? `$${fmtNum(Math.round(d.mrr / 100))}` : "—"}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Active Trials"
          value={d.trial_users != null ? fmtNum(d.trial_users) : "—"}
          sub="conversion opportunity"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Delivery Rate"
          value={d.delivery_rate != null ? `${d.delivery_rate}%` : "—"}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* High priority */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Needs Attention
                  {highPriority.length > 0 && (
                    <Badge variant="danger">{highPriority.length}</Badge>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-50 px-2 py-2">
              {queue.isLoading && (
                <p className="px-3 py-4 text-sm text-slate-400">Loading…</p>
              )}
              {!queue.isLoading && highPriority.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-400">No high-priority items right now.</p>
              )}
              {highPriority.map((item, i) => <ExecutionRow key={i} item={item} />)}
            </div>
          </Card>

          {rest.length > 0 && (
            <Card padding="none" className="mt-4">
              <CardHeader className="border-b border-slate-100 px-5 py-4">
                <CardTitle>Other Items</CardTitle>
              </CardHeader>
              <div className="divide-y divide-slate-50 px-2 py-2">
                {rest.slice(0, 10).map((item, i) => <ExecutionRow key={i} item={item} />)}
              </div>
            </Card>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-4">
          <Card>
            <CardTitle className="mb-4">Quick Actions</CardTitle>
            <div className="space-y-2">
              {[
                { label: "View all customers",    href: "/customers/" },
                { label: "Open support inbox",    href: "/support/" },
                { label: "Revenue overview",       href: "/billing/" },
                { label: "Platform operations",   href: "/operations/" },
                { label: "Commercial plans",       href: "/commercial/" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {l.label}
                  <span className="text-slate-400">→</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-3">Platform Status</CardTitle>
            {overview.isLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">New users (7d)</span>
                  <span className="font-medium text-slate-900">{d.new_7d ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Published (24h)</span>
                  <span className="font-medium text-slate-900">{d.published_24h ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Failed jobs (24h)</span>
                  <span className={`font-medium ${d.failed_24h ? "text-red-600" : "text-slate-900"}`}>
                    {d.failed_24h ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Conversion rate</span>
                  <span className="font-medium text-slate-900">
                    {d.conversion_rate != null ? `${d.conversion_rate}%` : "—"}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
