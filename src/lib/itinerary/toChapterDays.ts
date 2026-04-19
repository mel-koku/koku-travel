import type { Itinerary, ItineraryTravelSegment } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { ChapterDay, ChapterBeat } from "@/components/features/itinerary/chapter/ChapterList";
import type { BeatChip } from "@/components/features/itinerary/chapter/Beat";
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
 *   1. travelFromPrevious.arrivalTime (the moment we arrive)
 *   2. travelToNext.departureTime (when we leave — less ideal but better than nothing)
 *   3. Default per timeOfDay slot
 */
function pickTime(
  timeOfDay: string,
  travelFromPrevious?: ItineraryTravelSegment,
  travelToNext?: ItineraryTravelSegment,
): string {
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
  if (location.insiderTip) return location.insiderTip;
  if (location.editorialSummary) return location.editorialSummary;
  const cat = location.category?.toLowerCase();
  if (cat && CATEGORY_FALLBACK[cat]) return CATEGORY_FALLBACK[cat]!;
  return `${location.name}. ${location.category ?? "stop"}.`;
}

// ── Transit segment mapping ───────────────────────────────────────────────────

function mapTransit(travel: ItineraryTravelSegment | undefined): ChapterBeat["transitToNext"] {
  if (!travel) return null;
  const mode = normalizeMode(travel.mode);
  // TransitStep uses `lineName` field (verified in src/types/itinerary.ts)
  const line = travel.transitSteps?.[0]?.lineName ?? undefined;

  const steps = travel.transitSteps?.map((s) => ({
    type: s.type,
    walkMinutes: s.walkMinutes,
    walkInstruction: s.walkInstruction,
    lineName: s.lineName,
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

  return { minutes: travel.durationMinutes, mode, line, steps, totalFareYen, summary };
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
 */
export function toChapterDays(
  itinerary: Itinerary,
  guideProse: GuideProseLike | undefined,
  locations: Map<string, Location> | Record<string, Location>,
  tripStartDate?: string,
  isDayAccessible?: (dayIndex: number) => boolean,
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

    // Locked day early-return — keeps the chapter header/intro but skips beat computation
    const isLocked = isDayAccessible ? !isDayAccessible(dayIdx) : false;
    if (isLocked) {
      return {
        id: day.id,
        date: isoDate,
        city: day.cityId ? cityDisplay(day.cityId) : "",
        intro: proseByDay.get(day.id) ?? "",
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
    const beats: ChapterBeat[] = resolved.map(({ activity, location }) => {
      const time = pickTime(
        activity.timeOfDay,
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

      return {
        id: activity.id,
        time,
        partOfDay,
        location,
        body: bodyFor(location),
        chips,
        hasMore: Boolean(
          location.description || activity.description || activity.notes,
        ),
        transitToNext: mapTransit(activity.travelToNext),
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
      intro: proseByDay.get(day.id) ?? "",
      beats,
      inlineNotes,
      isLocked: false,
      dayActivities: day.activities,
    };
  });
}
