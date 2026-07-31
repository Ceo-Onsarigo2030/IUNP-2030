import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";

/**
 * The public SiteHeader is `sticky top-0 z-50`. AdminLayout renders its own
 * "Admin Panel" bar + hamburger on mobile, also pinned to the top — but with no
 * z-index of its own, so it was rendering underneath SiteHeader instead of
 * replacing it. On a phone, that meant the ONLY hamburger a signed-in admin could
 * ever tap was the public site menu — the real admin sidebar (Events, Gala,
 * Articles, Feedback Wall, Newsletter, Campaigns, Push, Members, Settings) was
 * completely hidden behind it and unreachable, so mobile admins were stuck on
 * whichever /admin page they first landed on.
 *
 * Fix: /admin/* owns the entire top chrome on every screen size — the public
 * header/banner/footer simply don't render there.
 *
 * IMPORTANT: this must be a Server Component, not a Client Component. MarqueeBanner
 * is itself an async Server Component (it reads from Supabase using next/headers),
 * and Client Components cannot import/render a Server Component directly — Next.js
 * fails the entire build with "You're importing a component that needs
 * next/headers" if you try (that broke every deployment after this file was first
 * added as "use client" using usePathname()). Server Components have no
 * usePathname() equivalent, so the route is read from the `x-pathname` header that
 * middleware.ts stamps onto every request instead.
 */
function currentPathname() {
  return headers().get("x-pathname") || "";
}

export function SiteChrome({ slot }: { slot: "header" | "footer" }) {
  const isAdminRoute = currentPathname().startsWith("/admin");
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
