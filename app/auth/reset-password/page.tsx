"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Previously the page just called supabase.auth.updateUser({ password }) with no
  // session set up at all — the reset link Supabase emails contains a one-time
  // `code` query param, not an active login. Without exchanging that code for a
  // real session first, updateUser() had nothing to update and failed every time,
  // which is exactly why the email arrived but resetting never actually worked.
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");

    async function establishSession() {
      if (!code) {
        // Some Supabase configurations deliver the token as a URL hash fragment
        // instead of a ?code= query param — the client SDK auto-detects that on
        // load, so give it a brief moment before deciding the link is invalid.
        const { data } = await supabase.auth.getSession();
        setSessionState(data.session ? "ready" : "invalid");
        return;
      }
      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
      setSessionState(exchangeErr ? "invalid" : "ready");
    }

    establishSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) return setError(updateErr.message);
    setDone(true);
    setTimeout(() => router.push("/auth"), 1800);
  }

  return (
    <div className="min-h-[calc(100vh-140px)] surface-ink flex items-center py-14">
      <div className="container max-w-md">
        <div className="card-elegant p-8">
          <h1 className="heading-display text-2xl mb-2">Set a new password</h1>
          <p className="text-sm text-ink/55 mb-6">This link is single-use and expires for your security.</p>

          {sessionState === "checking" && (
            <div className="flex items-center gap-2 text-sm text-ink/50 py-4">
              <Loader2 className="size-4 animate-spin" /> Verifying your reset link…
            </div>
          )}

          {sessionState === "invalid" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                This reset link has expired or was already used. Request a new one to continue.
              </div>
              <Link href="/auth/forgot-password" className="btn-gold w-full !py-3.5 inline-flex items-center justify-center">
                Request a new reset link
              </Link>
            </div>
          )}

          {sessionState === "ready" && (done ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="size-4 mt-0.5 shrink-0" /> Password updated — redirecting you to log in.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" /> {error}
                </div>
              )}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/35" />
                <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password" className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-3 text-sm focus:border-gold outline-none" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/35" />
                <input required type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password" className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-3 text-sm focus:border-gold outline-none" />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full !py-3.5 disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
