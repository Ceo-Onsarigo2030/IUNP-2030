import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

async function getPinnedArticles() {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("is_pinned", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(2);
    return data || [];
  } catch {
    return [];
  }
}

export async function ArticlesSection() {
  const articles = await getPinnedArticles();

  return (
    <section className="bg-cream-dim py-16 sm:py-24">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10 reveal">
          <div>
            <p className="eyebrow mb-3">From the Nexus desk</p>
            <h2 className="heading-display text-3xl sm:text-4xl text-ink">Articles &amp; announcements</h2>
          </div>
          <Button href="/articles" variant="outline" className="!text-ink !border-ink/20 hover:!bg-ink hover:!text-cream">
            All articles <ArrowRight className="size-4" />
          </Button>
        </div>

        {articles.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {articles.map((a: any) => (
              <Link key={a.id} href={`/articles/${a.slug}`} className="card-elegant p-7 block hover:shadow-gold transition-shadow reveal">
                <span className="eyebrow !text-gold-deep">Pinned</span>
                <h3 className="font-display text-2xl mt-3 mb-3">{a.title}</h3>
                <p className="text-sm text-ink/60 leading-relaxed mb-4 line-clamp-3">{a.excerpt}</p>
                <span className="flex items-center gap-2 text-xs text-ink/45">
                  <CalendarDays className="size-3.5" />
                  {a.published_at ? new Date(a.published_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-elegant p-10 text-center text-ink/50 reveal">No pinned articles yet — check back soon.</div>
        )}
      </div>
    </section>
  );
}
