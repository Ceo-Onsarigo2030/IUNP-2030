import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "UniNexus Connect | Bridging Campus. Building Futures.",
    template: "%s | UniNexus Connect",
  },
  description:
    "The Inter-Universities Nexus Platform — a flagship initiative of B.A Connect Organization uniting universities, colleges, tertiary institutions, youth organizations, associations and alumni across Kenya and beyond.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://uninexusconnect.org"),
  openGraph: {
    title: "UniNexus Connect",
    description: "Bridging Campus. Building Futures.",
    siteName: "UniNexus Connect",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-gold focus:text-ink focus:px-4 focus:py-2 focus:rounded-md">
          Skip to content
        </a>
        <SiteHeader />
        <MarqueeBanner />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
