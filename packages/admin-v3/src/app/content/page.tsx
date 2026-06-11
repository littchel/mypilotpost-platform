"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListApprovals, apiUpdateApproval,
  apiListBlogPosts, apiListCampaigns,
  apiListMemoryEvents, apiListMemoryFeatures,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  FileCheck, BookOpen, Megaphone, Brain,
  CheckCircle, XCircle,
} from "lucide-react";
import type { ContentApproval, BlogPost, Campaign, MemoryEvent, MemoryFeature } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

const APPROVAL_COLS: Column<ContentApproval>[] = [
  { key: "content_title", header: "Title", sortable: true, render: r => <span className="text-sm text-ink-1 font-medium">{r.content_title ?? "Untitled"}</span> },
  { key: "brand_name", header: "Brand", render: r => <span className="text-sm text-ink-2">{r.brand_name ?? "—"}</span> },
  { key: "content_type", header: "Type", render: r => <Badge variant="brand">{r.content_type ?? r.type ?? "post"}</Badge> },
  { key: "status", header: "Status", render: r => <Badge variant={statusBadge(r.status)}>{r.status}</Badge> },
  { key: "created_at", header: "Submitted", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

function ApprovalDrawer({ approval, onClose }: { approval: ContentApproval; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);

  const approveMut = useMutation({
    mutationFn: () => apiUpdateApproval(approval.id, "approved"),
    onSuccess: () => {
      toast.success("Content approved");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      onClose();
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMut = useMutation({
    mutationFn: () => apiUpdateApproval(approval.id, "rejected"),
    onSuccess: () => {
      toast.success("Content rejected");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      onClose();
    },
    onError: () => toast.error("Failed to reject"),
  });

  const canAct = approval.status === "pending" || approval.status === "review";

  return (
    <>
      <Drawer open onClose={onClose} title="Content Review" width="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" icon={<CheckCircle className="h-4 w-4" />}
              disabled={!canAct} loading={approveMut.isPending}
              onClick={() => setConfirmAction("approve")}>Approve</Button>
            <Button variant="danger" icon={<XCircle className="h-4 w-4" />}
              disabled={approval.status === "approved" || approval.status === "rejected"}
              loading={rejectMut.isPending}
              onClick={() => setConfirmAction("reject")}>Reject</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink-1">{approval.content_title ?? "Untitled"}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-ink-3">{approval.brand_name ?? approval.brand_id}</span>
              <Badge variant={statusBadge(approval.status)}>{approval.status}</Badge>
              {(approval.content_type ?? approval.type) && <Badge variant="brand">{approval.content_type ?? approval.type}</Badge>}
            </div>
          </div>

          <Card padding="none">
            <div className="divide-y divide-os-border">
              {[
                { label: "Content ID", value: approval.content_id },
                { label: "Submitted", value: fmt(approval.created_at) },
                { label: "Expires", value: fmt(approval.expires_at) },
                { label: "Last updated", value: fmt(approval.updated_at) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-ink-3">{row.label}</span>
                  <span className="text-xs text-ink-1 font-mono">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Drawer>

      <ConfirmDialog open={confirmAction === "approve"} onClose={() => setConfirmAction(null)}
        onConfirm={() => approveMut.mutate()} loading={approveMut.isPending}
        title="Approve content" description="Approve and publish this content?" type="info" />
      <ConfirmDialog open={confirmAction === "reject"} onClose={() => setConfirmAction(null)}
        onConfirm={() => rejectMut.mutate()} loading={rejectMut.isPending}
        title="Reject content" description="Reject and remove this content from the queue?" type="danger"
        confirmLabel="Reject" confirmVariant="danger" />
    </>
  );
}

function ApprovalsTab() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<ContentApproval | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["approvals", tab],
    queryFn: () => apiListApprovals({ status: tab }),
  });

  const approvals: ContentApproval[] = (data as { approvals?: ContentApproval[]; data?: ContentApproval[] } | undefined)?.approvals
    ?? (data as { data?: ContentApproval[] } | undefined)?.data ?? [];

  return (
    <>
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
          ]}
          active={tab}
          onChange={id => { setTab(id); setSelected(null); }}
          size="sm"
          variant="pills"
        />
      </div>

      <DataTable
        data={approvals}
        columns={APPROVAL_COLS}
        keyField="id"
        searchable
        searchPlaceholder="Search content..."
        loading={isLoading}
        error={error ? "Failed to load approvals" : undefined}
        emptyTitle={`No ${tab} approvals`}
        exportFilename="approvals"
        onRowClick={r => setSelected(r)}
        selectedId={selected?.id}
      />

      {selected && <ApprovalDrawer approval={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

const BLOG_COLS: Column<BlogPost>[] = [
  { key: "title", header: "Title", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{r.title}</span> },
  { key: "slug", header: "Slug", render: r => <span className="font-mono text-xs text-ink-3">{r.slug ?? "—"}</span> },
  { key: "status", header: "Status", render: r => <Badge variant={statusBadge(r.status)}>{r.status}</Badge> },
  { key: "author", header: "Author", render: r => <span className="text-sm text-ink-2">{r.author ?? "—"}</span> },
  { key: "published_at", header: "Published", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.published_at)}</span> },
];

function BlogTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["blog-posts"], queryFn: () => apiListBlogPosts({}) });
  const posts: BlogPost[] = (data as { posts?: BlogPost[]; data?: BlogPost[] } | undefined)?.posts
    ?? (data as { data?: BlogPost[] } | undefined)?.data ?? [];

  return (
    <DataTable
      data={posts}
      columns={BLOG_COLS}
      keyField="slug"
      searchable
      searchPlaceholder="Search posts..."
      loading={isLoading}
      error={error ? "Failed to load posts" : undefined}
      emptyTitle="No blog posts"
      exportFilename="blog-posts"
    />
  );
}

const CAMPAIGN_COLS: Column<Campaign>[] = [
  { key: "name", header: "Name", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{r.name}</span> },
  { key: "objective", header: "Objective", render: r => r.objective ? <Badge variant="brand">{r.objective}</Badge> : <span className="text-ink-3">—</span> },
  { key: "channel", header: "Channel", render: r => <span className="text-sm text-ink-2">{r.channel ?? "—"}</span> },
  { key: "status", header: "Status", render: r => <Badge variant={statusBadge(r.status)}>{r.status}</Badge> },
  { key: "created_at", header: "Created", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

function CampaignsTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ["campaigns"], queryFn: () => apiListCampaigns({}) });
  const campaigns: Campaign[] = (data as { campaigns?: Campaign[]; data?: Campaign[] } | undefined)?.campaigns
    ?? (data as { data?: Campaign[] } | undefined)?.data ?? [];

  return (
    <DataTable
      data={campaigns}
      columns={CAMPAIGN_COLS}
      keyField="id"
      searchable
      searchPlaceholder="Search campaigns..."
      loading={isLoading}
      error={error ? "Failed to load campaigns" : undefined}
      emptyTitle="No campaigns"
      exportFilename="campaigns"
    />
  );
}

const MEM_EVENT_COLS: Column<MemoryEvent>[] = [
  { key: "event", header: "Event", render: r => <span className="font-mono text-xs text-ink-1">{r.event}</span> },
  { key: "tool", header: "Tool", render: r => <span className="text-sm text-ink-2">{r.tool ?? "—"}</span> },
  { key: "brand_id", header: "Brand", render: r => <span className="font-mono text-xs text-ink-3">{r.brand_id ?? "—"}</span> },
  { key: "value", header: "Value", render: r => <span className="text-sm text-ink-2 truncate max-w-[180px]">{r.value ?? "—"}</span> },
  { key: "created_at", header: "When", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
];

const MEM_FEAT_COLS: Column<MemoryFeature>[] = [
  { key: "feature", header: "Feature", render: r => <span className="font-mono text-xs text-ink-1">{r.feature}</span> },
  { key: "brand_id", header: "Brand", render: r => <span className="font-mono text-xs text-ink-3">{r.brand_id}</span> },
  { key: "value", header: "Value", render: r => <span className="text-sm text-ink-1 truncate max-w-[200px]">{r.value ?? "—"}</span> },
  { key: "window", header: "Window", render: r => <span className="text-sm text-ink-2">{r.window ?? "—"}</span> },
  { key: "computed_at", header: "Computed", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.computed_at)}</span> },
];

function MemoryTab() {
  const [subtab, setSubtab] = useState("events");
  const { data: evData, isLoading: evLoading } = useQuery({ queryKey: ["memory-events"], queryFn: () => apiListMemoryEvents({}) });
  const { data: ftData, isLoading: ftLoading } = useQuery({ queryKey: ["memory-features"], queryFn: () => apiListMemoryFeatures() });

  const events: MemoryEvent[] = (evData as { events?: MemoryEvent[]; data?: MemoryEvent[] } | undefined)?.events
    ?? (evData as { data?: MemoryEvent[] } | undefined)?.data ?? [];
  const features: MemoryFeature[] = (ftData as { features?: MemoryFeature[]; data?: MemoryFeature[] } | undefined)?.features
    ?? (ftData as { data?: MemoryFeature[] } | undefined)?.data ?? [];

  return (
    <>
      <div className="mb-4">
        <Tabs tabs={[{ id:"events", label:"Events" }, { id:"features", label:"Features" }]} active={subtab} onChange={setSubtab} size="sm" variant="pills" />
      </div>
      {subtab === "events" && (
        <DataTable data={events} columns={MEM_EVENT_COLS} keyField="id" searchable loading={evLoading} emptyTitle="No memory events" exportFilename="memory-events" />
      )}
      {subtab === "features" && (
        <DataTable data={features} columns={MEM_FEAT_COLS} keyField="feature" searchable loading={ftLoading} emptyTitle="No memory features" exportFilename="memory-features" />
      )}
    </>
  );
}

export default function ContentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("approvals");

  return (
    <WorkspaceLayout
      workspace="content"
      title="Content Operations"
      subtitle="Approvals, blog, campaigns, memory"
      onRefresh={() => {
        ["approvals","blog-posts","campaigns","memory-events","memory-features"].forEach(k =>
          qc.invalidateQueries({ queryKey: [k] })
        );
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "approvals", label: "Approvals", icon: <FileCheck className="h-3.5 w-3.5" /> },
            { id: "blog", label: "Blog", icon: <BookOpen className="h-3.5 w-3.5" /> },
            { id: "campaigns", label: "Campaigns", icon: <Megaphone className="h-3.5 w-3.5" /> },
            { id: "memory", label: "Memory", icon: <Brain className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "approvals" && <ApprovalsTab />}
      {tab === "blog" && <BlogTab />}
      {tab === "campaigns" && <CampaignsTab />}
      {tab === "memory" && <MemoryTab />}
    </WorkspaceLayout>
  );
}
