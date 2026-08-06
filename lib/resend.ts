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

export async function sendGatePassEmail({
  to, buyerName, eventTitle, ticketNumber, pdfBytes,
}: { to: string; buyerName: string; eventTitle: string; ticketNumber: string; pdfBytes: Uint8Array }) {
  return getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect <tickets@uninexusconnect.org>",
    to,
    subject: `Your gate pass — ${eventTitle}`,
    html: `
      <div style="font-family: Georgia, serif; background:#0A0A0B; color:#FAF7EF; padding:32px; border-radius:12px;">
        <p style="color:#C9A227; letter-spacing:2px; font-size:12px; text-transform:uppercase;">UniNexus Connect</p>
        <h1 style="font-size:22px; margin:8px 0 16px;">You're confirmed for ${eventTitle}</h1>
        <p>Hi ${buyerName}, your payment was successful. Your QR gate pass is attached as a PDF — bring it printed or on your phone.</p>
        <p style="font-family: monospace; color:#C9A227; font-size:14px;">Ticket: ${ticketNumber}</p>
        <p style="color:#9a9890; font-size:12px; margin-top:24px;">Bridging Campus. Building Futures.</p>
      </div>
    `,
    attachments: [{ filename: `${ticketNumber}-gate-pass.pdf`, content: Buffer.from(pdfBytes) }],
  });
}

export async function sendCampaignEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  // Resend batches recipients internally when BCC'd this way; for large lists, chunk into batches of ~50.
  const chunks: string[][] = [];
  for (let i = 0; i < to.length; i += 50) chunks.push(to.slice(i, i + 50));

  for (const chunk of chunks) {
    await getResendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect <news@uninexusconnect.org>",
      to: process.env.RESEND_FROM_EMAIL || "news@uninexusconnect.org",
      bcc: chunk,
      subject,
      html,
    });
  }
}
