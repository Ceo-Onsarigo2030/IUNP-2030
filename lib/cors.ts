const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"].filter(Boolean) as string[];

/**
 * Returns a 403 Response if the request's Origin header is present and not allow-listed.
 * Requests with no Origin header (server-to-server calls, e.g. Safaricom's Daraja callback,
 * or same-origin navigations in some browsers) are allowed through unchanged.
 */
export function enforceCors(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.some((allowed) => origin === allowed)) return null;

  return new Response(JSON.stringify({ error: "Origin not allowed." }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
