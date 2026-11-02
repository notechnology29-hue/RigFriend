import type { MetadataRoute } from "next";
import { getAllBuilds } from "@/lib/builds";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

// Only live pages: inactive draft bundles and the unsubscribe page stay out.
// /tools/roi is left out because it points search engines to the homepage.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { software, gear } = await getAllBuilds();
  const now = new Date();

  const fixed: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/tools/gear", 0.9, "weekly"],
    ["/builds", 0.8, "weekly"],
    ["/about", 0.4, "monthly"],
    ["/how-we-make-money", 0.3, "yearly"],
    ["/privacy", 0.2, "yearly"],
  ];

  return [
    ...fixed.map(([path, priority, changeFrequency]) => ({ url: `${base}${path}`, lastModified: now, changeFrequency, priority })),
    ...gear.map((b) => ({
      url: `${base}/builds/gear/${b.slug}`,
      lastModified: new Date(b.updated_at ?? now),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...software.map((b) => ({
      url: `${base}/builds/software/${b.slug}`,
      lastModified: new Date(b.updated_at ?? now),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
