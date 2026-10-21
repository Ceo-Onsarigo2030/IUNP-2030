"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, HeartPulse, Mail } from "lucide-react";

type Check = { id: string; group: string; label: string; status: "ok" | "warn" | "fail"; detail: string };

const ICON = {
  ok: <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />,
  warn: <AlertTriangle className="size-5 text-amber-500 shrink-0" />,
  fail: <XCircle className="size-5 text-red-600 shrink-0" />,
};

export default function AdminHealthPage() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Health check failed");
      setChecks(data.checks);
      setAt(data.checkedAt);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);
  useEffect(() => { run(); }, [run]);

  async function testEmail() {
    setTestMsg("Sending…");
    const res = await fetch("/api/admin/test-email", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setTestMsg(res.ok ? `Test email sent to ${data.to} — check your inbox.` : data.error || "Failed.");
  }

  const groups = checks ? Array.from(new Set(checks.map((c) => c.group))) : [];
  const fails = checks?.filter((c) => c.status === "fail").length ?? 0;
  const warns = checks?.filter((c) => c.status === "warn").length ?? 0;

  return (
    <div className="p-6 sm:p-10 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <h1 className="heading-display text-3xl flex items-center gap-2"><HeartPulse className="size-7 text-gold-deep" /> System health</h1>
        <button onClick={run} disabled={loading} className="text-xs px-3 py-2 rounded-full border border-black/15 hover:bg-black/[0.03] flex items-center gap-1.5 disabled:opacity-60">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Re-check
        </button>
      </div>
      <p className="text-sm text-ink/55 mb-6">Live checks of the database, payments, email and protection. Secret values are never shown — only whether each is set.</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
      {!checks && !error && <p className="text-sm text-ink/50 flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Checking everything…</p>}

      {checks && (
        <>
          <div className={`mb-6 rounded-xl border p-4 text-sm font-medium ${fails ? "bg-red-50 border-red-200 text-red-700" : warns ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
            {fails ? `${fails} problem${fails === 1 ? "" : "s"} need fixing` : warns ? `Working — ${warns} thing${warns === 1 ? "" : "s"} to improve` : "Everything is healthy"}
            {at && <span className="block text-xs font-normal opacity-70 mt-0.5">Checked {new Date(at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })} (Kenya time)</span>}
          </div>
          {groups.map((g) => (
            <section key={g} className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-ink/45 mb-2">{g}</h2>
              <ul className="card-elegant divide-y divide-black/5">
                {checks.filter((c) => c.group === g).map((c) => (
                  <li key={c.id} className="flex items-start gap-3 p-4">
                    {ICON[c.status]}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-ink/60 mt-0.5 break-words">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="card-elegant p-4 flex items-center gap-3 flex-wrap">
            <Mail className="size-5 text-gold-deep" />
            <button onClick={testEmail} className="text-xs px-3 py-2 rounded-full bg-gold-foil text-ink shadow-gold">Send a test email to me</button>
            {testMsg && <span className="text-xs text-ink/65">{testMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
