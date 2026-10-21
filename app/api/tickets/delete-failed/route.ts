import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Removes FAILED payment attempts from the ticket list (they never produced a ticket or took money,
 * but clutter the lists and exports). Hard safety rules, enforced here on the server:
 *   - only rows whose status is "failed" can ever be deleted — paid / pending rows are untouched;
 *   - a "failed" row that carries an M-Pesa receipt is NEVER deleted (that would be money without a
 *     ticket and needs a human to look at it) — it is reported back instead.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });

  const { ticketIds } = await request.json().catch(() => ({}));
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });
  if (ticketIds.length > 500) return NextResponse.json({ error: "Select at most 500 at a time." }, { status: 400 });
  const ids = ticketIds.filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x));

  const service = createServiceRoleClient();
  const { data: candidates, error } = await service
    .from("tickets")
    .select("id, status, mpesa_receipt")
    .in("id", ids)
    .eq("status", "failed");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const safe = (candidates || []).filter((t) => !t.mpesa_receipt).map((t) => t.id);
  const needsReview = (candidates || []).length - safe.length;

  let deleted = 0;
  if (safe.length > 0) {
    const { data: gone, error: delErr } = await service.from("tickets").delete().in("id", safe).eq("status", "failed").select("id");
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    deleted = gone?.length ?? 0;
  }
  return NextResponse.json({ deleted, skipped: ids.length - deleted, needsReview });
}
