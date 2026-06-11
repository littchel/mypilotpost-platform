"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListSupportRequests, apiUpdateSupportRequest, apiSendSupportMessage,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import {
  Headphones, Send, CheckCircle, AlertCircle,
  ArrowUpRight, MessageSquare, User, Clock, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportRequest } from "@/types";

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RequestRow({ req, active, onClick }: { req: SupportRequest; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-os-border/50 transition-colors",
        active ? "bg-brand-500/10 border-l-2 border-l-brand-500" : "hover:bg-os-raised/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-1 truncate">{req.subject ?? req.category}</p>
        <Badge variant={req.priority === "urgent" ? "danger" : req.priority === "high" ? "warning" : "neutral"}>
          {req.priority ?? "normal"}
        </Badge>
      </div>
      <p className="text-xs text-ink-3 mt-1 truncate">{req.user_email ?? req.user_id}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <Badge variant={statusBadge(req.status)}>{req.status}</Badge>
        <span className="text-2xs text-ink-4">{timeAgo(req.created_at)}</span>
      </div>
    </button>
  );
}

function ThreadView({ req, onUpdate }: { req: SupportRequest; onUpdate: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [resolution, setResolution] = useState(req.resolution ?? "");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [req.id]);

  const sendMut = useMutation({
    mutationFn: () => apiSendSupportMessage(req.user_id, message),
    onSuccess: () => {
      toast.success("Message sent");
      setMessage("");
      onUpdate();
    },
    onError: () => toast.error("Failed to send message"),
  });

  const updateMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiUpdateSupportRequest(req.id, body),
    onSuccess: () => {
      toast.success("Request updated");
      onUpdate();
    },
    onError: () => toast.error("Failed to update request"),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-os-border shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink-1 truncate">{req.subject ?? req.category}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={statusBadge(req.status)}>{req.status}</Badge>
              {req.priority && <Badge variant={req.priority === "urgent" ? "danger" : req.priority === "high" ? "warning" : "neutral"}>{req.priority}</Badge>}
              <span className="text-xs text-ink-3">{req.user_email ?? req.user_id}</span>
              <span className="text-xs text-ink-3">{timeAgo(req.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => updateMut.mutate({ status: "in_progress" })} disabled={req.status === "in_progress" || req.status === "resolved"}>
              In progress
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle className="h-3.5 w-3.5" />}
              onClick={() => updateMut.mutate({ status: "resolved" })}
              disabled={req.status === "resolved"}
              loading={updateMut.isPending}
            >
              Resolve
            </Button>
          </div>
        </div>
      </div>

      {/* Original message */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full bg-os-raised border border-os-border flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-ink-3" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-ink-1">{req.user_email ?? req.user_id}</span>
              <span className="text-2xs text-ink-4">{timeAgo(req.created_at)}</span>
            </div>
            <div className="bg-os-raised border border-os-border rounded-lg px-4 py-3">
              <p className="text-sm text-ink-1 whitespace-pre-wrap">{req.message}</p>
            </div>
          </div>
        </div>

        {/* Resolution (if resolved) */}
        {req.resolution && (
          <div className="flex items-start gap-3 justify-end">
            <div className="flex-1 max-w-[80%]">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <span className="text-2xs text-ink-4">{req.updated_at ? timeAgo(req.updated_at) : ""}</span>
                <span className="text-xs font-medium text-brand-300">Admin</span>
              </div>
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg px-4 py-3">
                <p className="text-sm text-ink-1 whitespace-pre-wrap">{req.resolution}</p>
              </div>
            </div>
            <div className="h-7 w-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-300">A</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Status + category update */}
      <div className="px-5 py-3 border-t border-os-border bg-os-raised/30 shrink-0">
        <div className="flex gap-2 mb-3">
          <Select
            options={[
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ]}
            value={req.status}
            onChange={v => updateMut.mutate({ status: v })}
            className="h-8 text-xs flex-1"
          />
          <Select
            options={[
              { value: "low", label: "Low" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ]}
            value={req.priority ?? "normal"}
            onChange={v => updateMut.mutate({ priority: v })}
            className="h-8 text-xs flex-1"
          />
        </div>

        {/* Reply */}
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && message.trim()) {
                e.preventDefault();
                sendMut.mutate();
              }
            }}
            placeholder="Reply to customer... (⌘+Enter to send)"
            rows={2}
            className="os-input flex-1 resize-none"
          />
          <Button
            variant="primary"
            icon={<Send className="h-4 w-4" />}
            onClick={() => sendMut.mutate()}
            disabled={!message.trim()}
            loading={sendMut.isPending}
            className="self-end"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["support-requests", tab],
    queryFn: () => apiListSupportRequests({ status: tab }),
    staleTime: 30_000,
  });

  const requests = data?.data ?? [];
  const selected = requests.find(r => r.id === selectedId) ?? null;

  const counts = {
    open: requests.filter(r => r.status === "open").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    resolved: 0,
    closed: 0,
  };

  return (
    <WorkspaceLayout
      workspace="support"
      title="Support Center"
      subtitle="Customer tickets and requests"
      onRefresh={() => qc.invalidateQueries({ queryKey: ["support-requests"] })}
      noPadding
    >
      <div className="flex h-full overflow-hidden">
        {/* Left panel — thread list */}
        <div className="w-[320px] shrink-0 border-r border-os-border flex flex-col h-full">
          <div className="px-4 py-3 border-b border-os-border shrink-0">
            <Tabs
              tabs={[
                { id: "open", label: "Open", count: counts.open },
                { id: "in_progress", label: "Active", count: counts.in_progress },
                { id: "resolved", label: "Resolved" },
                { id: "closed", label: "Closed" },
              ]}
              active={tab}
              onChange={id => { setTab(id); setSelectedId(null); }}
              size="sm"
              variant="pills"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-1 p-2 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-20 bg-os-raised rounded" />
                ))}
              </div>
            ) : error ? (
              <EmptyState icon={<AlertCircle className="h-8 w-8" />} title="Failed to load" description="Check API connectivity." />
            ) : requests.length === 0 ? (
              <EmptyState icon={<Headphones className="h-8 w-8" />} title={`No ${tab} tickets`} />
            ) : (
              requests.map(r => (
                <RequestRow
                  key={r.id}
                  req={r}
                  active={r.id === selectedId}
                  onClick={() => setSelectedId(r.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — thread view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <ThreadView
              req={selected}
              onUpdate={() => qc.invalidateQueries({ queryKey: ["support-requests", tab] })}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <EmptyState
                icon={<MessageSquare className="h-10 w-10" />}
                title="Select a ticket"
                description="Click a request on the left to view the conversation."
              />
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
