"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Trash2, Copy, Eye, EyeOff, BarChart3, X, ImagePlus, Film, Link2 } from "lucide-react";

const EMPTY_CATEGORY = { name: "", slug: "", description: "", parent_id: "" };
const EMPTY_NOMINEE = { name: "", bio: "" };
const MAX_NOMINEE_MEDIA = 6;

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

  function copyGeneralLink() {
    const url = `${location.origin}/gala`;
    navigator.clipboard.writeText(url);
    alert(`Copied general voting link (all categories): ${url}`);
  }

  const topLevelOptions = categories.filter((c) => !c.parent_id);

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-1">UniNexus Gala Awards Voting</h1>
      <p className="text-xs text-gold-deep uppercase tracking-widest mb-2">Season 1</p>
      <p className="text-sm text-ink/50 mb-4">Create categories and subcategories, add nominees, then open voting and share each link.</p>
      <button onClick={copyGeneralLink} className="mb-8 text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10 flex items-center gap-1.5">
        <Link2 className="size-3.5" /> Copy general voting link (all categories)
      </button>

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
  const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [mediaNominee, setMediaNominee] = useState<any | null>(null);

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

  async function saveNominee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    if (editingNomineeId) {
      await supabase.from("gala_nominees").update({ name: form.name, bio: form.bio || null }).eq("id", editingNomineeId);
    } else {
      await supabase.from("gala_nominees").insert({ category_id: category.id, name: form.name, bio: form.bio || null });
    }
    setForm(EMPTY_NOMINEE);
    setEditingNomineeId(null);
    setSaving(false);
    load();
  }

  async function removeNominee(id: string) {
    if (!confirm("Remove this nominee and their votes?")) return;
    const supabase = createClient();
    await supabase.from("gala_nominees").delete().eq("id", id);
    load();
  }

  async function uploadProfilePhoto(nominee: any, file: File) {
    setUploadingPhotoFor(nominee.id);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `profiles/${nominee.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("gala-media").upload(path, file, { upsert: true });
    if (!uploadErr) {
      const { data: pub } = supabase.storage.from("gala-media").getPublicUrl(path);
      await supabase.from("gala_nominees").update({ photo_url: pub.publicUrl }).eq("id", nominee.id);
    }
    setUploadingPhotoFor(null);
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
          <form onSubmit={saveNominee} className="space-y-2">
            <input required placeholder="Nominee name" value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <textarea rows={2} placeholder="Short description (one line, shown with a Read more button)" value={form.bio}
              onChange={(e) => setForm((f: any) => ({ ...f, bio: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm resize-none" />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-gold !py-2 !px-4 disabled:opacity-60 flex-1">
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingNomineeId ? "Save changes" : <><Plus className="size-4" /> Add nominee</>}
              </button>
              {editingNomineeId && (
                <button type="button" onClick={() => { setForm(EMPTY_NOMINEE); setEditingNomineeId(null); }} className="text-xs px-4 rounded-lg border border-black/10">
                  Cancel
                </button>
              )}
            </div>
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
                    <div className="flex items-center gap-3 mb-2">
                      <label className="relative shrink-0 size-11 rounded-full overflow-hidden bg-black/5 border border-black/10 cursor-pointer">
                        {n.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={n.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-[9px] text-ink/40 text-center">Photo</span>
                        )}
                        {uploadingPhotoFor === n.id && (
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="size-3.5 animate-spin text-white" />
                          </span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadProfilePhoto(n, file);
                        }} />
                      </label>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm block truncate">{n.name}</span>
                        {n.bio && <span className="text-xs text-ink/45 block truncate">{n.bio}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-gold-deep">{count} votes</span>
                        <button onClick={() => setMediaNominee(n)} title="Photos & videos of what they do" className="text-gold-deep hover:text-gold"><ImagePlus className="size-4" /></button>
                        <button onClick={() => { setForm({ name: n.name, bio: n.bio || "" }); setEditingNomineeId(n.id); }} className="text-xs text-ink/50 hover:text-ink">Edit</button>
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

      {mediaNominee && <NomineeMediaPanel nominee={mediaNominee} onClose={() => setMediaNominee(null)} />}
    </div>
  );
}

function NomineeMediaPanel({ nominee, onClose }: { nominee: any; onClose: () => void }) {
  const [media, setMedia] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("gala_nominee_media").select("*").eq("nominee_id", nominee.id).order("sort_order", { ascending: true });
    setMedia(data || []);
  }
  useEffect(() => { load(); }, [nominee.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    if (media.length + files.length > MAX_NOMINEE_MEDIA) {
      setError(`You can have at most ${MAX_NOMINEE_MEDIA} media items per nominee (${media.length} already added).`);
      return;
    }

    setUploading(true);
    const supabase = createClient();

    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      const ext = file.name.split(".").pop();
      const path = `category-media/${nominee.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("gala-media").upload(path, file);
      if (uploadErr) {
        setError(uploadErr.message);
        continue;
      }

      const { data: pub } = supabase.storage.from("gala-media").getPublicUrl(path);
      await supabase.from("gala_nominee_media").insert({
        nominee_id: nominee.id,
        media_url: pub.publicUrl,
        media_type: isVideo ? "video" : "image",
        sort_order: media.length,
      });
    }

    setUploading(false);
    load();
  }

  async function removeMedia(item: any) {
    if (!confirm("Remove this media item?")) return;
    const supabase = createClient();
    await supabase.from("gala_nominee_media").delete().eq("id", item.id);
    const marker = "/object/public/gala-media/";
    const idx = item.media_url.indexOf(marker);
    if (idx !== -1) await supabase.storage.from("gala-media").remove([item.media_url.slice(idx + marker.length)]);
    load();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-cream rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="font-display text-lg">{nominee.name} — What they do</h2>
            <p className="text-xs text-ink/50">{media.length}/{MAX_NOMINEE_MEDIA} photos &amp; videos for this category · optional</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="size-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold/30 p-6 text-center cursor-pointer hover:bg-gold/5 transition-colors ${media.length >= MAX_NOMINEE_MEDIA ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 className="size-6 animate-spin text-gold-deep" /> : <ImagePlus className="size-6 text-gold-deep" />}
            <span className="text-sm text-ink/60">{uploading ? "Uploading…" : "Upload photos or videos of what they do in this category"}</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} disabled={media.length >= MAX_NOMINEE_MEDIA || uploading} />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((m) => (
              <div key={m.id} className="relative rounded-lg overflow-hidden border border-black/10 bg-black/5 aspect-square group">
                {m.media_type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/80 text-cream/70"><Film className="size-8" /></div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                )}
                <button onClick={() => removeMedia(m)} className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {media.length === 0 && <p className="col-span-full text-sm text-ink/40 text-center py-4">No media added yet — this is optional.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
