"use client";

import { useEffect, useState } from "react";
import { Users, Accessibility, Building2, CalendarCheck } from "lucide-react";

type Stats = { members: number; disability: number; institutions: number; events: number };

const POLL_MS = 60_000;

// Reads /api/stats (edge-cached for 60s, backed by the get_public_stats() RPC — profiles is
// RLS-locked, so the browser must never count it directly). Polls only while the tab is
// visible, once a minute, so thousands of open homepages don't hammer the database.
function useLiveStats(initialStats: Stats) {
  const [stats, setStats] = useState<Stats>(initialStats);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const row = await res.json();
        if (!mounted) return;
        setStats({
          members: Number(row.members) || 0,
          disability: Number(row.disability) || 0,
          institutions: Number(row.institutions) || 0,
          events: Number(row.events) || 0,
        });
      } catch {
        // Offline / temporarily unreachable — keep showing the last known numbers.
      }
    }

    const pollId = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      mounted = false;
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", load);
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

export function LiveStats({ initialStats }: { initialStats: Stats }) {
  const stats = useLiveStats(initialStats);

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
