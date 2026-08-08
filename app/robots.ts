import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uninexusconnect.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // None of these should ever show up in Google — admin/dashboard are private
        // panels, /auth is a login form, and /api is data endpoints, not content.
        disallow: ["/admin", "/dashboard", "/auth", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
