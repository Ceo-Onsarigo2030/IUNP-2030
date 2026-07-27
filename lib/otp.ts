import { createHash, randomInt } from "crypto";
import { normalizePhone } from "@/lib/daraja";

export { normalizePhone };

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

export function hashValue(value: string) {
  const pepper = process.env.OTP_HASH_SECRET || process.env.CRON_SECRET || "unx-fallback-pepper";
  return createHash("sha256").update(`${value}:${pepper}`).digest("hex");
}
