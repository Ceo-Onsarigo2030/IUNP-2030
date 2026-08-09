import * as Sentry from "@sentry/nextjs";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const TOKEN_CACHE_KEY = "daraja:oauth-token";

const BASE_URL = () =>
  process.env.DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

/**
 * Reads the first set env var among several possible names and trims it.
 * The project's .env.example documents DARAJA_* names, but this Vercel project
 * was actually configured with MPESA_* names for the shortcode/till/passkey
 * (real production credentials for a Till/Buy Goods account) — rather than
 * make the admin rename anything in Vercel, the code now accepts either.
 * .trim() matters: a key/secret pasted from the Daraja portal into Vercel's
 * env var UI very commonly picks up a trailing newline/space, which silently
 * breaks the Base64 Authorization header.
 */
function envAny(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function requiredEnvAny(names: string[]) {
  const value = envAny(names);
  if (!value) {
    throw new Error(
      `Daraja is not configured: none of these environment variables are set in Vercel: ${names.join(", ")}.`
    );
  }
  return value;
}

// Safaricom's OAuth token is valid for ~3600 seconds. Previously every single STK
// push call fetched a brand new token first — meaning every ticket buyer waited
// through TWO sequential Safaricom round-trips (get a token, then start the STK
// push) before their phone even prompted for a PIN. Caching the token cuts that
// to one round-trip for most purchases.
//
// Two layers: an in-memory cache (fast, but only shared within one warm Vercel
// instance) and Redis (shared across EVERY instance). Under a burst of
// concurrent buyers, Vercel spins up multiple separate instances in parallel —
// each starts with an empty in-memory cache, so without Redis a concurrent rush
// could still cause several redundant OAuth calls instead of ideally one.
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getDarajaToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (redis) {
    try {
      const shared = await redis.get<{ token: string; expiresAt: number }>(TOKEN_CACHE_KEY);
      if (shared && shared.expiresAt > Date.now()) {
        cachedToken = shared;
        return shared.token;
      }
    } catch {
      // Redis unreachable — fall through and fetch a fresh token directly.
    }
  }

  const consumerKey = requiredEnvAny(["DARAJA_CONSUMER_KEY", "MPESA_CONSUMER_KEY"]);
  const consumerSecret = requiredEnvAny(["DARAJA_CONSUMER_SECRET", "MPESA_CONSUMER_SECRET"]);
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(`${BASE_URL()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  if (!res.ok) {
    // Log Safaricom's actual rejection reason (previously discarded) so the next
    // failure shows up in Vercel's runtime logs/Sentry with the real cause instead
    // of a dead end.
    const bodyText = await res.text().catch(() => "");
    const detail = `Safaricom OAuth rejected the request (HTTP ${res.status}, env=${process.env.DARAJA_ENV || "sandbox"}): ${bodyText.slice(0, 500)}`;
    Sentry.captureMessage(detail, "error");
    console.error("[daraja] " + detail);
    throw new Error("Failed to authenticate with Daraja.");
  }

  const data = await res.json();
  const expiresInSeconds = Number(data.expires_in) || 3600;
  const expiresAt = Date.now() + (expiresInSeconds - 120) * 1000;
  cachedToken = { token: data.access_token, expiresAt };

  if (redis) {
    try {
      await redis.set(TOKEN_CACHE_KEY, cachedToken, { exat: Math.floor(expiresAt / 1000) });
    } catch {
      // Best-effort — the in-memory cache above still works for this instance.
    }
  }

  return cachedToken.token;
}

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export async function initiateStkPush({
  phone, amount, accountRef, description,
}: { phone: string; amount: number; accountRef: string; description: string }) {
  const token = await getDarajaToken();

  // MPESA_SHORTCODE: the online shortcode Safaricom issued for this STK Push app —
  // used to generate the password/auth, NOT necessarily what the customer sees.
  // MPESA_TILL: the actual Till (Buy Goods) number Bridging Academia Connect
  // Organization's till pays into — that's PartyB, the account the money lands in.
  // Previously the code only knew a single "DARAJA_SHORTCODE" and always sent
  // TransactionType "CustomerPayBillOnline" — wrong for a Till/Buy Goods account,
  // which Safaricom will simply reject (that's the actual root cause of the
  // "Failed to authenticate with Daraja." / STK push failures here).
  const shortcode = requiredEnvAny(["MPESA_SHORTCODE", "DARAJA_SHORTCODE"]);
  const till = envAny(["MPESA_TILL"]) || shortcode;
  const passkey = requiredEnvAny(["MPESA_PASSKEY", "DARAJA_PASSKEY"]);
  const isBuyGoods = Boolean(envAny(["MPESA_TILL"]));

  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

  const res = await fetch(`${BASE_URL()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: isBuyGoods ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
      Amount: Math.max(1, Math.round(amount)),
      PartyA: phone,
      PartyB: till,
      PhoneNumber: phone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL,
      AccountReference: accountRef.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== "0") {
    const detail = `STK push rejected (HTTP ${res.status}, env=${process.env.DARAJA_ENV || "sandbox"}, type=${isBuyGoods ? "BuyGoods" : "PayBill"}): ${JSON.stringify(data).slice(0, 500)}`;
    Sentry.captureMessage(detail, "error");
    console.error("[daraja] " + detail);
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push request failed.");
  }
  return { checkoutRequestId: data.CheckoutRequestID as string, merchantRequestId: data.MerchantRequestID as string };
}
