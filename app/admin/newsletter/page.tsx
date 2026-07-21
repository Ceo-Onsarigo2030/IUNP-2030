"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, Trash2 } from "lucide-react";

export default function AdminNewsletterPage() {
  const [subs, setSubs] = useState<any[]>([]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
    setSubs(data || []);
  }
  useEffect(() => { load(); }, []);

  function exportCsv() {
    const rows = [["email", "subscribed_at", "active"], ...subs.map((s) => [s.email, s.created_at, String(s.is_active)])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uninexus-newsletter-subscribers.csv";
    a.click();
  }

  async function toggleActive(id: string, active: boolean) {
    const supabase = createClient();
    await supabase.from("newsletter_subscribers").update({ is_active: !active }).eq("id", id);
    load();
  }

  return (
    <div className="p-8 sm:p-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-display text-3xl">Newsletter Subscribers</h1>
        <button onClick={exportCsv} className="btn-outline-gold !text-ink !border-ink/20"><Download className="size-4" /> Export CSV</button>
      </div>
      <div className="card-elegant divide-y divide-black/5">
        {subs.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm">{s.email}</p>
              <p className="text-xs text-ink/40">{new Date(s.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => toggleActive(s.id, s.is_active)} className={`text-xs px-3 py-1.5 rounded-full border ${s.is_active ? "border-emerald-300 text-emerald-600" : "border-black/10 text-ink/40"}`}>
              {s.is_active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
        {subs.length === 0 && <p className="p-5 text-sm text-ink/45">No subscribers yet.</p>}
      </div>
    </div>
  );
}
