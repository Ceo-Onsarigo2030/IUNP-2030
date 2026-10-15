// Shared email helpers — pure functions, safe to import from server routes and client components.

// Strict enough to reject the typos that used to break whole campaign batches
// ("name@gmail", "name@gmail.c"): needs a dotted domain and a TLD of 2+ letters.
const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.length <= 254 && !v.includes("..") && !v.startsWith(".") && EMAIL_RE.test(v);
}

const COMMON_DOMAIN_FIXES: Record<string, string> = {
  "gmail": "gmail.com", "gmail.c": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com",
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.cm": "gmail.com",
  "yahoo": "yahoo.com", "yahoo.c": "yahoo.com", "yahoo.con": "yahoo.com",
  "hotmail": "hotmail.com", "hotmail.c": "hotmail.com", "hotmail.con": "hotmail.com",
  "outlook": "outlook.com", "outlook.c": "outlook.com", "outlook.con": "outlook.com",
};

/** If the address looks like a typo of a common provider, return the corrected address. */
export function suggestEmailFix(value: string): string | null {
  const v = value.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const fixed = COMMON_DOMAIN_FIXES[v.slice(at + 1)];
  return fixed ? `${v.slice(0, at)}@${fixed}` : null;
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function firstNameOf(fullName?: string | null) {
  const first = (fullName || "").trim().split(/\s+/)[0] || "";
  if (!first) return "";
  // "JOHN" -> "John"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Replaces {{first_name}} / {{name}} (any spacing) in a subject or HTML body. */
export function personalize(template: string, fullName?: string | null, asHtml = true) {
  const first = firstNameOf(fullName) || "there";
  const full = (fullName || "").trim() || "there";
  const safe = (s: string) => (asHtml ? escapeHtml(s) : s);
  return template
    .replace(/\{\{\s*first_name\s*\}\}/gi, safe(first))
    .replace(/\{\{\s*name\s*\}\}/gi, safe(full));
}

export function campaignFooterHtml(siteUrl: string, contactEmail: string) {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#8a8780;font-size:12px;line-height:1.6;text-align:center;padding:22px 12px;">
  You're receiving this because you're a UniNexus Connect member or newsletter subscriber.<br>
  To stop these emails, reply with &ldquo;unsubscribe&rdquo; or write to <a href="mailto:${contactEmail}" style="color:#8a8780;">${contactEmail}</a>.<br>
  <a href="${siteUrl}/privacy" style="color:#8a8780;">Privacy Policy</a>
</div>`;
}
