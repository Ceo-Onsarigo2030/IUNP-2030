"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ProfileForm({ profile }: { profile: any }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    institution_name: profile?.institution_name || "",
    has_disability: profile?.has_disability || false,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    await supabase.from("profiles").update(form).eq("id", profile.id);
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elegant p-7 space-y-4">
      <div>
        <label className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Full name</label>
        <input
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          className="mt-1.5 w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Institution / Organization</label>
        <input
          value={form.institution_name}
          onChange={(e) => setForm((f) => ({ ...f, institution_name: e.target.value }))}
          className="mt-1.5 w-full rounded-lg border border-black/10 px-4 py-3 text-sm focus:border-gold outline-none"
        />
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink/70 cursor-pointer">
        <input
          type="checkbox"
          className="size-4 accent-[#C9A227]"
          checked={form.has_disability}
          onChange={(e) => setForm((f) => ({ ...f, has_disability: e.target.checked }))}
        />
        I identify as a person with a disability
      </label>
      <p className="text-[11px] text-ink/40">
        Email, membership ID and role can&apos;t be changed here — contact the admin team if something looks wrong.
      </p>
      <button type="submit" disabled={status === "loading"} className="btn-gold !py-3 disabled:opacity-60">
        {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : status === "done" ? <><CheckCircle2 className="size-4" /> Saved</> : "Save changes"}
      </button>
    </form>
  );
}
