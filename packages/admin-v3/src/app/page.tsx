"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  apiGetBillingOverviewV2, apiGetCustomerHealthSummary, apiGetJobs,
  apiGetSystemExtended, apiGetSystemEvents, apiListSupportRequests,
  apiListRefunds, apiGetAdminSEO,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle, XCircle, DollarSign, Users, Activity, Send, Bell,
  ClipboardCheck, Server, ChevronRight, CreditCard, Globe, RefreshCw, Radio, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

function money(cents?: number, currency = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
}
function fmtRel(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Section shell — renders only when it has content ─────────────────────────────
function Section({ title, icon, source, onOpen, children }: { title: string; icon: React.ReactNode; source: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-os-border">
        <div className="flex items-center gap-2">{icon}<h2 className="text-sm font-semibold text-ink-1">{title}</h2></div>
        <Button variant="ghost" size="sm" iconRight={<ChevronRight className="h-3.5 w-3.5" />} onClick={onOpen}>{source}</Button>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}
function Attn({ icon, label, count, severity, owner, onClick }: { icon: React.ReactNode; label: string; count: number | string; severity: "danger" | "warning" | "info"; owner: string; onClick: () => void }) {
  const ring = severity === "danger" ? "border-red-500/30 bg-red-500/5" : severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-os-border bg-os-raised/30";
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border text-left transition-colors hover:bg-os-raised/50", ring)}>
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0"><p className="text-sm text-ink-1">{label}</p><p className="text-2xs text-ink-3">{owner}</p></div>
      <span className={cn("text-lg font-bold tabular-nums", severity === "danger" ? "text-red-400" : severity === "warning" ? "text-amber-400" : "text-ink-1")}>{count}</span>
      <ChevronRight className="h-4 w-4 text-ink-4 shrink-0" />
    </button>
  );
}

export default function CommandCenterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const go = (p: string) => router.push(p);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("cc_dismissed") || "[]")); } catch { return new Set(); }
  });
  const dismiss = (id: string) => { const n = new Set(dismissed); n.add(id); setDismissed(n); localStorage.setItem("cc_dismissed", JSON.stringify([...n])); };

  const billing = useQuery({ queryKey: ["cc-billing"], queryFn: apiGetBillingOverviewV2, refetchInterval: 60_000 });
  const health = useQuery({ queryKey: ["cc-health"], queryFn: apiGetCustomerHealthSummary, refetchInterval: 120_000 });
  const jobs = useQuery({ queryKey: ["cc-jobs"], queryFn: () => apiGetJobs(), refetchInterval: 30_000 });
  const sys = useQuery({ queryKey: ["cc-system"], queryFn: apiGetSystemExtended, refetchInterval: 60_000 });
  const events = useQuery({ queryKey: ["cc-events"], queryFn: () => apiGetSystemEvents({ limit: 30 }), refetchInterval: 30_000 });
  const support = useQuery({ queryKey: ["cc-support"], queryFn: () => apiListSupportRequests({ status: "open", limit: "20" }) });
  const refunds = useQuery({ queryKey: ["cc-refunds"], queryFn: apiListRefunds });
  const seo = useQuery({ queryKey: ["cc-seo"], queryFn: apiGetAdminSEO });

  // ── derive ───────────────────────────────────────────────────────────────────
  const bo = (billing.data ?? {}) as Record<string, any>;
  const jobSummary = (jobs.data?.summary ?? {}) as Record<string, number>;
  const providers = ((sys.data?.providers ?? []) as { platform: string; status?: string; expiring?: number; active?: number }[]);
  const expiringProviders = providers.reduce((a, p) => a + (p.expiring ?? 0), 0);
  const degradedProviders = providers.filter(p => p.status === "degraded");
  const evRows = ((events.data as { events?: any[]; data?: any[] })?.events ?? (events.data as { data?: any[] })?.data ?? []) as { id: string; severity: string; message: string; source?: string; created_at: string }[];
  const critical = evRows.filter(e => e.severity === "critical" || e.severity === "error");
  const supportRows = ((support.data as { data?: any[] })?.data ?? []) as { id: string; subject?: string; category?: string; priority?: string; user_email?: string; created_at: string }[];
  const urgentSupport = supportRows.filter(s => s.priority === "urgent" || s.priority === "high");
  const refundRows = ((refunds.data?.refund_requests ?? []) as { id: string; status: string; refund_amount: number; owner_email?: string; brand_name?: string }[]);
  const openRefunds = refundRows.filter(r => r.status === "requested" || r.status === "processing");
  const retryableJobs = ((jobs.data?.jobs ?? []) as { retryable?: boolean }[]).filter(j => j.retryable).length;
  const so = (seo.data ?? {}) as Record<string, any>;
  const hc = (health.data?.counts ?? {}) as Record<string, number>;

  // ── attention items (only count>0) ─────────────────────────────────────────────
  const attention = [
    { id: "pay-fail", icon: <CreditCard className="h-4 w-4 text-red-400" />, label: "Failed payments", count: bo.payment_counts?.failed ?? 0, severity: "danger" as const, owner: "Billing", to: "/billing/" },
    { id: "dead-jobs", icon: <XCircle className="h-4 w-4 text-red-400" />, label: "Dead delivery jobs", count: jobSummary.dead ?? 0, severity: "danger" as const, owner: "Platform Ops", to: "/operations/" },
    { id: "fail-deliv", icon: <Send className="h-4 w-4 text-amber-400" />, label: "Delivery failures", count: jobSummary.failed ?? 0, severity: "warning" as const, owner: "Platform Ops", to: "/operations/" },
    { id: "exp-prov", icon: <Globe className="h-4 w-4 text-amber-400" />, label: "Expiring providers", count: expiringProviders, severity: "warning" as const, owner: "Platform Ops", to: "/operations/" },
    { id: "escal", icon: <Bell className="h-4 w-4 text-amber-400" />, label: "Customer escalations", count: urgentSupport.length, severity: "warning" as const, owner: "Customers", to: "/customers/" },
  ].filter(a => (a.count as number) > 0);

  const loading = billing.isLoading && jobs.isLoading && health.isLoading;

  return (
    <WorkspaceLayout workspace="today" title="Command Center" subtitle="Operational attention layer" onRefresh={() => ["cc-billing","cc-health","cc-jobs","cc-system","cc-events","cc-support","cc-refunds","cc-seo"].forEach(k => qc.invalidateQueries({ queryKey: [k] }))}>
      {loading && <div className="grid lg:grid-cols-2 gap-4 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-os-raised rounded-lg" />)}</div>}

      {/* SECTION 1 — ATTENTION */}
      {attention.length > 0 && (
        <div className="mb-5">
          <Section title="Attention" icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} source="" onOpen={() => {}}>
            <div className="grid md:grid-cols-2 gap-2">
              {attention.map(a => <Attn key={a.id} icon={a.icon} label={a.label} count={a.count} severity={a.severity} owner={a.owner} onClick={() => go(a.to)} />)}
            </div>
          </Section>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SECTION 2 — REVENUE (payment-derived) */}
        {(bo.revenue_net_cents != null) && (
          <Section title="Revenue" icon={<DollarSign className="h-4 w-4 text-green-400" />} source="Billing" onOpen={() => go("/billing/")}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Net Revenue", value: money(bo.revenue_net_cents, bo.currency) },
                { label: "MRR", value: money(bo.mrr_cents, bo.currency) },
                { label: "ARR", value: money(bo.arr_cents, bo.currency) },
                { label: "Refund Rate", value: `${((bo.refund_rate ?? 0) * 100).toFixed(1)}%` },
                { label: "ARPB", value: money(bo.arpu_cents, bo.currency) },
              ].map(s => <div key={s.label} className="os-card-raised p-3"><p className="text-2xs text-ink-3 uppercase tracking-wider">{s.label}</p><p className="text-lg font-bold text-ink-1 mt-0.5">{s.value}</p></div>)}
            </div>
            <p className="text-2xs text-ink-4 mt-2">Payment-derived (payments − refunds). Never plans/subscriptions.</p>
          </Section>
        )}

        {/* SECTION 3 — CUSTOMER HEALTH */}
        {(health.data?.total ?? 0) > 0 && (
          <Section title="Customer Health" icon={<Users className="h-4 w-4 text-brand-400" />} source="Customers" onOpen={() => go("/customers/")}>
            <div className="grid grid-cols-5 gap-2">
              {[
                { k: "healthy", label: "Healthy", color: "text-green-400" },
                { k: "at_risk", label: "At Risk", color: "text-amber-400" },
                { k: "expansion", label: "Expansion", color: "text-brand-300" },
                { k: "dormant", label: "Dormant", color: "text-ink-3" },
                { k: "churn", label: "Churn", color: "text-red-400" },
              ].map(c => <div key={c.k} className="os-card-raised p-2 text-center"><p className={cn("text-xl font-bold tabular-nums", c.color)}>{hc[c.k] ?? 0}</p><p className="text-2xs text-ink-3">{c.label}</p></div>)}
            </div>
          </Section>
        )}

        {/* SECTION 4 — OPERATIONS */}
        {(jobs.data || sys.data) && (
          <Section title="Operations" icon={<Activity className="h-4 w-4 text-blue-400" />} source="Platform Ops" onOpen={() => go("/operations/")}>
            <div className="space-y-1.5">
              {[
                { label: "Job backlog (queued)", value: jobSummary.queued ?? 0 },
                { label: "Failed jobs", value: jobSummary.failed ?? 0, warn: true },
                { label: "Dead jobs", value: jobSummary.dead ?? 0, danger: true },
                { label: "Provider issues", value: degradedProviders.length, warn: true },
                { label: "Expiring connections", value: expiringProviders, warn: true },
              ].map(r => <div key={r.label} className="flex items-center justify-between px-2 py-1.5"><span className="text-sm text-ink-2">{r.label}</span><span className={cn("text-sm font-semibold tabular-nums", r.danger && (r.value as number) > 0 ? "text-red-400" : r.warn && (r.value as number) > 0 ? "text-amber-400" : "text-ink-1")}>{r.value}</span></div>)}
            </div>
          </Section>
        )}

        {/* SECTION 5 — PUBLISHING */}
        {(jobs.data || seo.data) && (
          <Section title="Publishing" icon={<Send className="h-4 w-4 text-green-400" />} source="Content" onOpen={() => go("/content/")}>
            <div className="space-y-1.5">
              {[
                { label: "Publish failures", value: jobSummary.failed ?? 0, warn: true },
                { label: "Published", value: jobSummary.published ?? 0 },
                { label: "Missing images (SEO)", value: so.missing_images ?? 0, warn: true },
                { label: "Suspect links", value: so.suspect_links ?? 0, warn: true },
              ].map(r => <div key={r.label} className="flex items-center justify-between px-2 py-1.5"><span className="text-sm text-ink-2">{r.label}</span><span className={cn("text-sm font-semibold tabular-nums", r.warn && (r.value as number) > 0 ? "text-amber-400" : "text-ink-1")}>{r.value}</span></div>)}
            </div>
          </Section>
        )}
      </div>

      {/* SECTION 7 — APPROVALS (operational, not content) */}
      {(openRefunds.length > 0 || degradedProviders.length > 0 || retryableJobs > 0) && (
        <div className="mt-4">
          <Section title="Pending Operational Actions" icon={<ClipboardCheck className="h-4 w-4 text-amber-400" />} source="" onOpen={() => {}}>
            <div className="grid md:grid-cols-3 gap-2">
              {openRefunds.length > 0 && <Attn icon={<CreditCard className="h-4 w-4 text-amber-400" />} label="Refund requests" count={openRefunds.length} severity="warning" owner="Billing → Refunds" onClick={() => go("/billing/")} />}
              {degradedProviders.length > 0 && <Attn icon={<Globe className="h-4 w-4 text-amber-400" />} label="Providers need reconnect" count={degradedProviders.length} severity="warning" owner="Platform Ops" onClick={() => go("/operations/")} />}
              {retryableJobs > 0 && <Attn icon={<RefreshCw className="h-4 w-4 text-amber-400" />} label="Manual retries available" count={retryableJobs} severity="info" owner="Platform Ops → Jobs" onClick={() => go("/operations/")} />}
            </div>
          </Section>
        </div>
      )}

      {/* SECTION 6 — ALERTS */}
      {evRows.filter(e => !dismissed.has(e.id)).length > 0 && (
        <div className="mt-4">
          <Section title="Alerts" icon={<Bell className="h-4 w-4 text-amber-400" />} source="Events" onOpen={() => go("/operations/")}>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {evRows.filter(e => !dismissed.has(e.id)).slice(0, 15).map(e => (
                <div key={e.id} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-os-raised/40 group">
                  {e.severity === "critical" || e.severity === "error" ? <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" /> : <Radio className="h-3.5 w-3.5 text-ink-3 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0"><p className="text-sm text-ink-1 truncate">{e.message}</p><p className="text-2xs text-ink-3">{e.source ? `${e.source} · ` : ""}{fmtRel(e.created_at)}</p></div>
                  <button onClick={() => dismiss(e.id)} className="opacity-0 group-hover:opacity-100 text-ink-4 hover:text-ink-2"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            {critical.length > 0 && <p className="text-2xs text-red-400 mt-2">{critical.length} critical/error · dismiss is local only (no writes)</p>}
          </Section>
        </div>
      )}

      {/* SECTION 8 — SYSTEM */}
      {sys.data && (
        <div className="mt-4">
          <Section title="System" icon={<Server className="h-4 w-4 text-ink-3" />} source="Config" onOpen={() => go("/config/")}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Workers", value: (sys.data.workers ?? []).length },
                { label: "Domains", value: (sys.data.domains ?? []).length },
                { label: "Webhooks", value: Object.keys(sys.data.webhooks ?? {}).length },
                { label: "Providers", value: providers.length },
              ].map(s => <div key={s.label} className="os-card-raised p-3 text-center"><p className="text-xl font-bold text-ink-1">{s.value}</p><p className="text-2xs text-ink-3">{s.label}</p></div>)}
            </div>
          </Section>
        </div>
      )}

      {!loading && attention.length === 0 && (bo.revenue_net_cents == null) && (health.data?.total ?? 0) === 0 && !jobs.data && !sys.data && (
        <Card><p className="text-sm text-ink-2 py-8 text-center">No operational data yet. Cards appear here as activity occurs across the platform.</p></Card>
      )}
    </WorkspaceLayout>
  );
}
