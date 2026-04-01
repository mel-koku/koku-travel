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
import { google } from "@ai-sdk/google";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
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
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema,
      prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    const guide = result.object as GeneratedGuide;

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
      logger.warn("Guide prose deny-list violations", { leaks });
    }

    logger.info("Generated guide prose", {
      dayCount: guide.days.length,
      overviewLength: guide.tripOverview.length,
      denyListLeaks: leaks.length,
    });

    return guide;
  } catch (error) {
    clearTimeout(timeout);
    logger.warn("Guide prose generation failed, will fall back to day intros/templates", {
      error: getErrorMessage(error),
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
  /\byou'll love\b/i,
];

function scanForDenyListViolations(guide: GeneratedGuide): string[] {
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
