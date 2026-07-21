import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommentSection } from "@/components/comment-section";

async function getArticle(slug: string) {
  const supabase = createClient();
  const { data } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export default async function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  return (
    <div className="bg-cream">
      <section className="surface-ink py-14 sm:py-20 text-center">
        <div className="container max-w-3xl">
          {article.is_pinned && <span className="eyebrow !text-gold">Pinned</span>}
          <h1 className="heading-display text-3xl sm:text-5xl text-cream mt-3">{article.title}</h1>
          <p className="mt-4 text-cream/60">
            {article.published_at && new Date(article.published_at).toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </section>

      <article className="container py-14 sm:py-20 max-w-3xl">
        <div className="prose-content text-ink/75 leading-relaxed text-[15px] sm:text-base space-y-5 whitespace-pre-line">
          {article.body}
        </div>

        <div className="mt-16 border-t border-black/10 pt-10">
          {article.comments_enabled ? (
            <CommentSection articleId={article.id} />
          ) : (
            <p className="text-sm text-ink/45 italic">Comments are disabled for this article.</p>
          )}
        </div>
      </article>
    </div>
  );
}
