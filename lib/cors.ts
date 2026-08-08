function normalize(origin: string) {
  return origin.trim().toLowerCase().replace(/\/+$/, "");
}

const STATIC_ALLOWED = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  "http://localhost:3000",
]
  .filter(Boolean)
  .map((o) => normalize(o as string));

/**
 * Returns a 403 Response if the request's Origin header is present and not allow-listed.
 * Requests with no Origin header (server-to-server calls, e.g. Safaricom's Daraja callback,
 * or same-origin navigations in some browsers) are allowed through unchanged.
 *
 * NOTE: this used to compare only against `NEXT_PUBLIC_SITE_URL`. In practice that env var
 * is easy to leave unset, out of date, or mismatched (custom domain vs *.vercel.app, http vs
 * https, a trailing slash) — any of which made a completely legitimate ticket purchase from
 * the site's own pages get rejected here with "Origin not allowed.", which stopped the STK
 * push before Safaricom ever got a chance to prompt the buyer for their M-Pesa PIN. This
 * version always trusts the request's own host (a POST from the site to its own API route is
 * same-origin in every real scenario) and any *.vercel.app preview deployment of this project,
 * on top of the configured origins, so a missing/incorrect env var can no longer block real
 * purchases.
 */
export function enforceCors(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const normalizedOrigin = normalize(origin);

  const host = request.headers.get("host");
  if (host) {
    const selfOrigins = [normalize(`https://${host}`), normalize(`http://${host}`)];
    if (selfOrigins.includes(normalizedOrigin)) return null;
  }

  if (STATIC_ALLOWED.includes(normalizedOrigin)) return null;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol === "https:" && hostname.endsWith(".vercel.app")) return null;
  } catch {
    // Malformed Origin header — fall through to reject below.
  }

  console.warn(`[cors] Rejected request from origin "${origin}" (request host: "${host || "unknown"}").`);

  return new Response(JSON.stringify({ error: "Origin not allowed." }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
