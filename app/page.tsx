import { HeroSection } from "@/components/hero-section";
import { LiveStats } from "@/components/live-stats";
import { EventsSection } from "@/components/events-section";
import { AboutSection } from "@/components/about-section";
import { BaConnectSection } from "@/components/ba-connect-section";
import { PillarsSection } from "@/components/pillars-section";
import { ArticlesSection } from "@/components/articles-section";
import { FeedbackSection } from "@/components/feedback-section";
import { NewsletterSection } from "@/components/newsletter-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LiveStats />
      <EventsSection />
      <AboutSection />
      <BaConnectSection />
      <PillarsSection />
      <ArticlesSection />
      <FeedbackSection />
      <NewsletterSection />
    </>
  );
}
