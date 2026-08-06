import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uninexusconnect.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/programs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/gala`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/feedback`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/auth`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const supabase = createClient();

    const [{ data: articles }, { data: categories }] = await Promise.all([
      supabase.from("articles").select("slug, updated_at").not("published_at", "is", null),
      supabase.from("gala_categories").select("slug").eq("is_open", true),
    ]);

    const articleRoutes: MetadataRoute.Sitemap = (articles || []).map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: a.updated_at || undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const galaRoutes: MetadataRoute.Sitemap = (categories || []).map((c) => ({
      url: `${SITE_URL}/gala/${c.slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    return [...staticRoutes, ...articleRoutes, ...galaRoutes];
  } catch {
    return staticRoutes;
  }
}
