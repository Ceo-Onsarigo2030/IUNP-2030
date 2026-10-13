import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { SOCIALS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How UniNexus Connect collects, uses, stores and protects your personal data.",
};

export default function PrivacyPage() {
  const email = SOCIALS.uninexus.email;
  return (
    <LegalPage eyebrow="Your data, your rights" title="Privacy Policy" updated="13 October 2026">
      <p>
        UniNexus Connect (the &ldquo;Platform&rdquo;), the Inter-Universities Nexus Platform, is a flagship initiative of the
        B.A Connect Organization (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the <strong>data controller</strong> for the personal data described
        below and process it in line with the Kenya Data Protection Act, 2019. This page explains what we collect, why, who
        helps us handle it, how long we keep it, and the rights you have.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Membership account:</strong> full name, email address, password (stored only as a secure hash by our authentication provider — we never see or store your plain password), the category you choose (institution, affiliation or other), and the name of your institution or group. If you sign in with Google we receive your name and email from Google.</li>
        <li><strong>Disability status (optional, sensitive):</strong> if you tick &ldquo;I identify as a person with a disability&rdquo; at sign-up. This is voluntary, is used only for anonymous platform statistics and inclusion planning, and you may leave it unticked.</li>
        <li><strong>Event tickets:</strong> your name, email, M-Pesa phone number, the ticket you bought, the amount, and the M-Pesa receipt reference. We never receive or store your M-Pesa PIN or any card details — payment is completed on your phone with Safaricom.</li>
        <li><strong>Gala Awards voting:</strong> a one-time SMS code is sent to your phone number. We store only a <em>hashed</em> (irreversible) version of your phone number and code, a hashed IP address and a random device token, to enforce one vote per person.</li>
        <li><strong>Newsletter and push notifications:</strong> your email address if you subscribe; a browser push-subscription identifier if you allow notifications.</li>
        <li><strong>Feedback and comments:</strong> what you write, and your name where shown.</li>
        <li><strong>Technical data:</strong> IP address, browser/device type and error reports, used for security, abuse prevention and fixing problems.</li>
      </ul>

      <h2>2. Why we use it, and our legal basis</h2>
      <ul>
        <li>To create and run your membership and issue your Membership ID — <em>performance of the service you asked for</em>.</li>
        <li>To sell tickets, take payment and email your gate pass — <em>contract</em>.</li>
        <li>To run fair, one-person-one-vote Gala Awards and to block bots and abuse — <em>legitimate interest</em>.</li>
        <li>To send you newsletters, campaigns and push notifications — <em>your consent</em>, which you can withdraw at any time.</li>
        <li>To produce anonymous, aggregate statistics (such as total members and institutions) — <em>legitimate interest</em>.</li>
        <li>To meet legal obligations and protect the Platform — <em>legal obligation / legitimate interest</em>.</li>
      </ul>
      <p>We do <strong>not</strong> sell your personal data, and we do not use it for advertising.</p>

      <h2>3. Who we share it with</h2>
      <p>We use trusted service providers (&ldquo;processors&rdquo;) who handle data only on our instructions:</p>
      <ul>
        <li><strong>Supabase</strong> — database and sign-in (data is hosted in the EU, Ireland region).</li>
        <li><strong>Vercel</strong> — website hosting.</li>
        <li><strong>Safaricom (M-Pesa Daraja)</strong> — ticket payments.</li>
        <li><strong>Resend</strong> — sending gate-pass and campaign emails.</li>
        <li><strong>Africa&rsquo;s Talking</strong> — sending voting SMS codes.</li>
        <li><strong>Upstash</strong> — rate limiting (temporary IP and phone-hash identifiers).</li>
        <li><strong>Sentry</strong> — error monitoring.</li>
        <li><strong>Cloudflare Turnstile</strong> — bot protection on sign-in and voting forms.</li>
        <li><strong>Google</strong> — optional &ldquo;Continue with Google&rdquo; sign-in and embedded event maps.</li>
      </ul>
      <p>
        Some of these providers process data outside Kenya. Where that happens we rely on appropriate safeguards as required by the
        Data Protection Act. We may also disclose data when required by law or a court order.
      </p>

      <h2>4. How we protect it</h2>
      <ul>
        <li>Data is encrypted in transit (HTTPS) and database access is restricted by row-level security, so members can only read and change their own information.</li>
        <li>Administrator accounts are protected by two-step verification.</li>
        <li>Secrets and payment credentials are kept in encrypted server settings and never exposed to your browser.</li>
        <li>Login, payment, voting and form endpoints are rate-limited and bot-protected.</li>
      </ul>
      <p>No system is perfectly secure. If a breach affecting your data occurs, we will notify you and the Office of the Data Protection Commissioner as the law requires.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Membership data: while your membership is active, and deleted or anonymised when you ask us to close it.</li>
        <li>Ticket and payment records: kept as long as needed for accounting, audit and dispute purposes.</li>
        <li>One-time voting codes: expire within minutes; hashed vote-integrity records are kept for the life of the awards season.</li>
        <li>Newsletter and push data: until you unsubscribe or your browser subscription expires.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>You have the right to be informed about how your data is used; to access it; to correct inaccurate data; to ask us to delete it; to object to or restrict processing; to withdraw consent at any time; and to receive a copy of your data in a portable format. To use any of these rights, email <a href={`mailto:${email}`}>{email}</a> from the address on your membership. We may need to verify your identity before acting on a request.</p>
      <p>If you are unhappy with how we handle your data, please contact us first. You also have the right to complain to the <strong>Office of the Data Protection Commissioner</strong> (Kenya) at <a href="https://www.odpc.go.ke" target="_blank" rel="noreferrer">www.odpc.go.ke</a>.</p>

      <h2>7. Cookies</h2>
      <p>We use only essential cookies: a secure session cookie that keeps you signed in, and a random device token used to prevent duplicate votes. We do not use advertising or cross-site tracking cookies.</p>

      <h2>8. Young people</h2>
      <p>The Platform is built for university, college and tertiary students and youth. If you are under 18, please make sure a parent or guardian is aware of and agrees to your use of the Platform.</p>

      <h2>9. Changes to this policy</h2>
      <p>We will update this page when our practices change and show the new &ldquo;last updated&rdquo; date above. For significant changes we will also notify members by email.</p>

      <h2>10. Contact</h2>
      <p>B.A Connect Organization — UniNexus Connect, Kenya. Email: <a href={`mailto:${email}`}>{email}</a>. See also our <Link href="/terms">Terms of Use</Link>.</p>
    </LegalPage>
  );
}
