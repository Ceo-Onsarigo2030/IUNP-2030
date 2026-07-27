import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

async function getOpenCategoryCount() {
  try {
    const supabase = createClient();
    const { count } = await supabase
      .from("gala_categories")
      .select("id", { count: "exact", head: true })
      .eq("is_open", true);
    return count || 0;
  } catch {
    return 0;
  }
}

export async function GalaTeaserSection() {
  const count = await getOpenCategoryCount();
  if (count === 0) return null; // hide the section entirely until voting is actually open

  return (
    <section className="surface-ink py-16 sm:py-20">
      <div className="container text-center">
        <Trophy className="size-10 text-gold mx-auto mb-4" />
        <p className="eyebrow mb-3">Season 1 is live</p>
        <h2 className="heading-display text-3xl sm:text-4xl text-cream mb-3">UniNexus Gala Awards Voting</h2>
        <p className="text-cream/60 max-w-xl mx-auto mb-8">
          {count} categor{count === 1 ? "y is" : "ies are"} open for voting — one SMS-verified vote each. Cast yours before voting closes.
        </p>
        <Link href="/gala" className="btn-gold">
          Vote now <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
