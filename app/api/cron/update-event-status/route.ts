import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  // Anything current or upcoming whose start time has passed moves to "past".
  // (A simple "starts_at < now" heuristic — swap for an explicit ends_at column if events run multi-day.)
  const { data: expired } = await supabase
    .from("events")
    .update({ status: "past" })
    .lt("starts_at", nowIso)
    .in("status", ["current", "upcoming"])
    .select("id");

  // If no event is marked "current" anymore, promote the soonest upcoming one.
  const { data: currentEvent } = await supabase.from("events").select("id").eq("status", "current").maybeSingle();
  let promoted = null;
  if (!currentEvent) {
    const { data: nextUp } = await supabase
      .from("events")
      .select("id")
      .eq("status", "upcoming")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextUp) {
      await supabase.from("events").update({ status: "current" }).eq("id", nextUp.id);
      promoted = nextUp.id;
    }
  }

  return NextResponse.json({ expired: expired?.length || 0, promoted });
}
