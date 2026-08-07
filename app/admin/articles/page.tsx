"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Star, Trash2, Eye, EyeOff, ImagePlus, X, Film } from "lucide-react";

const EMPTY = { title: "", slug: "", excerpt: "", body: "", comments_enabled: true };
const MAX_MEDIA = 8;

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaArticle, setMediaArticle] = useState<any | null>(null);
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
          {!editingId && (
            <p className="text-[11px] text-ink/40 text-center">Create the draft first, then open &quot;Media&quot; on it to add photos/videos.</p>
          )}
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
                <p className="text-xs text-ink/50">{a.published_at ? "Published" : "Draft"} · Comments {a.comments_enabled ? "on" : "off"} · {a.like_count || 0} likes</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => togglePublish(a)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 flex items-center gap-1">
                  {a.published_at ? <EyeOff className="size-3" /> : <Eye className="size-3" />} {a.published_at ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => togglePin(a)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10">{a.is_pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => setMediaArticle(a)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10 flex items-center gap-1">
                  <ImagePlus className="size-3" /> Media
                </button>
                <button onClick={() => { setForm(a); setEditingId(a.id); }} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5">Edit</button>
                <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {mediaArticle && <MediaPanel article={mediaArticle} onClose={() => setMediaArticle(null)} />}
    </div>
  );
}

function MediaPanel({ article, onClose }: { article: any; onClose: () => void }) {
  const [media, setMedia] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("article_media").select("*").eq("article_id", article.id).order("sort_order", { ascending: true });
    setMedia(data || []);
  }
  useEffect(() => { load(); }, [article.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    if (media.length + files.length > MAX_MEDIA) {
      setError(`You can have at most ${MAX_MEDIA} media items on an article (${media.length} already added).`);
      return;
    }

    setUploading(true);
    const supabase = createClient();

    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      const ext = file.name.split(".").pop();
      const path = `${article.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("article-media").upload(path, file);
      if (uploadErr) {
        setError(uploadErr.message);
        continue;
      }

      const { data: pub } = supabase.storage.from("article-media").getPublicUrl(path);
      await supabase.from("article_media").insert({
        article_id: article.id,
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
    await supabase.from("article_media").delete().eq("id", item.id);
    // Best-effort storage cleanup — the object's path is the part of the public URL after the bucket name.
    const marker = "/object/public/article-media/";
    const idx = item.media_url.indexOf(marker);
    if (idx !== -1) {
      const path = item.media_url.slice(idx + marker.length);
      await supabase.storage.from("article-media").remove([path]);
    }
    load();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-cream rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="font-display text-xl">{article.title} — Media</h2>
            <p className="text-xs text-ink/50">{media.length}/{MAX_MEDIA} photos &amp; videos · optional</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X className="size-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold/30 p-8 text-center cursor-pointer hover:bg-gold/5 transition-colors ${media.length >= MAX_MEDIA ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 className="size-6 animate-spin text-gold-deep" /> : <ImagePlus className="size-6 text-gold-deep" />}
            <span className="text-sm text-ink/60">{uploading ? "Uploading…" : "Click to upload photos or videos (up to 8 total)"}</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} disabled={media.length >= MAX_MEDIA || uploading} />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((m) => (
              <div key={m.id} className="relative rounded-lg overflow-hidden border border-black/10 bg-black/5 aspect-square group">
                {m.media_type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/80 text-cream/70">
                    <Film className="size-8" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeMedia(m)}
                  className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
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
