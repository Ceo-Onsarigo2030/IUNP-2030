"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "uninexus_liker_key";

function getLikerKey() {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = `anon_${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

function likedArticlesKey(articleId: string) {
  return `uninexus_liked_${articleId}`;
}

export function ArticleLikeButton({ articleId, initialLikeCount }: { articleId: string; initialLikeCount: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(window.localStorage.getItem(likedArticlesKey(articleId)) === "1");
  }, [articleId]);

  async function toggleLike() {
    if (pending) return;
    setPending(true);
    const wasLiked = liked;
    // Optimistic update — feels instant, and either request below can only confirm it.
    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));

    try {
      const likerKey = getLikerKey();
      const res = await fetch("/api/articles/like", {
        method: wasLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, likerKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();

      setCount(data.likeCount);
      setLiked(data.liked);
      window.localStorage.setItem(likedArticlesKey(articleId), data.liked ? "1" : "0");
    } catch {
      // Roll back the optimistic update if the request failed.
      setLiked(wasLiked);
      setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggleLike}
      disabled={pending}
      aria-pressed={liked}
      className="inline-flex items-center gap-2 rounded-full bg-white border border-black/10 px-4 py-2 text-sm font-medium text-ink shadow-sm hover:shadow-md transition-shadow disabled:opacity-70"
    >
      <Heart className={liked ? "size-4 fill-red-500 text-red-500" : "size-4 text-ink/50"} />
      {count} {count === 1 ? "Like" : "Likes"}
    </button>
  );
}
