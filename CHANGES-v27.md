# UniNexus Connect v27 — what changed

## Fixes
- **Sign-up failing at ~1000 members** ("Database error saving new user"): membership-ID generator truncated ids ≥ 1000 → duplicates. Fixed (migration 0011, already applied live).
- Cron endpoint could be called with `Bearer undefined` if `CRON_SECRET` was unset → now refused.
- Security headers blocked Sentry in the browser → CSP now allows it (and Turnstile).
- Vote-hash secret no longer falls back to a public default.
- Origin check no longer trusts every `*.vercel.app` site.
- M-Pesa callback now verifies the amount paid equals the ticket price.
- Open-redirect hole in `/auth/callback` and login `?redirect=` closed.
- `.env.example` / defaults now use the live domain `uninexusconnectplatform.co.ke`.

## New
- `/privacy` (Privacy Policy) and `/terms` (Terms of Use), linked in the footer; sign-up requires accepting them.
- Cloudflare Turnstile CAPTCHA: sign-up, login, forgot-password (verified by Supabase) and Gala SMS-code requests (verified by our server).
- Two-step verification (authenticator app) for admins: `/admin/security`, `/auth/mfa`, middleware + API enforcement, optional DB enforcement (migration 0012).

## Scale
- Edge-cached `/api/stats` replaces per-visitor DB polling.
- Admin members: server-side search + paging (was capped at 1000 rows).
- Campaigns: full list (not capped at 1000), members + subscribers, resumable batches, Resend 50-recipient limit respected.
- Push: pages through all subscribers, parallel batches, bulk cleanup.
- DB indexes + least-privilege grants (migration 0011).

## Deploy order
1. Push code → Vercel deploys. 2. Add Turnstile keys, redeploy, then enable CAPTCHA in Supabase (README Step 12).
3. Admin sets up two-step (Step 13). 4. Run migration 0012. 5. Add the missing Vercel variables: `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_SENDER_ID`, `OTP_HASH_SECRET`.

---

# v28 additions
- **Email campaigns fixed.** Root cause: one malformed address among the saved emails (`name@gmail`, `name@gmail.c`) made Resend reject the whole batch, stopping every send. Now: invalid addresses are skipped, any address Resend still rejects is isolated automatically, and each person gets their own personalised email (`{{first_name}}`) instead of a BCC list.
- **Invitations:** invitation template (fill from an event or blank), live preview, "Send test to me", resumable sending with progress, unsubscribe footer + header.
- **Push notifications fixed.** Root cause: the opt-in button existed but was never shown anywhere, so 0 devices were subscribed. Now there is a pop-up prompt on the public site, a footer link, clearer errors, and the admin page shows how many devices will receive a message.
- **Institutions on Board de-duplicated** (migration 0013): spacing/case/punctuation/"The"/"Co-operative" variants and common typos merge. 222 → 188.
- Sign-up rejects incomplete emails and suggests fixes (`@gmail` → `@gmail.com`).
- Push subscriptions now link to the signed-in member from the session, not from request data.
- Optional env var: `RESEND_REPLY_TO` (where replies to campaigns go).
