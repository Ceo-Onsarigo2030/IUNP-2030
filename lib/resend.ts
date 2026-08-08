import { Resend } from "resend";

// Lazily instantiated — creating this at module load time crashes `next build`
// during the "Collecting page data" step whenever RESEND_API_KEY isn't set yet
// (e.g. before you've added environment variables in Vercel). Building the client
// only when an email actually needs to be sent avoids that entirely.
let client: Resend | null = null;

function getResendClient() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY || "re_placeholder_key_not_set");
  }
  return client;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uninexusconnectplatform.co.ke";
const LOGO_URL = `${SITE_URL}/logos/inter-uni-logo.webp`;

function emailShell(bodyHtml: string) {
  return `
    <div style="font-family: Georgia, serif; background:#0A0A0B; color:#FAF7EF; padding:32px; border-radius:12px; max-width:480px; margin:0 auto;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
        <img src="${LOGO_URL}" alt="UniNexus Connect Platform" width="36" height="36" style="border-radius:6px; background:#fff; padding:2px; display:inline-block; vertical-align:middle;" />
        <span style="color:#C9A227; letter-spacing:1.5px; font-size:12px; text-transform:uppercase; vertical-align:middle;">UniNexus Connect Platform</span>
      </div>
      ${bodyHtml}
      <p style="color:#9a9890; font-size:12px; margin-top:28px; border-top:1px solid #232326; padding-top:16px;">Bridging Campus. Building Futures.</p>
    </div>
  `;
}

export async function sendGatePassEmail({
  to, buyerName, eventTitle, ticketNumber, pdfBytes,
}: { to: string; buyerName: string; eventTitle: string; ticketNumber: string; pdfBytes: Uint8Array }) {
  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect Platform <tickets@uninexusconnectplatform.co.ke>",
    to,
    subject: `Your gate pass — ${eventTitle}`,
    html: emailShell(`
      <h1 style="font-size:22px; margin:0 0 16px;">You're confirmed for ${eventTitle}</h1>
      <p>Hi ${buyerName}, your payment was successful. Your QR gate pass is attached as a PDF — bring it printed or on your phone.</p>
      <p style="font-family: monospace; color:#C9A227; font-size:14px;">Ticket: ${ticketNumber}</p>
    `),
    attachments: [{ filename: `${ticketNumber}-gate-pass.pdf`, content: Buffer.from(pdfBytes) }],
  });
}

export async function sendCampaignEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  // Resend batches recipients internally when BCC'd this way; for large lists, chunk into batches of ~50.
  const chunks: string[][] = [];
  for (let i = 0; i < to.length; i += 50) chunks.push(to.slice(i, i + 50));

  for (const chunk of chunks) {
    await getResendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect Platform <news@uninexusconnectplatform.co.ke>",
      to: process.env.RESEND_FROM_EMAIL || "news@uninexusconnectplatform.co.ke",
      bcc: chunk,
      subject,
      html: emailShell(html),
    });
  }
}

export async function sendNewsletterWelcomeEmail({ to }: { to: string }) {
  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect Platform <news@uninexusconnectplatform.co.ke>",
    to,
    subject: "Welcome to the UniNexus Connect newsletter",
    html: emailShell(`
      <h1 style="font-size:22px; margin:0 0 16px;">You're subscribed 🎉</h1>
      <p>Thanks for joining the UniNexus Connect Platform newsletter. You'll get updates on inter-university events, programs, and opportunities straight to your inbox.</p>
    `),
  });
}
