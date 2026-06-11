"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListApprovals, apiUpdateApproval,
  apiListBlogPosts, apiCreateBlogPost, apiUpdateBlogPost, apiDeleteBlogPost,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Toggle } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import {
  FileCheck, BookOpen, CheckCircle, XCircle,
  Plus, Trash2, Eye, Globe,
} from "lucide-react";
import type { ContentApproval, BlogPost } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Approvals tab ────────────────────────────────────────────────────────────

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
    onSuccess: () => { toast.success("Content approved"); qc.invalidateQueries({ queryKey: ["approvals"] }); onClose(); },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMut = useMutation({
    mutationFn: () => apiUpdateApproval(approval.id, "rejected"),
    onSuccess: () => { toast.success("Content rejected"); qc.invalidateQueries({ queryKey: ["approvals"] }); onClose(); },
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
        title="Reject content" description="Reject this content from the queue?" type="danger"
        confirmLabel="Reject" confirmVariant="danger" />
    </>
  );
}

function ApprovalsTab() {
  const [status, setStatus] = useState("pending");
  const [selected, setSelected] = useState<ContentApproval | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["approvals", status],
    queryFn: () => apiListApprovals({ status }),
  });

  const approvals: ContentApproval[] = (data as { approvals?: ContentApproval[] } | undefined)?.approvals
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
          active={status}
          onChange={id => { setStatus(id); setSelected(null); }}
          size="sm" variant="pills"
        />
      </div>
      <DataTable
        data={approvals} columns={APPROVAL_COLS} keyField="id" searchable
        searchPlaceholder="Search content..." loading={isLoading}
        error={error ? "Failed to load approvals" : undefined}
        emptyTitle={`No ${status} approvals`} exportFilename="approvals"
        onRowClick={r => setSelected(r)} selectedId={selected?.id}
      />
      {selected && <ApprovalDrawer approval={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

// ─── Blog tab ─────────────────────────────────────────────────────────────────

const BLOG_COLS: Column<BlogPost>[] = [
  { key: "title", header: "Title", sortable: true, render: r => <span className="text-sm font-medium text-ink-1">{r.title}</span> },
  { key: "status", header: "Status", render: r => <Badge variant={r.status === "published" ? "success" : r.status === "draft" ? "neutral" : "warning"}>{r.status}</Badge> },
  { key: "author", header: "Author", render: r => <span className="text-sm text-ink-2">{r.author ?? "—"}</span> },
  { key: "published_at", header: "Published", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.published_at)}</span> },
  { key: "tags", header: "Tags", render: r => r.tags ? <span className="text-xs text-ink-3 truncate max-w-[120px]">{r.tags}</span> : <span className="text-ink-4">—</span> },
];

type BlogFormState = {
  title: string; content: string; excerpt: string;
  cover_image: string; author: string; status: BlogPost["status"];
  seo_title: string; seo_description: string; tags: string;
  published_at: string;
};

const EMPTY_POST: BlogFormState = {
  title: "", content: "", excerpt: "",
  cover_image: "", author: "", status: "draft",
  seo_title: "", seo_description: "", tags: "", published_at: "",
};

function postToForm(p: BlogPost): BlogFormState {
  return {
    title: p.title ?? "", content: p.content ?? "", excerpt: p.excerpt ?? "",
    cover_image: p.cover_image ?? "", author: p.author ?? "", status: p.status ?? "draft",
    seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "",
    tags: p.tags ?? "", published_at: p.published_at ?? "",
  };
}

function BlogEditor({ post, onClose }: { post: BlogPost | "new"; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = post === "new";
  const postId = isNew ? "" : ((post as BlogPost).id ?? (post as BlogPost).slug ?? "");
  const [form, setForm] = useState<BlogFormState>(isNew ? EMPTY_POST : postToForm(post as BlogPost));
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editorTab, setEditorTab] = useState("content");

  const f = (k: keyof BlogFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value })); setDirty(true);
  };

  const saveMut = useMutation<{ id: string } | { success: boolean }, Error>({
    mutationFn: () =>
      isNew
        ? apiCreateBlogPost(form as unknown as BlogPost)
        : apiUpdateBlogPost(postId, form),
    onSuccess: () => {
      toast.success(isNew ? "Post created" : "Post saved");
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      setDirty(false);
      if (isNew) onClose();
    },
    onError: () => toast.error("Failed to save post"),
  });

  const publishMut = useMutation({
    mutationFn: () => apiUpdateBlogPost(postId, { status: "published", published_at: new Date().toISOString() }),
    onSuccess: () => {
      toast.success("Post published");
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      onClose();
    },
    onError: () => toast.error("Failed to publish"),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDeleteBlogPost(postId),
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      setConfirmDelete(false);
      onClose();
    },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <>
      <Drawer open onClose={onClose} title={isNew ? "New Blog Post" : "Edit Post"} dirty={dirty} width="lg"
        footer={
          <div className="flex items-center gap-2 flex-wrap">
            <Button loading={saveMut.isPending} disabled={!form.title} onClick={() => saveMut.mutate()}>Save draft</Button>
            {!isNew && form.status !== "published" && (
              <Button variant="secondary" icon={<Globe className="h-3.5 w-3.5" />} loading={publishMut.isPending} onClick={() => publishMut.mutate()}>
                Publish
              </Button>
            )}
            {!isNew && (
              <Button variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(true)}>Delete</Button>
            )}
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        }
      >
        <div className="space-y-1 mb-4">
          <Tabs
            tabs={[
              { id: "content", label: "Content" },
              { id: "seo", label: "SEO" },
              { id: "settings", label: "Settings" },
            ]}
            active={editorTab} onChange={setEditorTab} size="sm" variant="pills"
          />
        </div>

        {editorTab === "content" && (
          <div className="space-y-4">
            <Input label="Title" required value={form.title} onChange={f("title")} placeholder="Post title…" />
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">Content</label>
              <textarea
                value={form.content}
                onChange={f("content")}
                placeholder="Write your post content in markdown…"
                rows={16}
                className="os-input w-full resize-y font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">Excerpt</label>
              <textarea
                value={form.excerpt}
                onChange={f("excerpt")}
                placeholder="Short summary shown in listings…"
                rows={3}
                className="os-input w-full resize-none"
              />
            </div>
          </div>
        )}

        {editorTab === "seo" && (
          <div className="space-y-4">
            <Input label="SEO Title" value={form.seo_title} onChange={f("seo_title")} hint="Defaults to post title if blank" />
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">SEO Description</label>
              <textarea
                value={form.seo_description}
                onChange={f("seo_description")}
                placeholder="Meta description (150-160 characters recommended)…"
                rows={4}
                className="os-input w-full resize-none"
              />
              <p className="text-2xs text-ink-4 mt-1">{form.seo_description.length} characters</p>
            </div>
            <Input label="Cover Image URL" value={form.cover_image} onChange={f("cover_image")} placeholder="https://…" hint="Used as og:image and post header" />
            {form.cover_image && (
              <div className="rounded-lg overflow-hidden border border-os-border h-32 bg-os-raised flex items-center justify-center">
                <img src={form.cover_image} alt="Cover preview" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
        )}

        {editorTab === "settings" && (
          <div className="space-y-4">
            <Input label="Author" value={form.author} onChange={f("author")} placeholder="Author name" />
            <Input label="Tags" value={form.tags} onChange={f("tags")} placeholder="comma, separated, tags" hint="Comma-separated tag list" />
            <Select label="Status"
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived", label: "Archived" },
              ]}
              value={form.status}
              onChange={v => { setForm(p => ({...p, status: v as BlogPost["status"]})); setDirty(true); }} />
            {form.status === "published" && (
              <Input label="Published at" type="datetime-local" value={form.published_at} onChange={f("published_at")} />
            )}
          </div>
        )}
      </Drawer>

      {!isNew && (
        <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)}
          onConfirm={() => deleteMut.mutate()} loading={deleteMut.isPending}
          title="Delete post" description={`Permanently delete "${(post as BlogPost).title}"?`}
          type="danger" confirmLabel="Delete" confirmVariant="danger" />
      )}
    </>
  );
}

function BlogTab() {
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: ["blog-posts"], queryFn: () => apiListBlogPosts({}) });
  const posts: BlogPost[] = (data as { posts?: BlogPost[]; data?: BlogPost[] } | undefined)?.posts
    ?? (data as { data?: BlogPost[] } | undefined)?.data ?? [];

  return (
    <>
      <DataTable
        data={posts} columns={BLOG_COLS} keyField="id"
        searchable searchPlaceholder="Search posts..."
        loading={isLoading} error={error ? "Failed to load posts" : undefined}
        emptyTitle="No blog posts" emptyMessage="Create your first post."
        exportFilename="blog-posts"
        onRowClick={r => setSelected(r)} selectedId={selected?.id ?? selected?.slug}
        toolbar={
          <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowNew(true)}>
            New post
          </Button>
        }
      />
      {selected && <BlogEditor post={selected} onClose={() => setSelected(null)} />}
      {showNew && <BlogEditor post="new" onClose={() => setShowNew(false)} />}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("approvals");

  return (
    <WorkspaceLayout
      workspace="content"
      title="Content"
      subtitle="Publishing approvals and blog management"
      onRefresh={() => {
        ["approvals", "blog-posts"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "approvals", label: "Approvals", icon: <FileCheck className="h-3.5 w-3.5" /> },
            { id: "blog", label: "Blog", icon: <BookOpen className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "approvals" && <ApprovalsTab />}
      {tab === "blog" && <BlogTab />}
    </WorkspaceLayout>
  );
}
