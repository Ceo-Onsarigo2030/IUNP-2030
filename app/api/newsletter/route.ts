import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { publicFormLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import { sendNewsletterWelcomeEmail } from "@/lib/resend";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({ email: z.string().trim().email() });

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const blocked = await enforceRateLimit(publicFormLimiter, `newsletter:${clientIp(request)}`);
  if (blocked) return blocked;

  try {
    const { email } = schema.parse(await request.json());
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    const isNewSubscriber = !error;
    if (error && error.code !== "23505") throw error; // ignore duplicate email

    // Previously the row was inserted and nothing else happened — no email ever went
    // out, so subscribers had no confirmation they'd actually signed up. Send one now,
    // best-effort: a failed email should never make the subscribe action itself fail,
    // since the subscriber row is already saved either way.
    try {
      await sendNewsletterWelcomeEmail({ to: email });
    } catch (emailErr) {
      Sentry.captureException(emailErr);
    }

    return NextResponse.json({ ok: true, alreadySubscribed: !isNewSubscriber });
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
}
