import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicFormLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({
  articleId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in to comment." }, { status: 401 });

  const blocked = await enforceRateLimit(publicFormLimiter, `comment:${user.id}:${clientIp(request)}`);
  if (blocked) return blocked;

  try {
    const { articleId, body } = schema.parse(await request.json());
    const { error } = await supabase.from("article_comments").insert({ article_id: articleId, user_id: user.id, body });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: err.message || "Couldn't post your comment." }, { status: 400 });
  }
}
