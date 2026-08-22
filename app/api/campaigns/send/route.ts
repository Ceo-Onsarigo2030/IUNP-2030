import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendCampaignEmail } from "@/lib/resend";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user?.id || "").eq("role", "admin").maybeSingle();
  if (!user || !role) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { campaignId } = await request.json();
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("email_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const { data: members } = await service.from("profiles").select("email");
  // Previously any null/blank email in this list (a profile created without one)
  // would make Resend reject the ENTIRE batch send, and since nothing here was
  // wrapped in a try/catch, the whole request threw — the admin panel's "Send"
  // button doesn't check the response at all, so this failed completely
  // invisibly: no error shown, and the campaign stayed marked "Draft" forever,
  // exactly matching "I tried sending and nothing happened."
  const recipients = (members || []).map((m: any) => m.email).filter((e: string) => e && e.includes("@"));

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No members with a valid email address to send to." }, { status: 400 });
  }

  try {
    await sendCampaignEmail({ to: recipients, subject: campaign.subject, html: campaign.body_html });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[campaigns] send failed:", err?.message || err);
    return NextResponse.json(
      { error: `Sending failed: ${err?.message || "unknown error"}. The campaign is still saved as a draft — check Resend's dashboard for the exact cause (a common one is an unverified sending domain).` },
      { status: 502 }
    );
  }

  await service.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaignId);

  return NextResponse.json({ sent: recipients.length });
}
