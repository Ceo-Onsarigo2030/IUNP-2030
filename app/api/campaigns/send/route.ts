import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendCampaignEmail } from "@/lib/resend";
import { requireAdmin } from "@/lib/admin";
import * as Sentry from "@sentry/nextjs";

// Vercel Hobby allows up to 60s per request. Large lists are sent in a resumable way:
// each request sends as many 50-recipient batches as fit in the time budget, records
// progress, and the admin presses "Send" again to continue until everything is out.
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000;
const BATCH = 49; // 1 "to" + 49 BCC = 50, Resend's per-email recipient cap
const PAUSE_MS = 600; // Resend's default limit is ~2 requests/second

// PostgREST returns at most 1000 rows per request, so list-style reads must be paged.
async function fetchAllEmails(service: ReturnType<typeof createServiceRoleClient>, table: string, activeOnly = false) {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    let q = service.from(table).select("email").order("email", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    (data || []).forEach((r: any) => r.email && out.push(String(r.email).trim().toLowerCase()));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });

  const { campaignId } = await request.json();
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("email_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (campaign.status === "sent") return NextResponse.json({ error: "This campaign was already sent." }, { status: 409 });

  let recipients: string[];
  try {
    // Members + active newsletter subscribers, de-duplicated, in a stable order so a
    // resumed send continues exactly where the previous request stopped.
    const [members, subscribers] = await Promise.all([
      fetchAllEmails(service, "profiles"),
      fetchAllEmails(service, "newsletter_subscribers", true),
    ]);
    recipients = Array.from(new Set([...members, ...subscribers])).filter((e) => e.includes("@")).sort();
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: `Couldn't load the recipient list: ${err?.message || "unknown error"}` }, { status: 500 });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No members with a valid email address to send to." }, { status: 400 });
  }

  const started = Date.now();
  let sentCount = Math.min(campaign.sent_count || 0, recipients.length);

  try {
    while (sentCount < recipients.length && Date.now() - started < TIME_BUDGET_MS) {
      const chunk = recipients.slice(sentCount, sentCount + BATCH);
      await sendCampaignEmail({ to: chunk, subject: campaign.subject, html: campaign.body_html });
      sentCount += chunk.length;
      await service.from("email_campaigns").update({ sent_count: sentCount, status: "sending" }).eq("id", campaignId);
      if (sentCount < recipients.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[campaigns] send failed:", err?.message || err);
    return NextResponse.json(
      {
        error: `Sending stopped after ${sentCount} of ${recipients.length}: ${err?.message || "unknown error"}. Press Send again to resume — nobody gets a duplicate. A common cause is an unverified sending domain in Resend.`,
        sent: sentCount,
        total: recipients.length,
      },
      { status: 502 }
    );
  }

  const done = sentCount >= recipients.length;
  await service
    .from("email_campaigns")
    .update(done ? { status: "sent", sent_at: new Date().toISOString(), sent_count: sentCount } : { status: "sending", sent_count: sentCount })
    .eq("id", campaignId);

  return NextResponse.json({ sent: sentCount, total: recipients.length, done, remaining: recipients.length - sentCount });
}
