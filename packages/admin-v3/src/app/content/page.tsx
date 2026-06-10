"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiListBlogPosts, apiGetBlogPost, apiSaveBlogPost, apiListApprovals } from "@/lib/api";
import { fmtDate, slugify } from "@/lib/utils";
import type { BlogPost } from "@/types";
import { FileText, Plus, Edit } from "lucide-react";

type ContentTab = "blog" | "approvals";

export default function ContentPage() {
  const [tab, setTab] = useState<ContentTab>("blog");

  return (
    <WorkspaceLayout workspace="content" title="Content Operations" subtitle="Blog, email campaigns, and content approvals">
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(["blog", "approvals"] as ContentTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "blog" ? "Blog CMS" : "Approvals"}
          </button>
        ))}
      </div>
      {tab === "blog"      && <BlogCMS />}
      {tab === "approvals" && <Approvals />}
    </WorkspaceLayout>
  );
}

// ── Blog CMS ──────────────────────────────────────────────────────────────────

const EMPTY_POST: BlogPost = {
  title: "", slug: "", content: "", excerpt: "", status: "draft",
  seo_title: "", seo_description: "",
};

function BlogCMS() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPost>(EMPTY_POST);

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts", filter],
    queryFn: () => apiListBlogPosts(filter !== "all" ? { status: filter } : {}),
  });

  const save = useMutation({
    mutationFn: () => apiSaveBlogPost(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog-posts"] }); setEditPost(null); },
  });

  const posts = data?.data ?? [];

  function openCreate() {
    setForm(EMPTY_POST);
    setEditPost(EMPTY_POST);
  }

  async function openEdit(slug: string) {
    const post = await apiGetBlogPost(slug);
    setForm(post);
    setEditPost(post);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1">
          {["all", "draft", "published", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>New post</Button>
        </div>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
        ) : posts.length === 0 ? (
          <EmptyState icon={<FileText className="h-10 w-10" />} title="No posts" description="Create your first blog post." action={<Button onClick={openCreate}>Create</Button>} />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Title", "Status", "Published", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{p.title}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.slug}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.published_at ? fmtDate(p.published_at) : "—"}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" icon={<Edit className="h-3.5 w-3.5" />} onClick={() => openEdit(p.slug)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Drawer open={!!editPost} onClose={() => setEditPost(null)} title={form.id ? "Edit Post" : "New Post"} width="lg">
        {editPost && (
          <div className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })}
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="font-mono"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BlogPost["status"] })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Excerpt</label>
              <textarea
                value={form.excerpt ?? ""}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Content (Markdown)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={12}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <Input label="SEO title" value={form.seo_title ?? ""} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">SEO description</label>
              <textarea
                value={form.seo_description ?? ""}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button loading={save.isPending} disabled={!form.title || !form.slug} onClick={() => save.mutate()}>
                {form.id ? "Save changes" : "Publish draft"}
              </Button>
              <Button variant="secondary" onClick={() => setEditPost(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ── Content Approvals ──────────────────────────────────────────────────────────

function Approvals() {
  const [filter, setFilter] = useState("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["approvals", filter],
    queryFn: () => apiListApprovals(filter !== "all" ? { status: filter } : {}),
  });

  const approvals = data?.data ?? [];

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {["all", "pending", "approved", "rejected", "changes_requested"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12"><span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
        ) : approvals.length === 0 ? (
          <EmptyState title="No approvals" description="No content approvals in this state." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Title", "Brand", "Status", "Requested", "Reviewed"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{a.title ?? "(untitled)"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 truncate max-w-[100px]">{a.brand_id}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(a.status)} className="capitalize">{a.status.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(a.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{a.updated_at ? fmtDate(a.updated_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
