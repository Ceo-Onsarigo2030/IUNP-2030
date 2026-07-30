"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";

/**
 * The public SiteHeader is `sticky top-0 z-50`. AdminLayout renders its own
 * "Admin Panel" bar + hamburger on mobile, also pinned to the top — but with no
 * z-index of its own, so it was rendering underneath SiteHeader instead of
 * replacing it. On a phone, that meant the ONLY hamburger a signed-in admin could
 * ever tap was the public site menu (Home/Articles/Programs/Dashboard/Admin/Log
 * out) — the real admin sidebar (Events, Gala, Articles, Feedback Wall,
 * Newsletter, Campaigns, Push, Members, Settings) was completely hidden behind
 * it and unreachable, so mobile admins were stuck on whichever /admin page they
 * first landed on. Desktop never showed this because the admin sidebar there is
 * a separate `hidden lg:flex` column, not fixed-positioned, so it never collided.
 *
 * Fix: /admin/* owns the entire top chrome on every screen size. The public
 * header/banner/footer simply don't render there.
 */
export function SiteChrome({ children, slot }: { children?: React.ReactNode; slot: "header" | "footer" }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) return null;

  if (slot === "header") {
    return (
      <>
        <SiteHeader />
        <MarqueeBanner />
      </>
    );
  }

  return <SiteFooter />;
}
