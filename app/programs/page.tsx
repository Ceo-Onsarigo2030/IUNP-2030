import type { Metadata } from "next";
import { MapPin, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/utils";
import { TicketWidget } from "@/components/ticket-widget";

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
    return { current, upcoming: upcoming || [] };
  } catch {
    return { current: null, upcoming: [] };
  }
}

export default async function ProgramsPage() {
  const { current, upcoming } = await getEvents();

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
                <div className="flex flex-wrap gap-5 text-sm text-ink/60">
                  <span className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-deep" /> {formatEventDate(current.starts_at)}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-4 text-gold-deep" /> {current.venue}</span>
                </div>
              </div>
            </div>
            <TicketWidget eventId={current.id} price={current.ticket_price || 0} currency={current.ticket_currency || "KES"} />
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
                <div className="flex flex-col gap-1.5 text-xs text-ink/50">
                  <span className="flex items-center gap-2"><CalendarDays className="size-3.5 text-gold-deep" /> {formatEventDate(e.starts_at)}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-3.5 text-gold-deep" /> {e.venue}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elegant p-10 text-center text-ink/50">No upcoming events published yet.</div>
        )}
      </section>
    </div>
  );
}
