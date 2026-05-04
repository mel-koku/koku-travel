import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";

import { resolvePlaceByText, type ResolvedPlace } from "@/lib/google/search";
import { getModel, VERTEX_PROVIDER_OPTIONS, logVertexUsage } from "@/lib/server/llmProvider";
import { badRequest, serviceUnavailable } from "@/lib/api/errors";
import { featureFlags } from "@/lib/env/featureFlags";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS, DAILY_QUOTAS } from "@/lib/api/rateLimits";
import { gateOnDailyCost } from "@/lib/api/costGate";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const NEARBY_FOOD_MAX_BODY_SIZE = 4 * 1024;

// ── Cache (LRU, in-memory) ─────────────────────────────────────────
// Keyed by (rounded lat, rounded lng, mealType). 0.01° rounding ≈ 1.1km
// at Tokyo's latitude — anchors that fall in the same neighborhood share
// a cache hit. 24h TTL because food venues change slowly.
const CACHE_MAX = 200;
const CACHE_TTL = 24 * 60 * 60 * 1000;

type CacheEntry = {
  places: NearbyFoodPlace[];
  expiresAt: number;
};

class LruMap<K, V> extends Map<K, V> {
  constructor(private maxSize: number) {
    super();
  }
  override get(key: K): V | undefined {
    const value = super.get(key);
    if (value !== undefined) {
      super.delete(key);
      super.set(key, value);
    }
    return value;
  }
  override set(key: K, value: V): this {
    if (super.has(key)) super.delete(key);
    super.set(key, value);
    while (super.size > this.maxSize) {
      const oldest = super.keys().next().value;
      if (oldest !== undefined) super.delete(oldest);
    }
    return this;
  }
}

const cache = new LruMap<string, CacheEntry>(CACHE_MAX);

function cacheKey(lat: number, lng: number, mealType: string): string {
  const rLat = Math.round(lat * 100) / 100;
  const rLng = Math.round(lng * 100) / 100;
  return `${rLat}|${rLng}|${mealType}`;
}

// ── LLM schema ─────────────────────────────────────────────────────
// Force exactly 5 venues with concise concierge blurbs. Names should be
// "Google-listable" (real, established places) — explicit constraint in
// the prompt below to suppress hallucination.
const venueSchema = z.object({
  venues: z
    .array(
      z.object({
        name: z
          .string()
          .min(2)
          .max(120)
          .describe("Official restaurant name as it would appear on Google Maps."),
        blurb: z
          .string()
          .min(10)
          .max(120)
          .describe(
            "One concierge sentence — sensory and specific. No marketing fluff, no em-dashes.",
          ),
      }),
    )
    .min(3)
    .max(6),
});

type NearbyFoodPlace = {
  placeId: string;
  name: string;
  blurb: string;
  address?: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  ratingCount?: number;
  primaryType?: string;
  /** Already proxy-encoded URL pointing at /api/places/photo. */
  photoUrl?: string;
};

// ── Prompt builder ────────────────────────────────────────────────
function buildPrompt(args: {
  mealType: "breakfast" | "lunch" | "dinner";
  lat: number;
  lng: number;
  anchorLabel?: string;
  cityLabel?: string;
}): string {
  // The COORDINATES are the only fully-trusted signal. The cityLabel is the
  // user's planning city (e.g. "Tokyo") which can be misleading when the
  // anchor sits in an outlying area like Narita (still "Tokyo region" for
  // trip planning, but actually 60km from central Tokyo). The anchorLabel
  // can be a generic chain name. So we instruct the model to identify the
  // neighborhood from coords first, then suggest places strictly within
  // walking distance.
  const focus =
    args.mealType === "breakfast"
      ? "morning food (cafes, bakeries, hotel-style breakfasts, traditional teishoku)"
      : args.mealType === "lunch"
        ? "midday food (ramen, soba, teishoku sets, sushi counters, casual restaurants)"
        : "evening food (izakaya, kaiseki, ramen, yakiniku, sushi, dinner restaurants)";

  const cityHint = args.cityLabel
    ? `\n\nThe user's broader trip city is "${args.cityLabel}", but TRUST THE COORDINATES — if the coordinates point to a different specific neighborhood (Narita, Yokohama, Kawasaki, etc.) suggest places there, not in central ${args.cityLabel}.`
    : "";

  return `You are Yuku, the Japan-desk concierge layer of a travel publication. You recommend ${args.mealType} options near specific Japanese coordinates. Concrete, restrained, operational.

ANCHOR COORDINATES: ${args.lat.toFixed(5)}, ${args.lng.toFixed(5)}${args.anchorLabel ? `\nNAMED ANCHOR (may be ambiguous): ${args.anchorLabel}` : ""}${cityHint}

First, identify what specific neighborhood / ward / town these coordinates fall in.

Then suggest exactly 5 well-known, established food venues suitable for ${args.mealType} — within 3km walking distance of the coordinates above. ${focus} are good candidates.

Hard constraints:
- The venues MUST be located within ~3km of the coordinates. Verify using your knowledge of Japanese geography. A wrong-neighborhood suggestion (e.g. central Tokyo restaurants for Narita coordinates) is a failure.
- Real, established venues only — places a Google Maps search would confirm exist at those coordinates. No invented names.
- Mix of price points and styles. Include at least one chain or casual option in case the user needs something quick.

For each venue, give:
- "name": the official Japanese-romanized name as it appears on Google Maps.
- "blurb": one short concierge sentence (max 18 words). Sensory and specific. No em-dashes. No "hidden gem" / "secret" / "off the beaten path".

Return JSON matching the schema.`;
}

export const POST = withApiHandler(
  async (request: NextRequest, { context, user }) => {
    if (request.headers.get("content-length")) {
      const length = Number(request.headers.get("content-length"));
      if (length > NEARBY_FOOD_MAX_BODY_SIZE) {
        return badRequest("Body too large", undefined, { requestId: context.requestId });
      }
    }

    let body: {
      lat?: number;
      lng?: number;
      mealType?: string;
      anchorLabel?: string;
      cityLabel?: string;
    };
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON.", undefined, { requestId: context.requestId });
    }

    const { lat, lng, mealType, anchorLabel, cityLabel } = body;

    if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
      return badRequest("'lat' and 'lng' must be numbers.", undefined, {
        requestId: context.requestId,
      });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return badRequest("'lat'/'lng' out of range.", undefined, { requestId: context.requestId });
    }
    if (mealType !== "breakfast" && mealType !== "lunch" && mealType !== "dinner") {
      return badRequest("'mealType' must be breakfast, lunch, or dinner.", undefined, {
        requestId: context.requestId,
      });
    }

    if (!featureFlags.enableGooglePlaces) {
      return serviceUnavailable("Google Places API calls are disabled.", {
        requestId: context.requestId,
      });
    }

    const key = cacheKey(lat, lng, mealType);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(
        { places: cached.places, cached: true },
        { headers: { "Cache-Control": "private, max-age=900" } },
      );
    }

    // Cache missed — gate Vertex spend before LLM call.
    const costDenial = await gateOnDailyCost({
      costKey: user?.id ?? context.ip ?? "unknown",
      estimate: "nearbyFood",
      routeName: "/api/places/nearby-food",
      requestId: context.requestId,
    });
    if (costDenial) return costDenial;

    const model = getModel();
    if (!model) {
      return serviceUnavailable("LLM provider not configured.", {
        requestId: context.requestId,
      });
    }

    // ── Step 1: ask the LLM for 5 candidates ──
    let venues: { name: string; blurb: string }[];
    try {
      const controller = new AbortController();
      // 20s budget: Gemini Flash usually returns in 2-4s warm but cold-start
      // (first call after deploy / 5+ min idle) can spike to 10-15s. The
      // user is waiting in front of an "Add a place" dialog — bias toward
      // showing them something rather than aborting.
      const timeout = setTimeout(() => controller.abort(), 20000);
      const result = await generateObject({
        model,
        providerOptions: VERTEX_PROVIDER_OPTIONS,
        schema: venueSchema,
        prompt: buildPrompt({ mealType, lat, lng, anchorLabel, cityLabel }),
        abortSignal: controller.signal,
      });
      clearTimeout(timeout);
      logVertexUsage("nearby-food", result);
      venues = result.object.venues;
    } catch (error) {
      logger.warn("nearby-food: LLM venue generation failed", {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ places: [], cached: false });
    }

    // ── Step 2: resolve each via Google searchText (parallel) ──
    // Hard radius — anything outside this is a near-miss / wrong city,
    // and we drop it. Google's searchText respects locationBias as a soft
    // hint, not a strict cutoff, so we double-check the resolved coords.
    // 6km is generous enough for sparse outer-Tokyo / Narita neighborhoods
    // without letting wrong-city results through.
    const MAX_RESOLVED_KM = 6;
    const resolved = await Promise.all(
      venues.map(async (venue): Promise<NearbyFoodPlace | null> => {
        let place: ResolvedPlace | null = null;
        try {
          place = await resolvePlaceByText({
            query: venue.name,
            lat,
            lng,
            radiusMeters: 5000,
          });
        } catch (error) {
          logger.warn("nearby-food: resolve failed for venue", {
            venue: venue.name,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
        if (!place) return null;

        const distanceKm = haversineKm(lat, lng, place.coordinates.lat, place.coordinates.lng);
        if (distanceKm > MAX_RESOLVED_KM) {
          logger.info("nearby-food: dropped wrong-area resolution", {
            venue: venue.name,
            resolvedTo: place.displayName,
            distanceKm: distanceKm.toFixed(2),
          });
          return null;
        }

        const photoUrl = place.photoName
          ? `/api/places/photo?photoName=${encodeURIComponent(place.photoName)}&maxWidthPx=400`
          : undefined;

        return {
          placeId: place.placeId,
          name: place.displayName,
          blurb: venue.blurb,
          address: place.formattedAddress,
          coordinates: place.coordinates,
          rating: place.rating,
          ratingCount: place.ratingCount,
          primaryType: place.primaryType,
          photoUrl,
        };
      }),
    );

    // ── Step 3: filter, dedupe by placeId, cap at 6 ──
    const seen = new Set<string>();
    const places: NearbyFoodPlace[] = [];
    for (const p of resolved) {
      if (!p) continue;
      if (seen.has(p.placeId)) continue;
      seen.add(p.placeId);
      places.push(p);
      if (places.length >= 6) break;
    }

    cache.set(key, { places, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json(
      { places, cached: false },
      { headers: { "Cache-Control": "private, max-age=900" } },
    );
  },
  {
    rateLimit: RATE_LIMITS.PLACES,
    dailyQuota: DAILY_QUOTAS.PLACES,
    optionalAuth: true,
    requireJson: true,
  },
);
