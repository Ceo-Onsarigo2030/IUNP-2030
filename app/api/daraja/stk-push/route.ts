import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { initiateStkPush, normalizePhone } from "@/lib/daraja";
import { stkPushLimiter, stkPushIpLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import { verifyTurnstile } from "@/lib/turnstile";
import { isValidEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({
  eventId: z.string().uuid(),
  tierId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().max(254),
  phone: z.string().min(9).max(20),
  captchaToken: z.string().nullish(),
});

// Messages for the reasons the database can refuse a reservation (see reserve_ticket in migration 0014).
const REFUSALS: Record<string, [string, number]> = {
  TIER_UNAVAILABLE: ["That ticket type isn't available any more.", 400],
  EVENT_CLOSED: ["Ticket sales for this event are closed.", 409],
  SOLD_OUT: ["Sorry — this ticket type is sold out.", 409],
  PHONE_LIMIT: ["This phone number has reached the maximum number of tickets for this event.", 409],
  DUPLICATE_PENDING: ["A payment prompt is already waiting on this phone. Enter your M-Pesa PIN, or wait a minute and try again.", 409],
};

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const ip = clientIp(request);
  let ticketId: string | null = null;
  const supabase = createServiceRoleClient();

  try {
    const body = schema.parse(await request.json());

    const email = body.email.toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a complete email address — your gate pass is sent there." }, { status: 400 });
    }
    const phone = normalizePhone(body.phone);
    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712345678." }, { status: 400 });
    }

    // 1) Bots: a payment prompt lands on a REAL person's phone, so scripted abuse is blocked up front.
    if (!(await verifyTurnstile(body.captchaToken, ip))) {
      return NextResponse.json({ error: "The security check didn't pass. Please try again." }, { status: 400 });
    }

    // 2) Rate limits — per phone (stops prompt-spamming one person) and per IP (generous, shared Wi-Fi).
    const blocked =
      (await enforceRateLimit(stkPushLimiter, `stk:phone:${phone}`)) ||
      (await enforceRateLimit(stkPushIpLimiter, `stk:ip:${ip}`));
    if (blocked) return blocked;

    // 3) Reserve the seat ATOMICALLY in the database (locks the ticket type, so thousands of
    //    simultaneous buyers can never oversell). Also enforces: event open, tier active,
    //    one live prompt per phone, per-phone ticket cap.
    const { data: reserved, error: reserveErr } = await supabase.rpc("reserve_ticket", {
      p_event_id: body.eventId,
      p_tier_id: body.tierId,
      p_name: body.name,
      p_email: email,
      p_phone: phone,
      p_max_per_phone: Number(process.env.TICKET_MAX_PER_PHONE) || 10,
      p_hold_minutes: 10,
    });
    if (reserveErr) {
      const code = Object.keys(REFUSALS).find((k) => reserveErr.message?.includes(k));
      if (code) return NextResponse.json({ error: REFUSALS[code][0] }, { status: REFUSALS[code][1] });
      throw reserveErr;
    }
    const r = Array.isArray(reserved) ? reserved[0] : reserved;
    if (!r?.ticket_id) throw new Error("reserve_ticket returned nothing");
    ticketId = r.ticket_id;

    // 4) Charge the PRICE FROM THE DATABASE — never anything sent by the browser.
    const { checkoutRequestId, merchantRequestId } = await initiateStkPush({
      phone,
      amount: Number(r.amount),
      accountRef: r.event_slug,
      description: `${r.event_title} - ${r.tier_name}`,
    });

    const { error: updateErr } = await supabase
      .from("tickets")
      .update({ checkout_request_id: checkoutRequestId, merchant_request_id: merchantRequestId })
      .eq("id", ticketId);
    if (updateErr) throw updateErr;

    return NextResponse.json({ checkoutRequestId });
  } catch (err: any) {
    // If the prompt couldn't be sent, release the held seat straight away.
    if (ticketId) await supabase.from("tickets").update({ status: "failed" }).eq("id", ticketId).eq("status", "pending");

    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Please check your name, email and phone number and try again." }, { status: 400 });
    }
    Sentry.captureException(err);
    console.error("[stk-push] payment could not be started:", err?.message || err);
    return NextResponse.json(
      { error: "We couldn't start your M-Pesa payment right now. Please try again in a moment, or reach us on WhatsApp if it keeps happening." },
      { status: 502 }
    );
  }
}
