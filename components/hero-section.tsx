import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const AUDIENCE = ["Universities", "Colleges", "Tertiary Institutions", "Youth Organizations", "Youths"];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden surface-ink">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.14),transparent_60%)]" />

      <div className="container relative py-6 border-b border-gold/10">
        <div className="flex items-center justify-center gap-4 text-center">
          <Image src="/logos/inter-uni-logo.webp" alt="Inter-Universities Nexus Platform" width={34} height={34} className="h-8 w-8 rounded bg-white p-0.5" />
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-cream/60">
            A flagship initiative of <span className="text-gold">B.A Connect Organization</span>
          </p>
          <Image src="/logos/ba-connect-logo.webp" alt="B.A Connect Organization" width={34} height={34} className="h-8 w-8 rounded" />
        </div>
      </div>

      <div className="container relative py-16 sm:py-24 text-center">
        <div className="flex flex-wrap justify-center gap-2 mb-8 reveal">
          {AUDIENCE.map((a) => (
            <span key={a} className="text-[11px] sm:text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-gold/25 text-gold/90">
              {a}
            </span>
          ))}
        </div>

        <h1 className="heading-display text-4xl sm:text-6xl md:text-7xl text-cream reveal [animation-delay:100ms]">
          One Nation.
          <br />
          <span className="gold-text">Every Youth. Every Campus.</span>
          <br />
          Endless Potential.
        </h1>

        <p className="mt-7 max-w-2xl mx-auto text-cream/70 text-base sm:text-lg leading-relaxed reveal [animation-delay:200ms]">
          A vibrant national space for talent, creativity, innovation, inclusion and opportunity —
          built for youths from every corner of Kenya and beyond.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 reveal [animation-delay:300ms]">
          <Button href="/auth" size="lg">
            Join UniNexus <ArrowRight className="size-4" />
          </Button>
          <Button href="/programs" variant="outline" size="lg">
            Explore Events
          </Button>
        </div>
      </div>
    </section>
  );
}
