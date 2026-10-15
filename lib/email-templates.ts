import { escapeHtml } from "@/lib/email";

export type InvitationInput = {
  title: string;
  dateText: string;
  venue: string;
  link: string;
  message?: string;
};

/** Brand-styled event invitation. `{{first_name}}` is filled in per recipient when the campaign is sent. */
export function buildInvitationHtml({ title, dateText, venue, link, message }: InvitationInput) {
  const t = escapeHtml(title);
  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:6px 0;color:#C9A227;font-size:12px;letter-spacing:2px;text-transform:uppercase;width:90px;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#FAF7EF;font-size:16px;">${escapeHtml(value)}</td></tr>`
      : "";
  const body = message
    ? message.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")
    : `<p style="margin:0 0 14px;">We would be honoured to have you with us. Come connect with students and leaders from universities across Kenya and East Africa.</p>`;

  return `<div style="background:#f3efe4;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0A0A0B;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:36px 32px 6px;"><p style="margin:0;color:#C9A227;letter-spacing:3px;font-size:12px;text-transform:uppercase;">UniNexus Connect</p></td></tr>
    <tr><td style="padding:8px 32px 0;"><h1 style="margin:0;color:#FAF7EF;font-size:28px;line-height:1.25;font-weight:600;">You&rsquo;re invited, {{first_name}}</h1></td></tr>
    <tr><td style="padding:18px 32px 0;color:#d9d5c8;font-size:16px;line-height:1.65;">
      ${body}
      <p style="margin:18px 0 6px;color:#C9A227;font-size:20px;font-weight:600;">${t}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
        ${row("When", dateText)}
        ${row("Where", venue)}
      </table>
    </td></tr>
    <tr><td style="padding:26px 32px 38px;">
      <a href="${link}" style="display:inline-block;background:#C9A227;color:#0A0A0B;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:14px 30px;border-radius:999px;">Reserve your spot</a>
      <p style="margin:22px 0 0;color:#9a9890;font-size:12px;">Bridging Campus. Building Futures.</p>
    </td></tr>
  </table>
</div>`;
}
