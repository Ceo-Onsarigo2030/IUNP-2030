import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateGatePassPdf } from "@/lib/gate-pass";
import { sendGatePassEmail } from "@/lib/resend";
import { generateTicketNumber } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== process.env.DARAJA_CALLBACK_SECRET) {
    // Wrong or missing secret — don't reveal why, just reject.
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }

  const payload = await request.json();
  const stkCallback = payload?.Body?.stkCallback;
  if (!stkCallback) return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });

  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const supabase = createServiceRoleClient();

  if (resultCode !== 0) {
    // Same atomic-claim pattern as below — only a still-pending ticket gets moved to
    // "failed", so a duplicate failure callback is a harmless no-op the second time.
    await supabase.from("tickets").update({ status: "failed" }).eq("checkout_request_id", checkoutRequestId).eq("status", "pending");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Marked failed" });
  }

  const metadata: any[] = stkCallback.CallbackMetadata?.Item || [];
  const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value || null;
  const ticketNumber = generateTicketNumber();

  // Safaricom is documented to occasionally redeliver the same callback. The previous
  // version did a SELECT (checking status = 'pending') and then a separate UPDATE —
  // two near-simultaneous redelivered callbacks could both pass that SELECT before
  // either UPDATE landed, and both would then send a gate pass email and double-count
  // stats for one payment. Folding the pending-check into the UPDATE itself makes the
  // claim atomic: Postgres only lets one concurrent request's WHERE status='pending'
  // actually match and return a row — a second, redelivered callback for the same
  // ticket updates zero rows and is safely ignored below.
  const { data: claimed } = await supabase
    .from("tickets")
    .update({ status: "paid", mpesa_receipt: receipt, ticket_number: ticketNumber })
    .eq("checkout_request_id", checkoutRequestId)
    .eq("status", "pending")
    .select("*, events(*), event_ticket_tiers(name)")
    .maybeSingle();

  if (!claimed) return NextResponse.json({ ResultCode: 0, ResultDesc: "No matching pending ticket" });
  const ticket = claimed;

  try {
    const tierName = (ticket as any).event_ticket_tiers?.name;
    const pdfBytes = await generateGatePassPdf({
      eventTitle: tierName ? `${ticket.events.title} — ${tierName}` : ticket.events.title,
      venue: ticket.events.venue,
      startsAt: ticket.events.starts_at,
      buyerName: ticket.buyer_name,
      ticketNumber,
    });

    await sendGatePassEmail({
      to: ticket.buyer_email,
      buyerName: ticket.buyer_name,
      eventTitle: tierName ? `${ticket.events.title} (${tierName})` : ticket.events.title,
      ticketNumber,
      pdfBytes,
    });

    await supabase.from("tickets").update({ gate_pass_sent_at: new Date().toISOString() }).eq("id", ticket.id);
  } catch (err) {
    // Payment already succeeded — log for admin follow-up (bulk resend covers this) rather than failing the callback.
    Sentry.captureException(err);
    console.error("Gate pass email failed for ticket", ticket.id, err);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Processed" });
}
