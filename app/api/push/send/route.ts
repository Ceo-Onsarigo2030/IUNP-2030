import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { ensureWebPushConfigured, webpush } from "@/lib/web-push";
import * as Sentry from "@sentry/nextjs";

// Many subscribers: send in parallel batches of 25 and stop at ~50s (Vercel Hobby limit is 60s).
export const maxDuration = 60;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });

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

    // PostgREST caps a single read at 1000 rows, so page through every subscription.
    const subs: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await service
        .from("push_subscriptions")
        .select("*")
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      subs.push(...(data || []));
      if (!data || data.length < 1000) break;
    }

    if (subs.length === 0) {
      return NextResponse.json({ sent: 0, note: "No one has enabled notifications yet — nothing to send to." });
    }

    const payload = JSON.stringify({ title, body: message, url: url || "/" });
    const deadline = Date.now() + 50_000;
    let sent = 0;
    let failed = 0;
    let processed = 0;
    const expired: string[] = [];
    let reportedOther = false;

    for (let i = 0; i < subs.length && Date.now() < deadline; i += 25) {
      const batch = subs.slice(i, i + 25);
      await Promise.all(
        batch.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
              payload
            );
            sent++;
          } catch (err: any) {
            failed++;
            if (err.statusCode === 410 || err.statusCode === 404) {
              expired.push(sub.id);
            } else if (!reportedOther) {
              // A non-expiry error (e.g. bad VAPID keys) fails every subscriber identically — report once.
              reportedOther = true;
              Sentry.captureException(err);
            }
          }
        })
      );
      processed += batch.length;
    }

    // Clean out dead subscriptions in bulk instead of one query per subscriber.
    for (let i = 0; i < expired.length; i += 200) {
      await service.from("push_subscriptions").delete().in("id", expired.slice(i, i + 200));
    }

    if (processed < subs.length) {
      return NextResponse.json({ sent, failed, total: subs.length, note: `Time limit reached after ${processed} of ${subs.length} devices — press Send again to reach the rest (devices already notified will get it again).` });
    }

    return NextResponse.json({ sent, failed });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[push] send failed:", err?.message || err);
    return NextResponse.json({ error: `Sending failed: ${err?.message || "unknown error"}` }, { status: 500 });
  }
}
