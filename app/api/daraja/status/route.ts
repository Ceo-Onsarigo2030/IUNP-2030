import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { queryStkPush } from "@/lib/daraja";
import { issueTicket, failTicket } from "@/lib/tickets";
import { ticketStatusIpLimiter, ticketStatusQueryLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";

// Safaricom result codes that mean the customer will not pay (cancelled, wrong PIN, timed out, insufficient funds …).
const FAILED_CODES = new Set(["1", "17", "1001", "1019", "1025", "1032", "1037", "2001", "2028", "9999"]);

export async function GET(request: Request) {
  const checkoutRequestId = new URL(request.url).searchParams.get("checkout_request_id");
  if (!checkoutRequestId || checkoutRequestId.length > 100) {
    return NextResponse.json({ error: "Missing checkout_request_id" }, { status: 400 });
  }

  const blocked = await enforceRateLimit(ticketStatusIpLimiter, `tstatus:${clientIp(request)}`);
  if (blocked) return blocked;

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("tickets").select("status, created_at").eq("checkout_request_id", checkoutRequestId).maybeSingle();
  if (!data) return NextResponse.json({ status: "pending" });
  if (data.status !== "pending") return NextResponse.json({ status: data.status });

  // Still pending after 20s? The callback may be late or lost (common under heavy load) —
  // ask Safaricom directly (at most once per 15s per payment) so a real payment is never missed.
  const ageMs = Date.now() - new Date(data.created_at).getTime();
  if (ageMs > 20_000 && !(await enforceRateLimit(ticketStatusQueryLimiter, `tquery:${checkoutRequestId}`))) {
    const { resultCode } = await queryStkPush(checkoutRequestId);
    if (resultCode === "0") {
      await issueTicket(checkoutRequestId, {});
      return NextResponse.json({ status: "paid" });
    }
    if (resultCode && FAILED_CODES.has(resultCode)) {
      await failTicket(checkoutRequestId);
      return NextResponse.json({ status: "failed" });
    }
  }
  return NextResponse.json({ status: "pending" });
}
