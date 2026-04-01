import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";
import { validateRequestBody } from "@/lib/api/schemas";
import { z } from "zod";
import { getCityCenterCoordinates } from "@/data/entryPoints";
import { calculateDistance } from "@/lib/utils/geoUtils";
import { VIBE_FILTER_MAP } from "@/data/vibeFilterMapping";
import { LOCATION_DAY_TRIP_COLUMNS } from "@/lib/supabase/projections";
import type { DayTripSuggestion } from "@/types/dayTrips";
import type { VibeId } from "@/data/vibes";

const MAX_SUGGESTIONS_PER_CITY = 3;
const MAX_SUGGESTIONS_TOTAL = 12;
const MIN_DISTANCE_KM = 50;
const MAX_DISTANCE_KM = 150;
const NEARBY_RADIUS_KM = 15;
/** Bounding box padding in degrees (~1.5 deg lat = ~167km) */
const BBOX_PAD_DEG = 1.5;

const requestSchema = z.object({
  cities: z.array(z.string().max(50)).min(1).max(20),
  vibes: z.array(z.string().max(50)).max(5).optional(),
  usedLocationIds: z.array(z.string().max(255)).max(500).optional(),
  tripStart: z.string().max(20).optional(),
});

type ScoredLocation = {
  id: string;
  name: string;
  region: string;
  city: string;
  planning_city: string | null;
  category: string;
  image: string | null;
  primary_photo_url: string | null;
  short_description: string | null;
  rating: number | null;
  review_count: number | null;
  coordinates: { lat: number; lng: number };
  is_hidden_gem: boolean | null;
  is_unesco_site: boolean | null;
  tags: string[] | null;
  estimated_duration: string | null;
  // Computed fields
  baseCityId: string;
  baseCityName: string;
  distanceKm: number;
  vibeMatchScore: number;
  vibeMatches: string[];
};

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function scoreVibeMatch(
  location: { category: string; tags: string[] | null; is_hidden_gem: boolean | null },
  vibes: string[],
): { score: number; matches: string[] } {
  if (!vibes.length) return { score: 0, matches: [] };

  let score = 0;
  const matches: string[] = [];

  for (const vibe of vibes) {
    const filter = VIBE_FILTER_MAP[vibe as VibeId];
    if (!filter) continue;

    let matched = false;

    if (filter.dbCategories.length > 0 && filter.dbCategories.includes(location.category)) {
      score += 10;
      matched = true;
    }

    if (filter.tags && location.tags) {
      const tagOverlap = filter.tags.filter((t) => location.tags!.includes(t));
      if (tagOverlap.length > 0) {
        score += tagOverlap.length * 3;
        matched = true;
      }
    }

    if (filter.hiddenGemOnly && location.is_hidden_gem) {
      score += 8;
      matched = true;
    }

    if (matched) matches.push(vibe);
  }

  return { score, matches };
}

const CATEGORY_PHRASES: Record<string, string> = {
  nature: "Natural scenery",
  landmark: "Landmark",
  shrine: "Historic shrine",
  temple: "Buddhist temple",
  castle: "Castle grounds",
  garden: "Traditional garden",
  onsen: "Hot spring",
  beach: "Coastal spot",
  viewpoint: "Scenic viewpoint",
  museum: "Museum",
  historic_site: "Historic site",
  craft: "Artisan workshop",
  market: "Local market",
  park: "Park",
};

function buildFallbackDescription(loc: { category: string; city: string; is_hidden_gem: boolean | null; is_unesco_site: boolean | null }): string {
  const phrase = CATEGORY_PHRASES[loc.category] || titleCase(loc.category.replace(/_/g, " "));
  const qualifier = loc.is_unesco_site ? "UNESCO World Heritage " : loc.is_hidden_gem ? "Lesser-known " : "";
  return `${qualifier}${qualifier ? phrase.toLowerCase() : phrase} in ${loc.city}.`;
}

function estimateTravelMinutes(
  _baseCityId: string,
  _targetPlanningCity: string | null,
  distanceKm: number,
): number {
  // Distance-based estimate from base city center to the actual location.
  // The travel matrix (city-to-city) is too coarse for day trip suggestions
  // since locations are 50-150km from the base city, not at a city center.
  // Real routing is used in /api/day-trips/plan when the user accepts.
  const avgSpeed = distanceKm > 100 ? 120 : 80;
  return Math.round((distanceKm / avgSpeed) * 60);
}

export const POST = withApiHandler(
  async (request) => {
    const validation = await validateRequestBody(request, requestSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", { errors: validation.error.issues });
    }

    const { cities, vibes = [], usedLocationIds = [] } = validation.data as { cities: string[]; vibes?: string[]; usedLocationIds?: string[]; tripStart?: string };
    const usedSet = new Set(usedLocationIds);
    const citySet = new Set(cities);

    // Get center coordinates for each user city
    const cityCenters = cities.map((c) => ({
      id: c,
      name: titleCase(c),
      coords: getCityCenterCoordinates(c),
    }));

    // Compute bounding box across all user cities
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const cc of cityCenters) {
      minLat = Math.min(minLat, cc.coords.lat);
      maxLat = Math.max(maxLat, cc.coords.lat);
      minLng = Math.min(minLng, cc.coords.lng);
      maxLng = Math.max(maxLng, cc.coords.lng);
    }
    // Expand by MAX_DISTANCE_KM equivalent in degrees
    minLat -= BBOX_PAD_DEG;
    maxLat += BBOX_PAD_DEG;
    minLng -= BBOX_PAD_DEG;
    maxLng += BBOX_PAD_DEG;

    // Query locations within bounding box
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("locations")
      .select(LOCATION_DAY_TRIP_COLUMNS)
      .eq("is_active", true)
      .not("coordinates", "is", null)
      .gte("coordinates->lat", minLat)
      .lte("coordinates->lat", maxLat)
      .gte("coordinates->lng", minLng)
      .lte("coordinates->lng", maxLng)
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: "Failed to query locations" }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    type LocationRow = {
      id: string; name: string; region: string; city: string;
      planning_city: string | null; category: string; image: string | null;
      primary_photo_url: string | null; short_description: string | null;
      rating: number | null; review_count: number | null;
      coordinates: { lat: number; lng: number } | null;
      is_hidden_gem: boolean | null; is_unesco_site: boolean | null;
      tags: string[] | null; estimated_duration: string | null;
    };
    const typedRows = rows as unknown as LocationRow[];

    // Filter and score locations
    const candidates: ScoredLocation[] = [];

    for (const row of typedRows) {
      if (!row.coordinates) continue;
      if (usedSet.has(row.id)) continue;
      // Exclude locations already reachable from user's planned cities
      if (row.planning_city && citySet.has(row.planning_city)) continue;

      // Find nearest user city and distance
      let nearestCity = cityCenters[0]!;
      let nearestDist = Infinity;
      for (const cc of cityCenters) {
        const d = calculateDistance(cc.coords, row.coordinates);
        if (d < nearestDist) {
          nearestDist = d;
          nearestCity = cc;
        }
      }

      // Must be in the day-trip range
      if (nearestDist < MIN_DISTANCE_KM || nearestDist > MAX_DISTANCE_KM) continue;

      const { score: vibeScore, matches: vibeMatches } = scoreVibeMatch(
        { category: row.category, tags: row.tags, is_hidden_gem: row.is_hidden_gem },
        vibes,
      );

      candidates.push({
        ...row,
        coordinates: row.coordinates,
        baseCityId: nearestCity.id,
        baseCityName: nearestCity.name,
        distanceKm: Math.round(nearestDist),
        vibeMatchScore: vibeScore,
        vibeMatches,
      });
    }

    // Score candidates: vibe match + rating + badges
    const scored = candidates.map((loc) => {
      let totalScore = loc.vibeMatchScore;
      if (loc.rating) totalScore += loc.rating * 4; // max ~20
      if (loc.is_hidden_gem) totalScore += 5;
      if (loc.is_unesco_site) totalScore += 10;
      if (loc.review_count && loc.review_count > 100) totalScore += 3;
      // Slight preference for closer locations
      totalScore -= (loc.distanceKm - MIN_DISTANCE_KM) * 0.05;
      return { ...loc, totalScore };
    });

    // Sort by score descending
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // Count nearby locations for each candidate (within NEARBY_RADIUS_KM)
    // Use the full candidate set for counting
    const coordMap: Array<{ id: string; lat: number; lng: number }> = scored.map((s) => ({
      id: s.id,
      lat: s.coordinates.lat,
      lng: s.coordinates.lng,
    }));

    // Group by base city, take top N per city
    const byCity = new Map<string, typeof scored>();
    for (const loc of scored) {
      const list = byCity.get(loc.baseCityId) || [];
      list.push(loc);
      byCity.set(loc.baseCityId, list);
    }

    const suggestions: DayTripSuggestion[] = [];

    for (const [, cityLocs] of byCity) {
      const topN = cityLocs.slice(0, MAX_SUGGESTIONS_PER_CITY);

      for (const loc of topN) {
        if (suggestions.length >= MAX_SUGGESTIONS_TOTAL) break;

        // Count nearby locations
        const nearbyCount = coordMap.filter(
          (c) =>
            c.id !== loc.id &&
            calculateDistance(loc.coordinates, { lat: c.lat, lng: c.lng }) < NEARBY_RADIUS_KM,
        ).length;

        const travelMins = estimateTravelMinutes(
          loc.baseCityId,
          loc.planning_city,
          loc.distanceKm,
        );

        suggestions.push({
          id: `daytrip-${loc.baseCityId}-${loc.id}`,
          baseCityId: loc.baseCityId,
          baseCityName: loc.baseCityName,
          targetLocationId: loc.id,
          targetLocationName: loc.name,
          targetCity: loc.city,
          targetRegion: loc.region,
          distanceKm: loc.distanceKm,
          travelMinutes: travelMins,
          description: loc.short_description || buildFallbackDescription(loc),
          image: loc.primary_photo_url || loc.image,
          category: loc.category,
          rating: loc.rating,
          reviewCount: loc.review_count,
          nearbyCount,
          vibeMatch: loc.vibeMatches,
          tags: loc.tags,
          isHiddenGem: loc.is_hidden_gem ?? false,
          isUnescoSite: loc.is_unesco_site ?? false,
        });
      }
      if (suggestions.length >= MAX_SUGGESTIONS_TOTAL) break;
    }

    return NextResponse.json({ suggestions });
  },
  { rateLimit: RATE_LIMITS.DAY_TRIPS_SUGGEST },
);
