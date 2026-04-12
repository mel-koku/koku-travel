import "server-only";

/**
 * Pass 4: Daily Briefings — Generates concise, context-aware per-day briefing
 * paragraphs that avoid repeating information across days.
 *
 * Runs in parallel with Pass 3 (guide prose) — zero added latency.
 * Falls back to null on any failure → consolidated rule-based tips render instead.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { vertex, VERTEX_GENERATE_OPTIONS } from "./vertexProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";
import { buildDailyBriefingSchema } from "./llmSchemas";
import { getFestivalsForDay } from "@/data/festivalCalendar";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { getSeason } from "@/lib/utils/seasonUtils";
import { callVertex, settleInOrder } from "./_llmBatchPrimitives";
import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedBriefings, DayBriefing } from "@/types/llmConstraints";

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

// ── Per-day parallel infrastructure ────────────────────────────────────

/**
 * Builds the prompt for a single day's briefing call. Output field: briefing
 * (2-4 sentences, max 80 words). Context size is O(1) per call -- no
 * full-itinerary embed.
 *
 * Voice and deny-list match the existing monolithic buildBriefingPrompt.
 *
 * @internal Exported for testing.
 */
export function buildDayBriefingPrompt(
  day: ItineraryDay,
  dayIndex: number,
  totalDays: number,
  builderData: TripBuilderData,
): string {
  const isFirstDay = dayIndex === 0;
  const isLastDay = dayIndex === totalDays - 1;

  const season = getSeason(builderData.dates?.start);
  const vibes = builderData.vibes?.join(", ") ?? "general sightseeing";
  const pace = builderData.style ?? "balanced";
  const group = builderData.group?.type ?? "solo traveler";

  const placeActivities = (day.activities ?? []).filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );
  const activityList = placeActivities
    .map((a) => `- ${a.title}`)
    .join("\n");

  let positionNote = "";
  if (isFirstDay && isLastDay) {
    positionNote = "This is the first day AND the final day -- a single-day trip.";
  } else if (isFirstDay) {
    positionNote = "This is the first day -- a nod to arrival is welcome.";
  } else if (isLastDay) {
    positionNote = "This is the final day -- a nod to leaving is welcome.";
  }

  return `You are a sharp UX writer for a Japan travel app. Say less. Talk to the person. Cut filler. Warm but never gushing. Concrete over clever. Every word earns its place.

You're writing a daily briefing for Day ${dayIndex + 1} of ${totalDays} of a Japan trip.

## Day Context
- City: ${day.cityId ?? "unknown"}
- Season: ${season}
- Vibes: ${vibes}
- Pace: ${pace}
- Group: ${group}
${positionNote ? `- ${positionNote}` : ""}

## Today's activities
${activityList || "(free day -- no fixed activities)"}

## What to write

A 2-4 sentence briefing, max 80 words. Ground it in today's specific activities and the day's rhythm. Tell the traveler what to expect, what to watch for, what small thing will make today work.
- Consequences, not mechanics: "The castle grounds are shadeless by 11" not "visit the castle in the morning".
- No exclamation marks. No emoji.
- Do not enumerate the schedule -- they can read the timeline.
- One sensory or logistical detail tied to today, not generic.

## Style rules
- Say less. Trust the reader.

## Deny-list (never use these words or phrases)
amazing, incredible, unforgettable, bustling, vibrant, traditional (as generic filler), hidden gem, delve, explore (as verb of enthusiasm), discover, wander, immerse, soak in, must-see, can't-miss, authentic (when vague), tucked away, off the beaten path, gem, treasure, embark, venture, hub, feast for the senses, treat yourself, don't miss, experience of a lifetime, bucket list, absolutely, truly, really (as intensifier), get ready, you'll love, stunning, breathtaking, journey, nestled, best-kept secret, tapestry.

## Voice
Write like a concierge who already knows this traveler. One sentence that a traveler will actually remember when they step outside this morning.

Return JSON with a single field: briefing.`;
}

/**
 * Zod schema for a single day's briefing call. No dayId -- the caller
 * (runBriefingBatch) tracks the dayId out-of-band by tagging each outcome
 * with the source dayId it fired the call for.
 *
 * @internal Exported for testing.
 */
export function buildBriefingDaySchema() {
  return z.object({
    briefing: z.string(),
  });
}

/** Payload shape for a single day's briefing call. */
type DayBriefingPayload = { briefing: string };

/**
 * Tagged outcome yielded by {@link runBriefingBatch} as each per-day call
 * settles. Three variants -- no "header" variant because daily briefings
 * has no trip-level preamble call.
 *
 * @internal Exported for testing.
 */
export type BriefingBatchOutcome =
  | { kind: "day"; dayId: string; dayIndex: number; result: DayBriefingPayload }
  | { kind: "day-failed"; dayId: string; dayIndex: number; error: unknown }
  | { kind: "day-deadline"; dayId: string; dayIndex: number };

// TODO(task-8): replace with env.dailyBriefingPerCallTimeoutMs
const PER_CALL_TIMEOUT_MS = 10_000;
const GLOBAL_DEADLINE_MS = 18_000;

/**
 * Fires one briefing call per day in parallel, yielding each outcome as it
 * settles via {@link settleInOrder}. The global deadline is enforced by a
 * shared AbortController whose signal is combined with each per-call
 * timeout inside {@link callVertex}.
 *
 * No trip-level header call -- daily briefings has no preamble, unlike
 * guide prose. The batch is N calls, not N+1.
 *
 * @internal Exported for testing.
 */
export async function* runBriefingBatch(
  itinerary: Itinerary,
  builderData: TripBuilderData,
): AsyncGenerator<BriefingBatchOutcome, void, void> {
  const days = itinerary.days ?? [];
  if (days.length === 0) return;

  const batchController = new AbortController();
  const deadlineTimer = setTimeout(
    () => batchController.abort(new Error("batch-deadline")),
    GLOBAL_DEADLINE_MS,
  );

  try {
    const dayPromises: Promise<BriefingBatchOutcome>[] = days.map(
      (day, dayIndex) => {
        const prompt = buildDayBriefingPrompt(day, dayIndex, days.length, builderData);
        return callVertex(
          prompt,
          buildBriefingDaySchema(),
          PER_CALL_TIMEOUT_MS,
          batchController.signal,
        ).then(
          (result): BriefingBatchOutcome => ({
            kind: "day",
            dayId: day.id,
            dayIndex,
            result,
          }),
          (error): BriefingBatchOutcome => ({
            kind: "day-failed",
            dayId: day.id,
            dayIndex,
            error,
          }),
        );
      },
    );

    for await (const settled of settleInOrder(dayPromises, GLOBAL_DEADLINE_MS)) {
      if (settled.status === "fulfilled") {
        yield settled.value;
      } else if (settled.status === "deadline") {
        const day = days[settled.index];
        if (day) {
          yield { kind: "day-deadline", dayId: day.id, dayIndex: settled.index };
        }
      }
    }
  } finally {
    clearTimeout(deadlineTimer);
  }
}

export async function generateDailyBriefings(
  itinerary: Itinerary,
  builderData: TripBuilderData,
): Promise<GeneratedBriefings | null> {
  const dayIds = itinerary.days.map((d) => d.id);
  if (dayIds.length === 0) return null;

  // Budget scales with trip length — the 15s base was sized for 3-7 day
  // trips and was hitting the cap on a 13-day trip (incident
  // req_1775916704399_jeo2x94nkx). Capped at 25s to stay under the parallel
  // block budget.
  const briefingsTimeoutMs = Math.min(
    25_000,
    15_000 + Math.max(0, dayIds.length - 5) * 1_000,
  );

  try {
    const { object } = await generateObject({
      model: vertex("gemini-2.5-flash"),
      providerOptions: VERTEX_GENERATE_OPTIONS,
      schema: buildDailyBriefingSchema(dayIds),
      prompt: buildBriefingPrompt(itinerary, builderData),
      abortSignal: AbortSignal.timeout(briefingsTimeoutMs),
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
        ...extractApiErrorDetails(error),
      },
    );
    return null;
  }
}
