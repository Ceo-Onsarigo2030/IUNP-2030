import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { articleLikeLimiter, enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { enforceCors } from "@/lib/cors";
import * as Sentry from "@sentry/nextjs";

const schema = z.object({
  articleId: z.string().uuid(),
  // A stable per-browser id (generated and stored client-side, no login required)
  // so the same visitor can't rack up unlimited likes on one article.
  likerKey: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const blocked = await enforceRateLimit(articleLikeLimiter, `like:${clientIp(request)}`);
  if (blocked) return blocked;

  try {
    const { articleId, likerKey } = schema.parse(await request.json());
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("article_likes").insert({ article_id: articleId, liker_key: likerKey });
    // 23505 = unique_violation — this browser already liked this article, treat as a no-op success.
    if (error && error.code !== "23505") throw error;

    const { data } = await supabase.from("articles").select("like_count").eq("id", articleId).maybeSingle();
    return NextResponse.json({ ok: true, liked: true, likeCount: data?.like_count ?? 0 });
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Couldn't like this article right now." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const corsBlock = enforceCors(request);
  if (corsBlock) return corsBlock;

  const blocked = await enforceRateLimit(articleLikeLimiter, `unlike:${clientIp(request)}`);
  if (blocked) return blocked;

  try {
    const { articleId, likerKey } = schema.parse(await request.json());
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("article_likes").delete().eq("article_id", articleId).eq("liker_key", likerKey);
    if (error) throw error;

    const { data } = await supabase.from("articles").select("like_count").eq("id", articleId).maybeSingle();
    return NextResponse.json({ ok: true, liked: false, likeCount: data?.like_count ?? 0 });
  } catch (err: any) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Couldn't update your like right now." }, { status: 400 });
  }
}
