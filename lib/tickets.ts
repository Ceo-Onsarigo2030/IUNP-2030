import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateGatePassPdf } from "@/lib/gate-pass";
import { sendGatePassEmail } from "@/lib/resend";
import { secureTicketNumber } from "@/lib/ticket-security";
import * as Sentry from "@sentry/nextjs";

/**
 * Turns a PENDING ticket into a PAID one — exactly once — and emails the gate pass.
 * Used by the M-Pesa callback AND by the payment-recovery paths (status polling / daily sweep),
 * so a payment is honoured whichever way we learn about it, and never twice.
 *
 * The pending->paid change is a single atomic UPDATE: if two callbacks (or a callback plus a
 * recovery check) race, only one matches `status = 'pending'` and the other safely does nothing.
 */
export async function issueTicket(
  checkoutRequestId: string,
  opts: { receipt?: string | null; paidAmount?: number | null } = {}
): Promise<"issued" | "noop" | "amount_mismatch"> {
  const supabase = createServiceRoleClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const ticketNumber = secureTicketNumber();
    let claim = supabase
      .from("tickets")
      .update({ status: "paid", mpesa_receipt: opts.receipt ?? null, ticket_number: ticketNumber })
      .eq("checkout_request_id", checkoutRequestId)
      .eq("status", "pending");
    // The amount Safaricom says was paid must equal the ticket price.
    if (opts.paidAmount != null) claim = claim.eq("amount", Number(opts.paidAmount));

    const { data: ticket, error } = await claim.select("*, events(*), event_ticket_tiers(name)").maybeSingle();

    if (error) {
      // Astronomically unlikely duplicate ticket number / receipt — retry the number; a duplicate
      // M-Pesa receipt means the same payment is being replayed, so stop.
      if (String(error.message).includes("mpesa_receipt")) {
        Sentry.captureMessage(`Duplicate M-Pesa receipt ${opts.receipt} for ${checkoutRequestId} — possible replay`, "error");
        return "noop";
      }
      if (attempt < 2) continue;
      throw error;
    }

    if (!ticket) {
      if (opts.paidAmount != null) {
        const { data: pending } = await supabase
          .from("tickets")
          .select("id, amount")
          .eq("checkout_request_id", checkoutRequestId)
          .eq("status", "pending")
          .maybeSingle();
        if (pending) {
          Sentry.captureMessage(`M-Pesa amount mismatch: paid ${opts.paidAmount}, expected ${pending.amount} (ticket ${pending.id})`, "error");
          return "amount_mismatch";
        }
      }
      return "noop";
    }

    await deliverGatePass(ticket as any);
    return "issued";
  }
  return "noop";
}

/** Builds and emails the gate pass for a paid ticket; marks it sent only if the email really went out. */
export async function deliverGatePass(ticket: any) {
  const supabase = createServiceRoleClient();
  try {
    const tierName = ticket.event_ticket_tiers?.name;
    const pdfBytes = await generateGatePassPdf({
      eventTitle: tierName ? `${ticket.events.title} — ${tierName}` : ticket.events.title,
      venue: ticket.events.venue,
      startsAt: ticket.events.starts_at,
      buyerName: ticket.buyer_name,
      ticketNumber: ticket.ticket_number,
    });
    await sendGatePassEmail({
      to: ticket.buyer_email,
      buyerName: ticket.buyer_name,
      eventTitle: tierName ? `${ticket.events.title} (${tierName})` : ticket.events.title,
      ticketNumber: ticket.ticket_number,
      pdfBytes,
    });
    await supabase.from("tickets").update({ gate_pass_sent_at: new Date().toISOString() }).eq("id", ticket.id);
    return true;
  } catch (err) {
    // Payment already succeeded — the daily sweep and the admin "resend" retry delivery.
    Sentry.captureException(err);
    console.error("Gate pass email failed for ticket", ticket.id, err);
    return false;
  }
}

export async function failTicket(checkoutRequestId: string, reason?: string | null) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("tickets")
    .update({ status: "failed", failure_reason: reason ? String(reason).slice(0, 200) : null })
    .eq("checkout_request_id", checkoutRequestId)
    .eq("status", "pending");
}
