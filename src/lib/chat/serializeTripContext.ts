import type { StoredTrip } from "@/services/trip/types";
import type { Itinerary } from "@/types/itinerary";

export type SerializedTripContext = {
  tripId: string;
  tripName: string;
  dates?: { start: string; end: string };
  budgetLevel?: string;
  days: Array<{
    dayIndex: number;
    cityId?: string;
    activities: Array<{
      title: string;
      time?: string;
      category?: string;
      neighborhood?: string;
    }>;
  }>;
};

/**
 * Serialize a trip into a compact JSON context for the chat system prompt.
 * Strips coordinates and keeps under 8KB.
 */
export function serializeTripContext(trip: StoredTrip): string {
  const itinerary = trip.itinerary as Itinerary;
  if (!itinerary?.days?.length) return "";

  const ctx: SerializedTripContext = {
    tripId: trip.id,
    tripName: trip.name,
    days: itinerary.days.map((day, i) => ({
      dayIndex: i,
      cityId: day.cityId,
      activities: day.activities
        .filter((a) => a.kind === "place")
        .map((a) => {
          const pa = a as Extract<typeof a, { kind: "place" }>;
          return {
            title: pa.title,
            time: pa.schedule?.arrivalTime ?? pa.manualStartTime ?? undefined,
            category: pa.tags?.[0],
            neighborhood: pa.neighborhood,
          };
        }),
    })),
  };

  const dates = trip.builderData?.dates;
  if (dates?.start && dates?.end) {
    ctx.dates = { start: dates.start, end: dates.end };
  }

  const budget = trip.builderData?.budget;
  if (budget?.level) {
    ctx.budgetLevel = budget.level;
  }

  const json = JSON.stringify(ctx);
  // If over 8KB, trim activity details
  if (json.length > 8192) {
    for (const day of ctx.days) {
      day.activities = day.activities.map((a) => ({
        title: a.title,
        time: a.time,
      }));
    }
    return JSON.stringify(ctx);
  }

  return json;
}

/**
 * Format serialized trip context as a human-readable markdown block
 * for injection into the system prompt.
 */
export function formatTripContextBlock(json: string): string {
  if (!json) return "";

  try {
    const ctx: SerializedTripContext = JSON.parse(json);
    const lines: string[] = [
      "",
      "## User's Current Trip",
      `Trip: ${ctx.tripName}`,
    ];

    if (ctx.dates) {
      lines.push(`Dates: ${ctx.dates.start} to ${ctx.dates.end}`);
    }
    if (ctx.budgetLevel) {
      lines.push(`Budget: ${ctx.budgetLevel}`);
    }

    for (const day of ctx.days) {
      lines.push(`### Day ${day.dayIndex + 1} — ${day.cityId}`);
      if (day.activities.length === 0) {
        lines.push("- (no activities)");
      }
      for (const act of day.activities) {
        const time = act.time ? ` (${act.time})` : "";
        const loc = act.neighborhood ? `, ${act.neighborhood}` : "";
        lines.push(`- ${act.title}${time}${loc}`);
      }
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}
