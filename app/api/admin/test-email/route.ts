import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendCampaignBatch } from "@/lib/resend";

// Sends a small test email to the signed-in admin only. Requires an admin with two-step verification;
// it can never be used to email anyone else.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin?.email) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });
  try {
    await sendCampaignBatch([{
      to: admin.email,
      subject: "UniNexus Connect — email test",
      html: "<p style=\"font-family:Arial,sans-serif\">This is a test message from your UniNexus Connect admin panel. If you can read this, email sending works.</p>",
    }]);
    return NextResponse.json({ ok: true, to: admin.email });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Sending failed." }, { status: 502 });
  }
}
