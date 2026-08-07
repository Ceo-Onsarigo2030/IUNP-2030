import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VoteWidget } from "@/components/vote-widget";
import { ChevronLeft, ArrowRight } from "lucide-react";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: category } = await supabase.from("gala_categories").select("name, description").eq("slug", params.slug).maybeSingle();
  if (!category) return {};

  return {
    title: `${category.name} — UniNexus Gala Awards`,
    description: category.description || `Vote for your favourite nominee in ${category.name}.`,
  };
}

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

    let nomineesWithMedia = nominees || [];
    if (nomineesWithMedia.length > 0) {
      const { data: media } = await supabase
        .from("gala_nominee_media")
        .select("*")
        .in("nominee_id", nomineesWithMedia.map((n: any) => n.id))
        .order("sort_order", { ascending: true });
      nomineesWithMedia = nomineesWithMedia.map((n: any) => ({
        ...n,
        media: (media || []).filter((m: any) => m.nominee_id === n.id),
      }));
    }

    let parent = null;
    if (category.parent_id) {
      const { data } = await supabase.from("gala_categories").select("name, slug").eq("id", category.parent_id).maybeSingle();
      parent = data;
    }

    return { category, nominees: nomineesWithMedia, parent };
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

        <div className="mt-14 card-elegant p-8 text-center max-w-xl mx-auto">
          <h3 className="font-display text-xl mb-2">Not a member yet?</h3>
          <p className="text-sm text-ink/60 mb-4">Join UniNexus Connect to follow every category, event and update across Kenyan universities.</p>
          <Link href="/auth" className="btn-gold inline-flex !py-3 !px-6">
            Join UniNexus <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
