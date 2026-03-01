/**
 * AI-powered place intent extraction — Extracts structured search params
 * from natural language queries like "quiet ramen spot" or "fun for kids".
 *
 * Uses Gemini to map free-text queries to categories, tags, and filters
 * that can be used to query the locations database.
 *
 * Returns null on any failure (missing key, quota, timeout, parse error).
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/**
 * Schema for structured place intent extraction
 */
const placeIntentSchema = z.object({
  categories: z
    .array(z.string())
    .describe("Location categories that match the query"),
  tags: z
    .array(z.string())
    .describe("Relevant tags from the tag dimensions"),
  searchQuery: z
    .string()
    .optional()
    .describe("A refined text search query to use for name/description matching"),
  mealType: z
    .enum(["breakfast", "lunch", "dinner", "snack"])
    .optional()
    .describe("If the query implies a specific meal type"),
  pricePreference: z
    .enum(["budget", "moderate", "luxury"])
    .optional()
    .describe("If the query implies a price preference"),
  timePreference: z
    .enum(["morning", "afternoon", "evening"])
    .optional()
    .describe("If the query implies a time of day"),
});

export type PlaceIntent = z.infer<typeof placeIntentSchema>;

interface PlaceIntentContext {
  query: string;
  cityId: string;
  dayActivities?: Array<{ name: string; category?: string }>;
  interests?: string[];
}

/**
 * Extracts structured place search intent from a natural language query.
 *
 * Returns structured filters or null on any failure.
 * 5s timeout to keep the UI responsive.
 */
export async function extractPlaceIntent(
  context: PlaceIntentContext,
): Promise<PlaceIntent | null> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return null;
  }

  const { query, cityId, dayActivities, interests } = context;

  const existingActivities = dayActivities?.length
    ? dayActivities
        .map((a) => `${a.name} (${a.category ?? "unknown"})`)
        .join(", ")
    : "none yet";

  const tripInterests = interests?.length
    ? interests.join(", ")
    : "general sightseeing";

  const prompt = `You are a Japan travel assistant. A traveler in ${cityId} described what they want to add to their day. Extract structured search parameters from their natural language query.

## Query
"${query}"

## Current Day
- City: ${cityId}
- Activities already planned: ${existingActivities}
- Trip interests: ${tripInterests}

## Your Task

Map the query to structured search parameters:

1. **categories**: Which location categories match? Pick from:
   restaurant, cafe, bar, shrine, temple, landmark, museum, park, garden, shopping, onsen, entertainment, market, wellness, viewpoint, nature, aquarium, beach, castle, historic_site, theater, zoo

2. **tags**: Relevant tags from these dimensions:
   - Environment: indoor, outdoor, mixed
   - Pace: quick-stop, half-day, full-day
   - Atmosphere: quiet, lively, contemplative, neutral
   - Tourist level: iconic, popular, local-favorite, hidden
   - Time: morning, afternoon, sunset, evening, late-night, anytime
   - Experience: scenic, hands-on, tasting, learning, spiritual, adrenaline, relaxation, photo-op
   - For: solo, couples, families, groups
   - Character: traditional-japan, modern-japan, quirky-japan, zen-japan, pop-culture

3. **searchQuery**: A refined keyword for text search (e.g., "ramen" from "quiet ramen spot"). Omit if the query is purely descriptive with no specific name/type.

4. **mealType**: If the query implies a meal (breakfast, lunch, dinner, snack). Omit if not food-related.

5. **pricePreference**: If the query implies a budget (budget, moderate, luxury). Omit if not mentioned.

6. **timePreference**: If the query implies a time of day (morning, afternoon, evening). Omit if not mentioned.

Important:
- Be generous with categories — include all that could match
- If the query mentions a specific food type (ramen, sushi, etc.), include "restaurant" in categories and the food type in searchQuery
- If the query is vague ("something fun"), use trip interests to guide category selection
- Empty arrays are fine if nothing specific applies`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: placeIntentSchema,
      prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    logger.info("Place intent extraction completed", {
      query,
      cityId,
      categories: result.object.categories,
      searchQuery: result.object.searchQuery,
    });

    return result.object;
  } catch (error) {
    clearTimeout(timeout);
    logger.warn("Place intent extraction failed, falling back to text search", {
      error: getErrorMessage(error),
      query,
    });
    return null;
  }
}
