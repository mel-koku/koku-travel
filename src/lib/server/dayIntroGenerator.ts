/**
 * Day Intro Generator — Uses Gemini to generate personalized day introductions.
 *
 * Single generateObject() call produces all day intros for a trip.
 * Falls back to null on any failure (missing API key, quota, network).
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

/**
 * Derives season from a date string (yyyy-mm-dd).
 */
function getSeason(dateStr?: string | null): string {
  if (!dateStr) return "spring";
  const month = new Date(dateStr).getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

/**
 * Builds a compact day summary for the prompt.
 */
function buildDayContext(itinerary: Itinerary): string {
  return itinerary.days
    .map((day, i) => {
      const city = day.cityId ?? "unknown";
      const activities = (day.activities ?? [])
        .filter((a) => a.kind === "place")
        .map((a) => {
          const category = a.tags?.[0] ?? "activity";
          return `${a.title} (${category})`;
        });
      return `Day ${i + 1} [${day.id}] — ${city}: ${activities.join(", ") || "free day"}`;
    })
    .join("\n");
}

/**
 * Generates personalized day intros for all days in a trip.
 *
 * Returns a Record mapping dayId → intro string, or null on failure.
 */
export async function generateDayIntros(
  itinerary: Itinerary,
  builderData: TripBuilderData,
): Promise<Record<string, string> | null> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return null;
  }

  const days = itinerary.days ?? [];
  if (days.length === 0) return null;

  const season = getSeason(builderData.dates?.start);
  const vibes = builderData.interests?.join(", ") ?? "general sightseeing";
  const pace = builderData.style ?? "balanced";
  const group = builderData.group?.type ?? "solo traveler";
  const dayContext = buildDayContext(itinerary);

  // Build Zod schema with exact day IDs
  const dayIds = days.map((d) => d.id);
  const schemaShape: Record<string, z.ZodString> = {};
  for (const id of dayIds) {
    schemaShape[id] = z.string();
  }
  const introSchema = z.object(schemaShape);

  const prompt = `You are a sharp UX writer. Say less. Talk to the person. Cut the filler. Trust the reader. Warm but never gushing. Concrete over clever. Every word earns its place.

You're writing day intros for a Japan travel itinerary.

Traveler:
- Season: ${season}
- Group: ${group}
- Pace: ${pace}
- Vibes: ${vibes}
- ${days.length} days total

Itinerary:
${dayContext}

Write one "Today's Plan" intro per day. 1-2 sentences, max 180 characters.

How to write these:
- Capture the FEEL of the day — the neighborhood vibe, a sensory detail, a contrast, a mood shift. Not the schedule.
- One place name to anchor it. Two max. Weave in, never list.
- NEVER enumerate activities. These patterns are banned:
  - "A taste of X, then a sip of Y"
  - "X in the morning, Y in the afternoon"
  - "[category] at [place] and [category] at [place]"
  - "Settle into / Ease into / Kick off with"
- Consequences, not mechanics. "The temples are quieter this early" not "visit temples in the morning."
- Vary openings across days — place, feeling, time of day, sensory detail. No two should start the same way.
- First day can nod to arrival. Last day can nod to leaving. Middle days just set the tone.
- No emoji. No exclamation marks. No "amazing/incredible/unforgettable." No "get ready." No "you'll love."

Yes:
- "Kitano's Western mansions sit above a Japanese port city. That contrast is Kobe in a nutshell."
- "Nara moves at its own speed. Deer on the temple paths, ancient wood creaking underfoot."
- "Morning in a Kyoto teahouse, afternoon under ten thousand vermillion gates. The contrast is the point."
- "The shrines are quieter before the tour buses arrive. Worth the early start."
- "Osaka after dark is a different city. Neon, noise, and the smell of takoyaki from every corner."

No:
- "Settle into Kobe, its port history visible from Harborland. A taste of Western influence at Weathercock House, then a sip of local sake."
- "Explore temples at Kinkaku-ji and enjoy food at Nishiki Market, then visit nature at Arashiyama."
- "Today features a mix of cultural landmarks and culinary experiences across the city."
- "Start your morning at X, then head to Y for Z."

Return a JSON object mapping each day ID to its intro string.`;

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: introSchema,
      prompt,
    });

    logger.info("Generated AI day intros", {
      dayCount: dayIds.length,
    });

    return result.object as Record<string, string>;
  } catch (error) {
    logger.warn("Failed to generate AI day intros, falling back to templates", {
      error: getErrorMessage(error),
    });
    return null;
  }
}
