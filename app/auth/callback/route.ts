import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // First-time Google sign-in: seed a profile row if one doesn't exist yet.
    if (data.user) {
      const { data: existing } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
      if (!existing) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: data.user.user_metadata.full_name || data.user.user_metadata.name || "New Member",
          email: data.user.email!,
          category: "other",
          signup_method: "google",
        } as any);
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
