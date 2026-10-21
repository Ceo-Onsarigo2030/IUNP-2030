"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, ImageIcon, Film, Link2, Loader2, Trash2, UploadCloud, Plus } from "lucide-react";

const BUCKET = "campaign-media";
const MAX_MB = 25;

type Item = { name: string; url: string; size: number; kind: "image" | "video" | "doc" };

const kindOf = (name: string): Item["kind"] =>
  /\.(png|jpe?g|webp|gif)$/i.test(name) ? "image" : /\.mp4$/i.test(name) ? "video" : "doc";

const prettyName = (stored: string) => stored.replace(/^\d{10,}-/, "");
const niceLabel = (stored: string) =>
  prettyName(stored).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** HTML snippets styled to sit inside the dark invitation card. */
function snippetFor(item: Item, label: string) {
  if (item.kind === "image") {
    return `<p style="margin:18px 0;"><img src="${item.url}" alt="${label.replace(/"/g, "&quot;")}" width="536" style="width:100%;max-width:536px;height:auto;border-radius:10px;display:block;"></p>`;
  }
  const icon = item.kind === "video" ? "&#9654;" : "&#128196;";
  return `<p style="margin:18px 0;"><a href="${item.url}" style="display:inline-block;background:#C9A227;color:#0A0A0B;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">${icon} ${label.replace(/</g, "&lt;")}</a></p>`;
}

/**
 * Upload programmes (PDF), posters/images or videos and drop a download button / image into the
 * email. Files are LINKED, not attached: attaching a 3 MB PDF to 1,500 emails is slow, often lands in
 * spam, and Resend's bulk endpoint doesn't support attachments. A link is instant and always the latest file.
 */
export function CampaignMedia({ onInsert }: { onInsert: (html: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.storage.from(BUCKET).list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const rows = (data || []).filter((f) => f.name && f.id);
    setItems(
      rows.map((f) => ({
        name: f.name,
        url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
        size: Number((f.metadata as any)?.size || 0),
        kind: kindOf(f.name),
      }))
    );
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) { setMsg(`That file is over ${MAX_MB} MB. Compress it first (for PDFs, try a "reduce size" tool).`); return; }
    setBusy(true);
    setMsg(null);
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
    const { error } = await createClient().storage.from(BUCKET).upload(`${Date.now()}-${safe}`, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) { setMsg(error.message.includes("mime") ? "That file type isn't allowed. Use PDF, PNG, JPG, WEBP, GIF, MP4, DOCX or PPTX." : error.message); return; }
    setMsg("Uploaded ✓ — now press Insert next to it.");
    load();
  }

  async function remove(name: string) {
    if (!confirm("Delete this file? Emails already sent that link to it will stop working.")) return;
    await createClient().storage.from(BUCKET).remove([name]);
    load();
  }

  const Icon = ({ k }: { k: Item["kind"] }) => (k === "image" ? <ImageIcon className="size-4" /> : k === "video" ? <Film className="size-4" /> : <FileText className="size-4" />);

  return (
    <div className="card-elegant p-5 space-y-3">
      <div>
        <h2 className="font-display text-lg">Programme &amp; media files</h2>
        <p className="text-xs text-ink/55 mt-0.5">Upload a PDF programme, poster or video, then insert a download button or image into your email.</p>
      </div>
      <input ref={fileRef} type="file" hidden onChange={upload} accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.docx,.pptx" />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full rounded-lg border-2 border-dashed border-gold/50 py-4 text-sm text-ink/70 hover:bg-gold/5 flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Upload a file (PDF, image, video — up to {MAX_MB} MB)
      </button>
      {msg && <p className="text-xs text-ink/70">{msg}</p>}
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-xs text-ink/40">No files yet.</li>}
        {items.map((it) => {
          const label = labels[it.name] ?? (it.kind === "image" ? niceLabel(it.name) : it.kind === "video" ? "Watch the video" : `Download the ${niceLabel(it.name)}`);
          return (
            <li key={it.name} className="rounded-lg border border-black/10 bg-white p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Icon k={it.kind} />
                <span className="truncate flex-1" title={prettyName(it.name)}>{prettyName(it.name)}</span>
                <span className="text-[11px] text-ink/40 shrink-0">{it.size ? `${(it.size / 1024 / 1024).toFixed(1)} MB` : ""}</span>
              </div>
              {it.kind !== "image" && (
                <input value={label} onChange={(e) => setLabels((l) => ({ ...l, [it.name]: e.target.value }))} className="w-full rounded-md border border-black/10 px-2 py-1.5 text-xs" aria-label="Button text" />
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onInsert(snippetFor(it, label))} className="text-xs px-3 py-1.5 rounded-full bg-gold-foil text-ink shadow-gold flex items-center gap-1">
                  <Plus className="size-3" /> {it.kind === "image" ? "Insert image" : "Insert button"}
                </button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(it.url); setMsg("Link copied."); }} className="text-xs px-3 py-1.5 rounded-full border border-black/15 flex items-center gap-1"><Link2 className="size-3" /> Copy link</button>
                <button type="button" onClick={() => remove(it.name)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
