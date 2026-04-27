import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import { detectMealGaps } from "@/lib/smartPrompts/detectors/mealGapDetector";

export type MealSlotEntry = {
  mealType: "breakfast" | "lunch" | "dinner";
  promptId: string;
  hasKonbini: boolean;
  insertAtIndex: number;
};

type ComputeArgs = {
  day: ItineraryDay;
  dayIndex: number;
  extendedActivities: ItineraryActivity[];
  accommodationStyle?: "hotel" | "ryokan" | "hostel" | "mix";
  dismissedPromptIds: ReadonlySet<string>;
};

export function computeMealSlotPositions({
  day,
  dayIndex,
  extendedActivities,
  accommodationStyle,
  dismissedPromptIds,
}: ComputeArgs): Map<number, MealSlotEntry> {
  const result = new Map<number, MealSlotEntry>();

  const gaps = detectMealGaps(day, dayIndex);
  const filtered =
    accommodationStyle === "ryokan"
      ? gaps.filter((g) => {
          if (g.action.type !== "add_meal" && g.action.type !== "quick_meal") return true;
          return g.action.mealType === "lunch";
        })
      : gaps;

  type MealInfo = { addMealId: string; hasKonbini: boolean };
  const byMealType = new Map<"breakfast" | "lunch" | "dinner", MealInfo>();
  for (const gap of filtered) {
    if (gap.action.type !== "add_meal" && gap.action.type !== "quick_meal") continue;
    const mealType = gap.action.mealType;
    const existing = byMealType.get(mealType) ?? { addMealId: "", hasKonbini: false };
    if (gap.action.type === "add_meal") existing.addMealId = gap.id;
    if (gap.action.type === "quick_meal") existing.hasKonbini = true;
    byMealType.set(mealType, existing);
  }

  type IndexedPlace = { a: Extract<ItineraryActivity, { kind: "place" }>; idx: number };
  const placeActivities: IndexedPlace[] = [];
  extendedActivities.forEach((a, idx) => {
    if (a.kind === "place") placeActivities.push({ a, idx });
  });

  const morning = placeActivities.filter(({ a }) => a.timeOfDay === "morning" && !a.isAnchor);
  const afternoon = placeActivities.filter(({ a }) => a.timeOfDay === "afternoon" && !a.isAnchor);
  const evening = placeActivities.filter(({ a }) => a.timeOfDay === "evening" && !a.isAnchor);
  const nonAnchor = placeActivities.filter(({ a }) => !a.isAnchor);
  const firstDepartureAnchor = placeActivities.find(
    ({ a }) => a.isAnchor && a.id.startsWith("anchor-departure"),
  );

  const indexAfter = (idx: number): number => {
    if (firstDepartureAnchor && idx + 1 >= firstDepartureAnchor.idx) {
      return firstDepartureAnchor.idx;
    }
    return Math.min(idx + 1, extendedActivities.length);
  };

  for (const [mealType, info] of byMealType) {
    if (!info.addMealId || dismissedPromptIds.has(info.addMealId)) continue;

    let insertAtIndex: number | null = null;
    if (mealType === "breakfast") {
      const first = morning[0];
      if (first) insertAtIndex = first.idx;
    } else if (mealType === "lunch") {
      const firstAfternoon = afternoon[0];
      const lastMorning = morning[morning.length - 1];
      if (firstAfternoon) {
        insertAtIndex = firstAfternoon.idx;
      } else if (lastMorning) {
        insertAtIndex = indexAfter(lastMorning.idx);
      }
    } else if (mealType === "dinner") {
      const firstEvening = evening[0];
      const lastNonAnchor = nonAnchor[nonAnchor.length - 1];
      if (firstEvening) {
        insertAtIndex = firstEvening.idx;
      } else if (lastNonAnchor) {
        insertAtIndex = indexAfter(lastNonAnchor.idx);
      }
    }

    if (insertAtIndex === null) continue;
    if (!result.has(insertAtIndex)) {
      result.set(insertAtIndex, {
        mealType,
        promptId: info.addMealId,
        hasKonbini: info.hasKonbini,
        insertAtIndex,
      });
    }
  }

  return result;
}
