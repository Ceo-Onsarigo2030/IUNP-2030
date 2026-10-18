"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Send, Trash2, MailCheck, CalendarPlus } from "lucide-react";
import { buildInvitationHtml, formatEventWhen } from "@/lib/email-templates";
import { personalize } from "@/lib/email";

const SITE = typeof window !== "undefined" ? window.location.origin : "";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ subject: "", body_html: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; message: string; ok: boolean } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dinner, setDinner] = useState("");

  async function load() {
    const supabase = createClient();
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("id, title, slug, venue, starts_at, status").neq("status", "draft").order("starts_at", { ascending: false }).limit(30),
    ]);
    setCampaigns(c || []);
    setEvents(e || []);
  }
  useEffect(() => { load(); }, []);

  function applyEventTemplate(eventId: string) {
    const ev = events.find((x) => x.id === eventId);
    if (!ev) return;
    const dateText = formatEventWhen(ev.starts_at); // always Kenya time, e.g. "… · 6:00 PM (18:00)"
    setForm({
      subject: `You're invited: ${ev.title}`,
      body_html: buildInvitationHtml({ title: ev.title, dateText, venue: ev.venue, link: `${SITE}/programs/${ev.slug}`, dinnerText: dinner.trim() || undefined }),
    });
  }

  function applyBlankInvitation() {
    setForm({
      subject: "You're invited to UniNexus Connect",
      body_html: buildInvitationHtml({ title: "Event name", dateText: "Date and time", venue: "Venue", link: `${SITE}/programs`, dinnerText: dinner.trim() || undefined }),
    });
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase.from("email_campaigns").insert(form);
    if (error) { setSaveError(error.message); return; }
    setForm({ subject: "", body_html: "" });
    load();
  }

  async function call(id: string, testOnly: boolean) {
    setBusy(`${testOnly ? "test" : "send"}:${id}`);
    setResult(null);
    try {
      const res = await fetch("/api/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, testOnly }) });
      const data = await res.json().catch(() => ({}));
      let message: string;
      if (!res.ok) {
        message = data.error || "Sending failed for an unknown reason — check Vercel logs.";
      } else if (data.test) {
        message = `Test email sent to ${data.to}. Check your inbox (and spam) to see exactly how members will receive it.`;
      } else if (data.done) {
        message = `Done — delivered to ${data.sent.toLocaleString()} people.${data.skippedInvalid ? ` ${data.skippedInvalid} saved address(es) were invalid and skipped.` : ""}${data.rejected?.length ? ` Rejected by Resend: ${data.rejected.join(", ")}.` : ""}`;
      } else {
        message = `Progress: ${(data.total - data.remaining).toLocaleString()} of ${data.total.toLocaleString()} processed. Press "Continue sending" to send the rest.`;
      }
      setResult({ id, ok: res.ok, message });
    } catch {
      setResult({ id, ok: false, message: "Couldn't reach the server. Check your connection and try again." });
    }
    setBusy(null);
    load();
  }

  async function send(id: string) {
    if (!confirm("Send this campaign to all members and newsletter subscribers now? Tip: send yourself a test first.")) return;
    call(id, false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await createClient().from("email_campaigns").delete().eq("id", id);
    load();
  }

  const preview = useMemo(() => personalize(form.body_html, "Amina Wanjiru", true), [form.body_html]);

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-2">Email Campaigns</h1>
      <p className="text-sm text-ink/55 mb-8 max-w-2xl">
        Sent individually to every member and active newsletter subscriber. Use <code className="font-mono text-xs bg-black/5 px-1 rounded">{"{{first_name}}"}</code> in the subject or body to greet each person by name.
      </p>
      <div className="grid xl:grid-cols-[1fr_1.2fr] gap-8">
        <div className="space-y-4">
          <form onSubmit={saveDraft} className="card-elegant p-6 space-y-3 h-fit">
            <h2 className="font-display text-lg mb-1">New campaign</h2>

            <div className="rounded-lg bg-gold/10 border border-gold/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-ink/70 flex items-center gap-1.5"><CalendarPlus className="size-3.5" /> Invitation template</p>
              <input value={dinner} onChange={(e) => setDinner(e.target.value)} placeholder="Extra line, e.g. Dinner will be served at 8:00 PM (optional)" className="w-full rounded-lg border border-black/10 px-2.5 py-2 text-sm bg-white" />
              <div className="flex flex-wrap gap-2">
                <select defaultValue="" onChange={(e) => { if (e.target.value) applyEventTemplate(e.target.value); e.target.value = ""; }} className="flex-1 min-w-[10rem] rounded-lg border border-black/10 px-2.5 py-2 text-sm bg-white">
                  <option value="">Fill from an event…</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                <button type="button" onClick={applyBlankInvitation} className="text-xs px-3 py-2 rounded-lg border border-black/10 bg-white hover:bg-black/[0.03]">Blank invitation</button>
              </div>
            </div>

            <input required placeholder="Subject line" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
            <textarea required rows={10} placeholder="HTML email body" value={form.body_html} onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-xs font-mono resize-y" />
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <button type="submit" className="btn-gold w-full !py-3">Save draft</button>
          </form>

          {form.body_html && (
            <div className="card-elegant p-4">
              <p className="text-xs font-semibold text-ink/60 mb-2">Preview (as &ldquo;Amina&rdquo; would see it)</p>
              <iframe title="Email preview" sandbox="" srcDoc={preview} className="w-full h-[480px] rounded-lg border border-black/10 bg-white" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {campaigns.length === 0 && <p className="text-sm text-ink/45">No campaigns yet — create one on the left.</p>}
          {campaigns.map((c) => {
            const sending = busy === `send:${c.id}`;
            const testing = busy === `test:${c.id}`;
            return (
              <div key={c.id} className="card-elegant p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg mb-1 break-words">{c.subject}</h3>
                    <p className="text-xs text-ink/50">
                      {c.status === "sent"
                        ? `Sent ${new Date(c.sent_at).toLocaleString()} · ${Math.max(0, (c.sent_count || 0) - (c.skipped_count || 0)).toLocaleString()} delivered`
                        : c.status === "sending"
                        ? `In progress — ${(c.sent_count || 0).toLocaleString()} processed so far`
                        : "Draft"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => call(c.id, true)} disabled={!!busy} className="text-xs px-3 py-1.5 rounded-full border border-black/15 hover:bg-black/[0.03] flex items-center gap-1 disabled:opacity-60">
                      {testing ? <Loader2 className="size-3 animate-spin" /> : <MailCheck className="size-3" />} Send test to me
                    </button>
                    {c.status !== "sent" && (
                      <button onClick={() => send(c.id)} disabled={!!busy} className="text-xs px-3 py-1.5 rounded-full bg-gold-foil text-ink shadow-gold flex items-center gap-1 disabled:opacity-60">
                        {sending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} {c.status === "sending" ? "Continue sending" : "Send to all"}
                      </button>
                    )}
                    <button onClick={() => remove(c.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>
                  </div>
                </div>
                {result && result.id === c.id && (
                  <p className={`mt-3 text-sm rounded-lg p-3 ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{result.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
