import type { Itinerary } from "@/types/itinerary";
import type { Trip } from "@/types/tripDomain";
import type { GeneratedGuide, GeneratedBriefings } from "@/types/llmConstraints";

/**
 * Day-shell fields kept on a locked day. Everything else is stripped so the
 * client UI can render the lock affordance without ever receiving the
 * scheduled activities, transitions, or LLM prose for the locked day.
 *
 * `cityId` is intentionally retained so the UnlockBeat can render the city
 * list ("The rest of your trip · Kyoto, Nara") without needing extra calls.
 */
type RedactionInput = {
  itinerary: Itinerary;
  trip: Trip;
  dayIntros?: Record<string, string> | null;
  guideProse?: GeneratedGuide | null;
  dailyBriefings?: GeneratedBriefings | null;
};

type RedactionOutput = {
  itinerary: Itinerary;
  trip: Trip;
  dayIntros: Record<string, string> | null;
  guideProse: GeneratedGuide | null;
  dailyBriefings: GeneratedBriefings | null;
};

/**
 * Strip Day 2-N detail from the API response when the caller has no full
 * access. Day 1 stays intact (free preview); Day 2-N is replaced with a
 * locked shell. Cache + DB always store the unredacted form — this helper
 * only shapes the response.
 *
 * Trip 1-day plans skip the second day entirely: the function is a no-op
 * when `itinerary.days.length <= 1`.
 *
 * Why this exists: prior to this gate, `/api/itinerary/plan` returned every
 * scheduled activity in the response payload regardless of access state,
 * so a guest reading dev tools could see the full Day 2-N plan even though
 * the UI hid it. See `feedback_*` notes for the bug history.
 */
export function redactItineraryForLockedDays(input: RedactionInput): RedactionOutput {
  const { itinerary, trip, dayIntros, guideProse, dailyBriefings } = input;

  if (!itinerary.days || itinerary.days.length <= 1) {
    return {
      itinerary,
      trip,
      dayIntros: dayIntros ?? null,
      guideProse: guideProse ?? null,
      dailyBriefings: dailyBriefings ?? null,
    };
  }

  const day1Id = itinerary.days[0]?.id;
  const allowedDayIds = new Set<string>(day1Id ? [day1Id] : []);

  const redactedItineraryDays = itinerary.days.map((day, idx) => {
    if (idx === 0) return day;
    return {
      id: day.id,
      dateLabel: day.dateLabel,
      cityId: day.cityId,
      timezone: day.timezone,
      isLocked: true as const,
      activities: [],
    };
  });

  const redactedTripDays = trip.days.map((day, idx) => {
    if (idx === 0) return day;
    return {
      id: day.id,
      date: day.date,
      cityId: day.cityId,
      activities: [],
      isLocked: true as const,
    };
  });

  const redactedDayIntros = dayIntros
    ? Object.fromEntries(
        Object.entries(dayIntros).filter(([dayId]) => allowedDayIds.has(dayId)),
      )
    : null;

  const redactedGuideProse: GeneratedGuide | null = guideProse
    ? {
        ...guideProse,
        days: guideProse.days.filter((d) => allowedDayIds.has(d.dayId)),
      }
    : null;

  const redactedDailyBriefings: GeneratedBriefings | null = dailyBriefings
    ? {
        ...dailyBriefings,
        days: dailyBriefings.days.filter((d) => allowedDayIds.has(d.dayId)),
      }
    : null;

  return {
    itinerary: { ...itinerary, days: redactedItineraryDays },
    trip: { ...trip, days: redactedTripDays },
    dayIntros: redactedDayIntros,
    guideProse: redactedGuideProse,
    dailyBriefings: redactedDailyBriefings,
  };
}
