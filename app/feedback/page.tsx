"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Quote, Send, Loader2, CheckCircle2 } from "lucide-react";

type Kind = "feedback" | "suggestion";

export default function FeedbackPage() {
  const [tab, setTab] = useState<Kind>("feedback");
  const [entries, setEntries] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", institution: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("feedback_entries")
      .select("*")
      .eq("kind", tab)
      .eq("is_approved", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setEntries(data || []));
  }, [tab]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: tab, ...form }),
    });
    setStatus("done");
    if (res.ok) setForm({ name: "", institution: "", message: "" });
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="surface-ink min-h-screen">
      <section className="py-16 sm:py-20 text-center">
        <div className="container">
          <p className="eyebrow mb-3">Your voice</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">Talk to us. Tell us what&apos;s next.</h1>
          <p className="mt-3 text-cream/55">Two walls. One conversation.</p>

          <div className="inline-flex mt-8 rounded-full border border-gold/25 p-1">
            {(["feedback", "suggestion"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-semibold transition-colors capitalize",
                  tab === k ? "bg-gold-foil text-ink shadow-gold" : "text-cream/60"
                )}
              >
                {k} Wall
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container pb-20 grid lg:grid-cols-[1fr_1.3fr] gap-8">
        <div className="card-elegant p-7 h-fit">
          <h2 className="font-display text-xl mb-4">Share your {tab}</h2>
          {status === "done" ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm py-4">
              <CheckCircle2 className="size-4" /> Thank you — your {tab} was received.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none" />
              <input placeholder="University (optional)" value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                className="w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none" />
              <textarea required rows={4} placeholder="Share your story, ideas or feedback…" value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none resize-none" />
              <button type="submit" disabled={status === "loading"} className="btn-gold w-full !py-3 disabled:opacity-60">
                {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <>Submit <Send className="size-4" /></>}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {entries.length === 0 && <p className="text-cream/45 text-sm">No entries yet on this wall.</p>}
          {entries.map((f) => (
            <div key={f.id} className="rounded-xl2 bg-white/5 border border-gold/15 p-6">
              {f.is_pinned && <span className="eyebrow !text-gold">Pinned</span>}
              <Quote className="size-5 text-gold/50 mt-2 mb-2" />
              <p className="text-cream/80 leading-relaxed mb-4">&ldquo;{f.message}&rdquo;</p>
              <p className="text-sm font-semibold text-gold">{f.name}</p>
              {f.institution && <p className="text-xs text-cream/45">{f.institution}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
