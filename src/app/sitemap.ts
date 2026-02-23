import type { MetadataRoute } from "next";
import { getPublishedGuides } from "@/lib/guides/guideService";
import { getPublishedExperiences } from "@/lib/experiences/experienceService";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kokutravel.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/places`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/guides`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/experiences`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/discover`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/trip-builder`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  // Dynamic guide routes
  const guides = await getPublishedGuides();
  const guideRoutes: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${BASE_URL}/guides/${guide.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic experience routes
  const experiences = await getPublishedExperiences();
  const experienceRoutes: MetadataRoute.Sitemap = experiences.map((exp) => ({
    url: `${BASE_URL}/experiences/${exp.slug}`,
    lastModified: exp.publishedAt ? new Date(exp.publishedAt) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Variant B routes (lower priority, added incrementally as pages are built)
  const variantBRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/b`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  return [...staticRoutes, ...guideRoutes, ...experienceRoutes, ...variantBRoutes];
}
