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
import type { RoutingResult } from "./routing/types";
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

function chooseTravelMode(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  location: Location | null,
  previousLocation: Location | null,
): ItineraryTravelMode {
  if (activity.travelFromPrevious?.mode) {
    return activity.travelFromPrevious.mode;
  }
  if (previousLocation?.preferredTransitModes?.length) {
    const firstMode = previousLocation.preferredTransitModes[0];
    if (firstMode) {
      return firstMode;
    }
  }
  if (location?.preferredTransitModes?.length) {
    const firstMode = location.preferredTransitModes[0];
    if (firstMode) {
      return firstMode;
    }
  }
  return "walk";
}

/**
 * Finds the fastest transit route by trying several transit-focused modes.
 * Returns the full routing result for the quickest option or null if all fail.
 */
async function findFastestTransitRoute(
  origin: Coordinates,
  destination: Coordinates,
  departureTime: string,
  timezone: string,
): Promise<RoutingResult | null> {
  if (!origin || !destination) {
    logger.warn("Skipping transit route search due to missing coordinates", {
      origin,
      destination,
    });
    return null;
  }

  // Only try "transit" mode which covers all public transit - reduces API calls significantly
  try {
    const route = await requestRoute({
      origin,
      destination,
      mode: "transit",
      departureTime,
      timezone,
    });
    logger.debug("Transit route found", {
      mode: route.mode,
      durationSeconds: route.durationSeconds,
    });
    return route;
  } catch (error) {
    logger.debug("Failed to get transit route", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
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
  if (travelTime < 60) {
    mode = "train"; // Short distance, likely train
  } else if (travelTime > 120) {
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

  const plannedDays: ItineraryDay[] = [];

  for (let dayIndex = 0; dayIndex < itinerary.days.length; dayIndex += 1) {
    const day = itinerary.days[dayIndex];
    const previousDay = dayIndex > 0 ? plannedDays[dayIndex - 1] : undefined;
    
    if (!day) {
      continue; // Skip if day is undefined
    }
    
    const entryPoints = dayEntryPoints?.[day.id];
    const plannedDay = await planItineraryDay(
      day,
      itinerary,
      mergedOptions,
      entryPoints?.startPoint,
      entryPoints?.endPoint,
    );
    
    // Detect city change and create transition
    if (previousDay && previousDay.cityId && plannedDay.cityId && previousDay.cityId !== plannedDay.cityId) {
      const transition = createCityTransition(
        previousDay.cityId,
        plannedDay.cityId,
        previousDay,
        plannedDay,
      );
      if (transition) {
        plannedDay.cityTransition = transition;
      }
    }
    
    plannedDays.push(plannedDay);
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

  let cursorMinutes = startMinutes;
  let lastPlaceIndex: number | null = null;
  // Use start point coordinates if available, otherwise null
  let lastPlaceCoordinates: Coordinates = startPoint
    ? { lat: startPoint.coordinates.lat, lng: startPoint.coordinates.lng }
    : null;
  let lastPlaceLocation: Location | null = null;

  const plannedActivities: ItineraryActivity[] = [];

  // Pre-fetch all locations at once for efficiency
  const placeActivities = day.activities.filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );
  const locationsMap = await findLocationsForActivities(placeActivities);

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

    const location = locationsMap.get(activity.id) ?? null;
    const coordinates = lookupCoordinates(activity, location);

    const plannerActivity: ItineraryActivity = { ...activity };

    let travelMode = chooseTravelMode(activity, location, lastPlaceLocation);
    let travelDurationSeconds = 0;
    let travelDistanceMeters = 0;
    let travelInstructions: string[] | undefined;

    if (lastPlaceCoordinates && coordinates) {
      let route: Awaited<ReturnType<typeof requestRoute>>;
      const departureTime = formatTime(cursorMinutes);

      // If explicit non-walk mode is set (likely user preference), preserve it
      // Otherwise, recalculate to apply the new logic (walk > 10 min -> transit)
      if (activity.travelFromPrevious?.mode && activity.travelFromPrevious.mode !== "walk") {
        travelMode = activity.travelFromPrevious.mode;
        route = await requestRoute({
          origin: lastPlaceCoordinates,
          destination: coordinates,
          mode: travelMode,
          departureTime,
          timezone: dayTimezone,
        });
      } else {
        // First, check walk duration
        const walkRoute = await requestRoute({
          origin: lastPlaceCoordinates,
          destination: coordinates,
          mode: "walk",
          departureTime,
          timezone: dayTimezone,
        });
        
        const walkDurationMinutes = Math.round(walkRoute.durationSeconds / 60);
        
        logger.debug("Checking travel mode", {
          walkDurationMinutes,
          origin: lastPlaceCoordinates,
          destination: coordinates,
        });
        
        // If walk is more than 10 minutes, use the fastest transit option
        if (walkDurationMinutes > 10) {
          const fastestTransitRoute = await findFastestTransitRoute(
            lastPlaceCoordinates,
            coordinates,
            departureTime,
            dayTimezone,
          );
          
          if (fastestTransitRoute) {
            const transitDurationMinutes = Math.round(fastestTransitRoute.durationSeconds / 60);
            logger.debug("Found transit options, using fastest", {
              fastestMode: fastestTransitRoute.mode,
              transitDurationMinutes,
              walkDurationMinutes,
            });
            
            // Use the fastest transit option (as per requirement: if walk > 10 min, use fastest transit)
            route = fastestTransitRoute;
            travelMode = toItineraryMode(route.mode);
            logger.debug("Using transit mode", { mode: travelMode, durationMinutes: transitDurationMinutes });
          } else {
            // Fallback to walk if no transit options available
            travelMode = "walk";
            route = walkRoute;
            logger.warn("No transit options found for walk > 10 min, using walk", { walkDurationMinutes });
          }
        } else {
          // Walk is 10 minutes or less, use walk
          travelMode = "walk";
          route = walkRoute;
          logger.debug("Walk <= 10 minutes, using walk", { walkDurationMinutes });
        }
      }
      
      travelMode = toItineraryMode(route.mode);
      travelDurationSeconds = route.durationSeconds;
      travelDistanceMeters = route.distanceMeters;
      travelInstructions = route.legs.flatMap((leg) =>
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
        travelDurationSeconds,
        travelDistanceMeters,
        travelPath,
        travelInstructions?.length ? travelInstructions : undefined,
      );

      if (lastPlaceIndex != null) {
        const previousActivity = plannedActivities[lastPlaceIndex] as Extract<ItineraryActivity, { kind: "place" }>;
        previousActivity.travelToNext = travelSegment;
      }

      plannerActivity.travelFromPrevious = travelSegment;
      cursorMinutes += travelSegment.durationMinutes;
    }

    const visitDuration = await determineVisitDuration(activity, location, options);
    const operatingPeriod = getOperatingPeriodForDay(location?.operatingHours, day.weekday);

    const evaluation = evaluateOperatingWindow(operatingPeriod, cursorMinutes, visitDuration);

    // Set durationMin so it's available for duration calculations
    plannerActivity.durationMin = visitDuration;

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
            note: location?.operatingHours?.notes,
            status: evaluation.window.status,
          }
        : undefined,
    };

    if (evaluation.window) {
      plannerActivity.operatingWindow = {
        opensAt: evaluation.window.opensAt,
        closesAt: evaluation.window.closesAt,
        status: evaluation.window.status,
        note: location?.operatingHours?.notes,
      };
    }

    cursorMinutes = evaluation.adjustedDeparture + options.transitionBufferMinutes;

    plannerActivity.notes = plannerActivity.notes ?? location?.recommendedVisit?.summary;

    plannedActivities.push(plannerActivity);

    lastPlaceIndex = plannedActivities.length - 1;
    lastPlaceCoordinates = coordinates;
    lastPlaceLocation = location;
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


