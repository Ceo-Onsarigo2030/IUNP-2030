import { escapeHtml } from "@/lib/email";

/** All event times are Kenya time (EAT, UTC+3), whatever device or server renders them. */
export const EVENT_TZ = "Africa/Nairobi";

/** "Friday, 6 November 2026 · 6:00 PM (18:00)" */
export function formatEventWhen(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-KE", { dateStyle: "full", timeZone: EVENT_TZ }).format(d);
  const t12 = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: EVENT_TZ }).format(d);
  const t24 = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: EVENT_TZ }).format(d);
  return `${date} · ${t12} (${t24})`;
}

export type InvitationInput = {
  title: string;
  dateText: string;
  venue: string;
  link: string;
  message?: string;
  /** Optional extra line, e.g. "Dinner will be served at 8:00 PM". */
  dinnerText?: string;
};

const rowHtml = (label: string, value: string) =>
  value
    ? `<tr><td style="padding:6px 14px 6px 0;color:#C9A227;font-size:12px;letter-spacing:2px;text-transform:uppercase;width:90px;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#FAF7EF;font-size:16px;">${escapeHtml(value)}</td></tr>`
    : "";

const shell = (inner: string) => `<div style="background:#f3efe4;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0A0A0B;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:36px 32px 6px;"><p style="margin:0;color:#C9A227;letter-spacing:3px;font-size:12px;text-transform:uppercase;">UniNexus Connect</p></td></tr>
${inner}
  </table>
</div>`;

const button = (link: string, label: string) =>
  `<tr><td style="padding:26px 32px 38px;">
      <a href="${link}" style="display:inline-block;background:#C9A227;color:#0A0A0B;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:14px 30px;border-radius:999px;">${label}</a>
      <p style="margin:22px 0 0;color:#9a9890;font-size:12px;">Bridging Campus. Building Futures.</p>
    </td></tr>`;

const paragraphs = (text: string) =>
  text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

/** Brand-styled event invitation. `{{first_name}}` is filled in per recipient when the campaign is sent. */
export function buildInvitationHtml({ title, dateText, venue, link, message, dinnerText }: InvitationInput) {
  const body = message
    ? paragraphs(message)
    : `<p style="margin:0 0 14px;">We would be honoured to have you with us. Come connect with students and leaders from universities across Kenya and East Africa.</p>`;
  return shell(`    <tr><td style="padding:8px 32px 0;"><h1 style="margin:0;color:#FAF7EF;font-size:28px;line-height:1.25;font-weight:600;">You&rsquo;re invited, {{first_name}}</h1></td></tr>
    <tr><td style="padding:18px 32px 0;color:#d9d5c8;font-size:16px;line-height:1.65;">
      ${body}
      <p style="margin:18px 0 6px;color:#C9A227;font-size:20px;font-weight:600;">${escapeHtml(title)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
        ${rowHtml("When", dateText)}
        ${rowHtml("Where", venue)}
        ${rowHtml("Dinner", dinnerText || "")}
      </table>
    </td></tr>
    ${button(link, "Reserve your spot")}`);
}

/** "Sorry — here is the correct time" notice, same look as the invitation. */
export function buildCorrectionHtml({ title, dateText, venue, link, dinnerText, wrongText }: InvitationInput & { wrongText?: string }) {
  return shell(`    <tr><td style="padding:8px 32px 0;"><h1 style="margin:0;color:#FAF7EF;font-size:26px;line-height:1.25;font-weight:600;">A quick correction, {{first_name}}</h1></td></tr>
    <tr><td style="padding:18px 32px 0;color:#d9d5c8;font-size:16px;line-height:1.65;">
      <p style="margin:0 0 14px;">Thank you for your interest in the ${escapeHtml(title)}. In our earlier invitation the start time was printed incorrectly${wrongText ? ` as <strong style="color:#FAF7EF;">${escapeHtml(wrongText)}</strong>` : ""}. We sincerely apologise for the confusion.</p>
      <p style="margin:0 0 6px;color:#C9A227;font-size:18px;font-weight:600;">The correct details are:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
        ${rowHtml("When", dateText)}
        ${rowHtml("Where", venue)}
        ${rowHtml("Dinner", dinnerText || "")}
      </table>
      <p style="margin:16px 0 0;">If you have already booked, nothing changes for you &mdash; your gate pass is valid. We look forward to seeing you there.</p>
    </td></tr>
    ${button(link, "View event details")}`);
}
