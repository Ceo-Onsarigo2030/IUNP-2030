"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-8">Site Settings</h1>
      <form onSubmit={handleSave} className="card-elegant p-6 max-w-lg space-y-3">
        <label className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Homepage moving message</label>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm resize-none" />
        <button type="submit" disabled={saving} className="btn-gold !py-3 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <><CheckCircle2 className="size-4" /> Saved</> : "Update marquee"}
        </button>
      </form>
    </div>
  );
}
