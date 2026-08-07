"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, Mail, AlertCircle } from "lucide-react";

export default function AdminSettingsPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("site_settings").select("value").eq("key", "marquee_text").maybeSingle()
      .then(
        ({ data }) => setText(data?.value || ""),
        () => setText("")
      );
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("site_settings").upsert({ key: "marquee_text", value: text });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function sendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      setTestResult(await res.json());
    } catch (err: any) {
      setTestResult({ ok: false, diagnosis: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-8 sm:p-10 space-y-8">
      <h1 className="heading-display text-3xl">Site Settings</h1>
      <form onSubmit={handleSave} className="card-elegant p-6 max-w-lg space-y-3">
        <label className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Homepage moving message</label>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
        <button type="submit" disabled={saving} className="btn-gold !py-3 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <><CheckCircle2 className="size-4" /> Saved</> : "Update marquee"}
        </button>
      </form>

      <div className="card-elegant p-6 max-w-lg space-y-3">
        <div className="flex items-center gap-2 text-gold-deep mb-1">
          <Mail className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Test email delivery</span>
        </div>
        <p className="text-xs text-ink/50">
          Sends a real email right now using your live Resend settings, and shows you the exact result — use this to confirm gate passes and campaigns will actually arrive.
        </p>
        <form onSubmit={sendTestEmail} className="flex gap-2">
          <input
            required
            type="email"
            placeholder="your@email.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="flex-1 rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <button type="submit" disabled={testing} className="btn-gold !py-2.5 !px-4 disabled:opacity-60">
            {testing ? <Loader2 className="size-4 animate-spin" /> : "Send test"}
          </button>
        </form>

        {testResult && (
          <div className={`rounded-lg p-3 text-xs space-y-1 border ${testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            <p className="flex items-center gap-1.5 font-semibold">
              {testResult.ok ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
              {testResult.ok ? "Sent successfully!" : "Failed"}
            </p>
            {testResult.fromEmailUsed && <p>From: {testResult.fromEmailUsed}</p>}
            {testResult.diagnosis && <p>{testResult.diagnosis}</p>}
            {testResult.resendError && <pre className="whitespace-pre-wrap break-words">{JSON.stringify(testResult.resendError, null, 2)}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
