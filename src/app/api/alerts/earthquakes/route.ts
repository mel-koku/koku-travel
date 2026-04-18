import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest, notFound } from "@/lib/api/errors";
import { fetchTripById } from "@/services/sync/tripSync";
import { logger } from "@/lib/logger";
import {
  USGS_FEED_URL,
  filterRelevantQuake,
  type EarthquakeAlert,
  type TripCity,
  type TripContext,
} from "@/lib/alerts/usgs";
import { resolveCityCoordinates } from "@/data/cityCoordinates";
import type { CityId } from "@/types/trip";

const uuidSchema = z.string().uuid();
const USGS_FETCH_TIMEOUT_MS = 3000;
const USGS_CACHE_TTL_MS = 5 * 60_000;

type FeedCacheEntry = { at: number; feed: unknown[] };
let feedCache: FeedCacheEntry | null = null;

function parseTripDates(start: string | undefined, end: string | undefined): { startDate: Date; endDate: Date } | null {
  if (!start || !end) return null;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return null;
  return {
    startDate: new Date(sy, sm - 1, sd),
    endDate: new Date(ey, em - 1, ed),
  };
}

function cityIdToDisplayName(id: CityId): string {
  // Capitalize first letter of the lowercase id; matches how existing banners display city names.
  const s = id.toString();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildTripContext(cityIds: CityId[] | undefined, startDate: Date, endDate: Date): TripContext | null {
  if (!cityIds || cityIds.length === 0) return null;
  const cities: TripCity[] = [];
  for (const id of cityIds) {
    const coords = resolveCityCoordinates(id);
    if (!coords) continue;
    cities.push({ id, name: cityIdToDisplayName(id), lat: coords.lat, lon: coords.lon });
  }
  if (cities.length === 0) return null;
  return { cities, startDate, endDate };
}

async function fetchUsgsFeed(): Promise<unknown[]> {
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

export async function GET(request: NextRequest) {
  return withApiHandler(
    async (req, { context, user }) => {
      const tripId = new URL(req.url).searchParams.get("tripId") ?? "";
      const idValidation = uuidSchema.safeParse(tripId);
      if (!idValidation.success) {
        return badRequest("Invalid trip ID", undefined, { requestId: context.requestId });
      }

      const supabase = await createClient();
      const existing = await fetchTripById(supabase, user!.id, tripId);
      if (!existing.success || !existing.data) {
        return notFound("Trip not found", { requestId: context.requestId });
      }

      const dates = parseTripDates(
        existing.data.builderData?.dates?.start,
        existing.data.builderData?.dates?.end,
      );
      if (!dates) {
        return jsonAlert(null);
      }

      // Pre-gate: skip USGS fetch if trip has ended or starts >14 days out.
      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      if (now > dates.endDate) return jsonAlert(null);
      const active = now >= dates.startDate && now <= dates.endDate;
      if (!active) {
        const daysUntilStart = Math.ceil((dates.startDate.getTime() - now.getTime()) / msPerDay);
        if (daysUntilStart > 14) return jsonAlert(null);
      }

      const tripCtx = buildTripContext(
        existing.data.builderData?.cities as CityId[] | undefined,
        dates.startDate,
        dates.endDate,
      );
      if (!tripCtx) return jsonAlert(null);

      const feed = await fetchUsgsFeed();
      const alert = filterRelevantQuake(feed, tripCtx, now);
      return jsonAlert(alert);
    },
    { rateLimit: RATE_LIMITS.TRIPS, requireAuth: true },
  )(request);
}

function jsonAlert(alert: EarthquakeAlert | null): NextResponse {
  const res = NextResponse.json({ alert });
  res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  return res;
}
