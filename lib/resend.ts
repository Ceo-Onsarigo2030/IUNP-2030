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

/**
 * CRITICAL: the `resend` SDK does NOT throw when the API rejects a send (e.g. the
 * sending domain in RESEND_FROM_EMAIL isn't verified in Resend yet, or — on an
 * unverified/trial account — the recipient isn't the account owner's own address).
 * It resolves successfully with `{ data: null, error: {...} }` instead. Every call
 * site here used to do `return getResendClient().emails.send(...)` and treat that
 * resolved promise as success — so a gate pass email could fail to send with ZERO
 * error anywhere, while the caller (the Daraja callback) went on to mark the ticket's
 * `gate_pass_sent_at` as if it had been delivered. This wrapper makes a Resend-level
 * error actually throw, so existing try/catch blocks around these calls catch it for
 * real, and a ticket only ever gets marked "gate pass sent" once it truly was.
 */
async function sendOrThrow(payload: Parameters<Resend["emails"]["send"]>[0]) {
  const { data, error } = await getResendClient().emails.send(payload);
  if (error) {
    throw new Error(`Resend rejected the email to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}: ${error.message} (${error.name})`);
  }
  return data;
}

export async function sendGatePassEmail({
  to, buyerName, eventTitle, ticketNumber, pdfBytes,
}: { to: string; buyerName: string; eventTitle: string; ticketNumber: string; pdfBytes: Uint8Array }) {
  return sendOrThrow({
    from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect <tickets@uninexusconnectplatform.co.ke>,
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

export async function sendNewsletterWelcomeEmail({ to }: { to: string }) {
  return sendOrThrow({
    from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect <news@uninexusconnectplatform.co.ke>",
    to,
    subject: "You're subscribed — UniNexus Connect",
    html: `
      <div style="font-family: Georgia, serif; background:#0A0A0B; color:#FAF7EF; padding:32px; border-radius:12px;">
        <p style="color:#C9A227; letter-spacing:2px; font-size:12px; text-transform:uppercase;">UniNexus Connect</p>
        <h1 style="font-size:22px; margin:8px 0 16px;">You're on the list</h1>
        <p>Thanks for subscribing. You'll hear from us whenever there's real news, events or opportunities worth your time — no spam, no noise.</p>
        <p style="color:#9a9890; font-size:12px; margin-top:24px;">Bridging Campus. Building Futures.</p>
      </div>
    `,
  });
}

export async function sendCampaignEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  // Resend batches recipients internally when BCC'd this way; for large lists, chunk into batches of ~50.
  const chunks: string[][] = [];
  for (let i = 0; i < to.length; i += 50) chunks.push(to.slice(i, i + 50));

  for (const chunk of chunks) {
    await sendOrThrow({
      from: process.env.RESEND_FROM_EMAIL || "UniNexus Connect <news@uninexusconnectplatform.co.ke>",
      to: process.env.RESEND_FROM_EMAIL ||  "news@uninexusconnectplatform.co.ke",
      bcc: chunk,
      subject,
      html,
    });
  }
}
