import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendCampaignBatch, ResendError, type CampaignMessage } from "@/lib/resend";
import { requireAdmin } from "@/lib/admin";
import { isValidEmail, personalize, campaignFooterHtml, firstNameOf } from "@/lib/email";
import { SOCIALS } from "@/lib/constants";
import * as Sentry from "@sentry/nextjs";

// Vercel Hobby allows 60s per request. Big lists are sent in a resumable way: each request
// sends as many batches as fit in the time budget, records progress, and the admin presses
// "Continue sending" until everything is out. Nobody receives a duplicate.
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000;
const BATCH = 100; // Resend's batch endpoint accepts up to 100 emails per call
const PAUSE_MS = 600; // Resend's default limit is ~2 requests/second

type Recipient = { email: string; name: string | null };

// PostgREST returns at most 1000 rows per request, so list reads must be paged.
async function fetchAll(service: ReturnType<typeof createServiceRoleClient>, table: string, cols: string, activeOnly = false) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    let q = service.from(table).select(cols).order("email", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// Who has already been handled for a campaign (email -> "sent" | "skipped"). Paged: PostgREST caps reads at 1000 rows.
async function loadDeliveries(service: ReturnType<typeof createServiceRoleClient>, campaignId: string) {
  const map = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from("email_campaign_deliveries")
      .select("email, status")
      .eq("campaign_id", campaignId)
      .order("email", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    (data || []).forEach((r: any) => map.set(String(r.email), String(r.status)));
    if (!data || data.length < 1000) break;
  }
  return map;
}

const FRIENDLY: Record<string, string> = {
  daily_quota_exceeded: "Your Resend plan's DAILY sending limit has been reached. Sending resumes automatically from the same point tomorrow (press Continue sending), or upgrade the Resend plan.",
  monthly_quota_exceeded: "Your Resend plan's MONTHLY sending limit has been reached. Upgrade the Resend plan to keep sending.",
  invalid_from_address: "The sending address isn't valid. Check RESEND_FROM_EMAIL in Vercel (format: Name <address@your-verified-domain>).",
  missing_api_key: "RESEND_API_KEY is missing in Vercel.",
  invalid_api_key: "RESEND_API_KEY in Vercel is invalid or was revoked — create a new key in Resend and update Vercel.",
  restricted_api_key: "The Resend API key is restricted to testing. Create a key with “Sending access” for your verified domain.",
};

/**
 * Sends one batch. If Resend rejects it because of a bad address (validation_error) the batch
 * is split in half repeatedly until the offending address(es) are isolated and skipped —
 * so one typo'd address can never block everyone else again.
 */
async function sendIsolating(msgs: CampaignMessage[], rejected: string[]): Promise<number> {
  if (msgs.length === 0) return 0;
  try {
    await sendCampaignBatch(msgs);
    return msgs.length;
  } catch (err: any) {
    if (!(err instanceof ResendError) || err.code !== "validation_error") throw err;
    if (msgs.length === 1) {
      rejected.push(msgs[0].to);
      return 0;
    }
    const mid = Math.ceil(msgs.length / 2);
    const a = await sendIsolating(msgs.slice(0, mid), rejected);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    const b = await sendIsolating(msgs.slice(mid), rejected);
    return a + b;
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });

  const { campaignId, testOnly } = await request.json();
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("email_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://uninexusconnectplatform.co.ke").replace(/\/$/, "");
  const footer = campaignFooterHtml(siteUrl, SOCIALS.uninexus.email);
  const build = (r: Recipient): CampaignMessage => ({
    to: r.email,
    subject: personalize(campaign.subject, r.name, false),
    html: personalize(campaign.body_html, r.name, true) + footer,
  });

  // ---- Test send: only to the signed-in admin, never touches campaign progress ----
  if (testOnly) {
    if (!admin.email) return NextResponse.json({ error: "Your admin account has no email address." }, { status: 400 });
    try {
      await sendCampaignBatch([{ ...build({ email: admin.email, name: firstNameOf(admin.user_metadata?.full_name) || null }), subject: `[TEST] ${personalize(campaign.subject, admin.user_metadata?.full_name, false)}` }]);
      return NextResponse.json({ test: true, to: admin.email });
    } catch (err: any) {
      Sentry.captureException(err);
      return NextResponse.json({ error: FRIENDLY[err?.code] || `Test email failed: ${err?.message || "unknown error"}` }, { status: 502 });
    }
  }

  if (campaign.status === "sent") return NextResponse.json({ error: "This campaign was already sent." }, { status: 409 });

  // ---- Build the recipient list: members + active newsletter subscribers, valid + de-duplicated ----
  let recipients: Recipient[];
  let invalidCount = 0;
  try {
    const [members, subscribers] = await Promise.all([
      fetchAll(service, "profiles", "email, full_name"),
      fetchAll(service, "newsletter_subscribers", "email", true),
    ]);
    const map = new Map<string, Recipient>();
    for (const row of [...members, ...subscribers]) {
      const email = String(row.email || "").trim().toLowerCase();
      if (!isValidEmail(email)) { invalidCount++; continue; }
      const existing = map.get(email);
      if (!existing || (!existing.name && row.full_name)) map.set(email, { email, name: row.full_name || null });
    }
    recipients = Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: `Couldn't load the recipient list: ${err?.message || "unknown error"}` }, { status: 500 });
  }

  if (recipients.length === 0) return NextResponse.json({ error: "No members with a valid email address to send to." }, { status: 400 });

  await service.from("email_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", campaignId);

  // ---- Work out who still needs this campaign. Every delivery is recorded per person, so a campaign
  //      can be paused/resumed any number of times and nobody is ever emailed twice. People who join
  //      later are picked up automatically by the next "Continue sending". ----
  let delivered: Map<string, string>;
  try {
    delivered = await loadDeliveries(service, campaignId);
    if (campaign.audience_from_campaign) {
      // A correction/follow-up: only the people who actually received the original campaign.
      const original = await loadDeliveries(service, campaign.audience_from_campaign);
      const allowed = new Set(Array.from(original.entries()).filter(([, st]) => st === "sent").map(([e]) => e));
      recipients = recipients.filter((r) => allowed.has(r.email));
    }
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: `Couldn't load delivery records: ${err?.message || "unknown error"}` }, { status: 500 });
  }

  const todo = recipients.filter((r) => !delivered.has(r.email));
  const started = Date.now();
  const rejectedNow: string[] = [];
  let processed = 0;

  try {
    while (processed < todo.length && Date.now() - started < TIME_BUDGET_MS) {
      const chunk = todo.slice(processed, processed + BATCH);
      const before = rejectedNow.length;
      await sendIsolating(chunk.map(build), rejectedNow);
      const rejectedSet = new Set(rejectedNow.slice(before));
      // Record exactly who was handled, BEFORE moving on, so a crash can never cause a double send.
      await service.from("email_campaign_deliveries").upsert(
        chunk.map((r) => ({ campaign_id: campaignId, email: r.email, status: rejectedSet.has(r.email) ? "skipped" : "sent" })),
        { onConflict: "campaign_id,email", ignoreDuplicates: true }
      );
      chunk.forEach((r) => delivered.set(r.email, rejectedSet.has(r.email) ? "skipped" : "sent"));
      processed += chunk.length;
      const skipped = Array.from(delivered.values()).filter((v) => v === "skipped").length;
      await service.from("email_campaigns").update({ sent_count: delivered.size, skipped_count: skipped, status: "sending" }).eq("id", campaignId);
      if (processed < todo.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[campaigns] send failed:", err?.code, err?.message || err);
    const reason = FRIENDLY[err?.code] || `${err?.message || "unknown error"}${err?.code === "validation_error" ? "" : " — a common cause is a sending domain that isn't verified in Resend."}`;
    await service.from("email_campaigns").update({ last_error: String(reason).slice(0, 300), last_run_at: new Date().toISOString() }).eq("id", campaignId);
    return NextResponse.json(
      { error: `Sending paused after ${delivered.size} of ${recipients.length}. ${reason} Press Continue sending to resume from the same point — nobody gets a duplicate.`, sent: delivered.size, total: recipients.length },
      { status: 502 }
    );
  }

  const remaining = todo.length - processed;
  const done = remaining <= 0;
  const skippedTotal = Array.from(delivered.values()).filter((v) => v === "skipped").length;
  await service
    .from("email_campaigns")
    .update(done ? { status: "sent", sent_at: new Date().toISOString(), sent_count: delivered.size, skipped_count: skippedTotal, last_error: null } : { status: "sending", sent_count: delivered.size, skipped_count: skippedTotal, last_error: null })
    .eq("id", campaignId);

  return NextResponse.json({
    sent: delivered.size - skippedTotal,
    total: recipients.length,
    done,
    remaining,
    skippedInvalid: invalidCount,
    rejected: rejectedNow.slice(0, 20),
  });
}
