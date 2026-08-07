import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendCampaignEmail } from "@/lib/resend";

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
  const recipients = (members || []).map((m: any) => m.email);

  await sendCampaignEmail({ to: recipients, subject: campaign.subject, html: campaign.body_html });
  await service.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaignId);

  return NextResponse.json({ sent: recipients.length });
}
