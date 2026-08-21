"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function AdminInstitutionsPage() {
  const [aliases, setAliases] = useState<any[]>([]);
  const [form, setForm] = useState({ alias: "", canonical_name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("institution_aliases").select("*").order("canonical_name", { ascending: true });
    setAliases(data || []);
  }
  useEffect(() => { load(); }, []);

  async function addAlias(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("institution_aliases").insert({
      alias: form.alias.trim(),
      canonical_name: form.canonical_name.trim(),
    });
    if (err) setError(err.code === "23505" ? "That short form is already mapped to something." : err.message);
    else setForm({ alias: "", canonical_name: "" });
    setSaving(false);
    load();
  }

  async function removeAlias(id: string) {
    if (!confirm("Remove this mapping? The short form will count as its own separate institution again.")) return;
    const supabase = createClient();
    await supabase.from("institution_aliases").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-8 sm:p-10 max-w-3xl">
      <h1 className="heading-display text-3xl mb-2">Institution Name Mapping</h1>
      <p className="text-sm text-ink/50 mb-8">
        If members enter the same institution differently (e.g. some type &quot;Kenyatta University&quot;, others just &quot;KU&quot;),
        add a mapping here so the live &quot;Institutions on board&quot; count treats them as one, not two.
      </p>

      <form onSubmit={addAlias} className="card-elegant p-6 space-y-3 mb-8">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink/50 block mb-1">Short form / variant members type</label>
            <input required placeholder='e.g. "KU"' value={form.alias}
              onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-ink/50 block mb-1">Full / canonical institution name</label>
            <input required placeholder='e.g. "Kenyatta University"' value={form.canonical_name}
              onChange={(e) => setForm((f) => ({ ...f, canonical_name: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-gold !py-2.5 !px-5 disabled:opacity-60">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4" /> Add mapping</>}
        </button>
      </form>

      <div className="space-y-2">
        {aliases.map((a) => (
          <div key={a.id} className="rounded-lg bg-white border border-black/5 p-4 flex items-center justify-between">
            <p className="text-sm">
              <span className="font-mono text-gold-deep">{a.alias}</span>
              <span className="text-ink/40 mx-2">→</span>
              <span className="font-semibold">{a.canonical_name}</span>
            </p>
            <button onClick={() => removeAlias(a.id)} className="text-red-500 hover:text-red-700"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
        {aliases.length === 0 && <p className="text-sm text-ink/40 text-center py-4">No mappings yet — every institution name counts separately.</p>}
      </div>
    </div>
  );
}
