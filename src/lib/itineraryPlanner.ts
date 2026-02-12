import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import { findLocationsForActivities } from "@/lib/itineraryLocations";
import { resolveTimezone } from "@/lib/utils/timezoneUtils";
import type {
  Itinerary,
  ItineraryActivity,
  ItineraryCityTransition,
  ItineraryDay,
  ItineraryTravelMode,
  ItineraryTravelSegment,
} from "@/types/itinerary";
import type { Location, LocationOperatingHours, LocationOperatingPeriod, Weekday } from "@/types/location";
import type { CityId } from "@/types/trip";
import { travelMinutes } from "./travelTime";
import { getCategoryDefaultDuration } from "./durationExtractor";
import { logger } from "./logger";

import { requestRoute } from "./routing";
import { toItineraryMode } from "./routing/types";

type PlannerOptions = {
  defaultDayStart?: string;
  defaultDayEnd?: string;
  defaultVisitMinutes?: number;
  transitionBufferMinutes?: number;
};

const DEFAULT_OPTIONS: Required<PlannerOptions> = {
  defaultDayStart: "09:00",
  defaultDayEnd: "21:00",
  defaultVisitMinutes: 90, // Matches DEFAULT_DURATION in durationExtractor.ts
  transitionBufferMinutes: 10,
};

type Coordinates = {
  lat: number;
  lng: number;
} | null;

const MINUTES_IN_DAY = 24 * 60;

/** Distance threshold (km) above which transit routing is preferred over walking */
const TRANSIT_DISTANCE_THRESHOLD_KM = 1;
/** Travel time threshold (minutes) for short-distance train classification */
const SHORT_DISTANCE_TRAIN_THRESHOLD_MIN = 60;
/** Travel time threshold (minutes) for long-distance shinkansen classification */
const LONG_DISTANCE_TRAIN_THRESHOLD_MIN = 120;

function parseTime(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = Math.round(normalized % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function lookupCoordinates(activity: Extract<ItineraryActivity, { kind: "place" }>, location: Location | null): Coordinates {
  // First check if activity has embedded coordinates (entry points, external places)
  if (activity.coordinates) {
    return activity.coordinates;
  }
  if (location?.coordinates) {
    return location.coordinates;
  }
  if (activity.locationId) {
    const coordinates = getCoordinatesForLocationId(activity.locationId);
    if (coordinates) {
      return coordinates;
    }
  }
  const byName = getCoordinatesForName(activity.title);
  if (byName) {
    return byName;
  }
  if (location?.name) {
    return getCoordinatesForName(location.name);
  }
  return null;
}

function parseEstimatedDuration(text?: string | null): number | null {
  if (!text) {
    return null;
  }
  const hoursMatch = text.match(/([\d.]+)\s*(hour|hr)/i);
  const minutesMatch = text.match(/(\d+)\s*min/i);
  let totalMinutes = 0;
  if (hoursMatch && hoursMatch[1]) {
    totalMinutes += Number.parseFloat(hoursMatch[1]) * 60;
  }
  if (minutesMatch && minutesMatch[1]) {
    totalMinutes += Number.parseInt(minutesMatch[1], 10);
  }
  if (totalMinutes === 0) {
    return null;
  }
  return Math.round(totalMinutes);
}

async function determineVisitDuration(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  location: Location | null,
  options: Required<PlannerOptions>,
): Promise<number> {
  // 1. Prefer explicit activity duration
  if (activity.durationMin) {
    return activity.durationMin;
  }

  // 2. Prefer structured recommendation from location data
  if (location?.recommendedVisit?.typicalMinutes) {
    return location.recommendedVisit.typicalMinutes;
  }
  if (location?.recommendedVisit?.minMinutes) {
    return location.recommendedVisit.minMinutes;
  }

  // 3. Parse estimatedDuration string from database (pre-enriched) or activity notes
  const parsed = parseEstimatedDuration(location?.estimatedDuration ?? activity.notes);
  if (parsed) {
    logger.debug("Using estimated duration from database", {
      locationId: location?.id,
      locationName: location?.name,
      duration: parsed,
    });
    return parsed;
  }

  // 4. Use category-based default if available
  if (location?.category) {
    return getCategoryDefaultDuration(location.category);
  }

  // 5. Fall back to options default (90 minutes)
  return options.defaultVisitMinutes;
}

function getOperatingPeriodForDay(hours: LocationOperatingHours | undefined, weekday?: Weekday): LocationOperatingPeriod | null {
  if (!hours || !weekday) {
    return null;
  }
  return hours.periods.find((period) => period.day === weekday) ?? null;
}

function evaluateOperatingWindow(
  period: LocationOperatingPeriod | null,
  arrivalMinutes: number,
  durationMinutes: number,
): {
  adjustedArrival: number;
  adjustedDeparture: number;
  arrivalBuffer?: number;
  departureBuffer?: number;
  status: "scheduled" | "tentative" | "out-of-hours";
  window?: {
    opensAt: string;
    closesAt: string;
    isOvernight?: boolean;
    note?: string;
    status: "within" | "outside" | "unknown";
  };
} {
  if (!period) {
    return {
      adjustedArrival: arrivalMinutes,
      adjustedDeparture: arrivalMinutes + durationMinutes,
      status: "tentative",
      window: undefined,
    };
  }

  const openMinutes = parseTime(period.open) ?? 0;
  const closeMinutesRaw = parseTime(period.close) ?? MINUTES_IN_DAY;
  const closeMinutes = period.isOvernight ? closeMinutesRaw + MINUTES_IN_DAY : closeMinutesRaw;

  let adjustedArrival = arrivalMinutes;
  let adjustedDeparture = arrivalMinutes + durationMinutes;
  let arrivalBuffer: number | undefined;
  let departureBuffer: number | undefined;
  let scheduleStatus: "scheduled" | "tentative" | "out-of-hours" = "scheduled";
  let windowStatus: "within" | "outside" | "unknown" = "within";

  if (adjustedArrival < openMinutes) {
    arrivalBuffer = openMinutes - adjustedArrival;
    adjustedArrival = openMinutes;
    adjustedDeparture = adjustedArrival + durationMinutes;
  }

  if (adjustedArrival > closeMinutes) {
    scheduleStatus = "out-of-hours";
    windowStatus = "outside";
  } else if (adjustedDeparture > closeMinutes) {
    departureBuffer = adjustedDeparture - closeMinutes;
    adjustedDeparture = closeMinutes;
    scheduleStatus = "out-of-hours";
    windowStatus = "outside";
  }

  return {
    adjustedArrival,
    adjustedDeparture,
    arrivalBuffer,
    departureBuffer,
    status: scheduleStatus,
    window: {
      opensAt: period.open,
      closesAt: period.close,
      isOvernight: period.isOvernight,
      status: windowStatus,
    },
  };
}

/**
 * Create a city transition segment between two days
 */
function createCityTransition(
  fromCityId: CityId,
  toCityId: CityId,
  previousDay: ItineraryDay,
  _currentDay: ItineraryDay,
): ItineraryCityTransition | undefined {
  // Get travel time between cities
  const travelTime = travelMinutes(fromCityId, toCityId);
  if (travelTime === undefined) {
    return undefined;
  }

  // Determine travel mode based on distance/time
  let mode: ItineraryTravelMode = "transit";
  if (travelTime < SHORT_DISTANCE_TRAIN_THRESHOLD_MIN) {
    mode = "train"; // Short distance, likely train
  } else if (travelTime > LONG_DISTANCE_TRAIN_THRESHOLD_MIN) {
    mode = "train"; // Long distance, likely shinkansen
  }

  // Use end of previous day or start of current day for departure
  const previousDayEnd = previousDay.bounds?.endTime ?? "21:00";
  const currentDayStart = _currentDay.bounds?.startTime ?? "09:00";
  void currentDayStart; // Intentionally unused - kept for future use

  // For inter-city travel, prefer traveling at end of previous day or start of current day
  // Use end of previous day as departure time
  const departureTime = previousDayEnd;
  const arrivalMinutes = parseTime(departureTime) ?? 0;
  const arrivalTimeMinutes = arrivalMinutes + travelTime;
  const arrivalTime = formatTime(arrivalTimeMinutes);

  return {
    fromCityId,
    toCityId,
    mode,
    durationMinutes: travelTime,
    departureTime,
    arrivalTime,
    notes: `Traveling from ${fromCityId} to ${toCityId}`,
  };
}

function mergePathSegments(paths: Array<ItineraryTravelSegment["path"] | undefined>): ItineraryTravelSegment["path"] {
  const merged: NonNullable<ItineraryTravelSegment["path"]> = [];

  paths.forEach((path) => {
    if (!path || path.length === 0) {
      return;
    }

    path.forEach((point, index) => {
      if (!point) return;
      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        if (last && last.lat === point.lat && last.lng === point.lng && index === 0) {
          return;
        }
      }
      merged.push({ lat: point.lat, lng: point.lng });
    });
  });

  return merged.length > 0 ? merged : undefined;
}

function buildTravelSegment(
  mode: ItineraryTravelMode,
  departureMinutes: number,
  durationSeconds: number,
  distanceMeters: number,
  path?: ItineraryTravelSegment["path"],
  instructions?: string[],
) {
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const arrivalMinutes = departureMinutes + durationMinutes;
  return {
    mode,
    durationMinutes,
    distanceMeters,
    departureTime: formatTime(departureMinutes),
    arrivalTime: formatTime(arrivalMinutes),
    instructions,
    path,
  };
}

export async function planItinerary(
  itinerary: Itinerary,
  options: PlannerOptions = {},
  dayEntryPoints?: Record<string, { startPoint?: { coordinates: { lat: number; lng: number } }; endPoint?: { coordinates: { lat: number; lng: number } } }>,
): Promise<Itinerary> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Plan all days in parallel (each day's routing is independent)
  const rawPlannedDays = await Promise.all(
    itinerary.days.map((day) => {
      if (!day) return undefined;
      const entryPoints = dayEntryPoints?.[day.id];
      return planItineraryDay(
        day,
        itinerary,
        mergedOptions,
        entryPoints?.startPoint,
        entryPoints?.endPoint,
      );
    }),
  );

  // Add city transitions sequentially (static lookups, no API calls)
  const plannedDays: ItineraryDay[] = [];
  for (const current of rawPlannedDays) {
    if (!current) continue;
    const previous = plannedDays[plannedDays.length - 1];
    if (previous?.cityId && current.cityId && previous.cityId !== current.cityId) {
      const transition = createCityTransition(
        previous.cityId,
        current.cityId,
        previous,
        current,
      );
      if (transition) {
        current.cityTransition = transition;
      }
    }
    plannedDays.push(current);
  }

  return {
    ...itinerary,
    days: plannedDays,
  };
}

async function planItineraryDay(
  day: ItineraryDay,
  itinerary: Itinerary,
  options: Required<PlannerOptions>,
  startPoint?: { coordinates: { lat: number; lng: number } },
  _endPoint?: { coordinates: { lat: number; lng: number } },
): Promise<ItineraryDay> {
  // Resolve timezone using fallback hierarchy (day > itinerary > Japan default)
  const dayTimezone = resolveTimezone({
    dayTimezone: day.timezone,
    itineraryTimezone: itinerary.timezone,
  });
  const startMinutes =
    parseTime(day.bounds?.startTime) ?? parseTime(options.defaultDayStart) ?? parseTime("09:00") ?? 540;
  const endMinutes =
    parseTime(day.bounds?.endTime) ?? parseTime(options.defaultDayEnd) ?? parseTime("21:00") ?? 1260;

  // Pre-fetch all locations at once for efficiency
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );
  const locationsMap = await findLocationsForActivities(placeActivities);

  // Pre-compute metadata for all place activities
  const metaByActivityId = new Map<
    string,
    { location: Location | null; coordinates: Coordinates; visitDuration: number }
  >();
  await Promise.all(
    placeActivities.map(async (activity) => {
      const location = locationsMap.get(activity.id) ?? null;
      const coordinates = lookupCoordinates(activity, location);
      const visitDuration = await determineVisitDuration(activity, location, options);
      metaByActivityId.set(activity.id, { location, coordinates, visitDuration });
    }),
  );

  // Build routing pairs between consecutive place activities
  const routingPairs: Array<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    activityId: string;
    explicitMode: ItineraryTravelMode | null;
  }> = [];
  let prevCoords: Coordinates = startPoint
    ? { lat: startPoint.coordinates.lat, lng: startPoint.coordinates.lng }
    : null;

  for (const activity of placeActivities) {
    const meta = metaByActivityId.get(activity.id);
    const coordinates = meta?.coordinates ?? null;
    if (prevCoords && coordinates) {
      const hasExplicit =
        activity.travelFromPrevious?.mode && activity.travelFromPrevious.mode !== "walk";
      routingPairs.push({
        origin: prevCoords,
        destination: coordinates,
        activityId: activity.id,
        explicitMode: hasExplicit ? activity.travelFromPrevious?.mode ?? null : null,
      });
    }
    prevCoords = coordinates;
  }

  // --- Phase 1: Fetch walk routes + explicit-mode routes in parallel ---
  const phase1Results = await Promise.all(
    routingPairs.map((pair) =>
      requestRoute({
        origin: pair.origin,
        destination: pair.destination,
        mode: pair.explicitMode ?? "walk",
        departureTime: formatTime(startMinutes),
        timezone: dayTimezone,
      }),
    ),
  );

  // --- Phase 2: Fetch transit routes for walk pairs with distance >= 1km ---
  const transitNeeded: { pairIndex: number; departureTime: string }[] = [];
  let estimatedCursor = startMinutes;

  for (let i = 0; i < routingPairs.length; i++) {
    const pair = routingPairs[i];
    const walkResult = phase1Results[i];
    if (!pair || !walkResult) continue;

    if (!pair.explicitMode) {
      const distanceKm = (walkResult.distanceMeters ?? 0) / 1000;
      if (distanceKm >= TRANSIT_DISTANCE_THRESHOLD_KM) {
        transitNeeded.push({
          pairIndex: i,
          departureTime: formatTime(estimatedCursor),
        });
      }
    }
    estimatedCursor += Math.max(1, Math.round(walkResult.durationSeconds / 60));
    const meta = metaByActivityId.get(pair.activityId);
    if (meta) {
      estimatedCursor += meta.visitDuration + options.transitionBufferMinutes;
    }
  }

  const phase2Results =
    transitNeeded.length > 0
      ? await Promise.all(
          transitNeeded.map(({ pairIndex, departureTime }) => {
            const rp = routingPairs[pairIndex]!;
            return requestRoute({
              origin: rp.origin,
              destination: rp.destination,
              mode: "transit",
              departureTime,
              timezone: dayTimezone,
            });
          },
          ),
        )
      : [];

  // Build transit result lookup
  const transitResultMap = new Map<number, Awaited<ReturnType<typeof requestRoute>>>();
  transitNeeded.forEach(({ pairIndex }, i) => {
    const result = phase2Results[i];
    if (result) transitResultMap.set(pairIndex, result);
  });

  // Resolve final route for each pair
  const resolvedRouteByActivityId = new Map<
    string,
    { route: Awaited<ReturnType<typeof requestRoute>>; travelMode: ItineraryTravelMode }
  >();

  for (let i = 0; i < routingPairs.length; i++) {
    const pair = routingPairs[i];
    const phase1Result = phase1Results[i];
    if (!pair || !phase1Result) continue;

    if (pair.explicitMode) {
      resolvedRouteByActivityId.set(pair.activityId, {
        route: phase1Result,
        travelMode: toItineraryMode(phase1Result.mode),
      });
    } else {
      const distanceKm = (phase1Result.distanceMeters ?? 0) / 1000;
      if (distanceKm >= TRANSIT_DISTANCE_THRESHOLD_KM) {
        const transitResult = transitResultMap.get(i);
        if (transitResult && transitResult.durationSeconds > 0) {
          resolvedRouteByActivityId.set(pair.activityId, {
            route: transitResult,
            travelMode: "train",
          });
        } else {
          resolvedRouteByActivityId.set(pair.activityId, {
            route: phase1Result,
            travelMode: "walk",
          });
          logger.warn("No train route found for distance >= 1km, using walk", { distanceKm });
        }
      } else {
        resolvedRouteByActivityId.set(pair.activityId, {
          route: phase1Result,
          travelMode: "walk",
        });
      }
    }
  }

  // --- Sequential assembly using pre-fetched routes (no more API calls) ---
  let cursorMinutes = startMinutes;
  let lastPlaceIndex: number | null = null;
  const plannedActivities: ItineraryActivity[] = [];

  for (const activity of day.activities) {
    if (activity.kind !== "place") {
      const plannedNote: ItineraryActivity = {
        ...activity,
        startTime: activity.startTime ?? formatTime(cursorMinutes),
        endTime: activity.endTime ?? formatTime(cursorMinutes + (activity.notes ? 15 : 5)),
      };
      plannedActivities.push(plannedNote);
      continue;
    }

    const meta = metaByActivityId.get(activity.id)!;
    const plannerActivity: ItineraryActivity = { ...activity };

    const resolved = resolvedRouteByActivityId.get(activity.id);
    if (resolved) {
      const { route, travelMode } = resolved;
      const travelInstructions = route.legs.flatMap((leg) =>
        (leg.steps ?? [])
          .map((step) => step.instruction)
          .filter((instruction): instruction is string => Boolean(instruction)),
      );
      const travelPath = mergePathSegments([
        route.geometry,
        ...route.legs.map((leg) => leg.geometry),
      ]);

      const travelSegment = buildTravelSegment(
        travelMode,
        cursorMinutes,
        route.durationSeconds,
        route.distanceMeters,
        travelPath,
        travelInstructions.length ? travelInstructions : undefined,
      );

      if (lastPlaceIndex != null) {
        const previousActivity = plannedActivities[lastPlaceIndex] as Extract<ItineraryActivity, { kind: "place" }>;
        previousActivity.travelToNext = travelSegment;
      }

      plannerActivity.travelFromPrevious = travelSegment;
      cursorMinutes += travelSegment.durationMinutes;
    }

    const operatingPeriod = getOperatingPeriodForDay(meta.location?.operatingHours, day.weekday);
    const evaluation = evaluateOperatingWindow(operatingPeriod, cursorMinutes, meta.visitDuration);

    plannerActivity.durationMin = meta.visitDuration;

    plannerActivity.schedule = {
      arrivalTime: formatTime(evaluation.adjustedArrival),
      departureTime: formatTime(evaluation.adjustedDeparture),
      arrivalBufferMinutes: evaluation.arrivalBuffer,
      departureBufferMinutes: evaluation.departureBuffer,
      status: evaluation.status,
      operatingWindow: evaluation.window
        ? {
            opensAt: evaluation.window.opensAt,
            closesAt: evaluation.window.closesAt,
            note: meta.location?.operatingHours?.notes,
            status: evaluation.window.status,
          }
        : undefined,
    };

    if (evaluation.window) {
      plannerActivity.operatingWindow = {
        opensAt: evaluation.window.opensAt,
        closesAt: evaluation.window.closesAt,
        status: evaluation.window.status,
        note: meta.location?.operatingHours?.notes,
      };
    }

    cursorMinutes = evaluation.adjustedDeparture + options.transitionBufferMinutes;

    plannerActivity.notes = plannerActivity.notes ?? meta.location?.recommendedVisit?.summary;

    plannedActivities.push(plannerActivity);

    lastPlaceIndex = plannedActivities.length - 1;
  }

  // Clamp final cursor to end of day
  if (cursorMinutes > endMinutes) {
    const lastActivity = plannedActivities[lastPlaceIndex ?? plannedActivities.length - 1];
    if (lastActivity && lastActivity.kind === "place" && lastActivity.schedule) {
      lastActivity.schedule.status = "out-of-hours";
      lastActivity.schedule.departureTime = formatTime(endMinutes);
    }
  }

  return {
    ...day,
    timezone: dayTimezone,
    bounds: {
      ...(day.bounds ?? {}),
      startTime: formatTime(startMinutes),
      endTime: formatTime(endMinutes),
    },
    activities: plannedActivities,
  };
}


