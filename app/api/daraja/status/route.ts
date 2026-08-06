import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { statusPollLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";

export async function GET(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const blocked = await enforceRateLimit(statusPollLimiter, `status:${clientIp(request)}`);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const checkoutRequestId = searchParams.get("checkout_request_id");
  if (!checkoutRequestId) return NextResponse.json({ error: "Missing checkout_request_id" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("tickets").select("status").eq("checkout_request_id", checkoutRequestId).maybeSingle();

  return NextResponse.json({ status: data?.status || "pending" });
}
