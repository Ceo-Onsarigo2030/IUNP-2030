"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Trash2, Copy, Eye, EyeOff, BarChart3, X, Check } from "lucide-react";

const EMPTY_CATEGORY = { name: "", slug: "", description: "", parent_id: "" };
const EMPTY_NOMINEE = { name: "", bio: "" };

export default function AdminGalaPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY_CATEGORY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState<any | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("gala_categories").select("*").order("sort_order", { ascending: true });
    setCategories(data || []);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: form.description || null,
      parent_id: form.parent_id || null,
    };
    if (editingId) await supabase.from("gala_categories").update(payload).eq("id", editingId);
    else await supabase.from("gala_categories").insert(payload);
    setForm(EMPTY_CATEGORY);
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function toggleOpen(c: any) {
    const supabase = createClient();
    await supabase.from("gala_categories").update({ is_open: !c.is_open }).eq("id", c.id);
    load();
  }

  async function togglePublished(c: any) {
    const supabase = createClient();
    await supabase.from("gala_categories").update({ results_published: !c.results_published }).eq("id", c.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category, its nominees, and all votes?")) return;
    const supabase = createClient();
    await supabase.from("gala_categories").delete().eq("id", id);
    load();
  }

  function copyLink(slug: string) {
    const url = `${location.origin}/gala/${slug}`;
    navigator.clipboard.writeText(url);
    alert(`Copied: ${url}`);
  }

  const topLevelOptions = categories.filter((c) => !c.parent_id);

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-1">UniNexus Gala Awards Voting</h1>
      <p className="text-xs text-gold-deep uppercase tracking-widest mb-2">Season 1</p>
      <p className="text-sm text-ink/50 mb-8">Create categories and subcategories, add nominees, then open voting and share each link.</p>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
        <form onSubmit={handleSave} className="card-elegant p-6 space-y-3 h-fit">
          <h2 className="font-display text-lg mb-1">{editingId ? "Edit category" : "New category or subcategory"}</h2>
          <input required placeholder="Name e.g. Dancer of the Year" value={form.name}
            onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          <textarea rows={2} placeholder="Short description (optional)" value={form.description}
            onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
          <select value={form.parent_id} onChange={(e) => setForm((f: any) => ({ ...f, parent_id: e.target.value }))}
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm">
            <option value="">Top-level category</option>
            {topLevelOptions.filter((c) => c.id !== editingId).map((c) => (
              <option key={c.id} value={c.id}>Subcategory of: {c.name}</option>
            ))}
          </select>
          <button type="submit" disabled={saving} className="btn-gold w-full !py-3 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4" /> {editingId ? "Save changes" : "Create"}</>}
          </button>
        </form>

        <div className="space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="card-elegant p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gold-deep uppercase tracking-wider mb-1">
                    {c.parent_id ? "Subcategory" : "Category"}
                  </p>
                  <h3 className="font-display text-lg">{c.name}</h3>
                  <p className="text-xs text-ink/40 mt-1">/gala/{c.slug}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end shrink-0">
                  <button onClick={() => copyLink(c.slug)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 flex items-center gap-1">
                    <Copy className="size-3" /> Copy link
                  </button>
                  <button onClick={() => setManaging(c)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10">
                    Nominees &amp; tally
                  </button>
                  <button onClick={() => toggleOpen(c)} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${c.is_open ? "border-emerald-300 text-emerald-700" : "border-black/10"}`}>
                    {c.is_open ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {c.is_open ? "Open" : "Closed"}
                  </button>
                  <button onClick={() => togglePublished(c)} className={`text-xs px-3 py-1.5 rounded-full border ${c.results_published ? "border-gold text-gold-deep" : "border-black/10"}`}>
                    {c.results_published ? "Results public" : "Results hidden"}
                  </button>
                  <button onClick={() => { setForm({ ...c, parent_id: c.parent_id || "" }); setEditingId(c.id); }} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-ink/45">No categories yet — create your first one.</p>}
        </div>
      </div>

      {managing && <NomineesPanel category={managing} onClose={() => { setManaging(null); load(); }} />}
    </div>
  );
}

function NomineesPanel({ category, onClose }: { category: any; onClose: () => void }) {
  const [nominees, setNominees] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY_NOMINEE);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const [{ data: n }, { data: r }] = await Promise.all([
      supabase.from("gala_nominees").select("*").eq("category_id", category.id).order("sort_order", { ascending: true }),
      supabase.rpc("get_category_results", { _category_id: category.id }),
    ]);
    setNominees(n || []);
    setResults(r || []);
  }
  useEffect(() => { load(); }, [category.id]);

  async function addNominee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("gala_nominees").insert({ category_id: category.id, name: form.name, bio: form.bio || null });
    setForm(EMPTY_NOMINEE);
    setSaving(false);
    load();
  }

  async function removeNominee(id: string) {
    if (!confirm("Remove this nominee and their votes?")) return;
    const supabase = createClient();
    await supabase.from("gala_nominees").delete().eq("id", id);
    load();
  }

  const totalVotes = results.reduce((sum, r) => sum + Number(r.vote_count), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-cream rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <h2 className="font-display text-xl">{category.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="size-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          <form onSubmit={addNominee} className="flex gap-2">
            <input required placeholder="Nominee name" value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
              className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <button type="submit" disabled={saving} className="btn-gold !py-2 !px-4 disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </button>
          </form>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-gold-deep" />
              <p className="text-sm font-semibold">Live tally {category.results_published && <span className="text-emerald-600 text-xs">(public)</span>}</p>
            </div>
            <div className="space-y-2">
              {nominees.map((n) => {
                const r = results.find((x) => x.nominee_id === n.id);
                const count = r ? Number(r.vote_count) : 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return (
                  <div key={n.id} className="rounded-lg bg-white border border-black/5 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm">{n.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gold-deep">{count} votes</span>
                        <button onClick={() => removeNominee(n.id)} className="text-red-500 hover:text-red-700"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full bg-gold-foil" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {nominees.length === 0 && <p className="text-sm text-ink/40">No nominees added yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
