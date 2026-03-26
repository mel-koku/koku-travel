import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { RATE_LIMITS } from "@/lib/api/rateLimits";
import { badRequest } from "@/lib/api/errors";
import { validateRequestBody } from "@/lib/api/schemas";
import { z } from "zod";
import { calculateDistance } from "@/lib/utils/geoUtils";
import { getCityCenterCoordinates } from "@/data/entryPoints";
import { LOCATION_ITINERARY_COLUMNS } from "@/lib/supabase/projections";
import { VIBE_FILTER_MAP } from "@/data/vibeFilterMapping";
import type { ItineraryActivity, ItineraryTravelSegment } from "@/types/itinerary";
import type { VibeId } from "@/data/vibes";
import { v4 as uuid } from "uuid";

const NEARBY_RADIUS_KM = 15;
const MAX_ACTIVITIES = 3;

type LocationRow = {
  id: string;
  name: string;
  region: string;
  city: string;
  planning_city: string | null;
  neighborhood: string | null;
  category: string;
  image: string | null;
  coordinates: { lat: number; lng: number } | null;
  short_description: string | null;
  rating: number | null;
  review_count: number | null;
  estimated_duration: string | null;
  tags: string[] | null;
  is_hidden_gem: boolean | null;
  is_unesco_site: boolean | null;
  business_status: string | null;
};

const requestSchema = z.object({
  baseCityId: z.string().max(50),
  targetLocationId: z.string().max(255),
  dayIndex: z.number().int().min(0),
  dayId: z.string().max(255),
  vibes: z.array(z.string().max(50)).max(5).optional(),
  usedLocationIds: z.array(z.string().max(255)).max(500).optional(),
  tripDate: z.string().max(20).optional(),
});

function estimateTravelMinutes(distanceKm: number): number {
  const avgSpeed = distanceKm > 100 ? 120 : 80;
  return Math.round((distanceKm / avgSpeed) * 60);
}

function scoreForDayTrip(
  location: { category: string; tags: string[] | null; rating: number | null; is_hidden_gem: boolean | null },
  vibes: string[],
): number {
  let score = 0;
  if (location.rating) score += location.rating * 4;
  if (location.is_hidden_gem) score += 5;

  for (const vibe of vibes) {
    const filter = VIBE_FILTER_MAP[vibe as VibeId];
    if (!filter) continue;
    if (filter.dbCategories.length > 0 && filter.dbCategories.includes(location.category)) score += 8;
    if (filter.tags && location.tags) {
      score += filter.tags.filter((t) => location.tags!.includes(t)).length * 2;
    }
  }

  return score;
}

function buildTravelSegment(
  fromName: string,
  toName: string,
  durationMinutes: number,
): ItineraryTravelSegment {
  return {
    mode: "train",
    durationMinutes,
    isEstimated: true,
    notes: `Train from ${fromName} to ${toName} (~${Math.round(durationMinutes / 60 * 10) / 10}h)`,
  };
}

export const POST = withApiHandler(
  async (request) => {
    const validation = await validateRequestBody(request, requestSchema);
    if (!validation.success) {
      return badRequest("Invalid request body", { errors: validation.error.issues });
    }

    const {
      baseCityId,
      targetLocationId,
      vibes = [],
      usedLocationIds = [],
    } = validation.data;

    const usedSet = new Set(usedLocationIds);
    const supabase = await createClient();

    // Fetch the target (anchor) location
    const { data: rawTarget, error: targetError } = await supabase
      .from("locations")
      .select(LOCATION_ITINERARY_COLUMNS)
      .eq("id", targetLocationId)
      .eq("is_active", true)
      .single();

    const targetRow = rawTarget as unknown as LocationRow | null;

    if (targetError || !targetRow?.coordinates) {
      return badRequest("Target location not found or missing coordinates");
    }

    // Fetch nearby locations for additional activities
    const targetCoords = targetRow.coordinates;
    const bbox = {
      minLat: targetCoords.lat - 0.15,
      maxLat: targetCoords.lat + 0.15,
      minLng: targetCoords.lng - 0.2,
      maxLng: targetCoords.lng + 0.2,
    };

    const { data: rawNearby } = await supabase
      .from("locations")
      .select(LOCATION_ITINERARY_COLUMNS)
      .eq("is_active", true)
      .not("coordinates", "is", null)
      .neq("id", targetLocationId)
      .gte("coordinates->lat", bbox.minLat)
      .lte("coordinates->lat", bbox.maxLat)
      .gte("coordinates->lng", bbox.minLng)
      .lte("coordinates->lng", bbox.maxLng)
      .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
      .limit(100);

    const nearbyRows = (rawNearby || []) as unknown as LocationRow[];

    // Filter to within NEARBY_RADIUS_KM and score
    const nearby = nearbyRows
      .filter((r) => {
        if (!r.coordinates || usedSet.has(r.id)) return false;
        return calculateDistance(targetCoords, r.coordinates) < NEARBY_RADIUS_KM;
      })
      .map((r) => ({
        ...r,
        score: scoreForDayTrip(r, vibes),
      }))
      .sort((a, b) => b.score - a.score);

    // Pick top companions (different categories preferred)
    const companions: typeof nearby = [];
    const usedCategories = new Set([targetRow.category]);
    for (const loc of nearby) {
      if (companions.length >= MAX_ACTIVITIES - 1) break;
      if (!usedCategories.has(loc.category) || companions.length < 1) {
        companions.push(loc);
        usedCategories.add(loc.category);
      }
    }

    // Build activities: target first, then companions
    const allLocs = [targetRow, ...companions];
    const timeSlots: Array<"morning" | "afternoon" | "evening"> = ["morning", "afternoon", "afternoon"];
    const activities: ItineraryActivity[] = allLocs.map((loc, i) => ({
      kind: "place" as const,
      id: uuid(),
      title: loc.name,
      timeOfDay: timeSlots[i] || "afternoon",
      durationMin: parseInt(loc.estimated_duration || "60", 10) || 60,
      locationId: loc.id,
      coordinates: loc.coordinates ?? undefined,
      description: loc.short_description || undefined,
      neighborhood: loc.neighborhood || undefined,
      tags: loc.tags || undefined,
    }));

    // Calculate travel times
    const baseCityName = baseCityId.charAt(0).toUpperCase() + baseCityId.slice(1);
    const baseCityCoords = getCityCenterCoordinates(baseCityId);
    const distanceKm = calculateDistance(baseCityCoords, targetCoords);
    const oneWayMinutes = estimateTravelMinutes(distanceKm);

    const travelTo = buildTravelSegment(baseCityName, targetRow.city || targetRow.name, oneWayMinutes);
    const travelFrom = buildTravelSegment(targetRow.city || targetRow.name, baseCityName, oneWayMinutes);

    // Add travel-to as the first activity's travelFromPrevious
    if (activities.length > 0) {
      (activities[0] as Extract<ItineraryActivity, { kind: "place" }>).travelFromPrevious = travelTo;
    }

    // Add travel-from as the last activity's travelToNext (return journey)
    if (activities.length > 0) {
      (activities[activities.length - 1] as Extract<ItineraryActivity, { kind: "place" }>).travelToNext = travelFrom;
    }

    const targetCityId = targetRow.planning_city || targetRow.city?.toLowerCase() || baseCityId;

    return NextResponse.json({
      activities,
      travelTo,
      travelFrom,
      totalTravelMinutes: oneWayMinutes * 2,
      dayLabel: `Day Trip: ${baseCityName} \u2192 ${targetRow.city || targetRow.name}`,
      targetCityId,
    });
  },
  { rateLimit: RATE_LIMITS.DAY_TRIPS_PLAN },
);
