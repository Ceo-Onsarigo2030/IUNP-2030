import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

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
  colorScheme: "light",
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

// Root shell only — no header/marquee/footer here. Those belong exclusively
// to the public marketing pages (see app/(public)/layout.tsx), so /admin,
// /auth, and /dashboard get their own clean chrome instead of the public
// site's header, ticker, and footer stacking on top of theirs.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
