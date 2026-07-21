import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ensureWebPushConfigured, webpush } from "@/lib/web-push";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user?.id || "").eq("role", "admin").maybeSingle();
  if (!user || !role) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { title, message, url } = await request.json();
  ensureWebPushConfigured();

  const service = createServiceRoleClient();
  const { data: subs } = await service.from("push_subscriptions").select("*");

  let sent = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
        JSON.stringify({ title, body: message, url: url || "/" })
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await service.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ sent });
}
