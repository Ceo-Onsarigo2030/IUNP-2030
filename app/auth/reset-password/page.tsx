"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

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

          {done ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
