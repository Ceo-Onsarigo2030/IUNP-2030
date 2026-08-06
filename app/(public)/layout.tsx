import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-gold focus:text-ink focus:px-4 focus:py-2 focus:rounded-md">
        Skip to content
      </a>
      <SiteHeader />
      <MarqueeBanner />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
