import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { parseScannedCode } from "@/lib/ticket-security";
import { checkinLimiter, enforceRateLimit } from "@/lib/rate-limit";

/**
 * Gate check-in. Body: { code, mode?: "checkin" | "lookup" }.
 * "code" is whatever the scanner read: the QR text, or a typed ticket number.
 * A ticket can be checked in ONCE — a screenshot or photocopy of a used pass is refused.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ result: "forbidden", message: "Admins only (two-step verification required)." }, { status: 403 });

  const blocked = await enforceRateLimit(checkinLimiter, `checkin:${admin.id}`);
  if (blocked) return blocked;

  const { code, mode } = await request.json().catch(() => ({}));
  if (!code || typeof code !== "string" || code.length > 80) {
    return NextResponse.json({ result: "invalid", message: "Nothing to check." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseScannedCode(code);
  } catch {
    return NextResponse.json({ result: "error", message: "Gate check-in isn't configured (missing signing secret)." }, { status: 500 });
  }
  if (parsed.signatureOk === false) {
    return NextResponse.json({ result: "forged", message: "FAKE TICKET — the security signature doesn't match." });
  }

  const service = createServiceRoleClient();
  const { data: ticket } = await service
    .from("tickets")
    .select("id, ticket_number, buyer_name, status, checked_in_at, event_id, events(title), event_ticket_tiers(name)")
    .eq("ticket_number", parsed.ticketNumber)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ result: "not_found", message: "No such ticket." });
  const t: any = ticket;
  const info = { buyer: t.buyer_name, tier: t.event_ticket_tiers?.name || null, event: t.events?.title || null, ticketNumber: t.ticket_number };

  if (t.status !== "paid") return NextResponse.json({ result: "not_paid", message: "This ticket was not paid for.", ...info });
  if (t.checked_in_at) {
    return NextResponse.json({ result: "already_used", message: "ALREADY USED", checkedInAt: t.checked_in_at, ...info });
  }
  if (mode === "lookup") return NextResponse.json({ result: "valid", message: "Valid — not yet used.", ...info });

  // Atomic: only one scan can flip checked_in_at from NULL.
  const { data: claimed } = await service
    .from("tickets")
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: admin.id })
    .eq("id", t.id)
    .is("checked_in_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) {
    const { data: again } = await service.from("tickets").select("checked_in_at").eq("id", t.id).maybeSingle();
    return NextResponse.json({ result: "already_used", message: "ALREADY USED", checkedInAt: again?.checked_in_at, ...info });
  }

  const [{ count: inside }, { count: sold }] = await Promise.all([
    service.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", t.event_id).not("checked_in_at", "is", null),
    service.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", t.event_id).eq("status", "paid"),
  ]);
  return NextResponse.json({ result: "ok", message: "WELCOME — entry granted", ...info, checkedIn: inside ?? 0, totalPaid: sold ?? 0 });
}
