import { NextResponse } from "next/server";
import { queryStkPush } from "@/lib/daraja";
import { issueTicket, failTicket } from "@/lib/tickets";
import { safeEqual } from "@/lib/ticket-security";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  // Shared secret in the callback URL, compared in constant time. Wrong or missing -> reject quietly.
  if (!safeEqual(url.searchParams.get("key"), process.env.DARAJA_CALLBACK_SECRET)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });
  }
  const stkCallback = payload?.Body?.stkCallback;
  if (!stkCallback?.CheckoutRequestID) return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });

  const checkoutRequestId = String(stkCallback.CheckoutRequestID);

  if (stkCallback.ResultCode !== 0) {
    await failTicket(checkoutRequestId);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Marked failed" });
  }

  // Never trust the callback body alone: ask Safaricom directly. If Safaricom says this payment
  // did NOT succeed, the callback is bogus — ignore it. (If Safaricom can't be reached we still
  // proceed, since the secret URL + exact-amount check already guard this path, and a real
  // payment must not be lost because of a network blip.)
  const verified = await queryStkPush(checkoutRequestId);
  if (verified.resultCode !== null && verified.resultCode !== "0") {
    Sentry.captureMessage(`Callback claimed success but Safaricom reports ${verified.resultCode} for ${checkoutRequestId}`, "warning");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Not confirmed" });
  }

  const items: any[] = stkCallback.CallbackMetadata?.Item || [];
  const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value ?? null;
  const paidAmount = items.find((i) => i.Name === "Amount")?.Value ?? null;

  try {
    await issueTicket(checkoutRequestId, { receipt, paidAmount: paidAmount != null ? Number(paidAmount) : null });
  } catch (err) {
    Sentry.captureException(err);
    console.error("[daraja callback] issueTicket failed", checkoutRequestId, err);
  }

  // Always acknowledge so Safaricom doesn't keep retrying; recovery runs from the status check / daily sweep.
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Processed" });
}
