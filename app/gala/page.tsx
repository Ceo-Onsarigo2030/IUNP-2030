import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Trophy } from "lucide-react";

export const metadata: Metadata = { title: "UniNexus Gala Awards Voting — Season 1" };

async function getCategories() {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("gala_categories")
      .select("*")
      .eq("is_open", true)
      .order("sort_order", { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

export default async function GalaIndexPage() {
  const categories = await getCategories();
  const topLevel = categories.filter((c: any) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c: any) => c.parent_id === id);

  return (
    <div className="bg-cream min-h-screen">
      <section className="surface-ink py-16 sm:py-20 text-center">
        <div className="container">
          <Trophy className="size-10 text-gold mx-auto mb-4" />
          <p className="eyebrow mb-3">UniNexus Connect</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">UniNexus Gala Awards Voting</h1>
          <p className="mt-2 text-gold text-sm uppercase tracking-[0.2em]">Season 1</p>
          <p className="mt-3 text-cream/60 max-w-xl mx-auto">
            One SMS-verified vote per category. Pick a category below to see the nominees.
          </p>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        {topLevel.length === 0 ? (
          <div className="card-elegant p-10 text-center text-ink/50">Voting hasn&apos;t opened yet — check back soon.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topLevel.map((c: any) => {
              const children = childrenOf(c.id);
              return (
                <div key={c.id} className="card-elegant p-6">
                  <h2 className="font-display text-xl mb-2">{c.name}</h2>
                  {c.description && <p className="text-sm text-ink/60 mb-4 line-clamp-2">{c.description}</p>}
                  <Link href={`/gala/${c.slug}`} className="text-sm font-semibold text-gold-deep flex items-center gap-1 mb-3">
                    Vote in this category <ArrowRight className="size-3.5" />
                  </Link>
                  {children.length > 0 && (
                    <div className="border-t border-black/5 pt-3 mt-3 space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-ink/40">Subcategories</p>
                      {children.map((sub: any) => (
                        <Link key={sub.id} href={`/gala/${sub.slug}`} className="block text-sm text-ink/70 hover:text-gold-deep">
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
