import "server-only";

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
import { vertex } from "./vertexProvider";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";

/** Valid DB categories — constrains Gemini to only return real values */
const VALID_CATEGORIES = [
  "restaurant", "cafe", "bar", "shrine", "temple", "landmark", "museum",
  "park", "garden", "shopping", "onsen", "entertainment", "market",
  "wellness", "viewpoint", "nature", "aquarium", "beach", "castle",
  "historic_site", "theater", "zoo", "craft",
] as const;

/**
 * Schema for structured place intent extraction with command classification
 */
const placeIntentSchema = z.object({
  commandType: z
    .enum(["search", "move", "swap", "remove", "optimize_route"])
    .describe("What action the user wants: 'search' to find new places, 'move' to reorder, 'swap' to exchange two activities, 'remove' to delete, 'optimize_route' to reorder for best walking route"),
  categories: z
    .array(z.enum(VALID_CATEGORIES))
    .describe("Location categories that match the query (only for 'search' commands)"),
  tags: z
    .array(z.string())
    .describe("Relevant tags from the tag dimensions (only for 'search' commands)"),
  searchQuery: z
    .string()
    .optional()
    .describe("A refined keyword for text search (e.g. 'ramen' from 'quiet ramen spot'). Omit if purely descriptive or not a search command."),
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
  targetActivityName: z
    .string()
    .optional()
    .describe("For move/swap/remove commands: the name of the activity to act on (must match one of the current activities)"),
  secondActivityName: z
    .string()
    .optional()
    .describe("For move/swap commands: the reference activity name"),
  movePosition: z
    .enum(["before", "after"])
    .optional()
    .describe("For move commands: whether to place the target before or after the reference activity"),
});

export type PlaceIntent = z.infer<typeof placeIntentSchema>;

/**
 * Common single-keyword queries mapped directly to categories/tags.
 * Avoids an LLM call for ~70-80% of simple searches.
 */
const KEYWORD_SHORTCUTS: Record<string, PlaceIntent> = {
  // Food categories
  ramen:      { commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "ramen" },
  sushi:      { commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "sushi" },
  udon:       { commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "udon" },
  soba:       { commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "soba" },
  yakitori:   { commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "yakitori" },
  tempura:    { commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "tempura" },
  okonomiyaki:{ commandType: "search", categories: ["restaurant"], tags: ["tasting"], searchQuery: "okonomiyaki" },
  izakaya:    { commandType: "search", categories: ["restaurant", "bar"], tags: ["tasting", "lively", "evening"], searchQuery: "izakaya" },
  wagashi:    { commandType: "search", categories: ["cafe"], tags: ["tasting", "traditional-japan"], searchQuery: "wagashi" },
  matcha:     { commandType: "search", categories: ["cafe"], tags: ["tasting", "traditional-japan"], searchQuery: "matcha" },
  coffee:     { commandType: "search", categories: ["cafe"], tags: [], searchQuery: "coffee" },
  breakfast:  { commandType: "search", categories: ["restaurant", "cafe"], tags: ["morning"], mealType: "breakfast" },
  lunch:      { commandType: "search", categories: ["restaurant"], tags: ["afternoon"], mealType: "lunch" },
  dinner:     { commandType: "search", categories: ["restaurant"], tags: ["evening"], mealType: "dinner" },
  // Location categories
  temple:     { commandType: "search", categories: ["temple"], tags: ["spiritual", "traditional-japan"] },
  shrine:     { commandType: "search", categories: ["shrine"], tags: ["spiritual", "traditional-japan"] },
  museum:     { commandType: "search", categories: ["museum"], tags: ["learning", "indoor"] },
  park:       { commandType: "search", categories: ["park"], tags: ["outdoor", "scenic"] },
  garden:     { commandType: "search", categories: ["garden"], tags: ["outdoor", "scenic", "quiet"] },
  onsen:      { commandType: "search", categories: ["onsen"], tags: ["relaxation", "traditional-japan"] },
  castle:     { commandType: "search", categories: ["castle"], tags: ["learning", "scenic", "traditional-japan"] },
  market:     { commandType: "search", categories: ["market"], tags: ["tasting", "lively"] },
  shopping:   { commandType: "search", categories: ["shopping"], tags: ["indoor"] },
  bar:        { commandType: "search", categories: ["bar"], tags: ["evening", "lively"] },
  cafe:       { commandType: "search", categories: ["cafe"], tags: [] },
  beach:      { commandType: "search", categories: ["beach"], tags: ["outdoor", "scenic"] },
  viewpoint:  { commandType: "search", categories: ["viewpoint"], tags: ["scenic", "photo-op"] },
  craft:      { commandType: "search", categories: ["craft"], tags: ["hands-on", "traditional-japan"] },
  nature:     { commandType: "search", categories: ["nature"], tags: ["outdoor", "scenic"] },
  zoo:        { commandType: "search", categories: ["zoo"], tags: ["families", "outdoor"] },
  aquarium:   { commandType: "search", categories: ["aquarium"], tags: ["families", "indoor"] },
};

interface PlaceIntentContext {
  query: string;
  cityId: string;
  dayActivities?: Array<{ id?: string; name: string; category?: string; isAnchor?: boolean }>;
  vibes?: string[];
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
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return null;
  }

  const { query, cityId, dayActivities, vibes } = context;

  // Short-circuit: single common keywords skip the LLM entirely
  const normalized = query.trim().toLowerCase();
  const shortcut = KEYWORD_SHORTCUTS[normalized];
  if (shortcut) {
    logger.info("Place intent resolved via keyword shortcut", {
      query,
      cityId,
      commandType: shortcut.commandType,
      categories: shortcut.categories,
    });
    return shortcut;
  }

  const activityListText = dayActivities?.length
    ? dayActivities
        .map((a, i) => `${i + 1}. ${a.name} (${a.category ?? "unknown"})${a.isAnchor ? " [anchor — cannot be moved/removed]" : ""}`)
        .join("\n")
    : "none yet";

  const tripVibes = vibes?.length
    ? vibes.join(", ")
    : "general sightseeing";

  const prompt = `You are a Japan travel assistant. A traveler in ${cityId} is using a search bar that can both find new places AND manage their existing itinerary. Classify their query and extract structured parameters.

## Query
"${query}"

## Current Day Activities
${activityListText}

## Trip Interests
${tripVibes}

## Command Classification

First, determine the **commandType**:

- **"search"** (default): The user wants to find/add a new place. Examples: "quiet ramen spot", "something fun for kids", "a nice park", "sushi"
- **"swap"**: Exchange the positions of two activities. Examples: "swap the temple and the garden", "switch Fushimi Inari and Kinkaku-ji"
- **"move"**: Move one activity before or after another. Examples: "move the museum before lunch", "put Senso-ji after the market"
- **"remove"**: Delete an activity from the day. Examples: "remove the museum", "take out Tsukiji Market", "drop the shrine"
- **"optimize_route"**: Reorder all activities for the most efficient walking route. Examples: "optimize my route", "reorder for best walking path", "minimize travel time"

## For "search" commands, also extract:

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

3. **searchQuery**: A refined keyword for text search (e.g., "ramen" from "quiet ramen spot"). Omit if purely descriptive.

4. **mealType**: If the query implies a meal. Omit if not food-related.

5. **pricePreference**: If the query implies a budget. Omit if not mentioned.

6. **timePreference**: If the query implies a time of day. Omit if not mentioned.

## For command types (swap/move/remove), also extract:

- **targetActivityName**: The activity to act on (must match one of the current activities above)
- **secondActivityName**: The reference activity (for swap/move only)
- **movePosition**: "before" or "after" (for move only, default "before" if ambiguous)

## Important Rules
- Default to "search" if the query is ambiguous or doesn't clearly reference existing activities
- Activity names must closely match the current day's activities listed above
- Activities marked [anchor] cannot be moved, swapped, or removed — use "search" instead
- Be generous with categories for search — include all that could match
- If the query mentions a specific food type, include "restaurant" in categories and the food type in searchQuery
- Empty arrays are fine for categories/tags if nothing specific applies`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const result = await generateObject({
      model: vertex("gemini-1.5-flash-002"),
      schema: placeIntentSchema,
      prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    logger.info("Place intent extraction completed", {
      query,
      cityId,
      commandType: result.object.commandType,
      categories: result.object.categories,
      searchQuery: result.object.searchQuery,
      targetActivityName: result.object.targetActivityName,
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
