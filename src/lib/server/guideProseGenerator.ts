import "server-only";

/**
 * Pass 3: Guide Prose — Generates personalized narrative for the entire trip guide.
 *
 * Replaces template-based guide text with LLM-generated prose that references
 * actual neighborhoods, activities, and traveler context.
 *
 * Runs in parallel with planItinerary() — zero added latency.
 * Falls back to null on any failure → standalone day intros → templates.
 */

import { z } from "zod";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";
import { getSeason } from "@/lib/utils/seasonUtils";
import {
  settleInOrder,
  callVertex,
} from "./_llmBatchPrimitives";
import type { Itinerary, ItineraryDay, ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { IntentExtractionResult, GeneratedGuide } from "@/types/llmConstraints";

// Re-export for backwards compatibility -- existing test files import these
// names from "../guideProseGenerator" and we keep that working without
// forcing a test rewrite in this task.
export { settleInOrder, callVertex, type SettledOutcome } from "./_llmBatchPrimitives";

/**
 * Output shape of the header LLM call.
 *
 * @internal Exported for testing.
 */
export type HeaderProse = {
  tripOverview: string;
  culturalBriefingIntro?: string;
};

/**
 * Output shape of a single day LLM call.
 *
 * @internal Exported for testing.
 */
export type DayProse = {
  intro: string;
  transitions: string[];
  culturalMoment?: string;
  practicalTip?: string;
  summary: string;
};

/**
 * Tagged outcome yielded by {@link runGuideProseBatch} as each call settles.
 *
 * @internal Exported for testing.
 */
export type BatchOutcome =
  | { kind: "header"; result: HeaderProse }
  | { kind: "header-failed"; error: unknown }
  | { kind: "header-deadline" }
  | { kind: "day"; dayId: string; dayIndex: number; result: DayProse }
  | { kind: "day-failed"; dayId: string; dayIndex: number; error: unknown }
  | { kind: "day-deadline"; dayId: string; dayIndex: number };

/**
 * Summarizes a day's activity mix for prompt context. Returns a short
 * natural-language string like "culture-heavy, with some food" that
 * Gemini can use to ground the day's voice without the full activity list
 * dominating the prompt.
 *
 * @internal Exported for testing.
 */
export function computeCategoryMix(
  activities: Array<{ category?: string }>,
): string {
  if (activities.length === 0) return "no activities";

  const counts = new Map<string, number>();
  for (const activity of activities) {
    const cat = activity.category || "other";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return "no activities";

  if (sorted.length === 1) {
    return `${top[0]}-focused`;
  }

  const second = sorted[1];
  if (!second) return `${top[0]}-focused`;

  return `${top[0]}-heavy, with some ${second[0]}`;
}

/**
 * Builds the prompt for the single trip-level header call. Output fields:
 * tripOverview, culturalBriefingIntro. Contains traveler profile, city list,
 * season, vibes, trip length, and trip-level voice rules + deny list.
 * Does NOT include per-day schedule data.
 *
 * @internal Exported for testing.
 */
export function buildHeaderPrompt(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  intentResult: IntentExtractionResult | undefined,
): string {
  const days = itinerary.days ?? [];
  const season = getSeason(builderData.dates?.start);
  const vibes = builderData.vibes?.join(", ") ?? "general sightseeing";
  const pace = builderData.style ?? "balanced";
  const group = builderData.group?.type ?? "solo traveler";
  const groupSize = builderData.group?.size ?? 1;
  const childrenAges = builderData.group?.childrenAges?.join(", ") ?? "none";
  const isFirstTime = builderData.isFirstTimeVisitor ? "yes" : "not mentioned";
  const dietary = builderData.accessibility?.dietary?.join(", ") ?? "none";
  const insights = intentResult?.additionalInsights?.join("; ") ?? "";

  const cities = [...new Set(days.map((d) => d.cityId).filter((c): c is string => !!c))];
  const cityList = cities.join(", ");

  return `You are a sharp UX writer for a Japan travel app. Say less. Talk to the person. Cut filler. Warm but never gushing. Concrete over clever. Every word earns its place.

You're writing the trip-level narrative header for a ${days.length}-day Japan trip.

## Traveler Context
- Season: ${season}
- Cities: ${cityList}
- Group: ${group} (${groupSize} people${childrenAges !== "none" ? `, children: ${childrenAges}` : ""})
- Pace: ${pace}
- Vibes: ${vibes}
- First time in Japan: ${isFirstTime}
- Dietary: ${dietary}
${insights ? `- Insights from notes: ${insights}` : ""}

## What to write

### tripOverview (2-3 sentences)
The arc of the whole trip. Name 1-2 cities. Set expectations without listing activities. Think back-cover copy — the line the traveler remembers.

### culturalBriefingIntro (2-3 sentences, max 250 chars, optional)
Intro to a cultural briefing that contextualizes this traveler's specific itinerary to Japanese cultural expectations. Reference the types of places they'll visit (temples, onsen, markets, residential neighborhoods) and set the tone that understanding these customs will transform their experience. Do not list rules. Do not use deny-list words.

## Style rules
- No emoji. No exclamation marks.
- Say less. Trust the reader.

## Deny-list (never use these words or phrases)
amazing, incredible, unforgettable, bustling, vibrant, traditional (as generic filler), hidden gem, delve, explore (as verb of enthusiasm), discover, wander, immerse, soak in, must-see, can't-miss, authentic (when vague), tucked away, off the beaten path, gem, treasure, embark, venture, hub, feast for the senses, treat yourself, don't miss, experience of a lifetime, bucket list, absolutely, truly, really (as intensifier), get ready, you'll love, stunning, breathtaking, journey, nestled, best-kept secret, tapestry.

## Voice
Write like a concierge who already knows this traveler, not a guidebook selling a destination. Ground every sentence in something concrete — a city, a season, a sensation.

Return JSON with tripOverview and optional culturalBriefingIntro.`;
}

/**
 * Builds the prompt for a single day's per-day call. Output fields:
 * intro, transitions, culturalMoment?, practicalTip?, summary. Contains
 * position flags, neighbor city framing, activity list, and category mix.
 * Does NOT include the full itinerary -- context size is O(1) per day.
 *
 * @internal Exported for testing.
 */
export function buildDayPrompt(
  day: ItineraryDay,
  dayIndex: number,
  totalDays: number,
  prevCityId: string | null,
  nextCityId: string | null,
  categoryMix: string,
  builderData: TripBuilderData,
  intentResult: IntentExtractionResult | undefined,
): string {
  const isFirstDay = dayIndex === 0;
  const isLastDay = dayIndex === totalDays - 1;

  const season = getSeason(builderData.dates?.start);
  const vibes = builderData.vibes?.join(", ") ?? "general sightseeing";
  const pace = builderData.style ?? "balanced";
  const group = builderData.group?.type ?? "solo traveler";
  const insights = intentResult?.additionalInsights?.join("; ") ?? "";

  const placeActivities = (day.activities ?? []).filter(
    (a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place",
  );
  const activityList = placeActivities
    .map((a) => {
      const category = a.tags?.[1] ?? a.tags?.[0] ?? "activity";
      return `- ${a.title} (${category})`;
    })
    .join("\n");

  // Natural-language position framing. First/last day get explicit nods;
  // middle days get neighbor-city context.
  let positionFraming: string;
  if (isFirstDay && isLastDay) {
    positionFraming = "This is the first day AND the final day — a single-day trip. The traveler arrives and departs on the same day.";
  } else if (isFirstDay) {
    positionFraming = `This is the first day. The traveler arrives today. Tomorrow: ${nextCityId ?? "next city"}.`;
  } else if (isLastDay) {
    positionFraming = `This is the final day. The traveler departs today. Yesterday: ${prevCityId ?? "previous city"}.`;
  } else {
    positionFraming = `Yesterday: ${prevCityId ?? "previous city"}. Tomorrow: ${nextCityId ?? "next city"}.`;
  }

  return `You are a sharp UX writer for a Japan travel app. Say less. Talk to the person. Cut filler. Warm but never gushing. Concrete over clever. Every word earns its place.

You're writing editorial prose for Day ${dayIndex + 1} of ${totalDays} of a Japan trip.

## Day Context
- City: ${day.cityId ?? "unknown"}
- Season: ${season}
- Vibes: ${vibes}
- Pace: ${pace}
- Group: ${group}
- This day: ${categoryMix}
- ${positionFraming}
${insights ? `- Traveler insights: ${insights}` : ""}

## Today's activities
${activityList || "(free day — no fixed activities)"}

## What to write

**intro** (1-2 sentences, max 180 chars)
Capture the FEEL of the day — neighborhood vibe, sensory detail, mood shift. Not the schedule.
- One place name to anchor it. Two max. Weave in, never list.
- NEVER enumerate activities or use "then" constructions.
- Banned openers: "Settle into / Ease into / Kick off with / Start your day".
- Consequences, not mechanics: "The temples are quieter this early" not "visit temples in the morning".
${isFirstDay ? "- This is the first day — a nod to arrival is welcome." : ""}
${isLastDay ? "- This is the final day — a nod to leaving is welcome." : ""}

**transitions** (array of 1-3 strings, 1 sentence each)
Connecting tissue between consecutive activities. Reference the physical/sensory shift — what changes as you walk from one place to the next. Spatial, not procedural.
- Never start with "Next" or "Then" or "Head to".
- Reference neighborhoods, sounds, smells, light changes.

**culturalMoment** (optional, 2-3 sentences)
Context before a shrine, temple, onsen, or market. History, etiquette, or meaning — not a Wikipedia summary.
- Only include if the day has a cultural site.
- Specific to the actual place, not generic.

**practicalTip** (optional, 1-2 sentences)
Actionable advice for the day. Route-specific navigation, neighborhood logistics, timing strategies unique to this day's activity sequence, or reservation/ticket tips for specific venues.
- Skip if nothing specific applies.

**summary** (1 sentence)
Reflective close. What the day felt like, not what happened.
- No exclamation marks. No "what a day!" or "unforgettable".

## Style rules
- No emoji. No exclamation marks.
- Say less. Trust the reader.

## Deny-list (never use these words or phrases)
amazing, incredible, unforgettable, bustling, vibrant, traditional (as generic filler), hidden gem, delve, explore (as verb of enthusiasm), discover, wander, immerse, soak in, must-see, can't-miss, authentic (when vague), tucked away, off the beaten path, gem, treasure, embark, venture, hub, feast for the senses, treat yourself, don't miss, experience of a lifetime, bucket list, absolutely, truly, really (as intensifier), get ready, you'll love, stunning, breathtaking, journey, nestled, best-kept secret, tapestry.

## Voice
Write like a concierge who already knows this traveler. Ground every sentence in something concrete — a place, a sensation, a logistical specificity.

Return JSON with intro, transitions, optional culturalMoment, optional practicalTip, and summary.`;
}

/**
 * Zod schema for the header call's output. Fixed shape, no dynamic fields.
 *
 * @internal Exported for testing.
 */
export function buildHeaderSchema() {
  return z.object({
    tripOverview: z.string(),
    culturalBriefingIntro: z.string().optional(),
  });
}

/**
 * Zod schema for a single day call's output. Fixed shape, no dayId.
 * The caller (runGuideProseBatch) tracks the dayId out-of-band by tagging
 * each outcome with the source dayId it fired the call for.
 *
 * @internal Exported for testing.
 */
export function buildDaySchema() {
  return z.object({
    intro: z.string(),
    transitions: z.array(z.string()).max(3),
    culturalMoment: z.string().optional(),
    practicalTip: z.string().optional(),
    summary: z.string(),
  });
}

/**
 * Timeout constants for the guide prose batch.
 *
 * Per-call: 10 seconds default, runtime-tunable via
 * GUIDE_PROSE_PER_CALL_TIMEOUT_MS env var (clamped [5_000, 15_000] in env.ts).
 * Tight at p99 -- see spec Budget numbers § Tuning note. Raise toward 12_000
 * if observability shows daysDeadline + daysFailed > 10% of totalDays
 * consistently in production.
 *
 * Global deadline: 18 seconds, not env-configurable. Allows 10s per-call +
 * ~5s Vertex AbortController slippage + 3s drain processing overhead. If
 * per-call is raised significantly via env var, this constant may need to
 * move in lockstep via code change.
 */
const PER_CALL_TIMEOUT_MS = env.guideProsePerCallTimeoutMs;
const GLOBAL_DEADLINE_MS = 18_000;

/**
 * Fires the header call and one call per day in parallel, yielding each
 * outcome as it settles via {@link settleInOrder}. The global deadline is
 * enforced by a shared AbortController whose signal is combined with each
 * per-call timeout inside {@link callVertex}.
 *
 * This generator is the Stage 2 handoff point -- a future SSE route will
 * consume it directly and forward each yield as a Server-Sent Event
 * without changes to the layers underneath.
 *
 * @internal Exported for testing. Also the public Stage 2 handoff.
 */
export async function* runGuideProseBatch(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  intentResult: IntentExtractionResult | undefined,
  onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void,
): AsyncGenerator<BatchOutcome, void, void> {
  const days = itinerary.days ?? [];
  if (days.length === 0) return;

  // Dual-deadline design: both this setTimeout and settleInOrder's internal
  // deadline use GLOBAL_DEADLINE_MS. They are complementary, not redundant:
  //
  // - This outer timer aborts the batchController signal, which propagates
  //   into each in-flight Vertex call via AbortSignal.any and closes the HTTP
  //   connection promptly (resource hygiene -- stops bandwidth spend).
  // - settleInOrder's internal timer is a termination guarantee: if abort
  //   propagation stalls or the underlying library is non-compliant, the
  //   async generator still yields deadline outcomes and terminates rather
  //   than hanging. Belt and suspenders by design.
  const batchController = new AbortController();
  const deadlineTimer = setTimeout(
    () => batchController.abort(new Error("batch-deadline")),
    GLOBAL_DEADLINE_MS,
  );

  try {
    // Fire the header call.
    const headerPromise: Promise<BatchOutcome> = callVertex(
      buildHeaderPrompt(itinerary, builderData, intentResult),
      buildHeaderSchema(),
      PER_CALL_TIMEOUT_MS,
      batchController.signal,
      onUsage,
    ).then(
      (result): BatchOutcome => ({ kind: "header", result }),
      (error): BatchOutcome => ({ kind: "header-failed", error }),
    );

    // Fire one call per day, tagging each promise with its dayId and index.
    const dayPromises: Promise<BatchOutcome>[] = days.map((day, dayIndex) => {
      const prevCityId =
        dayIndex > 0 ? days[dayIndex - 1]?.cityId ?? null : null;
      const nextCityId =
        dayIndex < days.length - 1 ? days[dayIndex + 1]?.cityId ?? null : null;

      const placeActivities = (day.activities ?? []).filter(
        (a): a is Extract<ItineraryActivity, { kind: "place" }> =>
          a.kind === "place",
      );
      // Project ItineraryActivity.tags into the { category?: string } shape that computeCategoryMix accepts.
      const categoryMix = computeCategoryMix(
        placeActivities.map((a) => ({
          category: a.tags?.[1] ?? a.tags?.[0],
        })),
      );

      const prompt = buildDayPrompt(
        day,
        dayIndex,
        days.length,
        prevCityId,
        nextCityId,
        categoryMix,
        builderData,
        intentResult,
      );

      return callVertex(
        prompt,
        buildDaySchema(),
        PER_CALL_TIMEOUT_MS,
        batchController.signal,
        onUsage,
      ).then(
        (result): BatchOutcome => ({
          kind: "day",
          dayId: day.id,
          dayIndex,
          result,
        }),
        (error): BatchOutcome => ({
          kind: "day-failed",
          dayId: day.id,
          dayIndex,
          error,
        }),
      );
    });

    // Drain all N+1 promises via settleInOrder. The .then handlers above
    // ensure these never reject -- they always resolve to an outcome tag --
    // so settleInOrder only sees fulfilled outcomes.
    for await (const settled of settleInOrder(
      [headerPromise, ...dayPromises],
      GLOBAL_DEADLINE_MS,
    )) {
      if (settled.status === "fulfilled") {
        yield settled.value;
      } else if (settled.status === "deadline") {
        // Convert the generic deadline outcome into a typed BatchOutcome.
        // Index 0 is the header; indices 1..N are days (offset by 1).
        if (settled.index === 0) {
          yield { kind: "header-deadline" };
        } else {
          const dayIndex = settled.index - 1;
          const day = days[dayIndex];
          // TypeScript requires the guard for `T | undefined` on array access,
          // but the else path is logically unreachable: settleInOrder only
          // yields indices within the bounds of the input array it was given.
          if (day) {
            yield { kind: "day-deadline", dayId: day.id, dayIndex };
          }
        }
      }
      // status: 'rejected' is unreachable because the .then handlers above
      // convert rejections into fulfilled outcome tags. Left unhandled.
    }
  } finally {
    clearTimeout(deadlineTimer);
  }
}

/**
 * Generates personalized guide prose for an entire trip via per-day parallel
 * Vertex calls. Returns a GeneratedGuide containing the assembled header
 * fields and per-day prose.
 *
 * Public contract is unchanged from the old monolithic implementation except
 * for one detail: the old code returned `null` on total LLM failure; the new
 * code returns an empty shell. Downstream consumer behavior is identical
 * (templates render via the three-tier fallback in guideBuilder), but the
 * shell form allows partial-success preservation (e.g., header succeeds but
 * some days fail).
 *
 * @returns Three distinct shapes:
 *   - `null` means the function never ran. Triggered only by precondition
 *     failure: missing GOOGLE_APPLICATION_CREDENTIALS_JSON env var, or zero
 *     days in the itinerary. Does NOT indicate LLM failure.
 *   - A GeneratedGuide shell with `tripOverview: undefined` and/or empty
 *     `days` array means the function ran but some or all Vertex calls
 *     failed (rejection, per-call timeout, or global deadline). The shell
 *     still carries whichever calls succeeded.
 *   - A fully-populated GeneratedGuide means every call (header + N days)
 *     succeeded.
 *
 *   Callers should NOT use `null` as a failure signal -- check
 *   `result?.tripOverview` and `result?.days.length` instead.
 */
export async function generateGuideProse(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  intentResult?: IntentExtractionResult,
  opts?: { onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void },
): Promise<GeneratedGuide | null> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return null;
  }

  const days = itinerary.days ?? [];
  if (days.length === 0) return null;

  // Shell with tripOverview genuinely absent until set by a successful
  // header call. The type change in types/llmConstraints.ts makes
  // tripOverview optional so this initialization compiles cleanly.
  const shell: GeneratedGuide = { days: [] };

  let daysSuccess = 0;
  let daysFailed = 0;
  let daysDeadline = 0;
  let headerStatus: "success" | "failed" | "deadline" = "failed";

  const startTime = Date.now();

  // Collect { dayIndex, day } pairs so we can sort by original index after
  // draining, without mutating the GeneratedDayGuide type.
  const dayEntries: Array<{ dayIndex: number; day: typeof shell.days[number] }> = [];

  for await (const outcome of runGuideProseBatch(itinerary, builderData, intentResult, opts?.onUsage)) {
    switch (outcome.kind) {
      case "header":
        shell.tripOverview = outcome.result.tripOverview;
        if (outcome.result.culturalBriefingIntro !== undefined) {
          shell.culturalBriefingIntro = outcome.result.culturalBriefingIntro;
        }
        headerStatus = "success";
        break;
      case "header-failed":
        logger.warn("Guide prose header call failed", {
          error: getErrorMessage(outcome.error),
          ...extractApiErrorDetails(outcome.error),
        });
        headerStatus = "failed";
        break;
      case "header-deadline":
        headerStatus = "deadline";
        break;
      case "day":
        dayEntries.push({
          dayIndex: outcome.dayIndex,
          day: {
            dayId: outcome.dayId,
            intro: outcome.result.intro,
            transitions: outcome.result.transitions,
            ...(outcome.result.culturalMoment !== undefined && {
              culturalMoment: outcome.result.culturalMoment,
            }),
            ...(outcome.result.practicalTip !== undefined && {
              practicalTip: outcome.result.practicalTip,
            }),
            summary: outcome.result.summary,
          },
        });
        daysSuccess++;
        break;
      case "day-failed":
        logger.warn("Guide prose day call failed", {
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

  // Sort by original dayIndex (completion order is non-deterministic) and
  // extract the day objects into the shell.
  dayEntries.sort((a, b) => a.dayIndex - b.dayIndex);
  shell.days = dayEntries.map((e) => e.day);

  const elapsedMs = Date.now() - startTime;
  const totalDays = days.length;
  const deadlineFired = daysDeadline > 0 || headerStatus === "deadline";

  // Fire-and-forget deny-list scan for observability. Per
   // _llmBatchPrimitives.ts the per-call retry was dropped because Gemini
  // 2.5 Flash with the deny-list in the prompt produces <1% violations.
  // We still want to know when one slips through so we can monitor the
  // rate over time and react if a model update degrades compliance.
  const denyListViolations = scanForDenyListViolations(shell);
  if (denyListViolations.length > 0) {
    logger.warn("Guide prose deny-list violations slipped through", {
      violations: denyListViolations.slice(0, 10),
      totalViolations: denyListViolations.length,
      totalDays,
    });
  }

  logger.info("Guide prose batch complete", {
    headerStatus,
    daysSuccess,
    daysFailed,
    daysDeadline,
    totalDays,
    elapsedMs,
    deadlineFired,
    denyListViolations: denyListViolations.length,
  });

  return shell;
}

// ---------------------------------------------------------------------------
// Deny-list validation
// ---------------------------------------------------------------------------

const DENY_LIST_PATTERNS = [
  /\bamazing\b/i, /\bincredible\b/i, /\bunforgettable\b/i, /\bbustling\b/i,
  /\bvibrant\b/i, /\bhidden gem\b/i, /\bdelve\b/i, /\bimmerse\b/i,
  /\bsoak in\b/i, /\bmust-see\b/i, /\bcan't-miss\b/i, /\btucked away\b/i,
  /\boff the beaten path\b/i, /\btreasure\b/i, /\bembark\b/i, /\bventure\b/i,
  /\bfeast for the senses\b/i, /\btreat yourself\b/i, /\bdon't miss\b/i,
  /\bexperience of a lifetime\b/i, /\bbucket list\b/i, /\bget ready\b/i,
  /\byou'll love\b/i, /\bexplore\b/i, /\bdiscover\b/i, /\bwander\b/i,
  /\bauthentic\b/i, /\bgem\b/i, /\bstunning\b/i, /\bbreathtaking\b/i,
  /\bjourney\b/i, /\bnestled\b/i, /\bbest-kept secret\b/i, /\btapestry\b/i,
  /\btraditional\b/i, /\bhub\b/i, /\babsolutely\b/i, /\btruly\b/i,
  /\breally\b/i,
];

export function scanForDenyListViolations(guide: GeneratedGuide): string[] {
  const violations: string[] = [];
  const allText = [
    guide.tripOverview,
    ...guide.days.flatMap((d) => [
      d.intro,
      ...(d.transitions ?? []),
      d.culturalMoment ?? "",
      d.practicalTip ?? "",
      d.summary,
    ]),
  ].join(" ");

  for (const pattern of DENY_LIST_PATTERNS) {
    const match = allText.match(pattern);
    if (match) violations.push(match[0]);
  }

  return violations;
}
