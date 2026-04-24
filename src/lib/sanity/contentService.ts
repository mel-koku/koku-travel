import { unstable_cache } from "next/cache";
import { sanityClient } from "@/sanity/client";
import {
  landingPageQuery,
  siteSettingsQuery,
  tripBuilderConfigQuery,
  pagesContentQuery,
  aboutPageQuery,
  conciergePageQuery,
  commerceDisclosureQuery,
  culturalPillarsQuery,
} from "@/sanity/queries";
import type {
  LandingPageContent,
  SiteSettings,
  TripBuilderConfig,
  PagesContent,
  AboutPageContent,
  ConciergePageContent,
  CommerceDisclosureContent,
} from "@/types/sanitySiteContent";
import type { CulturalPillar } from "@/types/culturalBriefing";
import { readFileCacheStale, writeFileCache } from "@/lib/api/fileCache";

const SANITY_TIMEOUT_MS = 4000;
// 1 hour fallback TTL — unstable_cache also invalidated via revalidateTag on webhook
const SANITY_REVALIDATE_SECONDS = 3600;

async function fetchFromSanity<T>(key: string, query: string): Promise<T | null> {
  const isDev = process.env.NODE_ENV === "development";

  try {
    const result = await Promise.race([
      sanityClient.fetch<T | null>(query),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), SANITY_TIMEOUT_MS),
      ),
    ]);

    if (result) {
      if (!isDev) writeFileCache(`sanity-${key}`, result);
      return result;
    }

    return readFileCacheStale<T>(`sanity-${key}`);
  } catch {
    return readFileCacheStale<T>(`sanity-${key}`);
  }
}

function makeCached<T>(key: string, query: string) {
  return unstable_cache(
    () => fetchFromSanity<T>(key, query),
    [`sanity-${key}`],
    { tags: [`sanity-${key}`], revalidate: SANITY_REVALIDATE_SECONDS },
  );
}

export const getLandingPageContent = makeCached<LandingPageContent>("landingPage", landingPageQuery);
export const getSiteSettings = makeCached<SiteSettings>("siteSettings", siteSettingsQuery);
export const getTripBuilderConfig = makeCached<TripBuilderConfig>("tripBuilderConfig", tripBuilderConfigQuery);
export const getPagesContent = makeCached<PagesContent>("pagesContent", pagesContentQuery);
export const getAboutPageContent = makeCached<AboutPageContent>("aboutPage", aboutPageQuery);
export const getConciergePageContent = makeCached<ConciergePageContent>("conciergePage", conciergePageQuery);
export const getCommerceDisclosureContent = makeCached<CommerceDisclosureContent>("commerceDisclosure", commerceDisclosureQuery);
export const getCulturalPillars = makeCached<CulturalPillar[]>("culturalPillars", culturalPillarsQuery);
