import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDarajaToken } from "@/lib/daraja";

export const maxDuration = 30;

type Status = "ok" | "warn" | "fail";
type Check = { id: string; group: string; label: string; status: Status; detail: string };

const has = (...names: string[]) => names.some((n) => !!process.env[n]?.trim());

async function timed<T>(fn: () => Promise<T>) {
  const t = Date.now();
  try { return { ok: true as const, value: await fn(), ms: Date.now() - t }; }
  catch (e: any) { return { ok: false as const, error: String(e?.message || e).slice(0, 160), ms: Date.now() - t }; }
}

/** Live health report for admins. Never returns secret values — only whether each one is set. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only (two-step verification required)." }, { status: 403 });

  const checks: Check[] = [];
  const add = (group: string, id: string, label: string, status: Status, detail: string) => checks.push({ group, id, label, status, detail });
  const service = createServiceRoleClient();

  // ---- Database ----
  const db = await timed(async () => {
    const { count, error } = await service.from("profiles").select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  });
  add("Core", "db", "Database", db.ok ? (db.ms > 1500 ? "warn" : "ok") : "fail", db.ok ? `Reachable (${db.ms} ms) · ${db.value.toLocaleString()} members` : `Unreachable: ${db.error}`);

  // ---- Tickets & payments ----
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const cnt = async (build: (q: any) => any) => {
    const { count } = await build(service.from("tickets").select("id", { count: "exact", head: true }));
    return count ?? 0;
  };
  const [paid, failed, pendingStale, noPass, failedWithReceipt, checkedIn] = await Promise.all([
    cnt((q) => q.eq("status", "paid")),
    cnt((q) => q.eq("status", "failed")),
    cnt((q) => q.eq("status", "pending").lt("created_at", cutoff)),
    cnt((q) => q.eq("status", "paid").is("gate_pass_sent_at", null)),
    cnt((q) => q.eq("status", "failed").not("mpesa_receipt", "is", null)),
    cnt((q) => q.not("checked_in_at", "is", null)),
  ]);
  add("Tickets", "paid", "Paid tickets", "ok", `${paid} paid · ${checkedIn} checked in at the gate`);
  add("Tickets", "failed", "Failed payment attempts", failed > 40 ? "warn" : "ok", `${failed} failed attempts — normal (cancelled prompts, wrong PIN, timeouts). They take no money; you can delete them from the tickets list.`);
  add("Tickets", "stale", "Payments stuck 'pending'", pendingStale > 0 ? "warn" : "ok", pendingStale > 0 ? `${pendingStale} pending for over 15 minutes — the daily sweep will resolve them.` : "None stuck");
  add("Tickets", "nopass", "Paid tickets without a gate pass email", noPass > 0 ? "warn" : "ok", noPass > 0 ? `${noPass} paid ticket(s) whose gate pass hasn't been emailed. Use 'Resend gate pass' in the tickets list.` : "All paid tickets have had their gate pass sent");
  add("Tickets", "receipt", "Failed rows holding an M-Pesa receipt", failedWithReceipt > 0 ? "fail" : "ok", failedWithReceipt > 0 ? `${failedWithReceipt} — money may have moved without a ticket. Check these manually in M-Pesa.` : "None — no money is stuck");

  const { data: tiers } = await service.from("event_ticket_tiers").select("name, capacity, is_active");
  const unlimited = (tiers || []).filter((t: any) => t.is_active && t.capacity == null);
  add("Tickets", "capacity", "Ticket capacity limits", unlimited.length ? "warn" : "ok", unlimited.length ? `No limit set for: ${unlimited.map((t: any) => String(t.name).trim()).join(", ")}. Set one before bulk selling so you can't oversell.` : "Every active ticket type has a capacity");

  // ---- M-Pesa ----
  const env = (process.env.DARAJA_ENV || "sandbox").trim();
  const mpesaKeys = has("MPESA_CONSUMER_KEY", "DARAJA_CONSUMER_KEY") && has("MPESA_CONSUMER_SECRET", "DARAJA_CONSUMER_SECRET") && has("MPESA_SHORTCODE", "DARAJA_SHORTCODE") && has("MPESA_PASSKEY", "DARAJA_PASSKEY") && has("DARAJA_CALLBACK_URL", "DARAJA_CALLBACK_SECRET");
  if (!mpesaKeys) add("Payments", "mpesa-keys", "M-Pesa settings", "fail", "One or more M-Pesa settings are missing in Vercel.");
  else {
    const tok = await timed(() => getDarajaToken());
    add("Payments", "mpesa", "M-Pesa (Safaricom Daraja)", tok.ok ? (env === "production" ? "ok" : "warn") : "fail",
      tok.ok ? `Connected (${tok.ms} ms) · mode: ${env}${env === "production" ? "" : " — SANDBOX: real payments will NOT work. Set DARAJA_ENV=production."}` : `Safaricom rejected the login: ${tok.error}`);
  }
  add("Payments", "signing", "Gate-pass signing secret", has("TICKET_SIGNING_SECRET") ? "ok" : has("CRON_SECRET") ? "warn" : "fail", has("TICKET_SIGNING_SECRET") ? "Set" : "Not set — using CRON_SECRET as a fallback. Add TICKET_SIGNING_SECRET.");

  // ---- Email ----
  if (!has("RESEND_API_KEY")) add("Email", "resend", "Resend (email)", "fail", "RESEND_API_KEY is missing.");
  else {
    const r = await timed(async () => {
      const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, cache: "no-store" });
      if (res.status === 401 || res.status === 403) return { restricted: true as const };
      const body = await res.json();
      return { restricted: false as const, domains: (body?.data || []).map((d: any) => ({ name: d.name, status: d.status })) };
    });
    if (!r.ok) add("Email", "resend", "Resend (email)", "warn", `Couldn't reach Resend: ${r.error}`);
    else if (r.value.restricted) add("Email", "resend", "Resend (email)", "ok", "API key works for sending (it can't list domains — that's normal for a sending-only key).");
    else {
      const unverified = r.value.domains.filter((d: any) => d.status !== "verified");
      add("Email", "resend", "Resend domains", r.value.domains.length === 0 ? "fail" : unverified.length ? "warn" : "ok",
        r.value.domains.length === 0 ? "No sending domain added in Resend." : r.value.domains.map((d: any) => `${d.name}: ${d.status}`).join(" · "));
    }
  }
  add("Email", "from", "Sender address", has("RESEND_FROM_EMAIL") ? "ok" : "warn", has("RESEND_FROM_EMAIL") ? "RESEND_FROM_EMAIL is set" : "Using the built-in default sender.");
  const { data: camps } = await service.from("email_campaigns").select("subject, status, last_error, last_run_at, sent_count");
  const sending = (camps || []).filter((c: any) => c.status === "sending");
  const errored = (camps || []).find((c: any) => c.last_error && c.status !== "sent");
  add("Email", "campaigns", "Email campaigns", errored ? "warn" : "ok", errored ? `"${errored.subject}": ${errored.last_error}` : `${sending.length} in progress · ${(camps || []).filter((c: any) => c.status === "sent").length} fully sent`);

  // ---- Protection & extras ----
  add("Security", "captcha", "Bot protection (Cloudflare Turnstile)", has("NEXT_PUBLIC_TURNSTILE_SITE_KEY") && has("TURNSTILE_SECRET_KEY") ? "ok" : "warn",
    has("NEXT_PUBLIC_TURNSTILE_SITE_KEY") && has("TURNSTILE_SECRET_KEY") ? "Active" : "NOT active — add NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY so bots can't spam M-Pesa prompts or sign-ups.");
  if (has("UPSTASH_REDIS_REST_URL") && has("UPSTASH_REDIS_REST_TOKEN")) {
    const red = await timed(async () => {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    add("Security", "ratelimit", "Rate limiting (Upstash)", red.ok ? "ok" : "fail", red.ok ? `Working (${red.ms} ms)` : `Not responding: ${red.error}`);
  } else add("Security", "ratelimit", "Rate limiting (Upstash)", "fail", "Not configured — forms and payments are unprotected from floods.");
  add("Security", "cron", "Daily safety sweep", has("CRON_SECRET") ? "ok" : "fail", has("CRON_SECRET") ? "CRON_SECRET set" : "CRON_SECRET missing");
  add("Messaging", "sms", "Voting SMS codes (Africa's Talking)", has("AFRICASTALKING_API_KEY") && has("AFRICASTALKING_USERNAME") ? (has("OTP_HASH_SECRET") ? "ok" : "warn") : "warn",
    has("AFRICASTALKING_API_KEY") && has("AFRICASTALKING_USERNAME") ? (has("OTP_HASH_SECRET") ? "Configured" : "Configured; add OTP_HASH_SECRET too") : "Not configured — Gala voting codes can't be texted until AFRICASTALKING_* settings are added.");
  const { count: pushCount } = await service.from("push_subscriptions").select("id", { count: "exact", head: true });
  add("Messaging", "push", "Push notifications", has("VAPID_PRIVATE_KEY") && has("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ? ((pushCount ?? 0) > 0 ? "ok" : "warn") : "fail",
    has("VAPID_PRIVATE_KEY") && has("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ? `${pushCount ?? 0} device(s) subscribed` : "VAPID keys missing");
  add("Core", "sentry", "Error monitoring (Sentry)", has("NEXT_PUBLIC_SENTRY_DSN") ? "ok" : "warn", has("NEXT_PUBLIC_SENTRY_DSN") ? "Active" : "Not configured");

  return NextResponse.json({ checkedAt: new Date().toISOString(), checks });
}
