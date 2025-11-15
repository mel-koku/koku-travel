import { getCoordinatesForLocationId, getCoordinatesForName } from "@/data/locationCoordinates";
import { findLocationForActivity } from "@/lib/itineraryLocations";
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
import { fetchLocationDetails } from "./googlePlaces";
import {
  extractDurationFromGooglePlaces,
  getCategoryDefaultDuration,
} from "./durationExtractor";
import { logger } from "./logger";

import { requestRoute } from "./routing";

type PlannerOptions = {
  defaultDayStart?: string;
  defaultDayEnd?: string;
  defaultVisitMinutes?: number;
  transitionBufferMinutes?: number;
};

const DEFAULT_OPTIONS: Required<PlannerOptions> = {
  defaultDayStart: "09:00",
  defaultDayEnd: "21:00",
  defaultVisitMinutes: 60,
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

function lookupCoordinates(activity: Extract<ItineraryActivity, { kind: "place" }>, location: Location | null): Coordinates {
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

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function straightLineDistanceMeters(
  origin: NonNullable<Coordinates>,
  destination: NonNullable<Coordinates>,
): number {
  const earthRadiusMeters = 6371e3;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

async function determineVisitDuration(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  location: Location | null,
  options: Required<PlannerOptions>,
  useGooglePlaces: boolean = true,
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

  // 3. Parse estimatedDuration string or activity notes
  const parsed = parseEstimatedDuration(location?.estimatedDuration ?? activity.notes);
  if (parsed) {
    return parsed;
  }

  // 4. Try to extract from Google Places API if enabled and location exists
  if (useGooglePlaces && location) {
    try {
      const details = await fetchLocationDetails(location);
      const extracted = extractDurationFromGooglePlaces(details);

      if (extracted.typicalMinutes) {
        logger.debug("Extracted duration from Google Places", {
          locationId: location.id,
          locationName: location.name,
          duration: extracted.typicalMinutes,
          source: extracted.source,
        });
        return extracted.typicalMinutes;
      }
    } catch (error) {
      // Fall through to defaults if Google Places fails
      logger.debug("Failed to extract duration from Google Places", {
        locationId: location?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 5. Use category-based default if available
  if (location?.category) {
    const categoryDefault = getCategoryDefaultDuration(location.category);
    if (categoryDefault !== 90) {
      // Only use if it's different from the global default
      return categoryDefault;
    }
  }

  // 6. Fall back to options default
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
  currentDay: ItineraryDay,
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
  const currentDayStart = currentDay.bounds?.startTime ?? "09:00";

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
): Promise<Itinerary> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const plannedDays: ItineraryDay[] = [];

  for (let dayIndex = 0; dayIndex < itinerary.days.length; dayIndex += 1) {
    const day = itinerary.days[dayIndex];
    const previousDay = dayIndex > 0 ? plannedDays[dayIndex - 1] : undefined;
    
    if (!day) {
      continue; // Skip if day is undefined
    }
    
    const plannedDay = await planItineraryDay(day, itinerary, mergedOptions);
    
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
): Promise<ItineraryDay> {
  const dayTimezone = day.timezone ?? itinerary.timezone ?? "UTC";
  const startMinutes =
    parseTime(day.bounds?.startTime) ?? parseTime(options.defaultDayStart) ?? parseTime("09:00") ?? 540;
  const endMinutes =
    parseTime(day.bounds?.endTime) ?? parseTime(options.defaultDayEnd) ?? parseTime("21:00") ?? 1260;

  let cursorMinutes = startMinutes;
  let lastPlaceIndex: number | null = null;
  let lastPlaceCoordinates: Coordinates = null;
  let lastPlaceLocation: Location | null = null;

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

    const location = findLocationForActivity(activity);
    const coordinates = lookupCoordinates(activity, location);

    const plannerActivity: ItineraryActivity = { ...activity };

    let travelMode = chooseTravelMode(activity, location, lastPlaceLocation);
    let travelDurationSeconds = 0;
    let travelDistanceMeters = 0;
    let travelInstructions: string[] | undefined;

    if (lastPlaceCoordinates && coordinates) {
      const directDistanceMeters = straightLineDistanceMeters(lastPlaceCoordinates, coordinates);
      if (activity.travelFromPrevious?.mode) {
        travelMode = activity.travelFromPrevious.mode;
      } else {
        travelMode = directDistanceMeters <= 1000 ? "walk" : "transit";
      }

      const route = await requestRoute({
        origin: lastPlaceCoordinates,
        destination: coordinates,
        mode: travelMode,
        departureTime: formatTime(cursorMinutes),
        timezone: dayTimezone,
      });
      travelMode = route.mode;
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


