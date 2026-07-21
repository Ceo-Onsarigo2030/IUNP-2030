"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Star, Trash2, Eye, EyeOff } from "lucide-react";

const EMPTY = { title: "", slug: "", excerpt: "", body: "", comments_enabled: true };

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pinnedCount = articles.filter((a) => a.is_pinned).length;

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    setArticles(data || []);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = { ...form, slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") };
    if (editingId) await supabase.from("articles").update(payload).eq("id", editingId);
    else await supabase.from("articles").insert(payload);
    setForm(EMPTY);
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function togglePublish(a: any) {
    const supabase = createClient();
    await supabase.from("articles").update({ published_at: a.published_at ? null : new Date().toISOString() }).eq("id", a.id);
    load();
  }

  async function togglePin(a: any) {
    if (!a.is_pinned && pinnedCount >= 2) return alert("Only two articles can be pinned at once. Unpin one first.");
    const supabase = createClient();
    await supabase.from("articles").update({ is_pinned: !a.is_pinned }).eq("id", a.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this article?")) return;
    const supabase = createClient();
    await supabase.from("articles").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Articles &amp; Announcements</h1>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
        <form onSubmit={handleSave} className="card-elegant p-6 space-y-3 h-fit">
          <h2 className="font-display text-lg mb-1">{editingId ? "Edit article" : "New article"}</h2>
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          <textarea required rows={2} placeholder="Short excerpt (3-4 lines shown on cards)" value={form.excerpt} onChange={(e) => setForm((f: any) => ({ ...f, excerpt: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
          <textarea required rows={6} placeholder="Full article body" value={form.body} onChange={(e) => setForm((f: any) => ({ ...f, body: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.comments_enabled} onChange={(e) => setForm((f: any) => ({ ...f, comments_enabled: e.target.checked }))} className="accent-[#C9A227]" />
            Enable comments on this article
          </label>
          <button type="submit" disabled={saving} className="btn-gold w-full !py-3 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4" /> {editingId ? "Save changes" : "Create draft"}</>}
          </button>
        </form>

        <div className="space-y-3">
          <p className="text-xs text-ink/50">{pinnedCount}/2 pinned</p>
          {articles.map((a) => (
            <div key={a.id} className="card-elegant p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {a.is_pinned && <Star className="size-3.5 text-gold fill-gold" />}
                  <h3 className="font-display text-lg">{a.title}</h3>
                </div>
                <p className="text-xs text-ink/50">{a.published_at ? "Published" : "Draft"} · Comments {a.comments_enabled ? "on" : "off"}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => togglePublish(a)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 flex items-center gap-1">
                  {a.published_at ? <EyeOff className="size-3" /> : <Eye className="size-3" />} {a.published_at ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => togglePin(a)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10">{a.is_pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => { setForm(a); setEditingId(a.id); }} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">Edit</button>
                <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
