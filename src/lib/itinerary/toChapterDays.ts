import type { Itinerary, ItineraryTravelSegment } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type {
  ChapterDay,
  ChapterBeat,
  ChapterAnchor,
} from "@/components/features/itinerary/chapter/ChapterList";
import type { BeatChip } from "@/components/features/itinerary/chapter/Beat";
import type { DayEntryPoint } from "@/types/trip";
import { shouldPromoteToBeatChip } from "@/lib/itinerary/chipDiscipline";
import { getClosuresForTripDate } from "@/lib/availability/closureDetection";

// ── Guide prose shape (subset we actually read) ───────────────────────────────

type GuideDayLike = { dayId: string; intro?: string | null };

type GuideProseLike = {
  days?: GuideDayLike[];
};

// ── Category body fallbacks ───────────────────────────────────────────────────

const CATEGORY_FALLBACK: Record<string, string> = {
  temple: "Arrive before the tour buses.",
  shrine: "Arrive before the tour buses.",
  market: "Walk end-to-end and graze.",
  view: "Best at dusk.",
  landmark: "Walk up close. Photos read better from the side.",
  culture: "Pause for the story behind the craft.",
  food: "Worth the queue if it has one.",
  restaurant: "Worth the queue if it has one.",
  cafe: "Sit in, not to go.",
  bar: "Arrive early to get a seat.",
  park: "Walk the loop path before you settle.",
  garden: "Take the long path.",
  onsen: "Shower before the soak. Small towel only in the bath.",
  museum: "Start at the top floor and work down.",
  gallery: "Slow down at the back rooms.",
  nature: "Go early for the quiet.",
  shopping: "Best finds are on the upper floors.",
  entertainment: "Book the slot when you plan the day.",
  view_point: "Best at dusk.",
  observatory: "Best at dusk.",
  shopping_street: "Walk end-to-end and graze.",
  accommodation: "Settle in. Onsen before dinner if there is one.",
};

// ── Default clock times per slot ─────────────────────────────────────────────

const DEFAULT_CLOCK: Record<string, string> = {
  morning: "09:00",
  afternoon: "14:00",
  evening: "18:30",
};

// ── Transit mode normalization ────────────────────────────────────────────────

type NarrowTransitMode = "walk" | "train" | "car" | "bus" | "transit";

function normalizeMode(raw: string): NarrowTransitMode {
  if (raw === "walk") return "walk";
  if (raw === "train" || raw === "subway" || raw === "tram") return "train";
  if (raw === "drive" || raw === "car" || raw === "taxi" || raw === "rideshare") return "car";
  if (raw === "bus" || raw === "ferry") return "bus";
  return "transit";
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Parse "HH:mm" to a fractional hour value for comparison.
 */
function timeToHour(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

/**
 * Resolve the clock time string ("HH:MM") for a beat.
 *
 * Priority:
 *   1. schedule.arrivalTime (planner sets this fresh on every replan — most authoritative)
 *   2. travelFromPrevious.arrivalTime (the moment we arrive)
 *   3. travelToNext.departureTime (when we leave — less ideal but better than nothing)
 *   4. Default per timeOfDay slot
 *
 * `schedule` takes priority because it's written unconditionally by the planner;
 * the travel segments may be stale across reorders for activities at the boundary
 * of a day (no incoming/outgoing route to overwrite them).
 */
function pickTime(
  timeOfDay: string,
  schedule?: { arrivalTime?: string },
  travelFromPrevious?: ItineraryTravelSegment,
  travelToNext?: ItineraryTravelSegment,
): string {
  if (schedule?.arrivalTime) return schedule.arrivalTime;
  if (travelFromPrevious?.arrivalTime) return travelFromPrevious.arrivalTime;
  if (travelToNext?.departureTime) return travelToNext.departureTime;
  return DEFAULT_CLOCK[timeOfDay] ?? "09:00";
}

/**
 * Map a (time, timeOfDay) pair to the display part-of-day label.
 *
 * Rules:
 *   morning   → "Morning"
 *   afternoon → "Midday" if clock < 14:00, else "Afternoon"
 *   evening   → "Night" if clock >= 21:00, else "Evening"
 */
function pickPartOfDay(time: string, timeOfDay: string): ChapterBeat["partOfDay"] {
  const hour = timeToHour(time);
  if (timeOfDay === "morning") return "Morning";
  if (timeOfDay === "afternoon") return hour < 14 ? "Midday" : "Afternoon";
  // evening
  return hour >= 21 ? "Night" : "Evening";
}

// ── Body text selection ───────────────────────────────────────────────────────

function bodyFor(location: Location): string {
  if (location.shortDescription) return location.shortDescription;
  if (location.editorialSummary) return location.editorialSummary;
  if (location.insiderTip) return location.insiderTip;
  const cat = location.category?.toLowerCase();
  if (cat && CATEGORY_FALLBACK[cat]) return CATEGORY_FALLBACK[cat]!;
  // Long-tail: no real body is better than "Name. category."
  // UI (Beat.tsx) suppresses the paragraph when body is empty.
  return "";
}

// ── Transit segment mapping ───────────────────────────────────────────────────

type CoordWithName = { lat?: number | null; lng?: number | null; name?: string };

function mapTransit(
  travel: ItineraryTravelSegment | undefined,
  origin?: CoordWithName,
  destination?: CoordWithName,
): ChapterBeat["transitToNext"] {
  if (!travel) return null;
  const mode = normalizeMode(travel.mode);
  // TransitStep uses `lineName` field (verified in src/types/itinerary.ts)
  const line = travel.transitSteps?.[0]?.lineName ?? undefined;

  const steps = travel.transitSteps?.map((s) => ({
    type: s.type,
    walkMinutes: s.walkMinutes,
    walkInstruction: s.walkInstruction,
    lineName: s.lineName,
    lineNameRomaji: s.lineNameRomaji,
    lineShortName: s.lineShortName,
    lineColor: s.lineColor,
    trainType: s.trainType,
    departureStop: s.departureStop,
    arrivalStop: s.arrivalStop,
    headsign: s.headsign,
    numStops: s.numStops,
    durationMinutes: s.durationMinutes,
    departureGateway: s.departureGateway,
    arrivalGateway: s.arrivalGateway,
    fareYen: s.fareYen,
    carPosition: s.carPosition,
  }));

  const totalFareYen =
    steps && steps.reduce((sum, s) => sum + (s.fareYen ?? 0), 0) > 0
      ? steps.reduce((sum, s) => sum + (s.fareYen ?? 0), 0)
      : undefined;

  const firstTransit = steps?.find((s) => s.type === "transit");
  const summary = firstTransit
    ? {
        departureStop: firstTransit.departureStop,
        arrivalStop: firstTransit.arrivalStop,
        lineName: firstTransit.lineName,
        lineShortName: firstTransit.lineShortName,
        lineColor: firstTransit.lineColor,
      }
    : undefined;

  const originCoords =
    origin?.lat != null && origin.lng != null
      ? { lat: origin.lat, lng: origin.lng, name: origin.name }
      : undefined;

  const destinationCoords =
    destination?.lat != null && destination.lng != null
      ? { lat: destination.lat, lng: destination.lng, name: destination.name }
      : undefined;

  return {
    minutes: travel.durationMinutes,
    mode,
    line,
    steps,
    totalFareYen,
    summary,
    origin: originCoords,
    destination: destinationCoords,
    isEstimated: travel.isEstimated ?? false,
  };
}

// ── ISO date arithmetic ───────────────────────────────────────────────────────

/**
 * Add `n` calendar days to an ISO YYYY-MM-DD string.
 * Uses UTC arithmetic to avoid DST shifts.
 */
function addDays(iso: string, n: number): string {
  const ms = Date.UTC(
    parseInt(iso.slice(0, 4), 10),
    parseInt(iso.slice(5, 7), 10) - 1,
    parseInt(iso.slice(8, 10), 10),
  );
  const result = new Date(ms + n * 86_400_000);
  const y = result.getUTCFullYear();
  const mo = String(result.getUTCMonth() + 1).padStart(2, "0");
  const d = String(result.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

// ── City display name ─────────────────────────────────────────────────────────

/**
 * Convert a cityId to a display name.
 * Avoids importing REGIONS (which pulls in tripBuilder deps) at module-level;
 * instead we do a lazy require so the function works in test environments too.
 * Falls back to simple capitalize if REGIONS is unavailable or city not found.
 */
function cityDisplay(cityId: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { REGIONS } = require("@/data/regions") as { REGIONS: Array<{ cities: Array<{ id: string; name: string }> }> };
    for (const region of REGIONS) {
      const city = region.cities.find((c) => c.id === cityId);
      if (city) return city.name;
    }
  } catch {
    // ignore — test environment may not have this module
  }
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Pure translation layer between the planner's `Itinerary` shape and the
 * `ChapterDay[]` shape consumed by `ChapterList`.
 *
 * @param itinerary   - Planner output
 * @param guideProse  - Optional LLM guide prose (Pass 3 output)
 * @param locations   - Lookup map keyed by location id
 * @param tripStartDate - Optional ISO YYYY-MM-DD for Day 0.
 *                        When provided, each day's `date` is computed as
 *                        `tripStartDate + dayIndex days`.
 *                        When absent, `day.dateLabel` is used as a fallback string.
 * @param isDayAccessible - Optional predicate; when provided, days that return false
 *                          are marked `isLocked: true` and rendered as paywall chapters.
 *                          Defaults to always-accessible when omitted.
 * @param dayEntryPoints  - Optional resolved start/end EntryPoints keyed by day.id
 *                          (output of `resolveEffectiveDayEntryPoints`). Drives the
 *                          start/end anchor items at the top/bottom of each spine.
 *                          City-center fallbacks are filtered out — only `airport`
 *                          and `accommodation` types render anchors.
 */
export function toChapterDays(
  itinerary: Itinerary,
  guideProse: GuideProseLike | undefined,
  locations: Map<string, Location> | Record<string, Location>,
  tripStartDate?: string,
  isDayAccessible?: (dayIndex: number) => boolean,
  dayIntros?: Record<string, string>,
  dayEntryPoints?: Record<string, DayEntryPoint>,
): ChapterDay[] {
  // Normalize locations to a Map regardless of input shape
  const locMap =
    locations instanceof Map
      ? locations
      : new Map(Object.entries(locations));

  // Build dayId → intro lookup from guide prose
  const proseByDay = new Map<string, string>(
    (guideProse?.days ?? [])
      .filter((d): d is GuideDayLike => !!d?.dayId)
      .map((d) => [d.dayId, d.intro ?? ""]),
  );

  return itinerary.days.map((day, dayIdx) => {
    // Compute ISO date for this day
    const isoDate = tripStartDate
      ? addDays(tripStartDate, dayIdx)
      : (day.dateLabel ?? "");

    // Resolve start/end anchors. Filter to airport + accommodation only —
    // synthetic city-center fallbacks are useful for routing math but don't
    // belong in the timeline as a "you start here" anchor.
    const ep = dayEntryPoints?.[day.id];
    const isAnchorable = (t?: string): t is "airport" | "accommodation" =>
      t === "airport" || t === "accommodation";
    const startAnchor: ChapterAnchor | undefined =
      ep?.startPoint && isAnchorable(ep.startPoint.type)
        ? {
            point: ep.startPoint,
            isArrivalAirport: dayIdx === 0 && ep.startPoint.type === "airport",
          }
        : undefined;
    const endAnchor: ChapterAnchor | undefined =
      ep?.endPoint && isAnchorable(ep.endPoint.type)
        ? { point: ep.endPoint }
        : undefined;

    // Locked day early-return — keeps the chapter header/intro but skips beat computation.
    // Anchors are intentionally not rendered on locked days (the paywall is the only beat).
    const isLocked = isDayAccessible ? !isDayAccessible(dayIdx) : false;
    if (isLocked) {
      return {
        id: day.id,
        date: isoDate,
        city: day.cityId ? cityDisplay(day.cityId) : "",
        cityId: day.cityId,
        intro: proseByDay.get(day.id) || dayIntros?.[day.id] || "",
        beats: [],
        inlineNotes: [],
        isLocked: true,
        dayActivities: day.activities,
      };
    }

    // Parse a Date object for closure detection (only when we have a real ISO date)
    const dateObj = tripStartDate ? new Date(addDays(tripStartDate, dayIdx) + "T00:00:00Z") : null;

    // Filter to place activities only
    type PlaceActivity = Extract<
      (typeof day.activities)[number],
      { kind: "place" }
    >;
    const placeActivities = day.activities.filter(
      (a): a is PlaceActivity => a.kind === "place",
    );

    // Pair each activity with its resolved location; skip if locationId is absent
    const resolved = placeActivities
      .map((a) => ({
        activity: a,
        location: a.locationId ? locMap.get(a.locationId) : undefined,
      }))
      .filter(
        (e): e is { activity: PlaceActivity; location: Location } =>
          e.location !== undefined,
      );

    // Detect closures for the day
    const closedIds = new Set<string>();
    let totalClosures = 0;
    if (dateObj !== null) {
      const closures = getClosuresForTripDate(
        resolved.map((e) => e.location),
        dateObj,
      );
      totalClosures = closures.length;
      for (const c of closures) closedIds.add(c.stopId);
    }

    // Build beats
    const beats: ChapterBeat[] = resolved.map(({ activity, location }, beatIdx) => {
      const time = pickTime(
        activity.timeOfDay,
        activity.schedule,
        activity.travelFromPrevious,
        activity.travelToNext,
      );
      const partOfDay = pickPartOfDay(time, activity.timeOfDay);

      const chipCtx = {
        beatTime: `${isoDate}T${time}:00+09:00`,
        isDayOfMode: false as const,
        dayDate: isoDate,
        isClosedOnDate: closedIds.has(location.id),
        isOutsideHoursOnArrival: false as const,
        lastEntryWithin1h: false as const,
        location,
      };

      const chips: BeatChip[] = [];

      if (shouldPromoteToBeatChip("closed-on-date", chipCtx)) {
        chips.push({
          id: "closed-on-date",
          label: "Closed today",
          tone: "warn",
          promoteInline: true,
        });
      }
      if (shouldPromoteToBeatChip("reservation-required", chipCtx)) {
        chips.push({
          id: "reservation-required",
          label: "Reservation required",
          tone: "warn",
          promoteInline: true,
        });
      }
      if (shouldPromoteToBeatChip("cash-only", chipCtx)) {
        chips.push({
          id: "cash-only",
          label: "Cash preferred",
          tone: "warn",
          promoteInline: true,
        });
      }

      // Current activity's location is the transit origin;
      // the next activity's location is the destination.
      const nextResolved = resolved[beatIdx + 1];
      const transitOrigin = location.coordinates
        ? { lat: location.coordinates.lat, lng: location.coordinates.lng, name: location.name }
        : undefined;
      const transitDestination = nextResolved?.location.coordinates
        ? {
            lat: nextResolved.location.coordinates.lat,
            lng: nextResolved.location.coordinates.lng,
            name: nextResolved.location.name,
          }
        : undefined;

      return {
        id: activity.id,
        time,
        partOfDay,
        location,
        body: bodyFor(location),
        note: activity.kind === "place" ? activity.notes : undefined,
        chips,
        hasMore: Boolean(
          location.description || activity.description,
        ),
        transitToNext: mapTransit(activity.travelToNext, transitOrigin, transitDestination),
      };
    });

    // Inline day note: only when 2+ closures on the day
    const inlineNotes =
      totalClosures >= 2
        ? [
            {
              kind: "closure" as const,
              label: `${totalClosures} stops closed on this date`,
            },
          ]
        : [];

    return {
      id: day.id,
      date: isoDate,
      city: day.cityId ? cityDisplay(day.cityId) : "",
      cityId: day.cityId,
      intro: proseByDay.get(day.id) || dayIntros?.[day.id] || "",
      beats,
      inlineNotes,
      isLocked: false,
      dayActivities: day.activities,
      startAnchor,
      endAnchor,
    };
  });
}
