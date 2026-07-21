import Link from "next/link";
import { ReadMore } from "@/components/ui/read-more";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, Eye, Compass } from "lucide-react";

const PARAGRAPHS = [
  "The Inter–Universities Nexus Platform, a flagship initiative of B.A Connect Organization, is a transformative youth-centered platform bringing together youths from universities, colleges, associations, youth organizations and tertiary institutions across Kenya and beyond into one vibrant space for talent, creativity, innovation, learning and opportunity.",
  "It was established from a simple but powerful belief: young people possess immense potential, but many lack the right platforms, exposure, mentorship, and support systems needed to fully realize and showcase their abilities. Inter–Universities Nexus exists to bridge that gap.",
  "The platform provides a credible and inclusive national stage where young people can discover their strengths, nurture their talents, showcase creativity, advance innovative ideas, and build practical skills that prepare them for the future.",
  "More than a showcase platform, Inter–Universities Nexus is a space for purposeful engagement and transformative dialogue — addressing entrepreneurship, employability, technology and AI, financial literacy, leadership, mental health, innovation, inclusion and civic education.",
];

export function AboutSection() {
  return (
    <section className="bg-cream py-16 sm:py-24">
      <div className="container grid lg:grid-cols-[1fr_0.9fr] gap-12 items-start">
        <div className="reveal">
          <p className="eyebrow mb-3">About us</p>
          <h2 className="heading-display text-3xl sm:text-4xl text-ink mb-6">A national stage for youth excellence</h2>
          <ReadMore lines={PARAGRAPHS} visibleCount={3} className="text-ink/70" />
          <Button href="/about" variant="outline" className="!text-ink !border-ink/20 hover:!bg-ink hover:!text-cream mt-6">
            Full about page <ArrowRight className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4 reveal">
          <div className="card-elegant p-6">
            <Target className="size-6 text-gold-deep mb-3" />
            <h3 className="font-display text-xl mb-2">Mission</h3>
            <p className="text-sm text-ink/65 leading-relaxed">
              To create a unified and inclusive network for universities, youth organizations, associations and colleges that promotes youth empowerment, leadership, talent recognition, policy engagement, innovation, civic education and sustainable opportunities.
            </p>
          </div>
          <div className="card-elegant p-6">
            <Eye className="size-6 text-gold-deep mb-3" />
            <h3 className="font-display text-xl mb-2">Vision</h3>
            <p className="text-sm text-ink/65 leading-relaxed">
              To become Africa&apos;s leading inter-university collaborative platform, nurturing a generation of empowered, innovative, socially responsible and globally competitive student leaders.
            </p>
          </div>
          <div className="card-elegant p-6">
            <Compass className="size-6 text-gold-deep mb-3" />
            <h3 className="font-display text-xl mb-2">Core philosophy</h3>
            <p className="text-sm text-ink/65 leading-relaxed">
              Universities, colleges, youth organizations and associations should not exist in isolation. They should collaborate, innovate and grow together for the betterment of society.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
