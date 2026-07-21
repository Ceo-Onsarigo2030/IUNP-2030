"use client";

import { useState } from "react";
import { Loader2, BellRing } from "lucide-react";

export default function AdminPushPage() {
  const [form, setForm] = useState({ title: "", message: "", url: "/" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(res.ok ? `Sent to ${data.sent} subscribers.` : data.error);
    setSending(false);
  }

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Push Notifications</h1>
      <form onSubmit={handleSend} className="card-elegant p-6 space-y-3 max-w-lg">
        <input required placeholder="Notification title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
        <textarea required rows={3} placeholder="Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
        <input placeholder="Link (optional)" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
        <button type="submit" disabled={sending} className="btn-gold w-full !py-3 disabled:opacity-60">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <><BellRing className="size-4" /> Send to all subscribers</>}
        </button>
        {result && <p className="text-sm text-ink/60">{result}</p>}
      </form>
    </div>
  );
}
