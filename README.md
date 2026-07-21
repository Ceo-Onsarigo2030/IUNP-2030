# UniNexus Connect

**The Inter-Universities Nexus Platform — a flagship initiative of B.A Connect Organization.**
*Bridging Campus. Building Futures.*

Full-stack build: Next.js 14 (App Router) + Supabase + M-Pesa Daraja + Resend + Web Push + Upstash (rate limiting) + Sentry (error tracking), deployed on Vercel.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript |
| Styling | Tailwind CSS — black / gold / cream, Cormorant Garamond + Inter |
| Database & Auth | Supabase (Postgres, Auth, RLS, Storage) |
| Payments | Safaricom Daraja STK Push (M-Pesa) |
| Email | Resend (campaigns + gate passes) |
| Push | Web Push API + VAPID |
| Rate limiting | Upstash Redis |
| Error tracking | Sentry |
| Hosting | Vercel (cron included) |
| Source control | GitHub |

---

## Step-by-step setup — do these in order

### Step 1 — Install and run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The site will 404 on data-driven pages until Step 2 is done — that's expected.

### Step 2 — Create the Supabase project

1. Go to supabase.com → New project. Save the database password somewhere safe.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose this to the browser — it's server-only)
3. Open the **SQL Editor**, paste the entire contents of `supabase/migrations/0001_init.sql`, and run it. It's idempotent, so re-running it later after edits is safe.
4. Go to **Authentication → Providers → Google**, enable it, and add these to your Google Cloud OAuth client's authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - `https://<your-vercel-domain>/auth/callback` (add this once you know your Vercel URL, after Step 9)

### Step 3 — Seed your first admin account

Admins never use the sign-up form — they're created directly in Supabase and only log in.

1. **Authentication → Users → Add user** → set an email + password.
2. Copy that user's UUID from the users table.
3. Back in the **SQL Editor**, run (replacing the UUID and details):
   ```sql
   insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');
   insert into public.profiles (id, full_name, email, category, signup_method)
   values ('<uuid>', 'Admin Name', 'admin@uninexusconnect.org', 'other', 'form');
   ```
4. That admin now logs in at `/auth` with those exact credentials and lands in `/admin`.

### Step 4 — Set up Upstash (rate limiting)

1. Go to upstash.com → Create a Redis database (any free-tier region close to your users, e.g. `eu-west-1`).
2. Copy the **REST URL** and **REST Token** into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. If these are left blank, rate limiting silently no-ops rather than breaking the site — but don't skip this for production.

### Step 5 — Set up Resend (email)

1. Create an account at resend.com, add and verify your sending domain (DNS records they give you — SPF/DKIM).
2. Create an API key → `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to an address on your verified domain, e.g. `UniNexus Connect <tickets@uninexusconnect.org>`.
4. Until the domain is verified, Resend only delivers to your own account email — fine for testing, not for launch.

### Step 6 — Set up M-Pesa Daraja

1. Register at developer.safaricom.co.ke, create an app, and get your **Consumer Key/Secret** for the sandbox.
2. For sandbox testing, use Safaricom's test shortcode/passkey (provided in their docs) → `DARAJA_SHORTCODE`, `DARAJA_PASSKEY`, keep `DARAJA_ENV=sandbox`.
3. Generate a long random string for `DARAJA_CALLBACK_SECRET` (e.g. `openssl rand -hex 24`), and set:
   ```
   DARAJA_CALLBACK_URL=https://<your-vercel-domain>/api/daraja/callback?key=<that same secret>
   ```
   This secret is how the callback route rejects forged requests, since Daraja doesn't sign callbacks itself.
4. When Safaricom approves your production paybill/till, switch `DARAJA_ENV=production` and swap in the live shortcode/passkey/keys.

### Step 7 — Generate VAPID keys (push notifications)

```bash
npx web-push generate-vapid-keys
```
Copy the output into `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and also `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same public key, needed client-side).

### Step 8 — Push to GitHub

```bash
cd uninexus-connect
git init
git add .
git commit -m "Initial commit — UniNexus Connect foundation"
git branch -M main
git remote add origin https://github.com/<your-username>/uninexus-connect.git
git push -u origin main
```

`.env.local` is already in `.gitignore` — never commit real secrets.

### Step 9 — Deploy to Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset auto-detects **Next.js** — leave build settings default.
3. Before the first deploy, open **Environment Variables** and paste in *every* value from your `.env.local` (all of them — Supabase, Upstash, Resend, Daraja, VAPID, `NEXT_PUBLIC_SITE_URL` set to your real Vercel/custom domain, `CRON_SECRET`).
4. Deploy. Once live, go back and update `DARAJA_CALLBACK_URL` and `NEXT_PUBLIC_SITE_URL` to the actual deployed domain if you didn't know it beforehand, then redeploy.
5. `vercel.json` already defines a once-daily cron (`/api/cron/update-event-status`, runs at 3am) — Vercel picks this up automatically on deploy. Free "Hobby" Vercel accounts only allow daily (not hourly) cron jobs, so this is set to run once a day, which is enough to flip events from current/upcoming → past once their date passes, and promote the next upcoming event if none is pinned. If you upgrade to Vercel Pro later, you can change the schedule in `vercel.json` to `0 * * * *` for hourly checks.

### Step 10 — Set up Sentry (error tracking)

1. sentry.io → New Project → choose **Next.js**.
2. Copy the DSN → `NEXT_PUBLIC_SENTRY_DSN` (safe to expose publicly).
3. For source-map uploads on build, also add `SENTRY_ORG`, `SENTRY_PROJECT`, and an auth token (**Settings → Auth Tokens**) → `SENTRY_AUTH_TOKEN`. Optional but recommended — the build still works fine without it, just without readable stack traces.
4. Add all four to Vercel's environment variables and redeploy.

### Step 11 — Post-deploy checklist

- [ ] Sign up as a test member (form + Google) → confirm a `UniNexus-00X` membership ID is generated and the dashboard loads.
- [ ] Log in as the seeded admin → confirm `/admin` loads and non-admins are redirected away from it.
- [ ] Create an event in `/admin/events`, pin it "current" → confirm it appears on the homepage and `/programs`.
- [ ] Buy a sandbox ticket end-to-end → confirm the M-Pesa prompt fires, the ticket flips to `paid`, and a gate pass PDF arrives by email.
- [ ] Publish + pin two articles, submit a comment as a member → confirm it needs admin approval before showing publicly.
- [ ] Submit feedback and a newsletter signup from an incognito window a dozen times quickly → confirm the 429 rate-limit message appears.
- [ ] Trigger a fake error (e.g. temporarily throw in a route) → confirm it shows up in Sentry, then remove the test throw.

---

## Security measures in place

- **RLS on every table**, gated through a `security definer` `is_admin()` helper (search_path pinned).
- **Column-level grants** on `profiles` — members can update name/institution/disability flag only, never `role`, `membership_id`, or `email`.
- **Tickets are never client-writable** — only server routes using the service-role key can write them, so a forged "paid" status from the browser is impossible.
- **Daraja callback** requires a matching secret query param and only transitions `pending → paid/failed` (naturally idempotent against Safaricom retries).
- **Rate limiting** (Upstash) on STK Push (by phone + IP), feedback, newsletter, comments, and push subscription endpoints.
- **CORS allow-list** on public POST routes — rejects cross-origin browser requests while still allowing server-to-server calls (e.g. the Daraja callback) that carry no Origin header.
- **Zod validation** on every API route's input.
- **Security headers** (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) set globally in `next.config.mjs`.
- Password reset always returns the same message regardless of whether the email exists (no account enumeration).
- **Sentry** captures unhandled errors from API routes, the global error boundary, and route-level error boundaries.
- Friendly `error.tsx` / `global-error.tsx` / `not-found.tsx` fallbacks — no raw stack traces reach visitors.

## What's deliberately left for you to configure per your own risk appetite

- Storage bucket policies if/when you add file uploads (event cover images, avatars) — the schema has `cover_image_url` columns ready, but no Storage bucket is created yet.
- A more granular admin role hierarchy (e.g. "editor" vs "super admin") — currently a single `admin` role.
- Multi-day event support — the cron currently treats `starts_at` as the end of the event too; add an `ends_at` column if events run longer than a day.

---

*Built for B.A Connect Organization — Kenya.*
