"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/utils";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export default function MfaChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-140px)] surface-ink" />}>
      <MfaChallenge />
    </Suspense>
  );
}

function MfaChallenge() {
  const router = useRouter();
  const params = useSearchParams();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp?.[0]; // verified TOTP factors only
      if (!factor) {
        // Nothing enrolled — nothing to verify. Admins are pushed to set it up by the middleware.
        router.replace(safeRedirect(params.get("redirect")));
        return;
      }
      setFactorId(factor.id);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") });
    if (err) {
      setError("That code didn't work. Check the 6-digit code in your authenticator app and try again.");
      setCode("");
      setLoading(false);
      return;
    }
    router.push(safeRedirect(params.get("redirect"), "/admin"));
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-140px)] surface-ink flex items-center py-14">
      <div className="container max-w-md">
        <div className="card-elegant p-8">
          <div className="size-12 rounded-xl bg-gold-foil flex items-center justify-center shadow-gold mb-5">
            <ShieldCheck className="size-6 text-ink" />
          </div>
          <h1 className="heading-display text-2xl mb-2">Two-step verification</h1>
          <p className="text-sm text-ink/55 mb-6">Open your authenticator app and enter the 6-digit code for UniNexus Connect.</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="size-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {!ready ? (
            <p className="text-sm text-ink/50 flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> One moment…</p>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full rounded-lg border border-black/10 px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono focus:border-gold outline-none"
              />
              <button type="submit" disabled={loading || code.replace(/\s/g, "").length !== 6} className="btn-gold w-full !py-3.5 disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify and continue"}
              </button>
            </form>
          )}
          <button onClick={signOut} className="mt-5 text-xs text-ink/45 hover:text-ink underline w-full text-center">Sign out</button>
        </div>
      </div>
    </div>
  );
}
