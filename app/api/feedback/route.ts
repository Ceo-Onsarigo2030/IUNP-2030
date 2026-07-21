import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { publicFormLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({
  kind: z.enum(["feedback", "suggestion"]),
  name: z.string().trim().min(1).max(120),
  institution: z.string().trim().max(160).optional().nullable(),
  message: z.string().trim().min(3).max(2000),
});

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const blocked = await enforceRateLimit(publicFormLimiter, `feedback:${clientIp(request)}`);
  if (blocked) return blocked;

  try {
    const body = schema.parse(await request.json());
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("feedback_entries").insert(body);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    Sentry.captureException(err);
    const message = err?.issues ? "Please check your entry and try again." : err.message || "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
