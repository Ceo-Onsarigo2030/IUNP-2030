import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, Linkedin } from "lucide-react";
import { SOCIALS, SLOGAN, NAV } from "@/lib/constants";
import { NewsletterForm } from "@/components/newsletter-section";

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-2.71-1.07 4.36 4.36 0 0 1-1.45-2.62h-3v13.66a2.6 2.6 0 1 1-1.83-2.48V9.44a5.9 5.9 0 1 0 4.83 5.8V9.03a7.24 7.24 0 0 0 4.16 1.31V7.09a4.24 4.24 0 0 1-.99-.04Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="surface-ink border-t border-gold/15">
      <div className="container py-14 grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Image src="/logos/inter-uni-logo.webp" alt="Inter-Universities Nexus Platform" width={40} height={40} className="h-10 w-10 rounded bg-white p-0.5" />
            <div className="h-8 w-px bg-gold/30" />
            <Image src="/logos/ba-connect-logo.webp" alt="B.A Connect Organization" width={40} height={40} className="h-10 w-10 rounded" />
          </div>
          <p className="text-cream/70 text-sm leading-relaxed max-w-xs">
            The Inter-Universities Nexus Platform is a flagship initiative of B.A Connect Organization, uniting youths across Kenya &amp; Africa for talent, leadership, innovation and opportunity.
          </p>
          <p className="mt-4 font-display text-gold text-lg italic">{SLOGAN}</p>
        </div>

        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2.5 text-sm text-cream/75">
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-gold transition-colors">{n.label}</Link></li>
            ))}
            <li><Link href="/programs" className="hover:text-gold transition-colors">Programs &amp; Events</Link></li>
            <li><Link href="/auth" className="hover:text-gold transition-colors">Join the Platform</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-4">Connect</div>
          <div className="flex gap-2 mb-4">
            <a href={SOCIALS.uninexus.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="size-9 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><Facebook className="size-4" /></a>
            <a href={SOCIALS.uninexus.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="size-9 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><Instagram className="size-4" /></a>
            <a href={SOCIALS.uninexus.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="size-9 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><TikTokIcon className="size-4" /></a>
            <a href={`mailto:${SOCIALS.uninexus.email}`} aria-label="Email" className="size-9 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-ink transition-colors"><Mail className="size-4" /></a>
          </div>
          <p className="text-xs text-cream/60 leading-relaxed">
            Follow UniNexus Connect for daily updates from campuses across Kenya.
          </p>
          <div className="eyebrow mt-6 mb-3">B.A Connect Org.</div>
          <div className="flex gap-2">
            <a href={SOCIALS.baConnect.facebook} target="_blank" rel="noreferrer" aria-label="B.A Connect Facebook" className="size-8 rounded-full border border-gold/20 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold/40"><Facebook className="size-3.5" /></a>
            <a href={SOCIALS.baConnect.instagram} target="_blank" rel="noreferrer" aria-label="B.A Connect Instagram" className="size-8 rounded-full border border-gold/20 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold/40"><Instagram className="size-3.5" /></a>
            <a href={SOCIALS.baConnect.linkedin} target="_blank" rel="noreferrer" aria-label="B.A Connect LinkedIn" className="size-8 rounded-full border border-gold/20 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold/40"><Linkedin className="size-3.5" /></a>
          </div>
        </div>

        <div>
          <div className="eyebrow mb-4">Newsletter</div>
          <p className="text-sm text-cream/70 mb-3">Campus news, events and opportunities — straight to your inbox.</p>
          <NewsletterForm variant="footer" />
        </div>
      </div>

      <div className="border-t border-gold/10">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/50">
          <p>&copy; {new Date().getFullYear()} UniNexus Connect — a flagship of B.A Connect Organization. All rights reserved.</p>
          <a href={SOCIALS.baConnect.website} target="_blank" rel="noreferrer" className="hover:text-gold">bridgingacademiaconnectorganization.org</a>
        </div>
      </div>
    </footer>
  );
}
