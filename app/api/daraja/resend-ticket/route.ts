import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateGatePassPdf } from "@/lib/gate-pass";
import { sendGatePassEmail } from "@/lib/resend";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user?.id || "").eq("role", "admin").maybeSingle();
  if (!user || !role) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { ticketIds } = await request.json();
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return NextResponse.json({ error: "No tickets selected." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: tickets } = await service
    .from("tickets")
    .select("*, events(*)")
    .in("id", ticketIds)
    .eq("status", "paid");

  let sent = 0;
  const failures: string[] = [];

  for (const ticket of tickets || []) {
    try {
      const pdfBytes = await generateGatePassPdf({
        eventTitle: (ticket as any).events.title,
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
