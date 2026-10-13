// Server-side Cloudflare Turnstile verification for our own API routes (e.g. the Gala
// SMS-code request, which costs real money per message). Login / sign-up / password
// reset are verified by Supabase Auth itself once CAPTCHA is switched on in its
// dashboard — see README "Step 12".
//
// If TURNSTILE_SECRET_KEY isn't set yet, verification is skipped so a deploy made before
// the keys exist never breaks the site.
export async function verifyTurnstile(token: string | undefined | null, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}
