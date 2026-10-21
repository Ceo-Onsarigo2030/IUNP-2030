import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { queryStkPush } from "@/lib/daraja";
import { issueTicket, failTicket, deliverGatePass } from "@/lib/tickets";
import { safeEqual } from "@/lib/ticket-security";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  // If CRON_SECRET is missing, `Bearer undefined` would otherwise match — refuse outright.
  if (!safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  // Anything current or upcoming whose start time has passed moves to "past".
  // (A simple "starts_at < now" heuristic — swap for an explicit ends_at column if events run multi-day.)
  const { data: expired } = await supabase
    .from("events")
    .update({ status: "past" })
    .lt("starts_at", nowIso)
    .in("status", ["current", "upcoming"])
    .select("id");

  // If no event is marked "current" anymore, promote the soonest upcoming one.
  const { data: currentEvent } = await supabase.from("events").select("id").eq("status", "current").maybeSingle();
  let promoted = null;
  if (!currentEvent) {
    const { data: nextUp } = await supabase
      .from("events")
      .select("id")
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextUp) {
      await supabase.from("events").update({ status: "current" }).eq("id", nextUp.id);
      promoted = nextUp.id;
    }
  }

  // ---- Ticket safety net ----
  // 1) Payments still "pending" after 15 min: ask Safaricom. Paid -> issue the ticket (lost callback);
  //    anything else -> release the held seat.
  let recovered = 0, released = 0;
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: stale } = await supabase
    .from("tickets")
    .select("checkout_request_id")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(25);
  for (const row of stale || []) {
    if (!row.checkout_request_id) continue;
    const { resultCode, description } = await queryStkPush(row.checkout_request_id);
    if (resultCode === "0") { await issueTicket(row.checkout_request_id, {}); recovered++; }
    else { await failTicket(row.checkout_request_id, description || "No payment received (timed out)"); released++; }
  }
  // Pending rows that never even got a Safaricom id (the prompt failed to send).
  await supabase.from("tickets").update({ status: "failed", failure_reason: "M-Pesa prompt could not be sent" }).eq("status", "pending").is("checkout_request_id", null).lt("created_at", cutoff);

  // 2) Paid tickets whose gate-pass email didn't go out — retry (a few per run keeps this fast).
  let redelivered = 0;
  const { data: undelivered } = await supabase
    .from("tickets")
    .select("*, events(*), event_ticket_tiers(name)")
    .eq("status", "paid")
    .is("gate_pass_sent_at", null)
    .not("ticket_number", "is", null)
    .limit(15);
  for (const t of undelivered || []) { if (await deliverGatePass(t)) redelivered++; }

  return NextResponse.json({ expired: expired?.length || 0, promoted, recovered, released, redelivered });
}
