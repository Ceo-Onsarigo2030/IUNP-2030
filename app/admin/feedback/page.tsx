"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star, Trash2, CheckCircle2 } from "lucide-react";

export default function AdminFeedbackPage() {
  const [entries, setEntries] = useState<any[]>([]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("feedback_entries").select("*").order("created_at", { ascending: false });
    setEntries(data || []);
  }
  useEffect(() => { load(); }, []);

  async function togglePin(e: any) {
    const pinnedInKind = entries.filter((x) => x.kind === e.kind && x.is_pinned).length;
    if (!e.is_pinned && pinnedInKind >= 2) return alert(`Only two ${e.kind} entries can be pinned. Unpin one first.`);
    const supabase = createClient();
    await supabase.from("feedback_entries").update({ is_pinned: !e.is_pinned }).eq("id", e.id);
    load();
  }

  async function toggleApprove(e: any) {
    const supabase = createClient();
    await supabase.from("feedback_entries").update({ is_approved: !e.is_approved }).eq("id", e.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const supabase = createClient();
    await supabase.from("feedback_entries").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Feedback &amp; Suggestion Wall</h1>
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="card-elegant p-5 flex items-start justify-between gap-4">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {e.is_pinned && <Star className="size-3.5 text-gold fill-gold" />}
                <span className="text-xs uppercase tracking-wider text-gold-deep">{e.kind}</span>
                {!e.is_approved && <span className="text-xs text-red-500">Hidden</span>}
              </div>
              <p className="text-sm text-ink/75 mb-1">&ldquo;{e.message}&rdquo;</p>
              <p className="text-xs text-ink/45">{e.name}{e.institution ? ` · ${e.institution}` : ""}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => toggleApprove(e)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> {e.is_approved ? "Hide" : "Approve"}
              </button>
              <button onClick={() => togglePin(e)} className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-deep hover:bg-gold/10">{e.is_pinned ? "Unpin" : "Pin"}</button>
              <button onClick={() => remove(e.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-ink/45">No entries yet.</p>}
      </div>
    </div>
  );
}
