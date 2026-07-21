import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { pushSubscribeLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const blocked = await enforceRateLimit(pushSubscribeLimiter, `push-sub:${clientIp(request)}`);
  if (blocked) return blocked;

  try {
    const { endpoint, keys, userId } = await request.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, user_id: userId || null },
      { onConflict: "endpoint" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
