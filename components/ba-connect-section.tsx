import Image from "next/image";
import { Facebook, Instagram, Linkedin, ExternalLink } from "lucide-react";
import { ReadMore } from "@/components/ui/read-more";
import { SOCIALS } from "@/lib/constants";

const PARAGRAPHS = [
  "B.A Connect Organization is a premier youth-led platform committed to bridging the critical gap between academic excellence and professional success in Kenya. It provides a structured, sustainable ecosystem connecting students and graduates to the evolving demands of the modern workforce.",
  "Through strategic mentorship, capacity building, research and innovation, B.A Connect equips young people with practical skills, professional exposure and access to internships, career pathways and networks that accelerate their growth.",
  "Beyond professional development, the organization champions social justice, gender equality and community well-being — actively fighting Gender-Based Violence, discrimination and social inequalities through advocacy, policy engagement and community-driven initiatives.",
  "It further prioritizes mental health and psychosocial well-being, promoting awareness and strengthening resilience among young people and communities in Kenya.",
  "Guided by integrity, accountability, professionalism, inclusivity and innovation, B.A Connect Organization stands as a transformative force shaping a generation that is empowered, resilient and socially responsible.",
];

export function BaConnectSection() {
  return (
    <section className="surface-ink py-16 sm:py-20">
      <div className="container grid lg:grid-cols-[auto_1fr] gap-10 items-start">
        <Image
          src="/logos/ba-connect-logo.webp"
          alt="B.A Connect Organization"
          width={120}
          height={120}
          className="size-24 sm:size-28 rounded-2xl shadow-gold reveal"
        />
        <div className="reveal">
          <p className="eyebrow mb-3">About the parent organization</p>
          <h2 className="heading-display text-2xl sm:text-3xl text-cream mb-5">B.A Connect Organization</h2>
          <ReadMore lines={PARAGRAPHS} visibleCount={2} className="text-cream/70 max-w-3xl" label="Read more about B.A Connect" />

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-wider text-cream/50 mr-1">Follow the pages</p>
            <a href={SOCIALS.baConnect.facebook} target="_blank" rel="noreferrer" className="size-9 rounded-full border border-gold/25 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><Facebook className="size-4" /></a>
            <a href={SOCIALS.baConnect.instagram} target="_blank" rel="noreferrer" className="size-9 rounded-full border border-gold/25 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><Instagram className="size-4" /></a>
            <a href={SOCIALS.baConnect.linkedin} target="_blank" rel="noreferrer" className="size-9 rounded-full border border-gold/25 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><Linkedin className="size-4" /></a>
            <a href={SOCIALS.baConnect.website} target="_blank" rel="noreferrer" className="btn-outline-gold !py-2 !px-4 text-xs">
              Visit website <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
