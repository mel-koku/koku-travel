import type { ItineraryActivity } from "@/types/itinerary";

export type TimeOfDay = ItineraryActivity["timeOfDay"];

export const SECTION_LABELS: Record<
  TimeOfDay,
  { title: string; description: string }
> = {
  morning: {
    title: "Morning",
    description: "Start the day with energizing plans.",
  },
  afternoon: {
    title: "Afternoon",
    description: "Keep exploring with midday highlights.",
  },
  evening: {
    title: "Evening",
    description: "Wind down with memorable nights.",
  },
};

export function buildSections(
  activities: ItineraryActivity[],
): Record<TimeOfDay, ItineraryActivity[]> {
  const activitiesByTime: Record<TimeOfDay, ItineraryActivity[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  activities.forEach((activity) => {
    activitiesByTime[activity.timeOfDay]?.push(activity);
  });

  return activitiesByTime;
}

export function createNoteActivity(timeOfDay: TimeOfDay): ItineraryActivity {
  return {
    kind: "note",
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `note-${Date.now()}-${Math.random()}`,
    title: "Note",
    timeOfDay,
    notes: "",
    startTime: undefined,
    endTime: undefined,
  };
}

