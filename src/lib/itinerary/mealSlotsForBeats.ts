import type { ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { CityId } from "@/types/trip";
import type { ChapterBeat } from "@/components/features/itinerary/chapter/ChapterList";
import { detectMealGaps } from "@/lib/smartPrompts/detectors/mealGapDetector";

export type MealSlotType = "breakfast" | "lunch" | "dinner";

export type BeatMealSlotInsertion = {
  promptId: string;
  mealType: MealSlotType;
  /** Beat id this slot renders directly above. `null` = render at end of spine. */
  beforeBeatId: string | null;
};

type Args = {
  dayId: string;
  dayIndex: number;
  cityId?: CityId;
  dayActivities: ItineraryActivity[];
  beats: ChapterBeat[];
  accommodationStyle?: "hotel" | "ryokan" | "hostel" | "mix";
  dismissedPromptIds: ReadonlySet<string>;
};

/**
 * Compute where to insert meal slots between `beats` in a chapter day.
 * Slots only fire when `detectMealGaps` already flags a missing meal —
 * detection logic itself is unchanged.
 *
 * Insertion is keyed off `beat.partOfDay`:
 *   - breakfast → before first "Morning" beat
 *   - lunch     → before first "Midday" / "Afternoon" / "Evening" / "Night" beat;
 *                 falls back to `beforeBeatId: null` (end of spine) if none exists
 *   - dinner    → before first "Evening" / "Night" beat;
 *                 falls back to `beforeBeatId: null` (end of spine)
 *
 * Caller is responsible for rendering — the meal slot never enters
 * `day.activities`.
 */
export function computeBeatMealSlotInsertions(args: Args): BeatMealSlotInsertion[] {
  const {
    dayId,
    dayIndex,
    cityId,
    dayActivities,
    beats,
    accommodationStyle,
    dismissedPromptIds,
  } = args;

  const synthDay = {
    id: dayId,
    cityId,
    activities: dayActivities,
  } as ItineraryDay;

  const gaps = detectMealGaps(synthDay, dayIndex);
  const filtered =
    accommodationStyle === "ryokan"
      ? gaps.filter((g) => {
          if (g.action.type !== "add_meal" && g.action.type !== "quick_meal") return true;
          return g.action.mealType === "lunch";
        })
      : gaps;

  // One add_meal id per meal type (drop the konbini half — not used in this layout).
  const addMealByType = new Map<MealSlotType, string>();
  for (const gap of filtered) {
    if (gap.action.type !== "add_meal") continue;
    const mealType = gap.action.mealType;
    if (!addMealByType.has(mealType)) addMealByType.set(mealType, gap.id);
  }

  const firstBeatWith = (predicate: (b: ChapterBeat) => boolean): ChapterBeat | undefined =>
    beats.find(predicate);

  const insertions: BeatMealSlotInsertion[] = [];
  for (const [mealType, promptId] of addMealByType) {
    if (dismissedPromptIds.has(promptId)) continue;

    let beforeBeat: ChapterBeat | undefined;
    if (mealType === "breakfast") {
      beforeBeat = firstBeatWith((b) => b.partOfDay === "Morning");
    } else if (mealType === "lunch") {
      beforeBeat = firstBeatWith(
        (b) =>
          b.partOfDay === "Midday" ||
          b.partOfDay === "Afternoon" ||
          b.partOfDay === "Evening" ||
          b.partOfDay === "Night",
      );
    } else {
      beforeBeat = firstBeatWith((b) => b.partOfDay === "Evening" || b.partOfDay === "Night");
    }

    insertions.push({
      promptId,
      mealType,
      beforeBeatId: beforeBeat?.id ?? null,
    });
  }

  return insertions;
}
