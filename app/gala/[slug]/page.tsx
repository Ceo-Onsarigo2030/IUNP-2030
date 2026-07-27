import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VoteWidget } from "@/components/vote-widget";
import { ChevronLeft } from "lucide-react";

async function getCategory(slug: string) {
  try {
    const supabase = createClient();
    const { data: category } = await supabase.from("gala_categories").select("*").eq("slug", slug).maybeSingle();
    if (!category || !category.is_open) return null;

    const { data: nominees } = await supabase
      .from("gala_nominees")
      .select("*")
      .eq("category_id", category.id)
      .order("sort_order", { ascending: true });

    let parent = null;
    if (category.parent_id) {
      const { data } = await supabase.from("gala_categories").select("name, slug").eq("id", category.parent_id).maybeSingle();
      parent = data;
    }

    return { category, nominees: nominees || [], parent };
  } catch {
    return null;
  }
}

export default async function GalaCategoryPage({ params }: { params: { slug: string } }) {
  const result = await getCategory(params.slug);
  if (!result) notFound();
  const { category, nominees, parent } = result;

  return (
    <div className="bg-cream min-h-screen">
      <section className="surface-ink py-14 sm:py-20 text-center">
        <div className="container max-w-2xl">
          <Link href="/gala" className="inline-flex items-center gap-1 text-xs text-cream/50 hover:text-gold mb-4">
            <ChevronLeft className="size-3.5" /> All categories
          </Link>
          {parent && <p className="eyebrow mb-2">{parent.name}</p>}
          <h1 className="heading-display text-3xl sm:text-5xl text-cream">{category.name}</h1>
          {category.description && <p className="mt-3 text-cream/60">{category.description}</p>}
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        {nominees.length === 0 ? (
          <div className="card-elegant p-10 text-center text-ink/50">Nominees for this category are coming soon.</div>
        ) : (
          <VoteWidget categoryId={category.id} nominees={nominees} />
        )}
      </section>
    </div>
  );
}
