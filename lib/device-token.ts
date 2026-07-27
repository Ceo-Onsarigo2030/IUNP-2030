import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

const COOKIE_NAME = "unx_device";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

/**
 * Returns the device token from the request's cookies, or creates a new one.
 * Must be called from a Server Action or Route Handler (needs cookie write access).
 */
export function getOrCreateDeviceToken(): string {
  const store = cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = randomBytes(24).toString("hex");
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TWO_YEARS,
    path: "/",
  });
  return token;
}

export function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}
