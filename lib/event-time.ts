// Event times are ALWAYS entered and shown in Kenya time (EAT, UTC+3, no daylight saving).
// Previously the admin form saved "18:00" with no timezone, the database treated it as 18:00 UTC,
// and Kenya then displayed 21:00. These helpers remove that ambiguity.

const TZ = "Africa/Nairobi";

/** "2026-11-06T18:00" (what the datetime-local box holds) -> "2026-11-06T18:00:00+03:00" */
export function nairobiLocalToIso(local: string) {
  if (!local) return local;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(local)) return local; // already has an offset
  return `${local.length === 16 ? `${local}:00` : local}+03:00`;
}

/** Stored ISO timestamp -> "YYYY-MM-DDTHH:mm" in Kenya time, for the datetime-local box. */
export function isoToNairobiLocal(iso: string) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function formatNairobi(iso: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}
