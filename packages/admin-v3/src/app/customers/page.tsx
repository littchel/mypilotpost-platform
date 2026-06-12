"use client";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListCustomers, apiGetCustomerProfile, apiToggleUser, apiVerifyUser, apiExtendTrial,
  apiSendSupportMessage, apiGetCustomerSubscriptions, apiGetCustomerActivity,
  apiGetCustomerAccess, apiGetCustomerLifecycle, apiGetCustomerAudit,
  apiGetCustomerSupportThread, apiUpdateSupportThread, apiSupportAuthorize,
  apiSupportHistory, supportStreamUrl,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/context/ToastContext";
import {
  UserCheck, UserX, CheckCircle, Building2, Clock, Mail, Send,
  User, Headphones, Activity, Shield, TrendingUp, ClipboardList,
  CreditCard, Globe, Zap, ChevronDown, ChevronRight, Search, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(cents: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
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
function pct(n: number) { return `${n}%`; }

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  LOGIN: <User className="h-3 w-3" />,
  PAYMENT: <CreditCard className="h-3 w-3" />,
  REFUND: <CreditCard className="h-3 w-3 text-amber-400" />,
  GENERATION: <Zap className="h-3 w-3 text-purple-400" />,
  PUBLISH: <Globe className="h-3 w-3 text-green-400" />,
  SUPPORT: <Headphones className="h-3 w-3 text-blue-400" />,
  BRAND: <Building2 className="h-3 w-3 text-brand-400" />,
  LIFECYCLE: <TrendingUp className="h-3 w-3 text-ink-3" />,
};

const SECTIONS = [
  { id: "profile",       label: "Profile",       icon: <User className="h-3.5 w-3.5" /> },
  { id: "subscriptions", label: "Subscriptions", icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: "support",       label: "Support",       icon: <Headphones className="h-3.5 w-3.5" /> },
  { id: "activity",      label: "Activity",      icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "access",        label: "Access",        icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "lifecycle",     label: "Lifecycle",     icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "audit",         label: "Audit",         icon: <ClipboardList className="h-3.5 w-3.5" /> },
];

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection({ userId }: { userId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [trialDays, setTrialDays] = useState("7");
  const [confirmAction, setConfirmAction] = useState<"toggle" | "verify" | "extend" | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");

  const { data: c, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-profile", userId],
    queryFn: () => apiGetCustomerProfile(userId),
  });

  const toggleMut = useMutation({
    mutationFn: () => apiToggleUser(userId),
    onSuccess: (res) => { toast.success("Status updated", res.data?.is_active ? "Enabled" : "Disabled"); refetch(); qc.invalidateQueries({ queryKey: ["customers"] }); setConfirmAction(null); },
    onError: () => toast.error("Failed to update status"),
  });
  const verifyMut = useMutation({
    mutationFn: () => apiVerifyUser(userId),
    onSuccess: () => { toast.success("User verified"); refetch(); setConfirmAction(null); },
    onError: () => toast.error("Failed to verify"),
  });
  const trialMut = useMutation({
    mutationFn: () => apiExtendTrial(userId, parseInt(trialDays, 10)),
    onSuccess: () => { toast.success("Trial extended", `+${trialDays} days`); refetch(); qc.invalidateQueries({ queryKey: ["customers"] }); setConfirmAction(null); },
    onError: () => toast.error("Failed to extend trial"),
  });
  const messageMut = useMutation({
    mutationFn: () => apiSendSupportMessage(userId, composeMsg),
    onSuccess: () => { toast.success("Message sent"); setComposeMsg(""); setShowCompose(false); },
    onError: () => toast.error("Failed to send"),
  });

  if (isLoading) return <div className="space-y-3 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-os-raised rounded" />)}</div>;
  if (error || !c) return <div className="py-8 text-center text-sm text-red-400">Failed to load profile</div>;

  const isActive = c.is_active === 1;
  const isVerified = !!c.verified_at;
  const ob = (c as any).onboarding;
  const fullName = ((c as any).first_name || (c as any).last_name) ? `${(c as any).first_name ?? ""} ${(c as any).last_name ?? ""}`.trim() : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: identity + account */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-brand-300">{c.email[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-1 truncate">{fullName ?? c.email}</p>
            {fullName && <p className="text-xs text-ink-3 truncate">{c.email}</p>}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={isActive ? "success" : "danger"} dot>{isActive ? "Active" : "Disabled"}</Badge>
              {isVerified && <Badge variant="success" dot>Verified</Badge>}
              {(c as any).plan_name && <Badge variant="brand">{(c as any).plan_name}</Badge>}
              {c.subscription_status && <Badge variant={statusBadge(c.subscription_status)}>{c.subscription_status}</Badge>}
            </div>
          </div>
        </div>

        {ob && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-ink-3">Onboarding</p>
              <p className="text-xs text-ink-2">{ob.completed_at ? `Completed ${fmt(ob.completed_at)}` : `Step ${ob.current_step} of ${ob.total_steps ?? 9}`}</p>
            </div>
            <div className="h-1.5 bg-os-raised rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: pct(ob.completion_percent) }} />
            </div>
          </div>
        )}

        <Card padding="none">
          <div className="divide-y divide-os-border">
            {[
              { label: "User ID", value: c.id, mono: true },
              { label: "Role", value: (c as any).role ?? "user" },
              { label: "Plan", value: (c as any).plan_name ?? "—" },
              { label: "Subscription", value: c.subscription_status ?? "—" },
              { label: "Trial until", value: fmt((c as any).trial_ends_at) },
              { label: "Joined", value: fmt(c.created_at) },
              { label: "Verified", value: fmt(c.verified_at) },
              { label: "AI generations", value: String((c as any).ai_generations ?? 0) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-ink-3">{row.label}</span>
                <span className={`text-xs text-ink-1 max-w-[240px] truncate ${row.mono ? "font-mono text-2xs" : ""}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right: brands + actions */}
      <div className="space-y-4">
        {(c as any).brands?.length > 0 && (
          <Card padding="none">
            <div className="px-4 py-2.5 border-b border-os-border"><p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Brands ({(c as any).brands.length})</p></div>
            {(c as any).brands.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-os-border/50 last:border-0">
                <Building2 className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                <div className="min-w-0"><p className="text-sm text-ink-1 truncate">{b.name}</p>{b.industry && <p className="text-xs text-ink-3">{b.industry}</p>}</div>
                <Badge variant="neutral" className="ml-auto shrink-0">{b.user_role}</Badge>
              </div>
            ))}
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-2 mb-3"><Clock className="h-3.5 w-3.5 text-ink-3" /><p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Extend Trial</p></div>
          <div className="flex gap-2 items-end">
            <Input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} min="1" max="90" hint="Days to add" className="w-24" />
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction("extend")} loading={trialMut.isPending}>Extend</Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={isActive ? "danger" : "secondary"} icon={isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />} onClick={() => setConfirmAction("toggle")} loading={toggleMut.isPending}>{isActive ? "Disable" : "Enable"}</Button>
          {!isVerified ? <Button variant="secondary" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setConfirmAction("verify")} loading={verifyMut.isPending}>Force verify</Button> : <div />}
          <Button variant="ghost" icon={<Mail className="h-4 w-4" />} onClick={() => setShowCompose(v => !v)} className="col-span-2">Message customer</Button>
        </div>

        {showCompose && (
          <Card>
            <textarea value={composeMsg} onChange={e => setComposeMsg(e.target.value)} placeholder="Message to customer..." rows={3} className="os-input w-full resize-none mb-2" />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => messageMut.mutate()} loading={messageMut.isPending} disabled={!composeMsg.trim()}>Send</Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowCompose(false); setComposeMsg(""); }}>Cancel</Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog open={confirmAction === "toggle"} onClose={() => setConfirmAction(null)} onConfirm={() => toggleMut.mutate()} title={isActive ? "Disable account" : "Enable account"} description={`${isActive ? "Disable" : "Enable"} access for ${c.email}?`} confirmLabel={isActive ? "Disable" : "Enable"} confirmVariant={isActive ? "danger" : "primary"} loading={toggleMut.isPending} type={isActive ? "danger" : "info"} />
      <ConfirmDialog open={confirmAction === "verify"} onClose={() => setConfirmAction(null)} onConfirm={() => verifyMut.mutate()} title="Force verify email" description={`Mark ${c.email} as verified.`} loading={verifyMut.isPending} />
      <ConfirmDialog open={confirmAction === "extend"} onClose={() => setConfirmAction(null)} onConfirm={() => trialMut.mutate()} title="Extend trial" description={`Add ${trialDays} days for ${c.email}.`} loading={trialMut.isPending} />
    </div>
  );
}

// ─── Subscriptions ──────────────────────────────────────────────────────────────

function SubscriptionsSection({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["customer-subscriptions", userId], queryFn: () => apiGetCustomerSubscriptions(userId) });
  const subs = (data?.subscriptions ?? []) as any[];
  if (isLoading) return <div className="space-y-3 animate-pulse">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 bg-os-raised rounded-lg" />)}</div>;
  if (error) return <div className="py-8 text-center text-sm text-red-400">Failed to load subscriptions</div>;
  if (!subs.length) return <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No subscriptions" description="No brands on paid plans." />;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {subs.map((s: any, i: number) => (
        <Card key={i} padding="none">
          <div className="px-4 py-3 border-b border-os-border flex items-center gap-2">
            <Building2 className="h-4 w-4 text-ink-3" /><p className="text-sm font-semibold text-ink-1">{s.brand?.name ?? "—"}</p>
            {s.subscription?.status && <Badge variant={statusBadge(s.subscription.status)} className="ml-auto">{s.subscription.status}</Badge>}
          </div>
          <div className="divide-y divide-os-border">
            {[
              { label: "Plan", value: s.plan?.name ?? "—" },
              { label: "Price", value: s.plan?.price_cents ? fmtMoney(s.plan.price_cents, s.currency ?? "ZAR") : "—" },
              { label: "Interval", value: s.subscription?.billing_interval ?? "—" },
              { label: "Renewal", value: fmt(s.renewal) },
              { label: "Last payment", value: s.last_payment ? `${fmtMoney(s.last_payment.amount, s.last_payment.currency)} — ${s.last_payment.status}` : "—" },
              { label: "Refund status", value: s.refund_status ?? "none" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2"><span className="text-xs text-ink-3">{row.label}</span><span className="text-xs text-ink-1">{row.value}</span></div>
            ))}
          </div>
          {s.payments?.length > 0 && (
            <div className="px-4 py-2 border-t border-os-border">
              <p className="text-2xs text-ink-3 uppercase tracking-wider mb-2">Recent payments</p>
              <div className="space-y-1">
                {s.payments.slice(0, 5).map((p: any, j: number) => (
                  <div key={j} className="flex items-center justify-between">
                    <span className="text-xs text-ink-2">{fmt(p.occurred_at)}</span>
                    <span className="text-xs text-ink-1">{fmtMoney(p.amount, p.currency)}</span>
                    <Badge variant={statusBadge(p.status)} className="text-2xs">{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Support (live, ChatRoom DO) ────────────────────────────────────────────────

interface ChatMsg { id: string; sender_type?: string; is_admin_msg?: number; message: string; created_at?: string; timestamp?: string; direction?: string; }

function SupportSection({ userId }: { userId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const append = useCallback((m: ChatMsg) => {
    if (!m.id || seenIds.current.has(m.id)) return;
    seenIds.current.add(m.id);
    setMessages(prev => [...prev, m]);
  }, []);

  // Load thread + history, then open live stream
  useEffect(() => {
    let cancelled = false;
    seenIds.current = new Set();
    setMessages([]);
    setLive(false);

    (async () => {
      const t = await apiGetCustomerSupportThread(userId);
      if (cancelled) return;
      setThreadId((t.thread as any)?.id ?? null);
      for (const m of (t.messages as ChatMsg[])) append(m);

      // Open live stream via ChatRoom DO
      try {
        const { ticket } = await apiSupportAuthorize(userId);
        if (cancelled || !ticket) return;
        const es = new EventSource(supportStreamUrl(ticket));
        esRef.current = es;
        es.onopen = () => !cancelled && setLive(true);
        es.onerror = () => setLive(false);
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === "message") append({ id: data.id, message: data.message, sender_type: data.sender_type, created_at: data.timestamp, is_admin_msg: data.sender_type === "admin" ? 1 : 0 });
          } catch { /* ignore */ }
        };
      } catch { setLive(false); }
    })();

    return () => { cancelled = true; esRef.current?.close(); esRef.current = null; };
  }, [userId, append]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: () => apiSendSupportMessage(userId, draft.trim()),
    onSuccess: (res) => { if (res?.thread_id) setThreadId(res.thread_id); setDraft(""); },
    onError: () => toast.error("Failed to send message"),
  });
  const resolveMut = useMutation({
    mutationFn: () => apiUpdateSupportThread(threadId as string, { status: "resolved" }),
    onSuccess: () => { toast.success("Thread resolved", "Customer notified by email"); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: () => toast.error("Failed to resolve"),
  });

  function isAdmin(m: ChatMsg) { return m.is_admin_msg === 1 || m.sender_type === "admin" || m.direction === "outbound"; }

  return (
    <div className="flex flex-col h-[460px] border border-os-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-os-border flex items-center gap-2 shrink-0">
        <Headphones className="h-4 w-4 text-ink-3" />
        <p className="text-sm font-semibold text-ink-1">Support conversation</p>
        <span className={cn("flex items-center gap-1 text-2xs ml-2", live ? "text-green-400" : "text-ink-4")}>
          <Circle className={cn("h-2 w-2", live && "fill-green-400")} />{live ? "Live" : "Offline"}
        </span>
        {threadId && (
          <Button variant="secondary" size="sm" icon={<CheckCircle className="h-3 w-3" />} className="ml-auto" onClick={() => resolveMut.mutate()} loading={resolveMut.isPending}>Resolve</Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center"><EmptyState icon={<Headphones className="h-8 w-8" />} title="No messages yet" description="Start the conversation below." /></div>
        ) : messages.map((m, i) => (
          <div key={m.id || i} className={cn("flex items-start gap-2", isAdmin(m) ? "flex-row-reverse" : "")}>
            <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold", isAdmin(m) ? "bg-brand-500/20 text-brand-300" : "bg-os-raised text-ink-3")}>{isAdmin(m) ? "A" : "U"}</div>
            <div className={cn("max-w-[70%] rounded-lg px-3 py-2", isAdmin(m) ? "bg-brand-500/10 border border-brand-500/20" : "bg-os-raised border border-os-border")}>
              <p className="text-xs text-ink-1 whitespace-pre-wrap">{m.message}</p>
              <span className="text-2xs text-ink-4">{(m.created_at || m.timestamp) ? timeAgo(m.created_at || m.timestamp!) : ""}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-4 py-3 border-t border-os-border bg-os-raised/30 shrink-0 flex gap-2">
        <textarea value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) { e.preventDefault(); sendMut.mutate(); } }}
          placeholder="Reply to customer... (⌘+Enter)" rows={2} className="os-input flex-1 resize-none" />
        <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={() => sendMut.mutate()} disabled={!draft.trim()} loading={sendMut.isPending} className="self-end">Send</Button>
      </div>
    </div>
  );
}

// ─── Activity (polling) ─────────────────────────────────────────────────────────

function ActivitySection({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-activity", userId],
    queryFn: () => apiGetCustomerActivity(userId, 100),
    refetchInterval: 15000,
  });
  const events = (data?.events ?? []) as any[];
  if (isLoading) return <div className="space-y-2 animate-pulse">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 bg-os-raised rounded" />)}</div>;
  if (error) return <div className="py-8 text-center text-sm text-red-400">Failed to load activity</div>;
  if (!events.length) return <EmptyState icon={<Activity className="h-8 w-8" />} title="No activity" description="No recorded events." />;

  const byType: Record<string, number> = {};
  for (const e of events) byType[e.type] = (byType[e.type] ?? 0) + 1;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(byType).map(([type, count]) => (
          <span key={type} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-os-raised border border-os-border text-2xs text-ink-2">{ACTIVITY_ICON[type] ?? <Activity className="h-3 w-3" />}{type} ({count})</span>
        ))}
        <span className="inline-flex items-center gap-1 px-2 py-1 text-2xs text-ink-4 ml-auto"><Circle className="h-2 w-2 fill-green-400 text-green-400" />auto-refresh 15s</span>
      </div>
      <div className="grid lg:grid-cols-2 gap-x-6">
        {events.map((e: any, i: number) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-os-border/30">
            <div className="h-6 w-6 rounded-full bg-os-raised border border-os-border flex items-center justify-center shrink-0 mt-0.5">{ACTIVITY_ICON[e.type] ?? <Activity className="h-3 w-3 text-ink-3" />}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-1">{e.label}</p>
              {e.meta?.brand && <p className="text-2xs text-ink-3">{e.meta.brand}</p>}
              {e.meta?.amount && <p className="text-2xs text-ink-3">{fmtMoney(e.meta.amount, e.meta.currency)}</p>}
            </div>
            <span className="text-2xs text-ink-4 shrink-0">{e.occurred_at ? timeAgo(e.occurred_at) : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Access (roles + platforms only) ────────────────────────────────────────────

function AccessSection({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["customer-access", userId], queryFn: () => apiGetCustomerAccess(userId) });
  const roles = (data?.roles ?? []) as any[];
  const platforms = (data?.platforms ?? []) as any[];
  if (isLoading) return <div className="space-y-2 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-os-raised rounded" />)}</div>;
  if (error) return <div className="py-8 text-center text-sm text-red-400">Failed to load access</div>;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <p className="text-2xs text-ink-3 uppercase tracking-wider mb-2">Roles ({roles.length})</p>
        {roles.length === 0 ? <p className="text-xs text-ink-3">No brand roles.</p> : (
          <Card padding="none">
            {roles.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-os-border/50 last:border-0">
                <Building2 className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-xs text-ink-1 truncate">{r.brand_name}</p><p className="text-2xs text-ink-3">Since {fmt(r.created_at)}</p></div>
                <Badge variant="neutral">{r.role}</Badge>
              </div>
            ))}
          </Card>
        )}
      </div>
      <div>
        <p className="text-2xs text-ink-3 uppercase tracking-wider mb-2">Connected platforms ({platforms.length})</p>
        {platforms.length === 0 ? <p className="text-xs text-ink-3">No connected platforms.</p> : (
          <Card padding="none">
            {platforms.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-os-border/50 last:border-0">
                <Globe className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-xs text-ink-1 capitalize">{p.platform}</p><p className="text-2xs text-ink-3">{p.platform_username ?? p.brand_name}</p></div>
                <Badge variant={p.status === "active" ? "success" : "warning"}>{p.status}</Badge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────────

function LifecycleSection({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["customer-lifecycle", userId], queryFn: () => apiGetCustomerLifecycle(userId) });
  if (isLoading) return <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-os-raised rounded" />)}</div>;
  if (error) return <div className="py-8 text-center text-sm text-red-400">Failed to load lifecycle</div>;
  const account: any = data?.account ?? {};
  const ob: any = data?.onboarding ?? {};
  const sub: any = data?.subscription ?? {};
  const events: any[] = (data?.events ?? []) as any[];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card padding="none">
        <div className="px-4 py-2.5 border-b border-os-border"><p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Account state</p></div>
        <div className="divide-y divide-os-border">
          {[
            { label: "Joined", value: fmt(account.joined_at) },
            { label: "Subscription", value: account.subscription_status ?? "—" },
            { label: "Trial until", value: fmt(account.trial_ends_at) },
          ].map(row => (<div key={row.label} className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-3">{row.label}</span><span className="text-xs text-ink-1">{row.value}</span></div>))}
        </div>
        <div className="px-4 py-3 border-t border-os-border">
          <div className="flex items-center justify-between mb-2"><p className="text-xs text-ink-3">Onboarding</p><p className="text-sm font-bold text-ink-1">{pct(ob.completion_percent ?? 0)}</p></div>
          <div className="h-2 bg-os-raised rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: pct(ob.completion_percent ?? 0) }} /></div>
        </div>
      </Card>

      <div>
        {sub && (sub.plan_name || sub.plan_id || sub.status) && (
          <Card padding="none" className="mb-4">
            <div className="px-4 py-2.5 border-b border-os-border"><p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Subscription</p></div>
            <div className="divide-y divide-os-border">
              {[
                { label: "Plan", value: sub.plan_name ?? sub.plan_id ?? "—" },
                { label: "Status", value: sub.status ?? "—" },
                { label: "Period end", value: fmt(sub.current_period_end) },
              ].map(row => (<div key={row.label} className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-3">{row.label}</span><span className="text-xs text-ink-1">{row.value}</span></div>))}
            </div>
          </Card>
        )}
        {events.length > 0 && (
          <div>
            <p className="text-2xs text-ink-3 uppercase tracking-wider mb-2">Lifecycle events ({events.length})</p>
            <div className="space-y-1">
              {events.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-os-border/30 last:border-0">
                  <TrendingUp className="h-3 w-3 text-ink-3 shrink-0" /><p className="text-xs text-ink-2 flex-1">{e.type?.replace(/_/g, " ")}</p><span className="text-2xs text-ink-4">{fmt(e.occurred_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Audit ──────────────────────────────────────────────────────────────────────

function AuditSection({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["customer-audit", userId], queryFn: () => apiGetCustomerAudit(userId) });
  const entries = (data?.audit ?? []) as any[];
  if (isLoading) return <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-os-raised rounded" />)}</div>;
  if (error) return <div className="py-8 text-center text-sm text-red-400">Failed to load audit log</div>;
  if (!entries.length) return <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No audit entries" description="No admin actions recorded." />;

  return (
    <Card padding="none">
      {entries.map((e: any, i: number) => (
        <div key={i} className="px-4 py-3 border-b border-os-border/50 last:border-0 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink-1 capitalize">{e.what}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-2xs text-ink-3">by {e.who}</span>
              {e.before !== null && e.before !== undefined && <span className="text-2xs text-ink-4">before: {String(e.before)}</span>}
              {e.after !== null && e.after !== undefined && <span className="text-2xs text-green-400">after: {String(e.after)}</span>}
              {e.ip && <span className="text-2xs text-ink-4">{e.ip}</span>}
            </div>
          </div>
          <span className="text-2xs text-ink-4 shrink-0">{fmt(e.time)}</span>
        </div>
      ))}
    </Card>
  );
}

// ─── Expanded accordion panel ─────────────────────────────────────────────────

function ExpandedPanel({ userId, section, onSection }: { userId: string; section: string; onSection: (s: string) => void }) {
  return (
    <div className="border-t border-os-border bg-os-base/40 px-5 py-5">
      <div className="mb-5"><Tabs tabs={SECTIONS} active={section} onChange={onSection} size="sm" variant="pills" /></div>
      {section === "profile"       && <ProfileSection       userId={userId} />}
      {section === "subscriptions" && <SubscriptionsSection  userId={userId} />}
      {section === "support"       && <SupportSection        userId={userId} />}
      {section === "activity"      && <ActivitySection       userId={userId} />}
      {section === "access"        && <AccessSection         userId={userId} />}
      {section === "lifecycle"     && <LifecycleSection      userId={userId} />}
      {section === "audit"         && <AuditSection          userId={userId} />}
    </div>
  );
}

// ─── Accordion list ─────────────────────────────────────────────────────────────

function AccountRow({ c, open, section, onToggle, onSection }: { c: Customer; open: boolean; section: string; onToggle: () => void; onSection: (s: string) => void }) {
  return (
    <div className={cn("border border-os-border rounded-lg overflow-hidden transition-colors", open ? "bg-os-raised/30" : "bg-os-surface hover:bg-os-raised/20")}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {open ? <ChevronDown className="h-4 w-4 text-ink-3 shrink-0" /> : <ChevronRight className="h-4 w-4 text-ink-3 shrink-0" />}
        <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0"><span className="text-xs font-bold text-brand-300">{c.email[0].toUpperCase()}</span></div>
        <div className="min-w-0 flex-1"><p className="text-sm text-ink-1 truncate">{c.email}</p></div>
        <Badge variant={c.is_active ? statusBadge(c.subscription_status ?? "inactive") : "danger"} dot>{c.is_active ? (c.subscription_status ?? "inactive") : "disabled"}</Badge>
        {c.plan_name && <Badge variant="brand" className="hidden sm:inline-flex">{c.plan_name}</Badge>}
        <span className="hidden md:flex items-center gap-1 text-xs text-ink-3 w-16"><Building2 className="h-3.5 w-3.5" />{c.brand_count ?? 0}</span>
        <span className="hidden lg:block text-xs text-ink-3 w-24 text-right">{fmt(c.created_at)}</span>
      </button>
      {open && <ExpandedPanel userId={c.id} section={section} onSection={onSection} />}
    </div>
  );
}

function CustomersInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openCustomer = searchParams.get("customer");
  const section = searchParams.get("section") ?? "profile";
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiListCustomers({ limit: 500 }),
    staleTime: 30_000,
  });
  const customers = data?.data ?? [];
  const total = data?.total ?? 0;

  const setUrl = useCallback((customerId: string | null, sec: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (customerId) { params.set("customer", customerId); params.set("section", sec); }
    else { params.delete("customer"); params.delete("section"); }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const filtered = search.trim()
    ? customers.filter(c => [c.email, c.plan_name, c.subscription_status].some(f => (f ?? "").toLowerCase().includes(search.toLowerCase())))
    : customers;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, plan, status..." className="os-input w-full pl-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-ink-3">{total.toLocaleString()} accounts</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-os-raised rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<UserX className="h-8 w-8" />} title="Failed to load" description="Could not fetch customers." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<User className="h-8 w-8" />} title="No customers" description="No accounts match your search." />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <AccountRow
              key={c.id}
              c={c}
              open={openCustomer === c.id}
              section={section}
              onToggle={() => setUrl(openCustomer === c.id ? null : c.id, section)}
              onSection={(s) => setUrl(c.id, s)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  return (
    <WorkspaceLayout
      workspace="customers"
      title="Customers"
      subtitle="Accounts, support, lifecycle management"
      onRefresh={() => qc.invalidateQueries({ queryKey: ["customers"] })}
    >
      <Suspense fallback={<div className="text-sm text-ink-3">Loading…</div>}>
        <CustomersInner />
      </Suspense>
    </WorkspaceLayout>
  );
}
