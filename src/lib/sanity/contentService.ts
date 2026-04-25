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

// 6s budget — Sanity typically responds in <1s, but cold-start serverless
// instances can stall on the first hit. Pillars are fetched in parallel
// with 8–15s LLM passes in the itinerary engine, so this doesn't extend
// the critical path. All other consumers are ISR pages where the wait
// only happens once per revalidate window.
const SANITY_TIMEOUT_MS = 6000;
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
  // Throw on null inside the cached function so unstable_cache doesn't
  // memoize the empty result. A transient Sanity timeout would otherwise
  // poison the cache for the full revalidate window (1h), even after
  // Sanity recovers — that's how the cultural-briefing empty-state bug
  // surfaced in prod after a cold-start timeout.
  const cached = unstable_cache(
    async (): Promise<T> => {
      const result = await fetchFromSanity<T>(key, query);
      if (result == null) {
        throw new Error(`sanity-${key}-empty`);
      }
      return result;
    },
    [`sanity-${key}`],
    { tags: [`sanity-${key}`], revalidate: SANITY_REVALIDATE_SECONDS },
  );
  return async (): Promise<T | null> => {
    try {
      return await cached();
    } catch {
      return null;
    }
  };
}

export const getLandingPageContent = makeCached<LandingPageContent>("landingPage", landingPageQuery);
export const getSiteSettings = makeCached<SiteSettings>("siteSettings", siteSettingsQuery);
export const getTripBuilderConfig = makeCached<TripBuilderConfig>("tripBuilderConfig", tripBuilderConfigQuery);
export const getPagesContent = makeCached<PagesContent>("pagesContent", pagesContentQuery);
export const getAboutPageContent = makeCached<AboutPageContent>("aboutPage", aboutPageQuery);
export const getConciergePageContent = makeCached<ConciergePageContent>("conciergePage", conciergePageQuery);
export const getCommerceDisclosureContent = makeCached<CommerceDisclosureContent>("commerceDisclosure", commerceDisclosureQuery);
export const getCulturalPillars = makeCached<CulturalPillar[]>("culturalPillars", culturalPillarsQuery);
