import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkoutRequestId = searchParams.get("checkout_request_id");
  if (!checkoutRequestId) return NextResponse.json({ error: "Missing checkout_request_id" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("tickets").select("status").eq("checkout_request_id", checkoutRequestId).maybeSingle();

  return NextResponse.json({ status: data?.status || "pending" });
}
