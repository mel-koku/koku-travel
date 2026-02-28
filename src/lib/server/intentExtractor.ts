/**
 * Pass 1: Intent Extraction — Extracts structured constraints from builder data.
 *
 * Uses Gemini to reason holistically about vibes, group, pace, notes, and
 * accessibility to produce actionable constraints for the itinerary generator.
 *
 * Runs in parallel with location fetching — zero added latency.
 * Falls back to null on any failure (missing key, quota, timeout, parse error).
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { intentExtractionSchema } from "./llmSchemas";
import type { TripBuilderData } from "@/types/trip";
import type { IntentExtractionResult } from "@/types/llmConstraints";

/**
 * Extracts trip intent from builder data using Gemini.
 *
 * Returns structured constraints or null on any failure.
 * 5s timeout to avoid blocking the pipeline.
 */
export async function extractTripIntent(
  builderData: TripBuilderData,
): Promise<IntentExtractionResult | null> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return null;
  }

  const notes = builderData.accessibility?.notes?.trim();
  const vibes = builderData.interests?.join(", ") ?? "general sightseeing";
  const cities = builderData.cities?.join(", ") ?? "not specified";
  const regions = builderData.regions?.join(", ") ?? "not specified";
  const duration = builderData.duration ?? "not specified";
  const startDate = builderData.dates?.start ?? "not specified";
  const endDate = builderData.dates?.end ?? "not specified";
  const pace = builderData.style ?? "balanced";
  const groupType = builderData.group?.type ?? "solo";
  const groupSize = builderData.group?.size ?? 1;
  const childrenAges = builderData.group?.childrenAges?.join(", ") ?? "none";
  const budget = builderData.budget?.level ?? "not specified";
  const mobility = builderData.accessibility?.mobility ? "needs mobility assistance" : "no restrictions";
  const dietary = builderData.accessibility?.dietary?.join(", ") ?? "none";
  const isFirstTime = builderData.isFirstTimeVisitor ? "yes" : "not specified";
  const entryPoint = builderData.entryPoint?.name ?? "not specified";
  const accommodation = builderData.accommodationStyle ?? "hotel";

  const prompt = `You are a Japan travel planning assistant. Analyze this trip configuration and extract structured constraints for itinerary generation.

## Trip Configuration

- **Duration**: ${duration} days (${startDate} to ${endDate})
- **Cities**: ${cities}
- **Regions**: ${regions}
- **Vibes/Interests**: ${vibes}
- **Pace**: ${pace}
- **Entry Point**: ${entryPoint}
- **Accommodation**: ${accommodation}

## Traveler Profile

- **Group**: ${groupType} (${groupSize} people)
- **Children ages**: ${childrenAges}
- **Budget**: ${budget}
- **Mobility**: ${mobility}
- **Dietary restrictions**: ${dietary}
- **First time in Japan**: ${isFirstTime}

## Notes from traveler
${notes || "(no notes provided)"}

## Your Task

Extract structured constraints from ALL the above information:

1. **pinnedLocations**: Extract any must-visit places from notes. Match to real Japan locations. Include preferredDay (0-indexed) and timeSlot if mentioned.

2. **excludedCategories**: Categories to skip. Examples:
   - Family with young kids → exclude "bar"
   - Mobility issues → flag but don't exclude (handled by scoring)
   - Vegan dietary → no category exclusion (handled by meal selection)

3. **dayConstraints**: Day-specific requests from notes (e.g., "birthday dinner on day 3" → dayIndex: 2, mealType: "dinner", categoryEmphasis: "restaurant").

4. **pacingHint**: Combine pace + group + children ages:
   - "relaxed" pace + kids under 5 → "very_relaxed"
   - "fast" pace + solo → "intense"
   - Default to the stated pace

5. **categoryWeights**: Multipliers (0.5-2.0) based on vibes + group. Examples:
   - "foodie_paradise" → { "restaurant": 1.5, "market": 1.3, "cafe": 1.2 }
   - "temples_tradition" → { "shrine": 1.5, "temple": 1.5, "garden": 1.3 }
   - "nature_adventure" → { "nature": 1.5, "park": 1.3, "garden": 1.2 }
   - "family_fun" → { "aquarium": 1.3, "zoo": 1.3, "park": 1.3, "entertainment": 1.2 }
   - "neon_nightlife" → { "bar": 1.5, "entertainment": 1.4 }

6. **timePreference**: Infer from notes or vibes. Night-focused vibes → "night_owl". Early temple visits → "morning_person". Default to "no_preference".

7. **additionalInsights**: Any insights that couldn't be structured above.

Important:
- Category names must be from: restaurant, cafe, bar, shrine, temple, landmark, museum, park, garden, shopping, onsen, entertainment, market, wellness, viewpoint, nature, aquarium, beach, castle, historic_site, theater, zoo
- Be conservative — only extract what's clearly implied
- Empty arrays are fine if nothing applies`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: intentExtractionSchema,
      prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    // Clamp category weights to valid range
    const clamped = { ...result.object };
    for (const key of Object.keys(clamped.categoryWeights)) {
      const val = clamped.categoryWeights[key];
      if (val !== undefined) {
        clamped.categoryWeights[key] = Math.max(0.5, Math.min(2.0, val));
      }
    }

    logger.info("Intent extraction completed", {
      pinnedCount: clamped.pinnedLocations.length,
      excludedCount: clamped.excludedCategories.length,
      constraintCount: clamped.dayConstraints.length,
      pacingHint: clamped.pacingHint,
      weightCount: Object.keys(clamped.categoryWeights).length,
    });

    return clamped as IntentExtractionResult;
  } catch (error) {
    clearTimeout(timeout);
    logger.warn("Intent extraction failed, proceeding without constraints", {
      error: getErrorMessage(error),
    });
    return null;
  }
}
