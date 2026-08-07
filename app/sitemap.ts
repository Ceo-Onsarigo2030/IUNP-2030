import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://uninexusconnectplatform.co.ke";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pillars`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/programs`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/articles`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/gala`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/feedback`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/auth`, changeFrequency: "yearly", priority: 0.6 },
  ];

  try {
    const supabase = createClient();

    const { data: articles } = await supabase
      .from("articles")
      .select("slug, published_at")
      .not("published_at", "is", null);

    const { data: categories } = await supabase
      .from("gala_categories")
      .select("slug")
      .eq("is_open", true);

    const articleRoutes: MetadataRoute.Sitemap = (articles || []).map((a: any) => ({
      url: `${base}/articles/${a.slug}`,
      lastModified: a.published_at,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const galaRoutes: MetadataRoute.Sitemap = (categories || []).map((c: any) => ({
      url: `${base}/gala/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...articleRoutes, ...galaRoutes];
  } catch {
    return staticRoutes;
  }
}
