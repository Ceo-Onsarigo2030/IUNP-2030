import { HeroSection } from "@/components/hero-section";
import { LiveStats } from "@/components/live-stats";
import { EventsSection } from "@/components/events-section";
import { GalaTeaserSection } from "@/components/gala-teaser-section";
import { AboutSection } from "@/components/about-section";
import { BaConnectSection } from "@/components/ba-connect-section";
import { PillarsSection } from "@/components/pillars-section";
import { ArticlesSection } from "@/components/articles-section";
import { FeedbackSection } from "@/components/feedback-section";
import { NewsletterSection } from "@/components/newsletter-section";
import { createClient } from "@/lib/supabase/server";

async function getInitialStats() {
  const fallback = { members: 0, disability: 0, institutions: 0, events: 0 };
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_public_stats");
    if (error || !data) return fallback;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return fallback;
    return {
      members: Number(row.members) || 0,
      disability: Number(row.disability) || 0,
      institutions: Number(row.institutions) || 0,
      events: Number(row.events) || 0,
    };
  } catch {
    return fallback;
  }
}

// Previously LiveStats always started at 0 and only fetched real numbers after
// the page finished loading in the visitor's browser — every single visitor saw
// a brief "0 → real number" flash while waiting on that client-side network
// round-trip, which is exactly the "loads slow" feeling reported. Fetching the
// same stats here, server-side, means the numbers are already correct in the
// very first HTML the browser receives — no visible wait at all. The client-side
// polling in LiveStats still runs afterward to keep the numbers current live.
export default async function HomePage() {
  const initialStats = await getInitialStats();

  return (
    <>
      <HeroSection />
      <LiveStats initialStats={initialStats} />
      <EventsSection />
      <GalaTeaserSection />
      <AboutSection />
      <BaConnectSection />
      <PillarsSection />
      <ArticlesSection />
      <FeedbackSection />
      <NewsletterSection />
    </>
  );
}
