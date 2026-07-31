import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isDashboardRoute = path.startsWith("/dashboard");

  // Every request gets its pathname forwarded as a header — this is how Server
  // Components (which have no usePathname()-equivalent) can tell whether they're
  // rendering inside /admin. Cheap: no Supabase call, just a header write.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  // Building the response once and mutating it in place — previously this was being
  // reassigned to a brand-new NextResponse.next() inside cookies.set()/remove(),
  // which silently dropped any cookie already attached if Supabase needed to set
  // more than one (e.g. refreshing both the access and refresh token). That could
  // leave the session cookie in a half-written state on some requests.
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // The Supabase auth check below is real work (a network round-trip) — only pay
  // for it on the routes that actually need to be guarded, not on every request
  // site-wide now that middleware runs everywhere for the pathname header.
  if (!isAdminRoute && !isDashboardRoute) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute) {
    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: role } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
