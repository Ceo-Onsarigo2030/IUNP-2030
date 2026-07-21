"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { MEMBER_CATEGORIES, type MemberCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Loader2, Mail, Lock, User, Building2, Accessibility, CheckCircle2, AlertCircle } from "lucide-react";

type Mode = "signup" | "login";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.4 2.8 12S6.9 21.8 12 21.8c6.9 0 9.4-4.8 9.4-7.3 0-.5 0-.9-.1-1.3H12Z" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [signupForm, setSignupForm] = useState({
    fullName: "",
    email: "",
    password: "",
    category: "" as MemberCategory | "",
    institutionName: "",
    hasDisability: false,
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!signupForm.category) {
      setError("Please choose one category to continue.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          data: {
            full_name: signupForm.fullName,
            category: signupForm.category,
            institution_name: signupForm.institutionName || null,
            has_disability: signupForm.hasDisability,
            signup_method: "form",
          },
        },
      });
      if (signErr) throw signErr;
      if (data.user && !data.session) {
        setSuccess("Check your email to confirm your account, then log in.");
      } else {
        router.push(searchParams.get("redirect") || "/dashboard");
      }
    } catch (err: any) {
      setError(mapAuthError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: loginErr } = await supabase.auth.signInWithPassword(loginForm);
      if (loginErr) throw loginErr;
      router.push(searchParams.get("redirect") || "/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(mapAuthError(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?redirect=/dashboard` },
    });
  }

  return (
    <div className="min-h-[calc(100vh-140px)] surface-ink relative overflow-hidden flex items-center py-14">
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-gold/10 blur-3xl animate-fade-up" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-gold/10 blur-3xl animate-fade-up [animation-delay:200ms]" />

      <div className="container relative grid lg:grid-cols-2 gap-10 items-center">
        <div className="hidden lg:block reveal">
          <Image src="/logos/inter-uni-logo.webp" alt="" width={64} height={64} className="h-16 w-16 rounded-lg bg-white p-1 mb-6" />
          <h1 className="heading-display text-4xl xl:text-5xl text-cream leading-tight mb-5">
            Your campus.
            <br />
            <span className="gold-text">Your voice.</span>
            <br />
            Your stage.
          </h1>
          <p className="text-cream/60 max-w-md leading-relaxed">
            Join thousands of youths building Kenya&apos;s most ambitious inter-university platform. One membership,
            one national stage.
          </p>
        </div>

        <div className="card-elegant p-7 sm:p-9 max-w-md w-full mx-auto reveal">
          <div className="flex rounded-full bg-cream-dim p-1 mb-7">
            {(["signup", "login"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={cn(
                  "flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors",
                  mode === m ? "bg-gold-foil text-ink shadow-gold" : "text-ink/50"
                )}
              >
                {m === "signup" ? "Sign Up" : "Log In"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="size-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="size-4 mt-0.5 shrink-0" /> {success}
            </div>
          )}

          {mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4 animate-fade-up">
              <Field icon={User} placeholder="Full name" value={signupForm.fullName}
                onChange={(v) => setSignupForm((f) => ({ ...f, fullName: v }))} required />
              <Field icon={Mail} type="email" placeholder="Email" value={signupForm.email}
                onChange={(v) => setSignupForm((f) => ({ ...f, email: v }))} required />
              <Field icon={Lock} type="password" placeholder="Password" value={signupForm.password}
                onChange={(v) => setSignupForm((f) => ({ ...f, password: v }))} required minLength={8} />

              <div>
                <p className="text-xs font-semibold text-ink/60 mb-2">Choose one category</p>
                <div className="space-y-2">
                  {MEMBER_CATEGORIES.map((c) => (
                    <label
                      key={c.value}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        signupForm.category === c.value ? "border-gold bg-gold/5" : "border-black/10 hover:border-black/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="category"
                        className="mt-1 accent-[#C9A227]"
                        checked={signupForm.category === c.value}
                        onChange={() => setSignupForm((f) => ({ ...f, category: c.value }))}
                      />
                      <span>
                        <span className="block text-sm font-medium">{c.label}</span>
                        <span className="block text-xs text-ink/45">{c.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {signupForm.category === "institution" && (
                <Field icon={Building2} placeholder="Institution name" value={signupForm.institutionName}
                  onChange={(v) => setSignupForm((f) => ({ ...f, institutionName: v }))} required />
              )}

              <label className="flex items-center gap-2.5 text-sm text-ink/70 cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 accent-[#C9A227]"
                  checked={signupForm.hasDisability}
                  onChange={(e) => setSignupForm((f) => ({ ...f, hasDisability: e.target.checked }))}
                />
                <Accessibility className="size-4 text-gold-deep" />
                I identify as a person with a disability
              </label>

              <button type="submit" disabled={loading} className="btn-gold w-full !py-3.5 disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create your Membership ID"}
              </button>

              <Divider />
              <button type="button" onClick={handleGoogle} className="w-full flex items-center justify-center gap-2.5 rounded-full border border-black/10 py-3 text-sm font-medium hover:bg-black/[0.03] transition-colors">
                <GoogleIcon className="size-4" /> Continue with Google
              </button>
              <p className="text-[11px] text-ink/40 text-center leading-relaxed">
                One sign-up per person — via this form or Google, not both. Registering creates your unique
                UniNexus Membership ID.
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-up">
              <Field icon={Mail} type="email" placeholder="Email" value={loginForm.email}
                onChange={(v) => setLoginForm((f) => ({ ...f, email: v }))} required />
              <Field icon={Lock} type="password" placeholder="Password" value={loginForm.password}
                onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))} required />
              <div className="text-right -mt-2">
                <Link href="/auth/forgot-password" className="text-xs text-gold-deep hover:underline">
                  Forgot password?
                </Link>
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full !py-3.5 disabled:opacity-60">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
              </button>
              <Divider />
              <button type="button" onClick={handleGoogle} className="w-full flex items-center justify-center gap-2.5 rounded-full border border-black/10 py-3 text-sm font-medium hover:bg-black/[0.03] transition-colors">
                <GoogleIcon className="size-4" /> Continue with Google
              </button>
              <p className="text-[11px] text-ink/40 text-center">
                Registered members and admins only. Admin accounts are pre-seeded and skip sign-up.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, ...props
}: { icon: any } & React.InputHTMLAttributes<HTMLInputElement> & { onChange: (v: string) => void }) {
  const { onChange, ...rest } = props as any;
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/35" />
      <input
        {...rest}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-3 text-sm focus:border-gold outline-none transition-colors"
      />
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-black/10" />
      <span className="text-[11px] uppercase tracking-wider text-ink/35">or</span>
      <div className="h-px flex-1 bg-black/10" />
    </div>
  );
}

function mapAuthError(message: string) {
  if (message?.includes("already registered")) return "This email is already registered — try logging in instead.";
  if (message?.includes("Invalid login")) return "Incorrect email or password.";
  return message || "Something went wrong. Please try again.";
}
