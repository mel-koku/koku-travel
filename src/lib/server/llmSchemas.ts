import "server-only";

/**
 * Zod schemas for the hybrid LLM layer.
 *
 * Used with Vercel AI SDK's `generateObject()` for structured Gemini output.
 * Each schema matches its corresponding type in `@/types/llmConstraints`.
 */

import { z } from "zod";

// ── Pass 1: Intent Extraction ──────────────────────────────────────

export const intentExtractionSchema = z.object({
  pinnedLocations: z.array(
    z.object({
      locationName: z.string(),
      preferredDay: z.number().optional(),
      preferredTimeSlot: z.enum(["morning", "afternoon", "evening"]).optional(),
      reason: z.string(),
    }),
  ),
  excludedCategories: z.array(z.string()),
  dayConstraints: z.array(
    z.object({
      dayIndex: z.number(),
      label: z.string(),
      categoryEmphasis: z.string().optional(),
      timeSlot: z.enum(["morning", "afternoon", "evening"]).optional(),
      mealType: z.enum(["breakfast", "lunch", "dinner"]).optional(),
    }),
  ),
  pacingHint: z
    .enum(["very_relaxed", "relaxed", "balanced", "active", "intense"])
    .optional(),
  categoryWeights: z.record(z.string(), z.number()),
  preferredTags: z.array(z.string()).optional(),
  timePreference: z
    .enum(["morning_person", "night_owl", "no_preference"])
    .optional(),
  additionalInsights: z.array(z.string()),
});

// ── Pass 2: Day Refinement ─────────────────────────────────────────

export const dayRefinementSchema = z.object({
  patches: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("swap"),
        dayIndex: z.number(),
        targetActivityId: z.string(),
        replacementLocationId: z.string(),
        reason: z.string(),
      }),
      z.object({
        type: z.literal("reorder"),
        dayIndex: z.number(),
        // Activity IDs must be unique — a reorder list with duplicates would
        // silently drop the activities whose IDs get repeated. applyPatches
        // enforces this defensively too but catching it at schema time means
        // the LLM output fails validation and the whole patch is skipped.
        newOrder: z.array(z.string()).refine(
          (ids) => new Set(ids).size === ids.length,
          { message: "newOrder must contain unique activity IDs" },
        ),
        reason: z.string(),
      }),
      z.object({
        type: z.literal("flag"),
        dayIndex: z.number(),
        activityId: z.string(),
        severity: z.enum(["info", "warning", "error"]),
        message: z.string(),
      }),
    ]),
  ),
  qualityScore: z.number().min(1).max(10),
  summary: z.string(),
});

// ── Pass 3: Guide Prose (dynamic schema) ───────────────────────────

/**
 * Builds a dynamic guide prose schema with exact day IDs from the itinerary.
 * This ensures Gemini returns prose keyed to real day IDs.
 */
export function buildGuideProseSchema(
  dayIds: string[],
) {
  return z.object({
    tripOverview: z.string(),
    days: z.array(
      z.object({
        dayId: dayIds.length > 0 ? z.enum(dayIds as [string, ...string[]]) : z.string(),
        intro: z.string(),
        transitions: z.array(z.string()).max(5),
        culturalMoment: z.string().optional(),
        practicalTip: z.string().optional(),
        summary: z.string(),
      }),
    ),
  });
}

// ── Pass 4: Daily Briefings (dynamic schema) ─────────────────────

/**
 * Builds a dynamic daily briefing schema with exact day IDs from the itinerary.
 */
export function buildDailyBriefingSchema(
  dayIds: string[],
) {
  return z.object({
    days: z.array(
      z.object({
        dayId: dayIds.length > 0 ? z.enum(dayIds as [string, ...string[]]) : z.string(),
        briefing: z.string(),
      }),
    ),
  });
}
