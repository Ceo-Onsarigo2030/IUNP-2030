import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { SOCIALS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using UniNexus Connect, buying tickets and voting in the Gala Awards.",
};

export default function TermsPage() {
  const email = SOCIALS.uninexus.email;
  return (
    <LegalPage eyebrow="Using the platform" title="Terms of Use" updated="13 October 2026">
      <p>
        By creating a membership or using UniNexus Connect (the &ldquo;Platform&rdquo;), run by the B.A Connect Organization, you agree to
        these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the Platform.
      </p>

      <h2>1. Membership</h2>
      <ul>
        <li>Membership is free and personal: one account and one Membership ID per person. Do not create duplicate or fake accounts, or share your login.</li>
        <li>You must give accurate information and keep your password secure. You are responsible for activity on your account.</li>
        <li>We may suspend or remove accounts that break these terms or harm other users or the Platform.</li>
      </ul>

      <h2>2. Acceptable use</h2>
      <p>You agree not to: attempt to hack, overload, scrape or disrupt the Platform; use bots or scripts to sign up, vote or buy tickets; post unlawful, hateful, harassing or misleading content; impersonate others; or misuse other members&rsquo; information.</p>

      <h2>3. Events and tickets</h2>
      <ul>
        <li>Ticket prices are shown in Kenyan shillings and paid through M-Pesa. A ticket is issued only after payment is confirmed, and the gate pass is emailed to the address you provide — please check it carefully.</li>
        <li>Each gate pass is for one person and may be refused if copied or altered.</li>
        <li>If an event is cancelled by the organisers, we will communicate how affected ticket holders will be refunded or compensated. Otherwise, tickets are non-refundable unless the law requires otherwise.</li>
        <li>Event details may change; we will update the event page and notify ticket holders where we can.</li>
      </ul>

      <h2>4. Gala Awards voting</h2>
      <p>Voting is one vote per phone number per category, verified by a one-time SMS code. Attempts to cast votes through bots, multiple numbers you do not own, or other manipulation may lead to votes being removed and nominees or voters being disqualified. Results are final once published by the organisers.</p>

      <h2>5. Content you submit</h2>
      <p>Comments and feedback you post remain yours, but you give us permission to display them on the Platform. We may moderate, hide or remove content at our discretion.</p>

      <h2>6. Our content</h2>
      <p>The UniNexus Connect and B.A Connect names, logos, designs and original content belong to the B.A Connect Organization. You may not reuse them without written permission.</p>

      <h2>7. Availability and liability</h2>
      <p>We work to keep the Platform available and accurate, but it is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for indirect losses or for interruptions beyond our reasonable control (such as network, mobile-money or SMS provider outages). Nothing in these terms limits liability that cannot lawfully be limited.</p>

      <h2>8. Changes and governing law</h2>
      <p>We may update these terms and will show the new date above; continued use means you accept the update. These terms are governed by the laws of Kenya.</p>

      <h2>9. Contact</h2>
      <p>Questions? Email <a href={`mailto:${email}`}>{email}</a>.</p>
    </LegalPage>
  );
}
