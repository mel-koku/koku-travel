import { sanityClient } from "@/sanity/client";
import {
  landingPageQuery,
  siteSettingsQuery,
  tripBuilderConfigQuery,
  pagesContentQuery,
} from "@/sanity/queries";
import type {
  LandingPageContent,
  SiteSettings,
  TripBuilderConfig,
  PagesContent,
} from "@/types/sanitySiteContent";
import { readFileCache, readFileCacheStale, writeFileCache } from "@/lib/api/fileCache";

/**
 * Timeout for Sanity CDN fetches in dev mode.
 * During Turbopack compilation, the event loop can be blocked for 30-60s,
 * causing Sanity fetches to hang. In production, Next.js handles this
 * via ISR/static generation so timeouts are less critical.
 */
const SANITY_TIMEOUT_MS = 4000;
const SANITY_CACHE_TTL = 60 * 60 * 1000; // 1 hour file cache

/**
 * Wraps a Sanity fetch with a timeout and file cache.
 * Returns cached data or null if both Sanity and cache miss.
 */
async function fetchWithCache<T>(
  key: string,
  query: string,
): Promise<T | null> {
  // Try globalThis cache first (fastest)
  const memKey = `__sanity_${key}` as const;
  const _g = globalThis as Record<string, unknown>;
  const memCached = _g[memKey] as { data: T; at: number } | undefined;
  if (memCached && Date.now() - memCached.at < SANITY_CACHE_TTL) {
    return memCached.data;
  }

  // Try file cache (survives dev server restarts)
  const fileCached = readFileCache<T>(`sanity-${key}`, SANITY_CACHE_TTL);
  if (fileCached) {
    _g[memKey] = { data: fileCached, at: Date.now() };
    return fileCached;
  }

  // Fetch from Sanity with timeout
  try {
    const result = await Promise.race([
      sanityClient.fetch<T | null>(query),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), SANITY_TIMEOUT_MS),
      ),
    ]);

    if (result) {
      _g[memKey] = { data: result, at: Date.now() };
      writeFileCache(`sanity-${key}`, result);
      return result;
    }

    // Sanity returned null (timeout or empty) — try stale cache
    const stale = readFileCacheStale<T>(`sanity-${key}`);
    if (stale) {
      _g[memKey] = { data: stale, at: Date.now() };
      return stale;
    }

    return null;
  } catch {
    // Network error — try stale cache before giving up
    const stale = readFileCacheStale<T>(`sanity-${key}`);
    if (stale) {
      _g[memKey] = { data: stale, at: Date.now() };
      return stale;
    }
    return null;
  }
}

export async function getLandingPageContent(): Promise<LandingPageContent | null> {
  return fetchWithCache<LandingPageContent>("landingPage", landingPageQuery);
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return fetchWithCache<SiteSettings>("siteSettings", siteSettingsQuery);
}

export async function getTripBuilderConfig(): Promise<TripBuilderConfig | null> {
  return fetchWithCache<TripBuilderConfig>("tripBuilderConfig", tripBuilderConfigQuery);
}

export async function getPagesContent(): Promise<PagesContent | null> {
  return fetchWithCache<PagesContent>("pagesContent", pagesContentQuery);
}
