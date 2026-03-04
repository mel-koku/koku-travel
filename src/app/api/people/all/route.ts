import { NextRequest, NextResponse } from "next/server";
import { getPublishedPeople } from "@/lib/people/peopleService";
import { logger } from "@/lib/logger";
import { internalError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
} from "@/lib/api/middleware";
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
export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  const rateLimitResponse = await checkRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) {
    return addRequestContextHeaders(rateLimitResponse, context);
  }

  const cached = getCached();
  if (cached) {
    return addRequestContextHeaders(
      NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "HIT",
        },
      }),
      context
    );
  }

  try {
    const people = await getPublishedPeople();
    setCache(people, people.length);

    return addRequestContextHeaders(
      NextResponse.json(
        { data: people, total: people.length },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
            "X-Cache": "MISS",
          },
        }
      ),
      context
    );
  } catch (err) {
    logger.error(
      "Failed to fetch all people",
      err instanceof Error ? err : new Error(String(err))
    );
    return addRequestContextHeaders(internalError(context.requestId), context);
  }
}
