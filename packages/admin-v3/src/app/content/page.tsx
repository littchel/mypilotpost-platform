"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListBlogPosts, apiCreateBlogPost, apiUpdateBlogPost, apiDeleteBlogPost,
  apiGetAdminMedia, apiDeleteMedia, apiGetAdminSEO, apiGetJobs,
  apiUploadBlogImage,
} from "@/lib/api";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Input, Select, Toggle } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/context/ToastContext";
import { useSession } from "@/context/SessionContext";
import {
  BookOpen, CheckCircle, XCircle, Plus, Trash2, Eye, Globe,
  Image as ImageIcon, Send, Activity,
} from "lucide-react";
import type { BlogPost } from "@/types";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
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
  const { session } = useSession();
  const canEdit = !!(session && ["super_admin", "admin", "ops", "operations"].includes(session.role));
  const toast = useToast();
  const isNew = post === "new";
  const postId = isNew ? "" : ((post as BlogPost).id ?? (post as BlogPost).slug ?? "");
  const [form, setForm] = useState<BlogFormState>(isNew ? EMPTY_POST : postToForm(post as BlogPost));
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editorTab, setEditorTab] = useState("content");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const [dragOverCover, setDragOverCover] = useState(false);

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setUploadingCover(true);
    try {
      const res = await apiUploadBlogImage(file);
      setForm(p => ({ ...p, cover_image: res.url }));
      setDirty(true);
      toast.success("Cover image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleBodyUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setUploadingBody(true);
    try {
      const res = await apiUploadBlogImage(file);
      const insertText = `![${res.filename}](${res.url})`;
      insertAtCursor(insertText);
      toast.success("Image uploaded and inserted");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingBody(false);
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById("blog-content-textarea") as HTMLTextAreaElement | null;
    if (!textarea) {
      setForm(p => ({ ...p, content: p.content + (p.content ? "\n" : "") + textToInsert }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newContent = before + textToInsert + after;
    setForm(p => ({ ...p, content: newContent }));
    setDirty(true);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCover(true);
  };

  const handleCoverDragLeave = () => {
    setDragOverCover(false);
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCoverUpload(file);
  };

  const f = (k: keyof BlogFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value })); setDirty(true);
  };

  const saveMut = useMutation<{ id: string } | { success: boolean }, Error, BlogFormState>({
    mutationFn: (variables) =>
      isNew
        ? apiCreateBlogPost(variables as unknown as BlogPost)
        : apiUpdateBlogPost(postId, variables),
    onSuccess: (_, variables) => {
      const isActuallyPublishing = variables.status === "published";
      toast.success(isActuallyPublishing ? "Post published" : (isNew ? "Post created" : "Post saved"));
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      setDirty(false);
      if (isNew || isActuallyPublishing) onClose();
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
            {canEdit ? (
              <>
                <Button loading={saveMut.isPending} disabled={!form.title} onClick={() => saveMut.mutate(form)}>
                  {form.status === "published" ? "Save changes" : "Save draft"}
                </Button>
                {(isNew || form.status !== "published") && (
                  <Button
                    variant="secondary"
                    icon={<Globe className="h-3.5 w-3.5" />}
                    loading={saveMut.isPending || publishMut.isPending}
                    disabled={!form.title}
                    onClick={() => {
                      if (isNew) {
                        saveMut.mutate({
                          ...form,
                          status: "published",
                          published_at: new Date().toISOString()
                        });
                      } else {
                        publishMut.mutate();
                      }
                    }}
                  >
                    Publish
                  </Button>
                )}
                {!isNew && (
                  <Button variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(true)}>Delete</Button>
                )}
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
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
            <Input label="Title" required value={form.title} onChange={f("title")} placeholder="Post title…" disabled={!canEdit} />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-ink-3">Content</label>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      id="blog-body-image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleBodyUpload(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      icon={<ImageIcon className="h-3.5 w-3.5" />}
                      loading={uploadingBody}
                      onClick={() => document.getElementById("blog-body-image-upload")?.click()}
                    >
                      Insert Image
                    </Button>
                  </div>
                )}
              </div>
              <textarea
                id="blog-content-textarea"
                value={form.content}
                onChange={f("content")}
                placeholder="Write your post content in markdown…"
                rows={16}
                className="os-input w-full resize-y font-mono text-sm"
                disabled={!canEdit}
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
                disabled={!canEdit}
              />
            </div>
          </div>
        )}

        {editorTab === "seo" && (
          <div className="space-y-4">
            <Input label="SEO Title" value={form.seo_title} onChange={f("seo_title")} hint="Defaults to post title if blank" disabled={!canEdit} />
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">SEO Description</label>
              <textarea
                value={form.seo_description}
                onChange={f("seo_description")}
                placeholder="Meta description (150-160 characters recommended)…"
                rows={4}
                className="os-input w-full resize-none"
                disabled={!canEdit}
              />
              <p className="text-2xs text-ink-4 mt-1">{form.seo_description.length} characters</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-3 mb-1.5">Cover Image</label>
              <div
                className={`border border-dashed rounded-lg p-4 transition-all text-center flex flex-col items-center justify-center min-h-[140px] bg-os-raised ${
                  canEdit ? "cursor-pointer" : "cursor-default"
                } ${
                  dragOverCover && canEdit ? "border-brand-500 bg-brand-500/5" : "border-os-border hover:border-ink-4"
                }`}
                onDragOver={canEdit ? handleCoverDragOver : undefined}
                onDragLeave={canEdit ? handleCoverDragLeave : undefined}
                onDrop={canEdit ? handleCoverDrop : undefined}
                onClick={() => canEdit && document.getElementById("blog-cover-image-upload")?.click()}
              >
                {canEdit && (
                  <input
                    type="file"
                    id="blog-cover-image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverUpload(file);
                    }}
                  />
                )}
                
                {uploadingCover ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border border-brand-500 border-t-transparent" />
                    <p className="text-xs text-ink-3">Uploading cover image...</p>
                  </div>
                ) : form.cover_image ? (
                  <div className="relative w-full group rounded overflow-hidden">
                    <img src={form.cover_image} alt="Cover preview" className="h-32 w-full object-cover rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {canEdit && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button type="button" size="xs" variant="secondary">Change Image</Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm(p => ({ ...p, cover_image: "" }));
                            setDirty(true);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-6 w-6 text-ink-3 mb-2" />
                    <p className="text-xs font-medium text-ink-2">
                      {canEdit ? "Drag & drop cover image, or click to upload" : "No cover image"}
                    </p>
                    {canEdit && <p className="text-2xs text-ink-4 mt-1">Supports PNG, JPG, WEBP, GIF up to 5MB</p>}
                  </div>
                )}
              </div>
            </div>
            <Input label="Cover Image URL" value={form.cover_image} onChange={f("cover_image")} placeholder="https://…" hint="Or paste an external image URL directly" disabled={!canEdit} />
          </div>
        )}

        {editorTab === "settings" && (
          <div className="space-y-4">
            <Input label="Author" value={form.author} onChange={f("author")} placeholder="Author name" disabled={!canEdit} />
            <Input label="Tags" value={form.tags} onChange={f("tags")} placeholder="comma, separated, tags" hint="Comma-separated tag list" disabled={!canEdit} />
            <Select label="Status"
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived", label: "Archived" },
              ]}
              value={form.status}
              disabled={!canEdit}
              onChange={v => { setForm(p => ({...p, status: v as BlogPost["status"]})); setDirty(true); }} />
            {form.status === "published" && (
              <Input label="Published at" type="datetime-local" value={form.published_at} onChange={f("published_at")} disabled={!canEdit} />
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
  const { session } = useSession();
  const canEdit = !!(session && ["super_admin", "admin", "ops", "operations"].includes(session.role));

  const { data, isLoading, error } = useQuery({ queryKey: ["blog-posts"], queryFn: () => apiListBlogPosts({}) });
  const posts: BlogPost[] = Array.isArray(data) ? data : ((data as any)?.posts ?? (data as any)?.data ?? []);

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
          canEdit ? (
            <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowNew(true)}>
              New post
            </Button>
          ) : undefined
        }
      />
      {selected && <BlogEditor post={selected} onClose={() => setSelected(null)} />}
      {showNew && <BlogEditor post="new" onClose={() => setShowNew(false)} />}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Media (platform-wide assets) ────────────────────────────────────────────────
type MediaAsset = { id: string; source: string; provider_asset_id: string | null; preview_url: string; mime_type: string; license: string; usage_count: number; owner: string; brand_name?: string; created_at: string };
function MediaTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-media"], queryFn: () => apiGetAdminMedia(), staleTime: 60_000 });
  const assets = (data?.assets ?? []) as MediaAsset[];
  const providers = (data?.providers ?? []) as { provider: string; imports: number; license: string; last_import: string }[];
  const delMut = useMutation({
    mutationFn: (id: string) => apiDeleteMedia(id),
    onSuccess: () => { toast.success("Asset deleted"); setConfirmDel(null); qc.invalidateQueries({ queryKey: ["admin-media"] }); },
    onError: (e: Error) => { toast.error("Delete blocked", e.message); setConfirmDel(null); },
  });
  const COLS: Column<MediaAsset>[] = [
    { key: "preview_url", header: "Asset", render: r => <div className="flex items-center gap-2"><img src={r.preview_url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} /><span className="text-2xs font-mono text-ink-3">{r.provider_asset_id ?? "—"}</span></div> },
    { key: "source", header: "Source", sortable: true, render: r => <Badge variant="brand">{r.source}</Badge> },
    { key: "license", header: "License", render: r => <span className="text-xs text-ink-2">{r.license}</span> },
    { key: "usage_count", header: "Usage", sortable: true, render: r => <span className="text-sm tabular-nums text-ink-2">{r.usage_count}</span> },
    { key: "owner", header: "Owner", render: r => <span className="text-sm text-ink-2">{r.owner}</span> },
    { key: "created_at", header: "Created", sortable: true, render: r => <span className="text-sm text-ink-2">{fmt(r.created_at)}</span> },
    { key: "id", header: "", render: r => <Button variant="ghost" size="sm" icon={<Trash2 className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); setConfirmDel(r.id); }} disabled={r.usage_count > 0} title={r.usage_count > 0 ? "In use — detach first" : "Delete"} /> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {providers.map(p => (
          <div key={p.provider} className="os-card-raised p-3">
            <p className="text-2xs text-ink-3 uppercase tracking-wider">{p.provider}</p>
            <p className="text-xl font-bold text-ink-1 mt-0.5">{p.imports}</p>
            <p className="text-2xs text-ink-4">{p.license}</p>
          </div>
        ))}
      </div>
      <DataTable data={assets} columns={COLS} keyField="id" searchable searchPlaceholder="Search source, owner..." searchFields={["source", "owner", "provider_asset_id"]} loading={isLoading} emptyTitle="No assets" exportFilename="media-assets" />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => confirmDel && delMut.mutate(confirmDel)} title="Delete asset" description="Permanently remove this media asset. Blocked if still linked to content." confirmLabel="Delete" confirmVariant="danger" loading={delMut.isPending} type="danger" />
    </div>
  );
}

// ─── SEO ──────────────────────────────────────────────────────────────────────────
function SEOTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-seo"], queryFn: apiGetAdminSEO });
  const d = (data ?? {}) as Record<string, any>;
  const mc = d.metadata_coverage ?? {};
  const issues = (d.issues ?? []) as { id: string; slug: string; title: string; score: number; issues: string[] }[];
  if (isLoading) return <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-os-raised rounded-lg" />)}</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Posts" value={String(d.total_posts ?? 0)} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Avg SEO score" value={String(d.avg_seo_score ?? 0)} icon={<Globe className="h-4 w-4" />} accent={(d.avg_seo_score ?? 0) >= 70 ? "success" : "warning"} />
        <StatCard label="Missing images" value={String(d.missing_images ?? 0)} icon={<XCircle className="h-4 w-4" />} accent={(d.missing_images ?? 0) > 0 ? "warning" : undefined} />
        <StatCard label="Suspect links" value={String(d.suspect_links ?? 0)} icon={<XCircle className="h-4 w-4" />} accent={(d.suspect_links ?? 0) > 0 ? "warning" : undefined} />
      </div>
      <Card>
        <h2 className="text-sm font-semibold text-ink-1 mb-3">Metadata coverage</h2>
        <div className="space-y-2">
          {[["Title", mc.title], ["Description", mc.description], ["Image", mc.image], ["Slug", mc.slug]].map(([label, v]: any) => (
            <div key={label} className="flex items-center gap-3"><span className="text-sm text-ink-2 w-24 shrink-0">{label}</span><div className="flex-1 h-2 bg-os-raised rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${v?.percent ?? 0}%` }} /></div><span className="text-xs text-ink-3 w-12 text-right">{v?.percent ?? 0}%</span></div>
          ))}
        </div>
        <p className="text-2xs text-ink-4 mt-3">{d.note}</p>
      </Card>
      {issues.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Issues ({issues.length})</h2></div>
          <div className="divide-y divide-os-border/40">{issues.map(it => (<div key={it.id} className="flex items-center justify-between px-4 py-2.5"><div className="min-w-0"><p className="text-sm text-ink-1 truncate">{it.title || it.slug}</p><p className="text-2xs text-ink-3">{it.issues.join(" · ")}</p></div><Badge variant={it.score >= 70 ? "success" : it.score >= 40 ? "warning" : "danger"}>{it.score}</Badge></div>))}</div>
        </Card>
      )}
    </div>
  );
}

// ─── Publishing ────────────────────────────────────────────────────────────────────
function PublishingTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-publishing-jobs"], queryFn: () => apiGetJobs() });
  const jobs = (data?.jobs ?? []) as { id: string; job: string; owner: string; status: string; last_run: string; error: string | null }[];
  const summary = (data?.summary ?? {}) as Record<string, number>;
  const failed = jobs.filter(j => j.status === "failed");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Published" value={String(summary.published ?? 0)} icon={<CheckCircle className="h-4 w-4" />} accent="success" loading={isLoading} />
        <StatCard label="Failed" value={String(summary.failed ?? 0)} icon={<XCircle className="h-4 w-4" />} accent={(summary.failed ?? 0) > 0 ? "warning" : undefined} loading={isLoading} />
        <StatCard label="Dead" value={String(summary.dead ?? 0)} icon={<XCircle className="h-4 w-4" />} accent={(summary.dead ?? 0) > 0 ? "danger" : undefined} loading={isLoading} />
      </div>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-os-border"><h2 className="text-sm font-semibold text-ink-1">Recent delivery history</h2></div>
        {jobs.length === 0 ? <p className="px-4 py-8 text-center text-sm text-ink-3">No publishing history</p> : (
          <div className="max-h-[500px] overflow-y-auto divide-y divide-os-border/40">{jobs.slice(0, 50).map(j => (<div key={j.id} className="flex items-center gap-3 px-4 py-2.5"><Badge variant={statusBadge(j.status)} dot>{j.status}</Badge><div className="flex-1 min-w-0"><p className="text-sm text-ink-1">{j.job}</p><p className="text-2xs text-ink-3">{j.owner}{j.error ? ` · ${j.error}` : ""}</p></div><span className="text-2xs text-ink-4">{j.last_run ? fmt(j.last_run) : "—"}</span></div>))}</div>
        )}
      </Card>
    </div>
  );
}

// ─── Content Health (derived, no moderation) ────────────────────────────────────────
function ContentHealthTab() {
  const { data: blogData } = useQuery({ queryKey: ["blog-posts"], queryFn: () => apiListBlogPosts() });
  const { data: seoData } = useQuery({ queryKey: ["admin-seo"], queryFn: apiGetAdminSEO });
  const { data: jobsData } = useQuery({ queryKey: ["admin-publishing-jobs"], queryFn: () => apiGetJobs() });
  const posts = ((blogData as { posts?: unknown[]; data?: unknown[] })?.posts ?? (blogData as { data?: unknown[] })?.data ?? []) as { status?: string; featured_image?: string }[];
  const seo = (seoData ?? {}) as Record<string, any>;
  const summary = ((jobsData?.summary ?? {}) as Record<string, number>);
  const published = posts.filter(p => p.status === "published").length;
  const lowSeo = (seo.issues ?? []).filter((i: { score: number }) => i.score < 40).length;
  const cards = [
    { label: "Published posts", value: published, accent: "success", show: true },
    { label: "Failed deliveries", value: summary.failed ?? 0, accent: "warning", show: (summary.failed ?? 0) > 0 },
    { label: "Dead jobs", value: summary.dead ?? 0, accent: "danger", show: (summary.dead ?? 0) > 0 },
    { label: "Missing images", value: seo.missing_images ?? 0, accent: "warning", show: (seo.missing_images ?? 0) > 0 },
    { label: "Low-SEO posts (<40)", value: lowSeo, accent: "warning", show: lowSeo > 0 },
    { label: "Suspect links", value: seo.suspect_links ?? 0, accent: "warning", show: (seo.suspect_links ?? 0) > 0 },
  ].filter(c => c.show);
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-3">Derived health signals from published content, SEO, and delivery. No moderation system.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} label={c.label} value={String(c.value)} accent={c.accent as "success" | "warning" | "danger"} />)}
      </div>
      {cards.length <= 1 && <Card><p className="text-sm text-ink-2">Content is healthy — no failed deliveries, missing images, or low-SEO posts.</p></Card>}
    </div>
  );
}

export default function ContentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("blog");

  return (
    <WorkspaceLayout
      workspace="content"
      title="Content"
      subtitle="Operate published content"
      onRefresh={() => {
        ["blog-posts", "admin-media", "admin-seo", "admin-publishing-jobs"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      }}
    >
      <div className="mb-5">
        <Tabs
          tabs={[
            { id: "blog", label: "Blog", icon: <BookOpen className="h-3.5 w-3.5" /> },
            { id: "media", label: "Media", icon: <ImageIcon className="h-3.5 w-3.5" /> },
            { id: "seo", label: "SEO", icon: <Globe className="h-3.5 w-3.5" /> },
            { id: "publishing", label: "Publishing", icon: <Send className="h-3.5 w-3.5" /> },
            { id: "health", label: "Content Health", icon: <Activity className="h-3.5 w-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "blog" && <BlogTab />}
      {tab === "media" && <MediaTab />}
      {tab === "seo" && <SEOTab />}
      {tab === "publishing" && <PublishingTab />}
      {tab === "health" && <ContentHealthTab />}
    </WorkspaceLayout>
  );
}
