import Link from "next/link";
import { Accessibility, Sparkles, Scale, HeartPulse, Landmark, ArrowRight } from "lucide-react";
import { PILLARS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const ICONS = { Accessibility, Sparkles, Scale, HeartPulse, Landmark };

export function PillarsSection() {
  return (
    <section className="bg-cream py-16 sm:py-24">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal">
          <p className="eyebrow mb-3">What we champion</p>
          <h2 className="heading-display text-3xl sm:text-4xl text-ink">Five pillars. One generation.</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map((p) => {
            const Icon = ICONS[p.icon as keyof typeof ICONS];
            return (
              <Link
                key={p.slug}
                href={`/pillars#${p.slug}`}
                className="card-elegant p-6 group hover:shadow-gold transition-shadow reveal"
              >
                <div className="size-11 rounded-lg bg-gold-foil flex items-center justify-center mb-4">
                  <Icon className="size-5 text-ink" />
                </div>
                <h3 className="font-display text-xl mb-2 leading-snug">{p.title}</h3>
                <p className="text-sm text-ink/60 leading-relaxed mb-4 line-clamp-3">{p.summary}</p>
                <span className="text-xs font-semibold text-gold-deep flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read more <ArrowRight className="size-3.5" />
                </span>
              </Link>
            );
          })}

          <Link
            href="/pillars"
            className="rounded-xl2 border border-dashed border-gold/40 p-6 flex flex-col items-center justify-center text-center hover:bg-gold/5 transition-colors reveal"
          >
            <p className="font-display text-lg text-ink mb-1">Explore all pillars</p>
            <p className="text-xs text-ink/50">Full philosophy, partners &amp; programs</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
