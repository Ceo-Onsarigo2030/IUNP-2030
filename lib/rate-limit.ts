import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

function makeLimiter(requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

// Payment initiation — tightest limit, protects Daraja quota + prevents prompt-spamming a phone number.
export const stkPushLimiter = makeLimiter(5, "10 m");
// Public form submissions — feedback, newsletter, comments.
export const publicFormLimiter = makeLimiter(10, "10 m");
// Push subscription registration.
export const pushSubscribeLimiter = makeLimiter(20, "1 h");

export function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Applies a limiter if configured. Returns null when allowed, or a 429 Response when blocked.
 * If Upstash isn't configured (e.g. local dev), rate limiting is skipped rather than blocking requests.
 */
export async function enforceRateLimit(limiter: Ratelimit | null, key: string) {
  if (!limiter) return null;
  const { success, reset } = await limiter.limit(key);
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
  });
}
