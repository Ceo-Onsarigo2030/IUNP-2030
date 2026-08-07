import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const schema = z.object({ to: z.string().email() });

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user?.id || "")
    .eq("role", "admin")
    .maybeSingle();
  if (!user || !role) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  try {
    const { to } = schema.parse(await request.json());

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: false,
        diagnosis: "RESEND_API_KEY is missing in Vercel — add it under Settings > Environment Variables.",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "UniNexus Connect <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "UniNexus Connect — test email",
      html: `<p>This is a test email sent directly from your live site to confirm Resend is configured correctly.</p><p>Sent from: ${fromEmail}</p>`,
    });

    if (result.error) {
      return NextResponse.json({
        ok: false,
        fromEmailUsed: fromEmail,
        resendError: result.error,
        diagnosis:
          "Resend rejected the send — see resendError above for the exact reason. The most common cause: RESEND_FROM_EMAIL's domain doesn't exactly match the domain you verified in Resend (e.g. a typo, or verifying uninexusconnectplatform.co.ke but RESEND_FROM_EMAIL still pointing at a different/placeholder domain).",
      });
    }

    return NextResponse.json({ ok: true, fromEmailUsed: fromEmail, resendId: result.data?.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, diagnosis: err.message || "Unexpected error." }, { status: 500 });
  }
}
