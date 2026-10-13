"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const PAGE_SIZE = 50;

// Server-side search + pagination. The old version downloaded every profile into the
// browser — which silently stopped at 1000 rows (the API's per-request cap) and gets
// slower with every new member.
export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("profiles")
      .select("id, membership_id, full_name, email, category, institution_name, has_disability, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (debounced) {
      // Strip characters that have meaning inside a PostgREST filter expression.
      const term = debounced.replace(/[%,()*\\]/g, " ").trim();
      if (term) {
        q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,membership_id.ilike.%${term}%,institution_name.ilike.%${term}%`);
      }
    }

    q.then(
      ({ data, count }) => {
        if (cancelled) return;
        setMembers(data || []);
        setTotal(count ?? 0);
        setLoading(false);
      },
      () => { if (!cancelled) { setMembers([]); setLoading(false); } }
    );
    return () => { cancelled = true; };
  }, [page, debounced]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-8 sm:p-10">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <h1 className="heading-display text-3xl">Members</h1>
        <p className="text-sm text-ink/50">{total.toLocaleString()} {debounced ? "match" : "registered"}</p>
      </div>
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink/35" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, ID or institution…" className="w-full rounded-lg border border-black/10 pl-10 pr-4 py-2.5 text-sm" />
      </div>
      <div className="card-elegant overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink/45 border-b border-black/5">
            <tr>
              <th className="px-5 py-3">Membership ID</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Institution / group</th>
              <th className="px-5 py-3">Disability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 font-mono text-xs text-gold-deep">{m.membership_id}</td>
                <td className="px-5 py-3">{m.full_name}</td>
                <td className="px-5 py-3 text-ink/60">{m.email}</td>
                <td className="px-5 py-3 capitalize">{m.category}</td>
                <td className="px-5 py-3 text-ink/60">{m.institution_name || "—"}</td>
                <td className="px-5 py-3">{m.has_disability ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-5 text-sm text-ink/45 flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</p>}
        {!loading && members.length === 0 && <p className="p-5 text-sm text-ink/45">No members found.</p>}
      </div>
      <div className="flex items-center justify-between mt-4">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="flex items-center gap-1 text-sm px-3 py-2 rounded-full border border-black/10 disabled:opacity-40">
          <ChevronLeft className="size-4" /> Previous
        </button>
        <span className="text-sm text-ink/50">Page {page + 1} of {pages}</span>
        <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="flex items-center gap-1 text-sm px-3 py-2 rounded-full border border-black/10 disabled:opacity-40">
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
