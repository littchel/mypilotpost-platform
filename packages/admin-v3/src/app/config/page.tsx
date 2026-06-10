"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  apiListKillSwitches, apiUpdateKillSwitch, apiListAuditLog, apiGetTokenOps,
} from "@/lib/api";
import { fmtDate, fmtRelative, fmtNum } from "@/lib/utils";
import { Settings, Activity, DollarSign, AlertTriangle } from "lucide-react";
import type { KillSwitch, AuditLogEntry } from "@/types";

type ConfigTab = "kill-switches" | "audit-log" | "token-ops";

export default function ConfigPage() {
  const [tab, setTab] = useState<ConfigTab>("kill-switches");

  return (
    <WorkspaceLayout workspace="config" title="Platform Config" subtitle="Kill switches, audit log, and token operations">
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {([
          ["kill-switches", "Kill Switches"],
          ["audit-log",    "Audit Log"],
          ["token-ops",    "Token Ops"],
        ] as [ConfigTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "kill-switches" && <KillSwitchesTab />}
      {tab === "audit-log"     && <AuditLogTab />}
      {tab === "token-ops"     && <TokenOpsTab />}
    </WorkspaceLayout>
  );
}

// ── Kill Switches ─────────────────────────────────────────────────────────────

function KillSwitchRow({ sw }: { sw: KillSwitch }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => apiUpdateKillSwitch(sw.key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kill-switches"] }),
  });

  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900">{sw.label ?? sw.key}</p>
          {!sw.enabled && <Badge variant="danger">DISABLED</Badge>}
        </div>
        {sw.description && <p className="text-xs text-slate-500">{sw.description}</p>}
        <p className="text-[10px] font-mono text-slate-400">{sw.key}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {sw.updated_at && <span className="text-xs text-slate-400">{fmtRelative(sw.updated_at)}</span>}
        <button
          disabled={toggle.isPending}
          onClick={() => {
            if (!sw.enabled || confirm(`Disable "${sw.label ?? sw.key}"? This may affect live users.`)) {
              toggle.mutate(!sw.enabled);
            }
          }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
            sw.enabled ? "bg-brand-600" : "bg-slate-300"
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${sw.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

function KillSwitchesTab() {
  const { data, isLoading } = useQuery({ queryKey: ["kill-switches"], queryFn: apiListKillSwitches });
  const switches = data?.switches ?? [];
  const disabled = switches.filter((s) => !s.enabled);

  return (
    <div>
      {disabled.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{disabled.length} feature{disabled.length > 1 ? "s" : ""} currently disabled</p>
        </div>
      )}
      <Card padding="none">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle>Feature Kill Switches ({switches.length})</CardTitle>
        </CardHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
        ) : switches.length === 0 ? (
          <EmptyState title="No kill switches" description="No kill switches configured." />
        ) : (
          <div className="divide-y divide-slate-50">
            {switches.map((sw) => <KillSwitchRow key={sw.key} sw={sw} />)}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", page],
    queryFn: () => apiListAuditLog({ page, per_page: 50 }),
  });

  const entries: AuditLogEntry[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <Card padding="none">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <CardTitle>Audit Log ({fmtNum(total)})</CardTitle>
      </CardHeader>
      {isLoading ? (
        <div className="flex justify-center py-8"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
      ) : entries.length === 0 ? (
        <EmptyState title="No audit entries" description="No log entries recorded yet." />
      ) : (
        <>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Time", "Admin", "Action", "Resource", "ID"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtRelative(e.created_at)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 truncate max-w-[140px]">{e.admin_email ?? e.admin_id ?? "system"}</td>
                  <td className="px-4 py-2.5"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">{e.action}</code></td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 capitalize">{e.resource_type ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-400 truncate max-w-[80px]">{e.resource_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 50 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-slate-500">Page {page} of {Math.ceil(total / 50)}</span>
              <Button variant="secondary" size="sm" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ── Token Ops ─────────────────────────────────────────────────────────────────

function TokenOpsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["token-ops"], queryFn: apiGetTokenOps });

  if (isLoading) return <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;
  if (!data) return <EmptyState title="No token data" description="Token usage tracking data is not available." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Today" value={fmtNum(data.today.tokens)} sub={`$${data.today.cost_usd.toFixed(2)}`} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="This week" value={fmtNum(data.week.tokens)} sub={`$${data.week.cost_usd.toFixed(2)}`} />
        <StatCard label="This month" value={fmtNum(data.month.tokens)} sub={`$${data.month.cost_usd.toFixed(2)} · forecast $${data.forecast_month_usd.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By feature */}
        <Card padding="none">
          <CardHeader className="border-b border-slate-100 px-5 py-4">
            <CardTitle>By Feature</CardTitle>
          </CardHeader>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Feature", "Tokens", "Cost"].map((h) => (
                  <th key={h} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.by_feature).map(([key, v]) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm text-slate-800 capitalize">{key.replace("_", " ")}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{fmtNum(v.tokens)}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-900">${v.cost_usd.toFixed(2)}</td>
                </tr>
              ))}
              {Object.keys(data.by_feature).length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-sm text-slate-400">No feature data.</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Top brands */}
        <Card padding="none">
          <CardHeader className="border-b border-slate-100 px-5 py-4">
            <CardTitle>Top Brands by Usage</CardTitle>
          </CardHeader>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Brand", "Tokens", "Cost"].map((h) => (
                  <th key={h} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.top_brands.map((b) => (
                <tr key={b.brand_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm text-slate-800">{b.brand_name ?? b.brand_id}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{fmtNum(b.tokens)}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-900">${b.cost_usd.toFixed(2)}</td>
                </tr>
              ))}
              {data.top_brands.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-sm text-slate-400">No brand data.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
