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

import { generateObject } from "ai";
import { vertex, VERTEX_GENERATE_OPTIONS } from "./vertexProvider";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";
import { buildGuideProseSchema } from "./llmSchemas";
import { getSeason } from "@/lib/utils/seasonUtils";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { IntentExtractionResult, GeneratedGuide } from "@/types/llmConstraints";

/**
 * Builds a compact itinerary summary for the prompt.
 */
function buildItinerarySummary(itinerary: Itinerary): string {
  return itinerary.days
    .map((day, i) => {
      const city = day.cityId ?? "unknown";
      const activities = (day.activities ?? [])
        .filter((a) => a.kind === "place")
        .map((a) => {
          const category = a.tags?.[1] ?? a.tags?.[0] ?? "activity";
          const neighborhood = a.neighborhood ?? "";
          return `${a.title} (${category}${neighborhood ? `, ${neighborhood}` : ""})`;
        });
      return `Day ${i + 1} [${day.id}] — ${city}: ${activities.join(", ") || "free day"}`;
    })
    .join("\n");
}

/**
 * Generates personalized guide prose for an entire trip.
 *
 * Returns a GeneratedGuide or null on failure.
 */
export async function generateGuideProse(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  intentResult?: IntentExtractionResult,
): Promise<GeneratedGuide | null> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return null;
  }

  const days = itinerary.days ?? [];
  if (days.length === 0) return null;

  const season = getSeason(builderData.dates?.start);
  const vibes = builderData.vibes?.join(", ") ?? "general sightseeing";
  const pace = builderData.style ?? "balanced";
  const group = builderData.group?.type ?? "solo traveler";
  const groupSize = builderData.group?.size ?? 1;
  const childrenAges = builderData.group?.childrenAges?.join(", ") ?? "none";
  const isFirstTime = builderData.isFirstTimeVisitor ? "yes" : "not mentioned";
  const dietary = builderData.accessibility?.dietary?.join(", ") ?? "none";
  const itinerarySummary = buildItinerarySummary(itinerary);
  const insights = intentResult?.additionalInsights?.join("; ") ?? "";

  const dayIds = days.map((d) => d.id);
  const schema = buildGuideProseSchema(dayIds);

  const prompt = `You are a sharp UX writer for a Japan travel app. Say less. Talk to the person. Cut filler. Warm but never gushing. Concrete over clever. Every word earns its place.

You're writing the full narrative guide for a ${days.length}-day Japan trip.

## Traveler Context
- Season: ${season}
- Group: ${group} (${groupSize} people${childrenAges !== "none" ? `, children: ${childrenAges}` : ""})
- Pace: ${pace}
- Vibes: ${vibes}
- First time in Japan: ${isFirstTime}
- Dietary: ${dietary}
${insights ? `- Insights from notes: ${insights}` : ""}

## Itinerary
${itinerarySummary}

## Day IDs (use these exactly)
${dayIds.map((id, i) => `Day ${i + 1}: "${id}"`).join("\n")}

## What to write

### tripOverview (2-3 sentences)
The arc of the whole trip. Name 1-2 cities. Set expectations without listing activities. Think back-cover copy.

### culturalBriefingIntro (2-3 sentences, max 250 chars, optional)
A cultural briefing intro that contextualizes this traveler's specific itinerary to Japanese cultural expectations. Reference the types of places they'll visit (temples, onsen, markets, residential neighborhoods) and set the tone that understanding these customs will transform their experience. Do not list rules. Do not use deny-list words.

### Per day (use exact dayId values from above):

**intro** (1-2 sentences, max 180 chars)
Capture the FEEL of the day — neighborhood vibe, sensory detail, mood shift. Not the schedule.
- One place name to anchor it. Two max. Weave in, never list.
- NEVER enumerate activities or use "then" constructions
- Banned: "Settle into / Ease into / Kick off with / Start your day"
- Banned: listing activities with "and" or "then"
- Consequences, not mechanics: "The temples are quieter this early" not "visit temples in the morning"
- Vary openings across days. No two should start the same way.
- First day can nod to arrival. Last day can nod to leaving.

**transitions** (array of strings, 1 sentence each)
Connecting tissue between consecutive activities. Reference the physical/sensory shift — what changes as you walk from one place to the next. Spatial, not procedural.
- Max ${Math.min(3, days[0]?.activities.length ?? 3)} per day
- Never start with "Next" or "Then" or "Head to"
- Reference neighborhoods, sounds, smells, light changes

**culturalMoment** (optional, 2-3 sentences)
Context before a shrine, temple, onsen, or market. History, etiquette, or meaning — not a Wikipedia summary.
- Only include if the day has a cultural site
- Specific to the actual place, not generic

**practicalTip** (optional, 1-2 sentences)
Actionable advice for the day. IC cards, coin lockers, etiquette, timing.
- Skip if nothing specific applies
- Day 1 tips can cover arrival basics

**summary** (1 sentence)
Reflective close. What the day felt like, not what happened.
- No exclamation marks
- No "what a day!" or "unforgettable"

## Topics to AVOID in practicalTip
These are handled by our tips system. Do not duplicate them:
- IC card / Suica / transit card setup or usage
- Cash withdrawal, ATM locations, or payment warnings
- Last train timing or schedule
- Luggage forwarding (takkyubin) logistics
- Rush hour avoidance
- Shoe removal at temples/shrines
- Temizuya (purification basin) instructions
- Weather warnings (heat, rain, cold, umbrella)
- General etiquette (bowing, queuing, quiet on trains)

Focus practicalTip on: route-specific navigation, neighborhood logistics, timing strategies unique to this day's activity sequence, or reservation/ticket tips for specific venues.

## Style rules
- No emoji. No exclamation marks.
- Say less. Trust the reader.

### Deny-list (never use these words or phrases)
amazing, incredible, unforgettable, bustling, vibrant, traditional (as generic filler), hidden gem, delve, explore (as verb of enthusiasm), discover, wander, immerse, soak in, must-see, can't-miss, authentic (when vague), tucked away, off the beaten path, gem, treasure, embark, venture, hub, feast for the senses, treat yourself, don't miss, experience of a lifetime, bucket list, absolutely, truly, really (as intensifier), get ready, you'll love.

### Positive direction
Use words that evoke texture, light, and logistics. Mention physical details: the smell of old wood, the steepness of a cobbled street, the specific transit exit to use. Ground every sentence in something the traveler can see, hear, or do.

### Voice
Write like a concierge who already knows this traveler, not a guidebook selling a destination. If they've placed a shrine on their itinerary, don't tell them it's beautiful. Tell them to arrive before 6:30 AM.

Return JSON with tripOverview and days array (one entry per day with exact dayId).`;

  // Budget scales with trip length. Gemini's response size grows roughly
  // linearly with day count (intro + transitions + culturalMoment +
  // practicalTip + summary per day, plus tripOverview and
  // culturalBriefingIntro). Guide prose is the biggest LLM pass by response
  // size and the one most likely to hit its cap on long trips.
  //
  // Budget math (13-day trip, after parallelizing getCulturalPillars):
  //   upstream ~4s
  //   + parallel block max = max(planItinerary 3s, guideProse 35s, briefings 23s, pillars 3s) = 35s
  //   + refineDays 8s
  //   = 47s, leaving 8s of headroom under the 55s route timer for
  //     Vertex's ~5s AbortController slippage on long responses.
  const guideProseTimeoutMs = Math.min(
    35_000,
    18_000 + Math.max(0, days.length - 5) * 2_000,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), guideProseTimeoutMs);

  try {
    const result = await generateObject({
      model: vertex("gemini-2.5-flash"),
      providerOptions: VERTEX_GENERATE_OPTIONS,
      schema,
      prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    let guide = result.object as GeneratedGuide;

    // Validate day IDs match
    const returnedIds = new Set(guide.days.map((d) => d.dayId));
    const missingDays = dayIds.filter((id) => !returnedIds.has(id));
    if (missingDays.length > 0) {
      logger.warn("Guide prose missing days, falling back", {
        missingDays,
        returnedCount: guide.days.length,
        expectedCount: dayIds.length,
      });
      return null;
    }

    // Scan for deny-listed words that leaked through
    const leaks = scanForDenyListViolations(guide);
    if (leaks.length > 0) {
      logger.warn("Guide prose deny-list violations, retrying", { leaks });
      try {
        const retryResult = await generateObject({
          model: vertex("gemini-2.5-flash"),
          providerOptions: VERTEX_GENERATE_OPTIONS,
          schema,
          prompt: prompt + `\n\nCRITICAL: Your previous response used banned words: ${leaks.join(", ")}. Rewrite WITHOUT any of these words.`,
          // Retry gets 2/3 of the primary budget — same day-count scaling,
          // capped lower so the retry can never blow past the primary timer.
          abortSignal: AbortSignal.timeout(Math.round(guideProseTimeoutMs * 2 / 3)),
        });
        const retryGuide = retryResult.object as GeneratedGuide;
        const retryLeaks = scanForDenyListViolations(retryGuide);
        if (retryLeaks.length === 0) {
          logger.info("Guide prose retry succeeded, deny-list clean");
          guide = retryGuide;
        } else {
          logger.warn("Guide prose retry still has violations, accepting", { retryLeaks });
          guide = retryGuide;
        }
      } catch (retryError) {
        logger.warn("Guide prose retry failed, using first attempt", {
          error: getErrorMessage(retryError),
          ...extractApiErrorDetails(retryError),
        });
      }
    }

    logger.info("Generated guide prose", {
      dayCount: guide.days.length,
      overviewLength: guide.tripOverview.length,
    });

    return guide;
  } catch (error) {
    clearTimeout(timeout);
    logger.warn("Guide prose generation failed, will fall back to day intros/templates", {
      error: getErrorMessage(error),
      ...extractApiErrorDetails(error),
    });
    return null;
  }
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
