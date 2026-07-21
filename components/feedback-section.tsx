import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

async function getPinnedFeedback() {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("feedback_entries")
      .select("*")
      .eq("is_pinned", true)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(2);
    return data || [];
  } catch {
    return [];
  }
}

export async function FeedbackSection() {
  const entries = await getPinnedFeedback();

  return (
    <section className="surface-ink py-16 sm:py-24">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10 reveal">
          <div>
            <p className="eyebrow mb-3">Your voice</p>
            <h2 className="heading-display text-3xl sm:text-4xl text-cream">Talk to us. Tell us what&apos;s next.</h2>
            <p className="mt-2 text-cream/60">Two walls, one conversation — feedback and suggestions from across the Nexus.</p>
          </div>
          <Button href="/feedback" variant="outline">
            Share yours <ArrowRight className="size-4" />
          </Button>
        </div>

        {entries.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {entries.map((f: any) => (
              <div key={f.id} className="rounded-xl2 bg-white/5 border border-gold/15 p-7 reveal">
                <Quote className="size-6 text-gold/50 mb-3" />
                <p className="text-cream/80 leading-relaxed mb-5">&ldquo;{f.message}&rdquo;</p>
                <p className="text-sm font-semibold text-gold">{f.name}</p>
                {f.institution && <p className="text-xs text-cream/45">{f.institution}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 bg-white/5 border border-gold/15 p-10 text-center text-cream/50 reveal">
            Be the first voice on the wall.
          </div>
        )}
      </div>
    </section>
  );
}
