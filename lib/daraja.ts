import * as Sentry from "@sentry/nextjs";

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

// Cached in module scope — a warm serverless instance reuses this instead of
// re-authenticating with Safaricom on every single ticket purchase, which is
// most of the delay users feel before the STK prompt reaches their phone.
// Daraja tokens are valid ~1 hour; refreshed 2 minutes early to be safe.
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getDarajaToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const key = (process.env.MPESA_CONSUMER_KEY || "").trim();
  const secret = (process.env.MPESA_CONSUMER_SECRET || "").trim();
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(`${BASE_URL()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    Sentry.captureMessage("Daraja OAuth failed", {
      level: "error",
      extra: {
        status: res.status,
        body: bodyText || "(empty response body)",
        env: process.env.DARAJA_ENV,
        baseUrl: BASE_URL(),
        keyLength: key.length,
        keyLooksQuoted: key.startsWith('"') || key.endsWith('"'),
        secretLength: secret.length,
        secretLooksQuoted: secret.startsWith('"') || secret.endsWith('"'),
      },
    });
    // Logged with real detail above (visible in Sentry/Vercel logs) — the most common
    // causes are a wrong MPESA_CONSUMER_KEY/SECRET, a quoted/whitespace-padded env var
    // value in Vercel, or a DARAJA_ENV/credential mismatch (sandbox credentials used
    // with DARAJA_ENV=production, or vice versa).
    throw new Error("Failed to authenticate with Daraja.");
  }

  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
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
  const ts = timestamp();
  const shortcode = process.env.MPESA_SHORTCODE;
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString("base64");

  const res = await fetch(`${BASE_URL()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.max(1, Math.round(amount)),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL,
      AccountReference: accountRef.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== "0") {
    Sentry.captureMessage("Daraja STK push rejected", {
      level: "error",
      extra: { status: res.status, response: data },
    });
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push request failed.");
  }
  return { checkoutRequestId: data.CheckoutRequestID as string, merchantRequestId: data.MerchantRequestID as string };
}
