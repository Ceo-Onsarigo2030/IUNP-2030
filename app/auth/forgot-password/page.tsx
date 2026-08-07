"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    });
    // Always show success — never reveal whether an email is registered.
    setDone(true);
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-140px)] surface-ink flex items-center py-14">
      <div className="container max-w-md">
        <div className="card-elegant p-8">
          <h1 className="heading-display text-2xl mb-2">Reset your password</h1>
          <p className="text-sm text-ink/55 mb-6">
            Enter the email on your UniNexus membership. If it&apos;s registered, we&apos;ll send a secure reset link that expires shortly.
          </p>

          {done ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              If that email is registered, a reset link is on its way.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/35" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-3 text-sm focus:border-gold outline-none"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full !py-3.5 disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
