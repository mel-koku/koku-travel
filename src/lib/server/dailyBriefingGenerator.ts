import "server-only";

/**
 * Pass 4: Daily Briefings — Generates concise, context-aware per-day briefing
 * paragraphs that avoid repeating information across days.
 *
 * Runs in parallel with Pass 3 (guide prose) — zero added latency.
 * Falls back to null on any failure → consolidated rule-based tips render instead.
 */

import { generateObject } from "ai";
import { vertex } from "./vertexProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { buildDailyBriefingSchema } from "./llmSchemas";
import { getFestivalsForDay } from "@/data/festivalCalendar";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedBriefings } from "@/types/llmConstraints";

function buildBriefingPrompt(
  itinerary: Itinerary,
  builderData: TripBuilderData,
): string {
  const days = itinerary.days;
  const startDate = builderData.dates.start
    ? parseLocalDate(builderData.dates.start)
    : null;
  const month = startDate ? startDate.getMonth() + 1 : null;

  const dayContexts = days.map((day, i) => {
    const date = startDate
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
      : null;
    const dayMonth = date ? date.getMonth() + 1 : month;
    const dayDate = date ? date.getDate() : null;

    const activities = day.activities
      .filter((a) => a.kind === "place" && !a.isAnchor)
      .map((a) => {
        const parts = [a.title];
        if (a.kind === "place" && a.mealType) parts.push(`(${a.mealType})`);
        if (a.kind === "place" && a.schedule?.arrivalTime)
          parts.push(`at ${a.schedule.arrivalTime}`);
        if (a.kind === "place" && a.tags?.includes("cash-only"))
          parts.push("[cash-only]");
        return parts.join(" ");
      });

    const hasLongTrain = day.activities.some(
      (a) =>
        a.kind === "place" &&
        a.travelFromPrevious &&
        (a.travelFromPrevious.durationMinutes ?? 0) >= 60,
    );

    const festivals =
      dayMonth && dayDate && day.cityId
        ? getFestivalsForDay(dayMonth, dayDate, day.cityId)
        : [];

    const isNewCity = i === 0 || days[i - 1]?.cityId !== day.cityId;

    const transitCount = day.activities.filter(
      (a) =>
        a.kind === "place" &&
        a.travelFromPrevious &&
        ["train", "subway", "bus", "tram", "ferry", "transit"].includes(
          a.travelFromPrevious.mode,
        ),
    ).length;

    return {
      dayId: day.id,
      index: i + 1,
      city: day.cityId,
      isNewCity,
      isCityTransition: !!day.cityTransition,
      activities: activities.slice(0, 6),
      hasLongTrain,
      transitCount,
      festivals: festivals.map((f) => f.name),
      dateStr: date
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : `Day ${i + 1}`,
    };
  });

  const citySequence = days.map((d) => d.cityId).filter(Boolean);
  const uniqueCities = [...new Set(citySequence)];

  return `You are a concise travel briefing writer for a Japan trip planning app.

Write ONE short briefing paragraph (2-4 sentences, max 80 words) per day.

RULES:
- Each day's briefing should only mention what is NEW or SPECIFIC to that day
- Do NOT repeat information from prior days. If Day 1 covered escalator rules, Day 2 must not mention them again.
- Do NOT repeat generic advice (IC cards, rail passes, escalator etiquette). Those are in a separate section.
- Focus on: logistics that matter TODAY (specific cash-only venues, specific transit timing, specific crowd conditions), cultural context for TODAY's activities, city-specific notes on arrival days
- Name specific places and times from the schedule
- On city transition days: mention luggage forwarding if relevant
- On festival days: mention the specific festival
- If a day has nothing noteworthy beyond the activities themselves, write a very short 1-sentence briefing
- Tone: knowledgeable concierge, not a guidebook. Direct, specific, no filler.

DENY LIST (never use these words): amazing, incredible, breathtaking, stunning, embark, venture, journey, delve, tapestry, embrace, discover, explore, vibrant, bustling, nestled, hidden gem, best-kept secret, off the beaten path, must-see, bucket list, unforgettable

TRIP CONTEXT:
- Cities: ${uniqueCities.join(" \u2192 ")}
- ${days.length} days total
- Pace: ${builderData.style ?? "balanced"}
- Group: ${builderData.group?.type ?? "solo"}

DAILY SCHEDULE:
${dayContexts
  .map(
    (d) =>
      `Day ${d.index} (${d.dateStr}, ${d.city}${d.isNewCity ? " - NEW CITY" : ""}${d.isCityTransition ? " - LEAVING CITY" : ""}):
  Activities: ${d.activities.join("; ") || "Free day"}
  Transit segments: ${d.transitCount}${d.hasLongTrain ? " (includes long train ride)" : ""}${d.festivals.length ? `\n  Festivals: ${d.festivals.join(", ")}` : ""}`,
  )
  .join("\n\n")}`;
}

export async function generateDailyBriefings(
  itinerary: Itinerary,
  builderData: TripBuilderData,
): Promise<GeneratedBriefings | null> {
  const dayIds = itinerary.days.map((d) => d.id);
  if (dayIds.length === 0) return null;

  try {
    const { object } = await generateObject({
      model: vertex("gemini-2.5-flash"),
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      schema: buildDailyBriefingSchema(dayIds),
      prompt: buildBriefingPrompt(itinerary, builderData),
      abortSignal: AbortSignal.timeout(15_000),
    });

    // Validate all day IDs present
    const returnedIds = new Set(object.days.map((d) => d.dayId));
    const missing = dayIds.filter((id) => !returnedIds.has(id));
    if (missing.length > 0) {
      logger.warn("Daily briefings missing days", { missing });
      return null;
    }

    // Validate no empty briefing text
    const emptyBriefings = object.days.filter((d) => !d.briefing?.trim());
    if (emptyBriefings.length > 0) {
      logger.warn("Daily briefings contain empty content", {
        emptyDayIds: emptyBriefings.map((d) => d.dayId),
      });
      return null;
    }

    return object as GeneratedBriefings;
  } catch (error) {
    logger.warn(
      "Daily briefings generation failed, falling back to rule-based tips",
      {
        error: getErrorMessage(error),
      },
    );
    return null;
  }
}
