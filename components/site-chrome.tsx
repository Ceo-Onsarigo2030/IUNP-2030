import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";

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
