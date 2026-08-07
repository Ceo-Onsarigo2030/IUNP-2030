import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { initiateStkPush, normalizePhone } from "@/lib/daraja";
import { stkPushLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({
  eventId: z.string().uuid(),
  tierId: z.string().uuid(),
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

    const { data: tier, error: tierErr } = await supabase
      .from("event_ticket_tiers")
      .select("*")
      .eq("id", body.tierId)
      .eq("event_id", body.eventId)
      .maybeSingle();
    if (tierErr || !tier) return NextResponse.json({ error: "That ticket tier isn't available for this event." }, { status: 400 });

    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712345678." }, { status: 400 });
    }

    // No capacity check existed before this — a tier's `capacity` column was set by
    // the admin but never actually enforced anywhere, so it could be oversold once
    // many buyers came in around the same time. This isn't perfectly race-proof
    // under extreme simultaneous load (a proper fix needs an atomic reserved-seat
    // counter), but it closes the gap for the realistic case: once a tier is sold
    // out, further buyers are stopped here, before Safaricom ever charges them.
    if (tier.capacity != null) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const [{ count: paidCount }, { count: recentPendingCount }] = await Promise.all([
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("tier_id", tier.id).eq("status", "paid"),
        // A "pending" ticket whose STK prompt was never answered (PIN never entered,
        // or the buyer just closed the app) would otherwise sit there forever and
        // permanently eat into capacity. Only count pending attempts from the last
        // 10 minutes — comfortably longer than Safaricom's own STK prompt timeout —
        // as still "in flight"; older ones are treated as abandoned.
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("tier_id", tier.id).eq("status", "pending").gte("created_at", tenMinutesAgo),
      ]);
      if ((paidCount ?? 0) + (recentPendingCount ?? 0) >= tier.capacity) {
        return NextResponse.json({ error: "This ticket tier is sold out." }, { status: 409 });
      }
    }

    const { checkoutRequestId, merchantRequestId } = await initiateStkPush({
      phone,
      amount: Number(tier.price),
      accountRef: event.slug,
      description: `${event.title} - ${tier.name}`,
    });

    const { error: insertErr } = await supabase.from("tickets").insert({
      event_id: event.id,
      tier_id: tier.id,
      buyer_name: body.name,
      buyer_email: body.email,
      buyer_phone: phone,
      amount: tier.price,
      status: "pending",
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
    });
    if (insertErr) throw insertErr;

    return NextResponse.json({ checkoutRequestId });
  } catch (err: any) {
    // Previously this returned err.message straight to the buyer, so a config/auth
    // problem on our end showed up on the checkout screen as raw text like "Failed
    // to authenticate with Daraja." — confusing, and it looked like the buyer's
    // fault. The real reason is now logged server-side (see lib/daraja.ts) for the
    // admin to check in Vercel; the buyer just gets a plain, actionable message.
    Sentry.captureException(err);
    console.error("[stk-push] payment could not be started:", err?.message || err);
    return NextResponse.json(
      { error: "We couldn't start your M-Pesa payment right now. Please try again in a moment, or reach us on WhatsApp if it keeps happening." },
      { status: 502 }
    );
  }
}
