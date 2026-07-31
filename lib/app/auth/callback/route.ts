import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitRedirect = searchParams.get("redirect");
  let redirect = explicitRedirect || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      // First-time Google sign-in: seed a profile row if one doesn't exist yet.
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

      // Admins land straight in /admin, unless the sign-in was explicitly
      // triggered from somewhere specific (e.g. "log in to vote/comment").
      if (!explicitRedirect) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (role) redirect = "/admin";
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
