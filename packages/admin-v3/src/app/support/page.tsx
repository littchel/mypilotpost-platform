"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card } from "@/components/ui/Card";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  apiListSupportThreads, apiGetSupportThread, apiReplySupportThread, apiUpdateSupportThread,
} from "@/lib/api";
import { fmtRelative, fmtDate } from "@/lib/utils";
import type { SupportThread, SupportMessage } from "@/types";
import { MessageSquare, Search, Send } from "lucide-react";

const STATUS_FILTERS = ["all", "open", "in_progress", "resolved", "closed"];

function ThreadRow({ t, selected, onClick }: { t: SupportThread; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg px-4 py-3 transition-colors hover:bg-slate-50 ${selected ? "bg-blue-50 border border-blue-200" : "border border-transparent"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{t.subject ?? "(No subject)"}</p>
          <p className="text-xs text-slate-500 truncate">{t.email ?? t.user_id}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <Badge variant={statusVariant(t.status)} className="capitalize">{t.status.replace("_", " ")}</Badge>
          <span className="text-[10px] text-slate-400">{t.last_message_at ? fmtRelative(t.last_message_at) : fmtDate(t.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: SupportMessage }) {
  const isAdmin = msg.is_admin;
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
        isAdmin
          ? "bg-brand-600 text-white rounded-br-sm"
          : "bg-slate-100 text-slate-800 rounded-bl-sm"
      }`}>
        <p className="whitespace-pre-wrap">{msg.message}</p>
        <p className={`mt-1 text-[10px] ${isAdmin ? "text-brand-200" : "text-slate-400"}`}>
          {fmtRelative(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

function ThreadDetail({ thread }: { thread: SupportThread }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState(thread.status);

  const { data, isLoading } = useQuery({
    queryKey: ["support-thread", thread.id],
    queryFn: () => apiGetSupportThread(thread.id),
  });

  const sendReply = useMutation({
    mutationFn: () => apiReplySupportThread(thread.id, reply),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["support-thread", thread.id] });
      qc.invalidateQueries({ queryKey: ["support-threads"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => apiUpdateSupportThread(thread.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-threads"] });
      qc.invalidateQueries({ queryKey: ["support-thread", thread.id] });
    },
  });

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{data?.subject ?? thread.subject ?? "(No subject)"}</p>
            <p className="text-xs text-slate-500">{data?.email ?? thread.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value as SupportThread["status"]);
                updateStatus.mutate(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
            >
              {STATUS_FILTERS.filter((s) => s !== "all").map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">No messages yet.</p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
      </div>

      {/* Reply box */}
      <div className="border-t border-slate-200 px-6 py-4">
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button
            size="sm"
            icon={<Send className="h-3.5 w-3.5" />}
            loading={sendReply.isPending}
            disabled={!reply.trim()}
            onClick={() => sendReply.mutate()}
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);

  const params: Record<string, string | number> = { per_page: 100 };
  if (search) params.search = search;
  if (filter !== "all") params.status = filter;

  const { data, isLoading } = useQuery({
    queryKey: ["support-threads", params],
    queryFn: () => apiListSupportThreads(params),
  });

  const threads = data?.data ?? [];
  const openCount = threads.filter((t) => t.status === "open").length;

  return (
    <WorkspaceLayout workspace="support" title="Support Center" subtitle="Unified inbox and ticket timeline">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Thread list */}
        <div className="flex w-80 shrink-0 flex-col">
          <Card padding="none" className="flex flex-col h-full">
            {/* Search + filter */}
            <div className="border-b border-slate-200 p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors capitalize ${
                      filter === s
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s === "open" ? `open (${openCount})` : s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : threads.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="No tickets"
                  description="No tickets match this filter."
                />
              ) : (
                threads.map((t) => (
                  <ThreadRow
                    key={t.id}
                    t={t}
                    selected={selectedThread?.id === t.id}
                    onClick={() => setSelectedThread(t)}
                  />
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Thread detail */}
        <div className="flex-1">
          {selectedThread ? (
            <Card padding="md" className="h-full overflow-hidden">
              <ThreadDetail thread={selectedThread} />
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="h-12 w-12" />}
                title="Select a ticket"
                description="Choose a thread from the left to view the conversation."
              />
            </Card>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
