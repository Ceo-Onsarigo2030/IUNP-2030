import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateGatePassPdf } from "@/lib/gate-pass";
import { sendGatePassEmail } from "@/lib/resend";
import { generateTicketNumber } from "@/lib/utils";

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

  // Only transition tickets that are still pending — blocks replayed/duplicate callbacks
  // from re-processing an already-settled ticket.
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, events(*)")
    .eq("checkout_request_id", checkoutRequestId)
    .eq("status", "pending")
    .maybeSingle();

  if (!ticket) return NextResponse.json({ ResultCode: 0, ResultDesc: "No matching pending ticket" });

  if (resultCode !== 0) {
    await supabase.from("tickets").update({ status: "failed" }).eq("id", ticket.id);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Marked failed" });
  }

  const metadata: any[] = stkCallback.CallbackMetadata?.Item || [];
  const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value || null;
  const ticketNumber = generateTicketNumber();

  await supabase.from("tickets").update({
    status: "paid",
    mpesa_receipt: receipt,
    ticket_number: ticketNumber,
  }).eq("id", ticket.id);

  try {
    const pdfBytes = await generateGatePassPdf({
      eventTitle: ticket.events.title,
      venue: ticket.events.venue,
      startsAt: ticket.events.starts_at,
      buyerName: ticket.buyer_name,
      ticketNumber,
    });

    await sendGatePassEmail({
      to: ticket.buyer_email,
      buyerName: ticket.buyer_name,
      eventTitle: ticket.events.title,
      ticketNumber,
      pdfBytes,
    });

    await supabase.from("tickets").update({ gate_pass_sent_at: new Date().toISOString() }).eq("id", ticket.id);
  } catch (err) {
    // Payment already succeeded — log for admin follow-up (bulk resend covers this) rather than failing the callback.
    console.error("Gate pass email failed for ticket", ticket.id, err);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Processed" });
}
