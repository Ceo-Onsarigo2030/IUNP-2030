import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public live-stats. The browser used to call the database directly every 15 seconds per
// visitor; with thousands of visitors that is a constant load. This endpoint is cached at
// Vercel's edge for 60s, so the database is hit about once a minute no matter how many
// people have the homepage open.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await supabase.rpc("get_public_stats");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    {
      members: Number(row.members) || 0,
      disability: Number(row.disability) || 0,
      institutions: Number(row.institutions) || 0,
      events: Number(row.events) || 0,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
