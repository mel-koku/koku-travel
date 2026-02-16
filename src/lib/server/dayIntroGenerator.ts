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
  if (month >= 8 && month <= 10) return "autumn";
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

  const prompt = `You are writing day introductions for a Japan travel itinerary.

Context:
- Season: ${season}
- Traveler: ${group}
- Pace: ${pace}
- Vibes: ${vibes}
- Trip length: ${days.length} days

Daily activities:
${dayContext}

Write a short "Today's Plan" intro for each day (1-2 sentences, max 180 characters).

Rules:
- Reference specific activity names from that day — don't be generic
- Vary sentence openings across days (no two should start the same way)
- Match the traveler's pace and group type in tone
- Be concrete and grounded — say what they'll actually do
- No emoji, no exclamation marks, no filler words like "amazing" or "incredible"
- No "you'll love" or "get ready" — just describe the day plainly
- First day can reference arrival; last day can reference wrapping up

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
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
