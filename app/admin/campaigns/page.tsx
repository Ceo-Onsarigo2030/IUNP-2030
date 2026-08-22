"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Send, Trash2 } from "lucide-react";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [form, setForm] = useState({ subject: "", body_html: "" });
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data || []);
  }
  useEffect(() => { load(); }, []);

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    await supabase.from("email_campaigns").insert(form);
    setForm({ subject: "", body_html: "" });
    load();
  }

  async function send(id: string) {
    if (!confirm("Send this campaign to all registered members now?")) return;
    setSending(id);
    setResult(null);
    try {
      const res = await fetch("/api/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id }) });
      const data = await res.json().catch(() => ({}));
      setResult({
        id,
        ok: res.ok,
        message: res.ok ? `Sent to ${data.sent} member(s).` : data.error || "Sending failed for an unknown reason — check Vercel logs.",
      });
    } catch {
      // Network failure or a non-JSON error page — still surface SOMETHING rather
      // than leaving the admin wondering if it worked.
      setResult({ id, ok: false, message: "Couldn't reach the server. Check your connection and try again." });
    }
    setSending(null);
    load();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("email_campaigns").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Email Campaigns</h1>
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
        <form onSubmit={saveDraft} className="card-elegant p-6 space-y-3 h-fit">
          <h2 className="font-display text-lg mb-1">New campaign</h2>
          <input required placeholder="Subject line" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          <textarea required rows={8} placeholder="HTML email body" value={form.body_html} onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm font-mono resize-none" />
          <button type="submit" className="btn-gold w-full !py-3">Save draft</button>
        </form>

        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="card-elegant p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg mb-1">{c.subject}</h3>
                  <p className="text-xs text-ink/50">{c.status === "sent" ? `Sent ${new Date(c.sent_at).toLocaleString()}` : "Draft"}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {c.status !== "sent" && (
                    <button onClick={() => send(c.id)} disabled={sending === c.id} className="text-xs px-3 py-1.5 rounded-full bg-gold-foil text-ink shadow-gold flex items-center gap-1 disabled:opacity-60">
                      {sending === c.id ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Send to all
                    </button>
                  )}
                  <button onClick={() => remove(c.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
                </div>
              </div>
              {result && result.id === c.id && (
                <p className={`mt-3 text-sm rounded-lg p-3 ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{result.message}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
