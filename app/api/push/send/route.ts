import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ensureWebPushConfigured, webpush } from "@/lib/web-push";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user?.id || "").eq("role", "admin").maybeSingle();
  if (!user || !role) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  try {
    const { title, message, url } = await request.json();

    // Previously nothing here was wrapped in a try/catch. If VAPID_PUBLIC_KEY /
    // VAPID_PRIVATE_KEY weren't set (or the public/private pair didn't match),
    // ensureWebPushConfigured() or the first sendNotification call would throw,
    // producing an unhandled server error — often a plain error page rather than
    // JSON. The admin panel's fetch expects JSON, so parsing that failure could
    // itself throw client-side, leaving the "Sending..." spinner stuck forever
    // with no message at all: exactly "I tried sending and nothing happened."
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Push notifications aren't configured yet — VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in Vercel." },
        { status: 500 }
      );
    }
    ensureWebPushConfigured();

    const service = createServiceRoleClient();
    const { data: subs } = await service.from("push_subscriptions").select("*");

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, note: "No one has enabled notifications yet — nothing to send to." });
    }

    let sent = 0;
    let failed = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
          JSON.stringify({ title, body: message, url: url || "/" })
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await service.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          // A non-expiry error (e.g. bad VAPID keys) would otherwise fail every
          // single subscriber identically and silently — log the first one so
          // it's visible in Vercel/Sentry instead of just a low "sent" count.
          Sentry.captureException(err);
        }
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[push] send failed:", err?.message || err);
    return NextResponse.json({ error: `Sending failed: ${err?.message || "unknown error"}` }, { status: 500 });
  }
}
