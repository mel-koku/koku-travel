import "server-only";

/**
 * Pass 4: Daily Briefings — Generates concise, context-aware per-day briefing
 * paragraphs that avoid repeating information across days.
 *
 * Runs in parallel with Pass 3 (guide prose) — zero added latency.
 * Falls back to null on any failure → consolidated rule-based tips render instead.
 */

import { z } from "zod";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";
import { getSeason } from "@/lib/utils/seasonUtils";
import { env } from "@/lib/env";
import {
  callVertex,
  callVertexGroundedText,
  settleInOrder,
  type LlmUsageCallback,
} from "./_llmBatchPrimitives";
import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { GeneratedBriefings, DayBriefing } from "@/types/llmConstraints";

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
  options: { grounded?: boolean } = {},
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
${options.grounded
  ? `\n## Grounding\nYou have Google Search access. Use it to check today's specifics — current closures, weather advisories, festival timing — for ${day.cityId ?? "this city"} on the trip's planned date. Only mention what materially affects today's plan; never recite generic city info.\n\nReturn only the briefing text. No preamble. No JSON. No markdown. No source list — citations are tracked separately.`
  : `\nReturn JSON with a single field: briefing.`}`;
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

const PER_CALL_TIMEOUT_MS = env.dailyBriefingPerCallTimeoutMs;
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
  onUsage?: LlmUsageCallback,
): AsyncGenerator<BriefingBatchOutcome, void, void> {
  const days = itinerary.days ?? [];
  if (days.length === 0) return;

  const batchController = new AbortController();
  const deadlineTimer = setTimeout(
    () => batchController.abort(new Error("batch-deadline")),
    GLOBAL_DEADLINE_MS,
  );

  const grounded = env.isBriefingGroundingEnabled;

  try {
    const dayPromises: Promise<BriefingBatchOutcome>[] = days.map(
      (day, dayIndex) => {
        const prompt = buildDayBriefingPrompt(day, dayIndex, days.length, builderData, { grounded });
        const callPromise: Promise<DayBriefingPayload> = grounded
          ? callVertexGroundedText(
              prompt,
              PER_CALL_TIMEOUT_MS,
              batchController.signal,
              onUsage,
              "daily-briefing-grounded",
            ).then((text) => ({ briefing: text.trim() }))
          : callVertex(
              prompt,
              buildBriefingDaySchema(),
              PER_CALL_TIMEOUT_MS,
              batchController.signal,
              onUsage,
              "daily-briefing",
            );
        return callPromise.then(
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

/**
 * Generates personalized daily briefings for a trip via per-day parallel
 * Vertex calls. Returns a GeneratedBriefings containing the assembled
 * per-day prose.
 *
 * Public contract change from pre-refactor: the old monolithic code returned
 * `null` on total LLM failure; the new drain returns an empty shell.
 * Downstream consumer behavior is identical for the total-failure case
 * (rule-based tips render via fallback), but the shell form allows
 * partial-success preservation.
 *
 * @returns `null` only on precondition failure (no credentials, zero days).
 *   Otherwise returns a GeneratedBriefings shell (possibly with empty days
 *   array on total failure).
 */
export async function generateDailyBriefings(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  opts?: { onUsage?: LlmUsageCallback },
): Promise<GeneratedBriefings | null> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return null;
  }

  const days = itinerary.days ?? [];
  if (days.length === 0) return null;

  const dayEntries: Array<{ dayIndex: number; day: DayBriefing }> = [];
  let daysSuccess = 0;
  let daysFailed = 0;
  let daysDeadline = 0;

  const startTime = Date.now();

  for await (const outcome of runBriefingBatch(itinerary, builderData, opts?.onUsage)) {
    switch (outcome.kind) {
      case "day": {
        const briefing = outcome.result.briefing?.trim();
        if (!briefing) {
          logger.warn("Daily briefing empty content", {
            dayId: outcome.dayId,
            dayIndex: outcome.dayIndex,
          });
          daysFailed++;
          break;
        }
        dayEntries.push({
          dayIndex: outcome.dayIndex,
          day: { dayId: outcome.dayId, briefing },
        });
        daysSuccess++;
        break;
      }
      case "day-failed":
        logger.warn("Daily briefing day call failed", {
          dayId: outcome.dayId,
          dayIndex: outcome.dayIndex,
          error: getErrorMessage(outcome.error),
          ...extractApiErrorDetails(outcome.error),
        });
        daysFailed++;
        break;
      case "day-deadline":
        daysDeadline++;
        break;
    }
  }

  dayEntries.sort((a, b) => a.dayIndex - b.dayIndex);
  const shell: GeneratedBriefings = { days: dayEntries.map(({ day }) => day) };

  const elapsedMs = Date.now() - startTime;
  const totalDays = days.length;
  const deadlineFired = daysDeadline > 0;

  logger.info("Daily briefings batch complete", {
    daysSuccess,
    daysFailed,
    daysDeadline,
    totalDays,
    elapsedMs,
    deadlineFired,
  });

  return shell;
}
