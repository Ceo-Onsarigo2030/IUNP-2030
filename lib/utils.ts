import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(date)
  );
}

export function generateMembershipId(sequence: number) {
  return `UniNexus-${String(sequence).padStart(3, "0")}`;
}

/**
 * Builds an embeddable Google Maps URL for an <iframe>. Google's basic Maps embed
 * (`google.com/maps?output=embed`) works with no API key, but only reliably renders
 * for a plain search query — not every admin-pasted share link (place links,
 * shortened maps.app.goo.gl links, etc.) embeds correctly, some just redirect. So this
 * always builds the embed from the venue name/address text, which is guaranteed to
 * render a real, correct map. The admin's pasted `map_url` (if any) is still used
 * separately as the "Get directions" link, since that one benefits from being the
 * admin's exact chosen pin.
 */
export function buildMapEmbedUrl(venue: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`;
}

export function generateTicketNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `UNX-${time}-${rand}`;
}
