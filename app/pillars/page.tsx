import type { Metadata } from "next";
import { Accessibility, Sparkles, Scale, HeartPulse, Landmark } from "lucide-react";
import { PILLARS } from "@/lib/constants";

export const metadata: Metadata = { title: "Pillars" };
const ICONS = { Accessibility, Sparkles, Scale, HeartPulse, Landmark };

export default function PillarsPage() {
  return (
    <div className="bg-cream">
      <section className="surface-ink py-16 sm:py-20 text-center">
        <div className="container">
          <p className="eyebrow mb-3">What we champion</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">Five pillars. One generation.</h1>
        </div>
      </section>

      <div className="container py-14 sm:py-20 space-y-16">
        {PILLARS.map((p, i) => {
          const Icon = ICONS[p.icon as keyof typeof ICONS];
          return (
            <article key={p.slug} id={p.slug} className="scroll-mt-28 grid lg:grid-cols-[auto_1fr] gap-7 items-start">
              <div className="size-16 rounded-2xl bg-gold-foil flex items-center justify-center shadow-gold">
                <Icon className="size-7 text-ink" />
              </div>
              <div>
                <p className="eyebrow mb-2">Pillar {String(i + 1).padStart(2, "0")}</p>
                <h2 className="heading-display text-2xl sm:text-3xl mb-2">{p.title}</h2>
                <p className="text-gold-deep font-medium mb-4">{p.tagline}</p>
                <div className="space-y-4 text-ink/70 leading-relaxed max-w-3xl">
                  {p.body.map((b, j) => <p key={j}>{b}</p>)}
                </div>
                <blockquote className="mt-5 border-l-2 border-gold pl-4 italic text-ink/60">
                  &ldquo;{p.philosophy}&rdquo;
                </blockquote>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
