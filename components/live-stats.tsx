"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Accessibility, Building2, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Stats = { members: number; disability: number; institutions: number; events: number };

const POLL_MS = 15_000;

// IMPORTANT: this reads through the `get_public_stats()` RPC (security definer,
// defined in supabase/migrations/0001_init.sql), never the `profiles` table directly.
// `profiles` is RLS-locked to "own row or admin", so querying it from the browser
// used to return a different (wrong) count on every device/session — signed-out
// visitors got 0, a signed-in member got ~1, only an admin ever saw the real total.
// The RPC bypasses that and always returns the true platform-wide counts.
function useLiveStats() {
  const [stats, setStats] = useState<Stats>({ members: 0, disability: 0, institutions: 0, events: 0 });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let supabaseClient: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const supabase = supabaseClient!;
        const { data, error } = await supabase.rpc("get_public_stats");
        if (error || !data) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !mountedRef.current) return;
        setStats({
          members: Number(row.members) || 0,
          disability: Number(row.disability) || 0,
          institutions: Number(row.institutions) || 0,
          events: Number(row.events) || 0,
        });
      } catch {
        // Supabase not reachable yet (e.g. env vars not configured) — leave stats as-is.
      }
    }

    try {
      supabaseClient = createClient();

      load();

      // Poll on an interval so numbers stay current for every visitor without
      // needing to refresh the page — this is the primary update mechanism.
      pollId = setInterval(load, POLL_MS);

      // Realtime is a nice-to-have on top of polling: if it's wired up (replication
      // enabled for these tables) it makes updates feel instant; if not, polling
      // above still keeps things correct within POLL_MS.
      channel = supabaseClient
        .channel("live-stats")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
        .subscribe();
    } catch {
      // createClient() itself threw (missing Supabase env vars) — stats stay at zero.
    }

    return () => {
      mountedRef.current = false;
      if (pollId) clearInterval(pollId);
      if (supabaseClient && channel) supabaseClient.removeChannel(channel);
    };
  }, []);

  return stats;
}

function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = display;
    let raf: number;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span key={value} className="animate-count-pop">{display.toLocaleString()}</span>;
}

const CARDS = [
  { key: "members", label: "Registered Members", icon: Users },
  { key: "institutions", label: "Institutions on Board", icon: Building2 },
  { key: "disability", label: "Members with Disability", icon: Accessibility },
  { key: "events", label: "Programs & Events", icon: CalendarCheck },
] as const;

export function LiveStats() {
  const stats = useLiveStats();

  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="container">
        <div className="text-center mb-10 reveal">
          <p className="eyebrow mb-3">Growing every day</p>
          <h2 className="heading-display text-3xl sm:text-4xl text-ink">Live statistics</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="surface-ink rounded-xl2 p-6 relative overflow-hidden reveal">
              <Icon className="absolute -right-3 -bottom-3 size-20 text-gold/10" />
              <div className="relative">
                <div className="font-display text-3xl sm:text-4xl text-gold font-semibold">
                  <Counter value={stats[key]} />
                </div>
                <p className="mt-2 text-[11px] sm:text-xs uppercase tracking-wider text-cream/60">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
