"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, BellRing } from "lucide-react";

export default function AdminPushPage() {
  const [form, setForm] = useState({ title: "", message: "", url: "/" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<number | null>(null);

  useEffect(() => {
    createClient().from("push_subscriptions").select("id", { count: "exact", head: true }).then(({ count }) => setSubscribers(count ?? 0));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setResult(data.error || "Sending failed for an unknown reason — check Vercel logs.");
      else if (data.note) setResult(data.note);
      else setResult(`Sent to ${data.sent} subscriber(s).${data.failed ? ` ${data.failed} failed.` : ""}`);
    } catch {
      setResult("Couldn't reach the server. Check your connection and try again.");
    }
    setSending(false);
  }

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-2">Push Notifications</h1>
      <p className="text-sm text-ink/55 mb-6 max-w-lg">
        {subscribers === null
          ? "Checking subscribers…"
          : subscribers === 0
          ? "No one has turned on notifications yet. Visitors are now invited by a pop-up on the public site and a link in the footer — alerts can only reach people who tap Turn on. Open the site on your own phone, turn it on, then send a test here."
          : `${subscribers.toLocaleString()} device${subscribers === 1 ? "" : "s"} will receive your message.`}
      </p>
      <form onSubmit={handleSend} className="card-elegant p-6 space-y-3 max-w-lg">
        <input required placeholder="Notification title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
        <textarea required rows={3} placeholder="Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
        <input placeholder="Link (optional)" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
        <button type="submit" disabled={sending || subscribers === 0} className="btn-gold w-full !py-3 disabled:opacity-60">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <><BellRing className="size-4" /> Send to all subscribers</>}
        </button>
        {result && <p className="text-sm text-ink/60">{result}</p>}
      </form>
    </div>
  );
}
