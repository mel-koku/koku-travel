import { logger } from "@/lib/logger";
import { USGS_FEED_URL } from "@/lib/alerts/usgs";

const USGS_FETCH_TIMEOUT_MS = 3000;
const USGS_CACHE_TTL_MS = 5 * 60_000;

type FeedCacheEntry = { at: number; feed: unknown[] };
let feedCache: FeedCacheEntry | null = null;

export async function fetchUsgsFeed(): Promise<unknown[]> {
  if (feedCache && Date.now() - feedCache.at < USGS_CACHE_TTL_MS) {
    return feedCache.feed;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), USGS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USGS_FEED_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "yuku-travel/1.0 (+https://yuku.travel)" },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { features?: unknown };
    const feed = Array.isArray(body.features) ? (body.features as unknown[]) : [];
    feedCache = { at: Date.now(), feed };
    return feed;
  } catch (err) {
    logger.warn("USGS fetch failed", { err: String(err) });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Test-only: reset the in-memory USGS feed cache between test cases.
 * Production code never calls this.
 */
export function __resetFeedCacheForTests(): void {
  feedCache = null;
}
