import { Navigation } from "lucide-react";
import { buildMapEmbedUrl } from "@/lib/utils";

/**
 * Renders an actual embedded Google Map for the event's venue, plus a "Get
 * directions" link. Previously the location was just plain text with an
 * optional outbound link — no map was ever shown on the page.
 */
export function EventMap({ venue, mapUrl }: { venue: string; mapUrl?: string | null }) {
  if (!venue) return null;

  return (
    <div className="rounded-lg overflow-hidden border border-black/10">
      <iframe
        title={`Map to ${venue}`}
        src={buildMapEmbedUrl(venue)}
        width="100%"
        height="220"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 bg-white py-2.5 text-xs font-semibold text-gold-deep hover:bg-black/[0.02] transition-colors"
      >
        <Navigation className="size-3.5" /> Get directions
      </a>
    </div>
  );
}
