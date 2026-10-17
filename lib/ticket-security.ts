import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Server-only. Ticket numbers come from a cryptographic RNG (the old ones used Math.random,
// which is predictable), and every gate-pass QR carries a short signature so a made-up
// ticket is rejected instantly, even before the database is consulted.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read out loud

export function secureTicketNumber() {
  const bytes = randomBytes(10);
  const pick = (from: number, n: number) =>
    Array.from(bytes.subarray(from, from + n), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `UNX-${pick(0, 4)}-${pick(4, 6)}`;
}

function signingSecret() {
  const s = process.env.TICKET_SIGNING_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error("TICKET_SIGNING_SECRET (or CRON_SECRET) must be set to sign gate passes.");
  return s;
}

function sig(ticketNumber: string) {
  return createHmac("sha256", signingSecret()).update(ticketNumber).digest("base64url").slice(0, 10);
}

/** What gets encoded into the QR code on the gate pass. */
export function signedQrPayload(ticketNumber: string) {
  return `${ticketNumber}.${sig(ticketNumber)}`;
}

/** Accepts "UNX-XXXX-XXXXXX" (typed/older passes) or "UNX-XXXX-XXXXXX.signature" (new QR codes). */
export function parseScannedCode(raw: string): { ticketNumber: string; signatureOk: boolean | null } {
  const code = raw.trim();
  const dot = code.lastIndexOf(".");
  if (dot === -1) return { ticketNumber: code.toUpperCase(), signatureOk: null };
  const ticketNumber = code.slice(0, dot).toUpperCase();
  const given = Buffer.from(code.slice(dot + 1));
  const expected = Buffer.from(sig(ticketNumber));
  return { ticketNumber, signatureOk: given.length === expected.length && timingSafeEqual(given, expected) };
}

/** Constant-time string comparison for shared secrets. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
