"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search } from "lucide-react";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(
      ({ data }) => setMembers(data || []),
      () => setMembers([])
    );
  }, []);

  const filtered = members.filter((m) =>
    [m.full_name, m.email, m.membership_id, m.institution_name].filter(Boolean).some((v) => v.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="p-8 sm:p-10">
      <h1 className="heading-display text-3xl mb-6">Members</h1>
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/35" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or ID…" className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-2.5 text-sm" />
      </div>
      <div className="card-elegant overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink/45 border-b border-black/5">
            <tr>
              <th className="px-5 py-3">Membership ID</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Disability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 font-mono text-xs text-gold-deep">{m.membership_id}</td>
                <td className="px-5 py-3">{m.full_name}</td>
                <td className="px-5 py-3 text-ink/60">{m.email}</td>
                <td className="px-5 py-3 capitalize">{m.category}</td>
                <td className="px-5 py-3">{m.has_disability ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-5 text-sm text-ink/45">No members found.</p>}
      </div>
    </div>
  );
}
