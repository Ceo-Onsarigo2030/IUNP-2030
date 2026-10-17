import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { generateGatePassPdf } from "@/lib/gate-pass";
import { sendGatePassEmail } from "@/lib/resend";
import * as Sentry from "@sentry/nextjs";

// Bulk resend is capped so one request always finishes inside Vercel's time limit.
export const maxDuration = 60;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });

  const { ticketIds } = await request.json();
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return NextResponse.json({ error: "No tickets selected." }, { status: 400 });
  }
  if (ticketIds.length > 40) {
    return NextResponse.json({ error: "Select at most 40 tickets at a time." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: tickets } = await service
    .from("tickets")
    .select("*, events(*), event_ticket_tiers(name)")
    .in("id", ticketIds)
    .eq("status", "paid");

  let sent = 0;
  const failures: string[] = [];

  for (const ticket of tickets || []) {
    try {
      const pdfBytes = await generateGatePassPdf({
        eventTitle: (ticket as any).event_ticket_tiers?.name ? `${(ticket as any).events.title} — ${(ticket as any).event_ticket_tiers.name}` : (ticket as any).events.title,
        venue: (ticket as any).events.venue,
        startsAt: (ticket as any).events.starts_at,
        buyerName: ticket.buyer_name,
        ticketNumber: ticket.ticket_number || ticket.id,
      });
      await sendGatePassEmail({
        to: ticket.buyer_email,
        buyerName: ticket.buyer_name,
        eventTitle: (ticket as any).events.title,
        ticketNumber: ticket.ticket_number || ticket.id,
        pdfBytes,
      });
      await service.from("tickets").update({ gate_pass_sent_at: new Date().toISOString() }).eq("id", ticket.id);
      sent++;
    } catch (err) {
      Sentry.captureException(err);
      failures.push(ticket.buyer_email);
    }
  }

  return NextResponse.json({ sent, failed: failures.length, failures });
}
