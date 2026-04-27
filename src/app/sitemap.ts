import type { MetadataRoute } from "next";
import { getPublishedGuides } from "@/lib/guides/guideService";
import { getAllCitySlugs } from "@/lib/cities/cityData";
import { getSitemapLocationIds } from "@/lib/locations/locationService";
import { logger } from "@/lib/logger";

// Fetchers call the SSR Supabase client which reads cookies; Next 16 won't
// statically render a route that touches cookies. Mark dynamic so the build
// stops erroring. A future refactor could switch sitemap fetchers to a
// cookie-free client (e.g. anon-keyed) and re-enable ISR via `revalidate`.
export const dynamic = "force-dynamic";

// Strip any trailing slash so `${BASE_URL}/path` never produces `//path`.
// A misconfigured env var with a trailing slash (e.g. set to a Vercel preview
// URL through the dashboard) would otherwise emit malformed sitemap entries.
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://yukujapan.com").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/places`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/guides`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/cities`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/trip-builder`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  // Dynamic city routes
  const citySlugs = getAllCitySlugs();
  const cityRoutes: MetadataRoute.Sitemap = citySlugs.map((slug) => ({
    url: `${BASE_URL}/cities/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Fetch dynamic content in parallel — sitemap generation is the slowest route,
  // and a failure in any single fetcher should not sink the whole file.
  //
  // Sanity experiences are intentionally excluded: they're authored at experience
  // slugs but the `/guides/[slug]` detail page only resolves _type=="guide", so
  // sitemapping them produces 530+ soft-404s. Add `/experiences/[slug]` here
  // once that route renders real experience content.
  const [guidesResult, locationIdsResult] = await Promise.allSettled([
    getPublishedGuides(),
    getSitemapLocationIds(),
  ]);

  const guideRoutes: MetadataRoute.Sitemap =
    guidesResult.status === "fulfilled"
      ? guidesResult.value.map((guide) => ({
          url: `${BASE_URL}/guides/${guide.id}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }))
      : (logger.warn("sitemap: guides fetch failed", { error: String(guidesResult.reason) }), []);

  const placeRoutes: MetadataRoute.Sitemap =
    locationIdsResult.status === "fulfilled"
      ? locationIdsResult.value.map((id) => ({
          url: `${BASE_URL}/places/${id}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      : (logger.warn("sitemap: places fetch failed", { error: String(locationIdsResult.reason) }), []);

  return [...staticRoutes, ...cityRoutes, ...guideRoutes, ...placeRoutes];
}
