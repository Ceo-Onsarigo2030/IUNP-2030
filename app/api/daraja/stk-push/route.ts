import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { initiateStkPush, normalizePhone } from "@/lib/daraja";
import { stkPushLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(9),
});

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  try {
    const body = schema.parse(await request.json());
    const phone = normalizePhone(body.phone);

    // Rate limit by phone number (primary abuse vector) and IP (secondary).
    const blocked =
      (await enforceRateLimit(stkPushLimiter, `stk:phone:${phone}`)) ||
      (await enforceRateLimit(stkPushLimiter, `stk:ip:${clientIp(request)}`));
    if (blocked) return blocked;

    const supabase = createServiceRoleClient();

    const { data: event, error: eventErr } = await supabase.from("events").select("*").eq("id", body.eventId).maybeSingle();
    if (eventErr || !event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (!event.ticket_price) return NextResponse.json({ error: "This event has no ticketing configured." }, { status: 400 });

    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712345678." }, { status: 400 });
    }

    const { checkoutRequestId, merchantRequestId } = await initiateStkPush({
      phone,
      amount: Number(event.ticket_price),
      accountRef: event.slug,
      description: event.title,
    });

    const { error: insertErr } = await supabase.from("tickets").insert({
      event_id: event.id,
      buyer_name: body.name,
      buyer_email: body.email,
      buyer_phone: phone,
      amount: event.ticket_price,
      status: "pending",
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
    });
    if (insertErr) throw insertErr;

    return NextResponse.json({ checkoutRequestId });
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
