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

/** Notional clock time each slot represents — used purely for chronological positioning. */
const SLOT_TIME_MINUTES: Record<MealSlotType, number> = {
  breakfast: 8 * 60, // 08:00
  lunch: 12 * 60 + 30, // 12:30
  dinner: 19 * 60, // 19:00
};

function timeToMinutes(hhmm: string): number {
  const parts = hhmm.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/**
 * Compute where to insert meal slots between `beats` in a chapter day.
 * Slots only fire when `detectMealGaps` already flags a missing meal —
 * detection logic itself is unchanged.
 *
 * Positioning is purely chronological: each slot has a notional time
 * (08:00 / 12:30 / 19:00) and lands before the first beat whose clock
 * time is later. If no beat is later, the slot trails at end of spine.
 *
 * Earlier revisions keyed off `beat.partOfDay`, which produced wrong
 * placements when the day's actual schedule didn't include a "Morning"
 * or "Evening" bucket — both slots fell through to end-of-spine and
 * stacked at the bottom.
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

  const insertions: BeatMealSlotInsertion[] = [];
  for (const [mealType, promptId] of addMealByType) {
    if (dismissedPromptIds.has(promptId)) continue;

    const slotMinutes = SLOT_TIME_MINUTES[mealType];
    const beforeBeat = beats.find((b) => timeToMinutes(b.time) > slotMinutes);

    insertions.push({
      promptId,
      mealType,
      beforeBeatId: beforeBeat?.id ?? null,
    });
  }

  return insertions;
}
