import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, CalendarDays, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/utils";
import { TicketWidget } from "@/components/ticket-widget";
import { EventMap } from "@/components/event-map";

async function getEvent(slug: string) {
  const supabase = createClient();
  const { data: event } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!event) return { event: null, tiers: [] };

  const { data: tiers } = await supabase
    .from("event_ticket_tiers")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return { event, tiers: tiers || [] };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { event } = await getEvent(params.slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.description,
    openGraph: { title: event.title, description: event.description, images: event.cover_image_url ? [event.cover_image_url] : undefined },
  };
}

// A dedicated, permanent URL for one specific event — previously the only ticket
// page was /programs, which always shows whichever event is currently marked
// "pinned". A link shared today could silently point to a completely different
// event tomorrow once the admin pins something else. This page always shows the
// exact event named in the URL, so a shared link stays correct indefinitely.
export default async function EventTicketPage({ params }: { params: { slug: string } }) {
  const { event, tiers } = await getEvent(params.slug);
  if (!event) notFound();

  return (
    <div className="bg-cream">
      <section className="surface-ink py-16 sm:py-20 text-center">
        <div className="container max-w-2xl">
          <p className="eyebrow mb-3">{event.status === "current" ? "Current event · Pinned" : event.status}</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">{event.title}</h1>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          <div className="card-elegant overflow-hidden">
            <div className="h-2 bg-gold-foil" />
            <div className="p-7 sm:p-9">
              <p className="text-ink/65 leading-relaxed mb-5">{event.description}</p>
              <div className="flex flex-wrap gap-5 text-sm text-ink/60 mb-5">
                <span className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-deep" /> {formatEventDate(event.starts_at)}</span>
                <span className="flex items-center gap-2"><MapPin className="size-4 text-gold-deep" /> {event.venue}</span>
              </div>
              <EventMap venue={event.venue} mapUrl={event.map_url} />
            </div>
          </div>
          <TicketWidget eventId={event.id} tiers={tiers} />
        </div>

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
