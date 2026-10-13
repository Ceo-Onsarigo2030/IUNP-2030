"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldCheck, ShieldAlert, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminSecurityPage() {
  return (
    <Suspense fallback={<div className="p-8 sm:p-10" />}>
      <SecurityContent />
    </Suspense>
  );
}

function SecurityContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setEnrolled((data?.totp?.length ?? 0) > 0);
  }
  useEffect(() => { refresh(); }, []);

  async function startEnroll() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // Clear any half-finished setup from an earlier attempt, so enrolling never collides with it.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `UniNexus Admin ${Date.now()}` });
    if (err || !data) {
      setError(err?.message || "Couldn't start setup. Please try again.");
    } else {
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    }
    setLoading(false);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, "") });
    if (err) {
      setError("That code didn't match. Wait for the app to show a new code and try again.");
      setCode("");
      setLoading(false);
      return;
    }
    setDone(true);
    setEnroll(null);
    setEnrolled(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="p-8 sm:p-10 max-w-2xl">
      <h1 className="heading-display text-3xl mb-2">Security</h1>
      <p className="text-sm text-ink/55 mb-8">Two-step verification protects the admin panel even if your password is stolen.</p>

      {params.get("setup") && !enrolled && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <ShieldAlert className="size-4 mt-0.5 shrink-0" />
          Admin accounts must use two-step verification. Set it up below to unlock the rest of the admin panel.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="size-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {done && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" /> Two-step verification is now on. Use the sidebar to open the rest of the admin panel.
        </div>
      )}

      <div className="card-elegant p-6">
        {enrolled === null ? (
          <p className="text-sm text-ink/50 flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Checking…</p>
        ) : enrolled && !enroll ? (
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-medium">Two-step verification is ON for this account.</p>
              <p className="text-sm text-ink/55 mt-1">You&apos;ll be asked for a 6-digit code each time you log in. If you lose your phone, another admin or the Supabase dashboard (Authentication → Users → your user → remove factor) can reset it.</p>
            </div>
          </div>
        ) : enroll ? (
          <form onSubmit={confirm} className="space-y-5">
            <ol className="text-sm text-ink/70 space-y-1 list-decimal pl-5">
              <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).</li>
              <li>Scan this QR code with the app.</li>
              <li>Type the 6-digit code it shows, then press Confirm.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="Authenticator QR code" className="size-48 rounded-lg border border-black/10 bg-white p-2" />
            <p className="text-xs text-ink/50">Can&apos;t scan? Enter this key manually: <span className="font-mono select-all text-ink">{enroll.secret}</span></p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full max-w-xs rounded-lg border border-black/10 px-4 py-3 text-center text-xl tracking-[0.35em] font-mono focus:border-gold outline-none"
            />
            <div>
              <button type="submit" disabled={loading || code.replace(/\s/g, "").length !== 6} className="btn-gold !py-3 px-6 disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Confirm and turn on"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="font-medium mb-1">Two-step verification is OFF.</p>
            <p className="text-sm text-ink/55 mb-5">Takes about a minute with the authenticator app on your phone.</p>
            <button onClick={startEnroll} disabled={loading} className="btn-gold !py-3 px-6 disabled:opacity-60">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Set up two-step verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
