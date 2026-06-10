"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card } from "@/components/ui/Card";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  apiListCustomers, apiGetCustomer, apiToggleUser, apiVerifyUser, apiExtendTrial,
} from "@/lib/api";
import { fmtDate, fmtRelative } from "@/lib/utils";
import type { Customer } from "@/types";
import { Users, Search, RefreshCw } from "lucide-react";

function CustomerRow({ c, selected, onClick }: { c: Customer; selected: boolean; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${selected ? "bg-blue-50" : ""}`}
    >
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{c.email}</p>
          {c.name && <p className="text-xs text-slate-500 truncate max-w-[200px]">{c.name}</p>}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusVariant(c.subscription_status)} className="capitalize">
          {c.subscription_status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{c.plan_id}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(c.created_at)}</td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {c.last_login_at ? fmtRelative(c.last_login_at) : "never"}
      </td>
    </tr>
  );
}

function CustomerDetail({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", userId],
    queryFn: () => apiGetCustomer(userId),
  });

  const [trialDays, setTrialDays] = useState("7");

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => apiToggleUser(userId, enabled),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); qc.invalidateQueries({ queryKey: ["customer", userId] }); },
  });
  const verify = useMutation({
    mutationFn: () => apiVerifyUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", userId] }),
  });
  const extend = useMutation({
    mutationFn: () => apiExtendTrial(userId, parseInt(trialDays, 10)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", userId] }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;
  if (!data) return <p className="text-sm text-slate-500">Could not load customer.</p>;

  const sub = data.subscription;
  const usage = data.usage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-lg font-semibold text-slate-900">{data.email}</p>
        {data.name && <p className="text-sm text-slate-500">{data.name}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={statusVariant(data.subscription_status)} className="capitalize">{data.subscription_status}</Badge>
          {!data.verified_at && <Badge variant="warning">Unverified</Badge>}
          {!data.is_active && <Badge variant="danger">Disabled</Badge>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={data.is_active ? "danger" : "secondary"}
          loading={toggle.isPending}
          onClick={() => toggle.mutate(!data.is_active)}
        >
          {data.is_active ? "Disable account" : "Enable account"}
        </Button>
        {!data.verified_at && (
          <Button size="sm" variant="secondary" loading={verify.isPending} onClick={() => verify.mutate()}>
            Verify email
          </Button>
        )}
      </div>

      {/* Subscription */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Subscription</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-500">Plan</span><p className="font-medium">{sub?.plan_name ?? data.plan_id}</p></div>
          <div><span className="text-slate-500">Status</span><p className="font-medium capitalize">{sub?.status ?? data.subscription_status}</p></div>
          {sub?.current_period_end && (
            <div><span className="text-slate-500">Renews</span><p className="font-medium">{fmtDate(sub.current_period_end)}</p></div>
          )}
          {data.trial_ends_at && (
            <div><span className="text-slate-500">Trial ends</span><p className="font-medium">{fmtDate(data.trial_ends_at)}</p></div>
          )}
        </div>
      </div>

      {/* Extend trial */}
      {(data.subscription_status === "trial" || data.subscription_status === "trial_expired") && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Extend Trial</h3>
          <div className="flex gap-2">
            <select
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
            <Button size="sm" loading={extend.isPending} onClick={() => extend.mutate()}>
              Extend
            </Button>
          </div>
        </div>
      )}

      {/* Usage */}
      {usage && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Usage</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: "Posts", used: usage.posts_used, limit: usage.posts_per_month_limit },
              { label: "AI generations", used: usage.ai_generations_used, limit: usage.ai_generations_limit },
              { label: "Social accounts", used: usage.social_accounts_used, limit: usage.social_accounts_limit },
            ].map(({ label, used, limit }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium">{used} / {limit ?? "∞"}</span>
                </div>
                {limit ? (
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health score */}
      {data.health_score && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Health Score</h3>
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold ${data.health_score.score >= 70 ? "text-green-600" : data.health_score.score >= 40 ? "text-amber-600" : "text-red-600"}`}>
              {data.health_score.score}
            </span>
            <Badge variant={statusVariant(data.health_score.tier)} className="capitalize">
              {data.health_score.tier.replace("_", " ")}
            </Badge>
          </div>
        </div>
      )}

      {/* Brands */}
      {data.brands && data.brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Brands ({data.brands.length})
          </h3>
          <div className="space-y-1">
            {data.brands.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{b.name}</span>
                <span className="text-xs text-slate-500">{b.industry ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account meta */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Account</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>ID<p className="font-mono text-slate-800 truncate">{data.id}</p></div>
          <div>Joined<p className="font-medium text-slate-800">{fmtDate(data.created_at)}</p></div>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const params: Record<string, string | number> = { page, per_page: 50 };
  if (search) params.search = search;
  if (filter !== "all") params.status = filter;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", params],
    queryFn: () => apiListCustomers(params),
  });

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <WorkspaceLayout workspace="customers" title="Customer 360" subtitle="Accounts, health, and lifecycle">
      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by email or name…"
            className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="trial_expired">Trial expired</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refetch()}>
          Refresh
        </Button>
        <span className="text-xs text-slate-500">{total} customers</span>
      </div>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState icon={<Users className="h-10 w-10" />} title="No customers found" description="Try adjusting your search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Email / Name", "Status", "Plan", "Joined", "Last seen"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    c={c}
                    selected={selectedId === c.id}
                    onClick={() => setSelectedId(c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > 50 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-slate-500">Page {page} of {Math.ceil(total / 50)}</span>
          <Button variant="secondary" size="sm" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Detail drawer */}
      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title="Customer Detail" width="md">
        {selectedId && <CustomerDetail userId={selectedId} onClose={() => setSelectedId(null)} />}
      </Drawer>
    </WorkspaceLayout>
  );
}
