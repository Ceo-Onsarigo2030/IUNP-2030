"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Send, Lock } from "lucide-react";

export function CommentSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();

        try {
          const { data } = await supabase.auth.getUser();
          if (!cancelled) setUserId(data.user?.id ?? null);
        } catch {
          if (!cancelled) setUserId(null);
        }

        const { data: commentsData } = await supabase
          .from("article_comments")
          .select("*")
          .eq("article_id", articleId)
          .eq("is_approved", true)
          .order("created_at", { ascending: true });
        if (!cancelled) setComments(commentsData || []);
      } catch {
        if (!cancelled) {
          setUserId(null);
          setComments([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !body.trim()) return;
    setPosting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, body }),
    });
    setPosting(false);
    if (res.ok) setBody("");
  }

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-2xl mb-6">
        <MessageCircle className="size-5 text-gold-deep" /> Comments
      </h2>

      <div className="space-y-4 mb-8">
        {comments.length === 0 && <p className="text-sm text-ink/45">No comments yet — be the first.</p>}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-white border border-black/5 p-4 text-sm">
            <p className="text-ink/75">{c.body}</p>
            <p className="mt-2 text-xs text-ink/40">{new Date(c.created_at).toLocaleDateString()}</p>
          </div>
        ))}
        <p className="text-[11px] text-ink/40 italic">Comments are reviewed by the team before appearing publicly.</p>
      </div>

      {userId ? (
        <form onSubmit={handlePost} className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm focus:border-gold outline-none"
          />
          <button type="submit" disabled={posting} className="size-10 rounded-full bg-gold-foil text-ink flex items-center justify-center shadow-gold disabled:opacity-60">
            <Send className="size-4" />
          </button>
        </form>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink/50">
          <Lock className="size-4" /> Log in as a member to join the conversation.
        </p>
      )}
    </div>
  );
}
