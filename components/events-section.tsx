import Link from "next/link";
import { MapPin, CalendarDays, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/utils";
import { TicketWidget } from "@/components/ticket-widget";
import { Button } from "@/components/ui/button";

async function getEvents() {
  try {
    const supabase = createClient();
    const { data: current } = await supabase.from("events").select("*").eq("status", "current").limit(1).maybeSingle();
    const { count: upcomingCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "upcoming");
    return { current, upcomingCount: upcomingCount || 0 };
  } catch {
    return { current: null, upcomingCount: 0 };
  }
}

export async function EventsSection() {
  const { current, upcomingCount } = await getEvents();

  return (
    <section className="bg-cream-dim py-16 sm:py-24">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10 reveal">
          <div>
            <p className="eyebrow mb-3">Mark your calendar</p>
            <h2 className="heading-display text-3xl sm:text-4xl text-ink">Reserve &amp; let&apos;s connect</h2>
            <p className="mt-2 text-ink/60 max-w-xl">
              One current event takes centre stage. Everything else — dates, venues and details — waits for you in Explore.
            </p>
          </div>
          <Button href="/programs" variant="outline" className="!text-ink !border-ink/20 hover:!bg-ink hover:!text-cream">
            Explore all events {upcomingCount > 0 && `(${upcomingCount})`} <ArrowRight className="size-4" />
          </Button>
        </div>

        {current ? (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
            <div className="card-elegant overflow-hidden reveal">
              <div className="h-2 bg-gold-foil" />
              <div className="p-7 sm:p-9">
                <span className="eyebrow !text-gold-deep">Current event · Pinned</span>
                <h3 className="heading-display text-2xl sm:text-3xl mt-3 mb-4">{current.title}</h3>
                <p className="text-ink/65 leading-relaxed mb-5 line-clamp-4">{current.description}</p>
                <div className="flex flex-wrap gap-5 text-sm text-ink/60">
                  <span className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-deep" /> {formatEventDate(current.starts_at)}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-4 text-gold-deep" /> {current.venue}</span>
                </div>
              </div>
            </div>
            <TicketWidget eventId={current.id} price={current.ticket_price || 0} currency={current.ticket_currency || "KES"} />
          </div>
        ) : (
          <div className="card-elegant p-10 text-center text-ink/50 reveal">
            No current event is pinned right now — check back soon, or browse what&apos;s coming up.
          </div>
        )}
      </div>
    </section>
  );
}
