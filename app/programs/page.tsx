import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, CalendarDays, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/utils";
import { TicketWidget } from "@/components/ticket-widget";
import { EventMap } from "@/components/event-map";

export const metadata: Metadata = { title: "Events & Programs" };

async function getEvents() {
  try {
    const supabase = createClient();
    const { data: current } = await supabase.from("events").select("*").eq("status", "current").maybeSingle();
    const { data: upcoming } = await supabase
      .from("events")
      .select("*")
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true });

    let tiers: any[] = [];
    if (current) {
      const { data } = await supabase
        .from("event_ticket_tiers")
        .select("*")
        .eq("event_id", current.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      tiers = data || [];
    }

    return { current, upcoming: upcoming || [], tiers };
  } catch {
    return { current: null, upcoming: [], tiers: [] };
  }
}

export default async function ProgramsPage() {
  const { current, upcoming, tiers } = await getEvents();

  return (
    <div className="bg-cream">
      <section className="surface-ink py-16 sm:py-20 text-center">
        <div className="container">
          <p className="eyebrow mb-3">Mark your calendar</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">Events &amp; Programs</h1>
          <p className="mt-3 text-cream/60 max-w-xl mx-auto">
            One current event, front and centre. Everything else waits below, in order of when it happens.
          </p>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <p className="eyebrow mb-4">Current event · Pinned</p>
        {current ? (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start mb-20">
            <div className="card-elegant overflow-hidden">
              <div className="h-2 bg-gold-foil" />
              <div className="p-7 sm:p-9">
                <h2 className="heading-display text-3xl mb-4">{current.title}</h2>
                <p className="text-ink/65 leading-relaxed mb-5">{current.description}</p>
                <div className="flex flex-wrap gap-5 text-sm text-ink/60 mb-5">
                  <span className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-deep" /> {formatEventDate(current.starts_at)}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-4 text-gold-deep" /> {current.venue}</span>
                </div>
                <EventMap venue={current.venue} mapUrl={current.map_url} />
              </div>
            </div>
            <TicketWidget eventId={current.id} tiers={tiers} />
          </div>
        ) : (
          <div className="card-elegant p-10 text-center text-ink/50 mb-20">No current event pinned right now.</div>
        )}

        <p className="eyebrow mb-4">Upcoming</p>
        {upcoming.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((e: any) => (
              <div key={e.id} className="card-elegant p-6">
                <h3 className="font-display text-xl mb-2">{e.title}</h3>
                <p className="text-sm text-ink/60 leading-relaxed mb-4 line-clamp-3">{e.description}</p>
                <div className="flex flex-col gap-1.5 text-xs text-ink/50 mb-3">
                  <span className="flex items-center gap-2"><CalendarDays className="size-3.5 text-gold-deep" /> {formatEventDate(e.starts_at)}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-3.5 text-gold-deep" /> {e.venue}</span>
                </div>
                <EventMap venue={e.venue} mapUrl={e.map_url} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elegant p-10 text-center text-ink/50">No upcoming events published yet.</div>
        )}

        <div className="mt-14 card-elegant p-8 text-center max-w-xl mx-auto">
          <h3 className="font-display text-xl mb-2">Not a member yet?</h3>
          <p className="text-sm text-ink/60 mb-4">Join UniNexus Connect to follow every event, category and update across Kenyan universities.</p>
          <Link href="/auth" className="btn-gold inline-flex !py-3 !px-6">
            Join UniNexus <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
