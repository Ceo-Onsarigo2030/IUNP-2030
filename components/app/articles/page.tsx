import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Articles" };

async function getArticles() {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .not("published_at", "is", null)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="bg-cream">
      <section className="surface-ink py-16 sm:py-20 text-center">
        <div className="container">
          <p className="eyebrow mb-3">From the Nexus desk</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">Articles &amp; announcements</h1>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        {articles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a: any) => (
              <Link key={a.id} href={`/articles/${a.slug}`} className="card-elegant p-6 block hover:shadow-gold transition-shadow">
                {a.is_pinned && <span className="eyebrow !text-gold-deep">Pinned</span>}
                <h2 className="font-display text-xl mt-2 mb-3">{a.title}</h2>
                <p className="text-sm text-ink/60 leading-relaxed mb-4 line-clamp-3">{a.excerpt}</p>
                <span className="flex items-center gap-2 text-xs text-ink/45">
                  <CalendarDays className="size-3.5" />
                  {new Date(a.published_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-elegant p-10 text-center text-ink/50">No articles published yet.</div>
        )}
      </section>
    </div>
  );
}
