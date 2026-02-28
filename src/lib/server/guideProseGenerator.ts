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
  const vibes = builderData.interests?.join(", ") ?? "general sightseeing";
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

## Style rules
- No emoji. No exclamation marks.
- No "amazing/incredible/unforgettable/bustling/vibrant"
- No "get ready" or "you'll love"
- Say less. Trust the reader.

Return JSON with tripOverview and days array (one entry per day with exact dayId).`;

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema,
      prompt,
    });

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

    logger.info("Generated guide prose", {
      dayCount: guide.days.length,
      overviewLength: guide.tripOverview.length,
    });

    return guide;
  } catch (error) {
    logger.warn("Guide prose generation failed, will fall back to day intros/templates", {
      error: getErrorMessage(error),
    });
    return null;
  }
}
