/**
 * Pass 2: Day Refinement — Holistic quality pass on the planned itinerary.
 *
 * Uses Gemini to review the complete itinerary and suggest swaps, reorders,
 * or flags for quality issues the algorithm may have missed.
 *
 * Runs sequentially after planItinerary() (needs scheduled times and travel data).
 * Falls back to the original itinerary on any failure.
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/errorUtils";
import { dayRefinementSchema } from "./llmSchemas";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";
import type { Location } from "@/types/location";
import type { IntentExtractionResult, DayRefinementResult, RefinementPatch } from "@/types/llmConstraints";

/**
 * Builds a detailed itinerary summary for the refinement prompt.
 */
function buildDetailedSummary(itinerary: Itinerary): string {
  return itinerary.days
    .map((day, i) => {
      const city = day.cityId ?? "unknown";
      const activities = (day.activities ?? [])
        .filter((a) => a.kind === "place")
        .map((a) => {
          const schedule = a.schedule
            ? `${a.schedule.arrivalTime ?? "?"}-${a.schedule.departureTime ?? "?"}`
            : "unscheduled";
          const category = a.tags?.[1] ?? a.tags?.[0] ?? "activity";
          const travel = a.travelFromPrevious
            ? `, ${a.travelFromPrevious.durationMinutes}min ${a.travelFromPrevious.mode}`
            : "";
          return `  - [${a.id}] ${a.title} (${category}, ${schedule}${travel})`;
        });
      return `Day ${i + 1} [${day.id}] — ${city}:\n${activities.join("\n") || "  (no activities)"}`;
    })
    .join("\n\n");
}

/**
 * Refines the itinerary by applying LLM-suggested patches.
 *
 * Returns the refined itinerary, or the original on failure.
 */
export async function refineDays(
  itinerary: Itinerary,
  builderData: TripBuilderData,
  allLocations: Location[],
  intentResult?: IntentExtractionResult,
): Promise<Itinerary> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return itinerary;
  }

  const days = itinerary.days ?? [];
  if (days.length === 0) return itinerary;

  const vibes = builderData.interests?.join(", ") ?? "general sightseeing";
  const pace = builderData.style ?? "balanced";
  const group = builderData.group?.type ?? "solo";
  const groupSize = builderData.group?.size ?? 1;
  const childrenAges = builderData.group?.childrenAges?.join(", ") ?? "none";
  const mobility = builderData.accessibility?.mobility ? "needs mobility assistance" : "none";
  const notes = builderData.accessibility?.notes?.trim() ?? "";
  const itinerarySummary = buildDetailedSummary(itinerary);

  // Collect runner-ups for potential swaps
  const runnerUpMap = new Map<string, string[]>();
  for (const day of days) {
    for (const activity of day.activities) {
      if (activity.kind === "place") {
        const runnerUps = (activity as { _runnerUps?: { name: string; id: string }[] })._runnerUps;
        if (runnerUps?.length) {
          runnerUpMap.set(activity.id, runnerUps.map((r) => r.id));
        }
      }
    }
  }

  const runnerUpContext = runnerUpMap.size > 0
    ? "\n## Available replacement locations (runner-ups from scoring)\n" +
      Array.from(runnerUpMap.entries())
        .map(([actId, ids]) => `${actId}: ${ids.join(", ")}`)
        .join("\n")
    : "";

  const insights = intentResult?.additionalInsights?.join("; ") ?? "";

  const prompt = `You are reviewing a Japan travel itinerary for quality. Suggest improvements via patches (swap, reorder, or flag).

## Traveler
- Vibes: ${vibes}
- Pace: ${pace}
- Group: ${group} (${groupSize} people${childrenAges !== "none" ? `, children: ${childrenAges}` : ""})
- Mobility: ${mobility}
${notes ? `- Notes: ${notes}` : ""}
${insights ? `- Insights: ${insights}` : ""}

## Itinerary
${itinerarySummary}
${runnerUpContext}

## Review criteria

1. **Pacing**: Back-to-back heavy walking days? Long transit gaps? Activities too close together?
2. **Accessibility**: If mobility assistance needed, flag locations known for steep stairs or hills.
3. **Day constraints**: If notes mention specific requests (birthday dinner, must-visit), check they're satisfied.
4. **Sequence**: Within each day, would a different order reduce backtracking or improve the flow?
5. **Category balance**: Too many similar activities in a row?

## Patch types

- **swap**: Replace an activity with a runner-up. Only use runner-up IDs from the list above.
- **reorder**: Change activity order within a day. Include ALL activity IDs for that day in the new order.
- **flag**: Add an informational/warning note to an activity. Use for issues that don't have a clear fix.

## Rules
- Be conservative — only suggest patches for clear issues
- Max 3 patches total (don't over-optimize)
- Never remove activities, only swap or reorder
- Give a qualityScore 1-10 (10 = no issues found)
- If the itinerary looks good, return empty patches array with a high score
- Swap targets MUST use IDs from the runner-ups list`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: dayRefinementSchema,
      prompt,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    const refinement = result.object as DayRefinementResult;

    logger.info("Day refinement completed", {
      patchCount: refinement.patches.length,
      qualityScore: refinement.qualityScore,
      summary: refinement.summary,
    });

    if (refinement.patches.length === 0) {
      return itinerary;
    }

    // Apply patches to itinerary
    return applyPatches(itinerary, refinement.patches, allLocations);
  } catch (error) {
    clearTimeout(timeout);
    logger.warn("Day refinement failed, using original itinerary", {
      error: getErrorMessage(error),
    });
    return itinerary;
  }
}

/**
 * Applies refinement patches to the itinerary.
 * Invalid patches are silently skipped — LLM output is never trusted blindly.
 */
function applyPatches(
  itinerary: Itinerary,
  patches: RefinementPatch[],
  allLocations: Location[],
): Itinerary {
  // Deep clone days to avoid mutation
  const days = itinerary.days.map((day) => ({
    ...day,
    activities: [...day.activities],
  }));

  const locationById = new Map(allLocations.map((l) => [l.id, l]));

  for (const patch of patches) {
    const day = days[patch.dayIndex];
    if (!day) {
      logger.warn("Refinement patch references invalid day index", { patch });
      continue;
    }

    switch (patch.type) {
      case "swap": {
        const targetIdx = day.activities.findIndex((a) => a.id === patch.targetActivityId);
        if (targetIdx === -1) {
          logger.warn("Swap target activity not found", { activityId: patch.targetActivityId });
          break;
        }
        const replacementLoc = locationById.get(patch.replacementLocationId);
        if (!replacementLoc) {
          logger.warn("Swap replacement location not found", { locationId: patch.replacementLocationId });
          break;
        }
        const original = day.activities[targetIdx]!;
        if (original.kind !== "place") break;

        // Build replacement activity preserving time slot and schedule
        const replacement: Extract<ItineraryActivity, { kind: "place" }> = {
          kind: "place",
          id: `${replacementLoc.id}-refined`,
          title: replacementLoc.name,
          timeOfDay: original.timeOfDay,
          durationMin: original.durationMin,
          locationId: replacementLoc.id,
          coordinates: replacementLoc.coordinates,
          neighborhood: replacementLoc.neighborhood ?? replacementLoc.city,
          tags: replacementLoc.category ? [replacementLoc.category] : [],
          notes: `Refined: ${patch.reason}`,
          schedule: original.schedule,
          ...(replacementLoc.description && { description: replacementLoc.description }),
        };

        day.activities[targetIdx] = replacement;
        logger.info(`Applied swap patch: ${original.title} → ${replacementLoc.name}`);
        break;
      }

      case "reorder": {
        const placeActivities = day.activities.filter((a) => a.kind === "place");
        const nonPlaceActivities = day.activities.filter((a) => a.kind !== "place");

        // Validate all IDs exist
        const activityMap = new Map(placeActivities.map((a) => [a.id, a]));
        if (patch.newOrder.length !== placeActivities.length) {
          logger.warn("Reorder patch has wrong activity count", {
            expected: placeActivities.length,
            got: patch.newOrder.length,
          });
          break;
        }

        const allExist = patch.newOrder.every((id) => activityMap.has(id));
        if (!allExist) {
          logger.warn("Reorder patch references unknown activity IDs");
          break;
        }

        const reordered: ItineraryActivity[] = [];
        for (const id of patch.newOrder) {
          const act = activityMap.get(id);
          if (act) reordered.push(act);
        }

        day.activities = [...nonPlaceActivities, ...reordered];
        logger.info(`Applied reorder patch on day ${patch.dayIndex + 1}`);
        break;
      }

      case "flag": {
        const flagTarget = day.activities.find((a) => a.id === patch.activityId);
        if (!flagTarget) {
          logger.warn("Flag target activity not found", { activityId: patch.activityId });
          break;
        }
        // Attach flag message to activity notes
        if (flagTarget.kind === "place") {
          const existing = flagTarget.notes ?? "";
          flagTarget.notes = existing
            ? `${existing} | ${patch.severity}: ${patch.message}`
            : `${patch.severity}: ${patch.message}`;
        }
        logger.info(`Applied flag patch: ${patch.message}`);
        break;
      }
    }
  }

  return { ...itinerary, days };
}
