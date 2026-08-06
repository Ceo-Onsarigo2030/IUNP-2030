"use client";

import { useEffect, useState } from "react";
import { Users, Accessibility, Building2, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Stats = { members: number; disability: number; institutions: number; events: number };

function useLiveStats() {
  const [stats, setStats] = useState<Stats>({ members: 0, disability: 0, institutions: 0, events: 0 });

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let supabaseClient: ReturnType<typeof createClient> | null = null;

    try {
      const supabase = createClient();
      supabaseClient = supabase;

      async function load() {
        try {
          const [{ count: members }, { count: disability }, { count: events }] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("has_disability", true),
            supabase.from("events").select("id", { count: "exact", head: true }),
          ]);
          const { data: institutionRows } = await supabase
            .from("profiles")
            .select("institution_name")
            .eq("category", "institution");
          const institutions = new Set((institutionRows || []).map((r: any) => r.institution_name)).size;

          setStats({ members: members || 0, disability: disability || 0, institutions, events: events || 0 });
        } catch {
          // Supabase not reachable yet (e.g. env vars not configured) — leave stats at zero rather than crash.
        }
      }

      load();

      channel = supabase
        .channel("live-stats")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, load)
        .subscribe();
    } catch {
      // createClient() itself threw (missing Supabase env vars) — stats stay at zero, rest of the page still renders.
    }

    return () => {
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
