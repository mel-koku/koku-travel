import { NextResponse } from "next/server";
import { getPublishedPeople } from "@/lib/people/peopleService";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { readFileCache, writeFileCache } from "@/lib/api/fileCache";
import type { Person } from "@/types/person";

/**
 * Two-tier cache following /api/locations/all pattern.
 */
const CACHE_TTL = 30 * 60 * 1000; // 30 min in-memory
const FILE_CACHE_KEY = "people-all";
const FILE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2hr file cache

type PeoplePayload = { data: Person[]; total: number };
type PeopleCache = PeoplePayload & { cachedAt: number };
const _g = globalThis as typeof globalThis & { __peopleCache?: PeopleCache };

function getCached(): PeoplePayload | null {
  const c = _g.__peopleCache;
  if (c && Date.now() - c.cachedAt <= CACHE_TTL) {
    return { data: c.data, total: c.total };
  }
  const fileData = readFileCache<PeoplePayload>(FILE_CACHE_KEY, FILE_CACHE_TTL);
  if (fileData) {
    _g.__peopleCache = { ...fileData, cachedAt: Date.now() };
    return fileData;
  }
  _g.__peopleCache = undefined;
  return null;
}

function setCache(data: Person[], total: number) {
  const payload: PeoplePayload = { data, total };
  _g.__peopleCache = { ...payload, cachedAt: Date.now() };
  writeFileCache(FILE_CACHE_KEY, payload);
}

/**
 * GET /api/people/all
 * Returns all published people.
 * Response: { data: Person[], total: number }
 */
export const GET = withApiHandler(
  async (_request) => {
    const cached = getCached();
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "HIT",
        },
      });
    }

    const people = await getPublishedPeople();
    setCache(people, people.length);

    return NextResponse.json(
      { data: people, total: people.length },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "MISS",
        },
      }
    );
  },
  { rateLimit: RATE_LIMITS.PEOPLE },
);
